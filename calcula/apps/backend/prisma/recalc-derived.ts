/**
 * Standalone recalc of all derived line items (parent sums, ratios,
 * valuations) for every period of a company. Mirrors the private
 * `FinancialsService.recalculateDerivedValues()` method so prisma
 * seed scripts that bypass the NestJS service can still populate
 * calculated values.
 *
 * Usage:
 *   npx tsx prisma/recalc-derived.ts              # default: API Holdings
 *   npx tsx prisma/recalc-derived.ts <isin>       # any company
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mirrors FinancialsService regexes so the two evaluation paths stay
// byte-compatible.
const IDENT_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
const SAFE_RE = /[^0-9+\-*/().\s]/;
const TEMPLATE_RE =
  /@SUM_CHILDREN_EXCEPT\s*\(([^)]*)\)|@SUM_CHILDREN\b|@SUM_DESCENDANTS\b/gi;

type LineItem = {
  id: string;
  code: string;
  parentId: string | null;
  isCalculated: boolean;
  formula: string | null;
};

function buildContext(lineItems: LineItem[]) {
  const idToItem = new Map(lineItems.map((r) => [r.id, r]));
  const childrenByParentCode = new Map<string, string[]>();
  for (const row of lineItems) {
    if (!row.parentId) continue;
    const parent = idToItem.get(row.parentId);
    if (!parent) continue;
    const arr = childrenByParentCode.get(parent.code) ?? [];
    arr.push(row.code);
    childrenByParentCode.set(parent.code, arr);
  }
  const descendantsByParentCode = new Map<string, string[]>();
  const collectDescendants = (code: string, acc: string[]) => {
    const kids = childrenByParentCode.get(code) ?? [];
    for (const k of kids) {
      acc.push(k);
      collectDescendants(k, acc);
    }
  };
  for (const row of lineItems) {
    const acc: string[] = [];
    collectDescendants(row.code, acc);
    if (acc.length) descendantsByParentCode.set(row.code, acc);
  }
  return { childrenByParentCode, descendantsByParentCode };
}

function expandTemplates(
  formula: string,
  currentCode: string,
  childrenByParentCode: Map<string, string[]>,
  descendantsByParentCode: Map<string, string[]>
): string {
  return formula.replace(TEMPLATE_RE, (match, exceptList?: string) => {
    const upper = match.toUpperCase();
    let codes: string[] = [];
    if (upper.startsWith('@SUM_CHILDREN_EXCEPT')) {
      const excluded = new Set(
        (exceptList ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      codes = (childrenByParentCode.get(currentCode) ?? []).filter(
        (c) => !excluded.has(c)
      );
    } else if (upper === '@SUM_CHILDREN') {
      codes = childrenByParentCode.get(currentCode) ?? [];
    } else if (upper === '@SUM_DESCENDANTS') {
      codes = descendantsByParentCode.get(currentCode) ?? [];
    }
    if (!codes.length) return '0';
    return `(${codes.join(' + ')})`;
  });
}

const identCache = new Map<string, string[]>();

function evaluateFormula(
  formula: string,
  codeToValue: Map<string, number>,
  ctx: {
    currentCode: string;
    childrenByParentCode: Map<string, string[]>;
    descendantsByParentCode: Map<string, string[]>;
  }
): number | null {
  if (!formula.trim()) return null;
  const expanded = expandTemplates(
    formula,
    ctx.currentCode,
    ctx.childrenByParentCode,
    ctx.descendantsByParentCode
  );
  let identifiers = identCache.get(expanded);
  if (!identifiers) {
    identifiers = Array.from(new Set(expanded.match(IDENT_RE) ?? []));
    identCache.set(expanded, identifiers);
  }
  for (const id of identifiers) {
    if (!codeToValue.has(id)) return null;
  }
  const replaced = expanded.replace(IDENT_RE, (code) =>
    String(codeToValue.get(code))
  );
  if (SAFE_RE.test(replaced)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const value = Function(`"use strict"; return (${replaced});`)() as number;
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

async function recalcPeriod(
  companyId: string,
  periodId: string,
  lineItems: LineItem[]
) {
  const existing = await prisma.financialMetric.findMany({
    where: { companyId, periodId },
    include: { lineItem: { select: { code: true } } }
  });
  const codeToValue = new Map<string, number>();
  for (const row of existing) {
    codeToValue.set(row.lineItem.code, Number(row.value));
  }

  const calculated = lineItems.filter((r) => r.isCalculated && r.formula);
  if (!calculated.length) return { updated: 0 };

  const ctx0 = buildContext(lineItems);
  const pending = new Map<string, number>();

  // Multi-pass fixpoint. The service caps at `calculated.length` passes,
  // same here — each pass stops early once nothing changes.
  for (let pass = 0; pass < calculated.length; pass += 1) {
    let changed = false;
    for (const item of calculated) {
      const next = evaluateFormula(item.formula ?? '', codeToValue, {
        currentCode: item.code,
        childrenByParentCode: ctx0.childrenByParentCode,
        descendantsByParentCode: ctx0.descendantsByParentCode
      });
      if (next === null) continue;
      const prev = codeToValue.get(item.code);
      if (prev === undefined || Math.abs(prev - next) > 1e-9) {
        codeToValue.set(item.code, next);
        pending.set(item.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  if (!pending.size) return { updated: 0 };

  await prisma.$transaction(
    Array.from(pending.entries()).map(([lineItemId, value]) =>
      prisma.financialMetric.upsert({
        where: {
          companyId_periodId_lineItemId: { companyId, periodId, lineItemId }
        },
        update: { value, currency: 'INR', valueSource: 'derived' },
        create: {
          companyId,
          periodId,
          lineItemId,
          value,
          currency: 'INR',
          valueSource: 'derived'
        }
      })
    )
  );
  return { updated: pending.size };
}

async function main() {
  const isin = process.argv[2] ?? 'INE0DJ201029';
  const company = await prisma.company.findUnique({
    where: { isin },
    select: { id: true, name: true }
  });
  if (!company) throw new Error(`${isin} not found`);
  console.log(`Recalculating derived values for ${company.name} (${isin})…`);

  const lineItems = await prisma.financialLineItem.findMany({
    select: { id: true, code: true, parentId: true, isCalculated: true, formula: true }
  });

  const periods = await prisma.financialPeriod.findMany({
    where: { companyId: company.id },
    orderBy: { fiscalYear: 'asc' }
  });

  let totalUpdated = 0;
  for (const period of periods) {
    const label = period.fiscalQuarter
      ? `FY${period.fiscalYear} Q${period.fiscalQuarter}`
      : `FY${period.fiscalYear}`;
    const { updated } = await recalcPeriod(company.id, period.id, lineItems);
    console.log(`  ${label.padEnd(12)} → ${updated} derived values written`);
    totalUpdated += updated;
  }

  // Bump version + invalidate snapshot by touching the company.
  await prisma.company.update({
    where: { id: company.id },
    data: {
      statementsVersion: { increment: 1 },
      contentUpdatedAt: new Date()
    }
  });
  console.log(`Total: ${totalUpdated} derived values across ${periods.length} periods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
