import { Injectable } from '@nestjs/common';
import { MetricValueSource, StatementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { UpsertFinancialValueInput } from './dto/financials.dto';

type RemainderMapping = { parentLineItemId: string; remainderLineItemId: string };

@Injectable()
export class FinancialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookService: WebhookService,
    private readonly snapshotsService: SnapshotsService,
  ) {}

  async companyMultiPeriodFinancials(companyId: string, periodIds: string[], statementType?: StatementType) {
    const normalizedPeriodIds = Array.from(new Set(periodIds.filter(Boolean)));
    if (!normalizedPeriodIds.length) return [];

    const periodIndex = new Map(normalizedPeriodIds.map((id, idx) => [id, idx]));
    const rows = await this.prisma.financialMetric.findMany({
      where: {
        companyId,
        periodId: { in: normalizedPeriodIds },
        lineItem: statementType ? { statementType } : undefined
      },
      include: { lineItem: true },
      orderBy: [{ lineItem: { orderCode: 'asc' } }, { lineItem: { name: 'asc' } }]
    });

    return rows
      .map((row) => ({
        id: String(row.id),
        companyId: row.companyId,
        periodId: row.periodId,
        lineItemId: row.lineItemId,
        lineItemCode: row.lineItem.code,
        lineItemName: row.lineItem.name,
        orderCode: row.lineItem.orderCode,
        value: Number(row.value),
        currency: row.currency,
        valueSource: row.valueSource
      }))
      .sort((a, b) => {
        if (a.orderCode !== b.orderCode) return a.orderCode.localeCompare(b.orderCode);
        if (a.lineItemCode !== b.lineItemCode) return a.lineItemCode.localeCompare(b.lineItemCode);
        return (periodIndex.get(a.periodId) ?? Number.MAX_SAFE_INTEGER) - (periodIndex.get(b.periodId) ?? Number.MAX_SAFE_INTEGER);
      });
  }

  async companyPeriodFinancials(companyId: string, periodId: string, statementType?: StatementType) {
    const rows = await this.prisma.financialMetric.findMany({
      where: {
        companyId,
        periodId,
        lineItem: statementType ? { statementType } : undefined
      },
      include: { lineItem: true },
      orderBy: [{ lineItem: { orderCode: 'asc' } }, { lineItem: { name: 'asc' } }]
    });

    return rows.map((row) => ({
      id: String(row.id),
      companyId: row.companyId,
      periodId: row.periodId,
      lineItemId: row.lineItemId,
      lineItemCode: row.lineItem.code,
      lineItemName: row.lineItem.name,
      orderCode: row.lineItem.orderCode,
      value: Number(row.value),
      currency: row.currency,
      valueSource: row.valueSource
    }));
  }

  async upsertFinancialValues(items: UpsertFinancialValueInput[]) {
    if (!items.length) {
      return [];
    }

    const reconciledItems = await this.applyRemainderReconciliation(items);

    await this.prisma.$transaction(
      reconciledItems.map((item) =>
        this.prisma.financialMetric.upsert({
          where: {
            companyId_periodId_lineItemId: {
              companyId: item.companyId,
              periodId: item.periodId,
              lineItemId: item.lineItemId
            }
          },
          update: {
            value: item.value,
            currency: item.currency ?? 'INR',
            valueSource: item.valueSource
          },
          create: {
            companyId: item.companyId,
            periodId: item.periodId,
            lineItemId: item.lineItemId,
            value: item.value,
            currency: item.currency ?? 'INR',
            valueSource: item.valueSource
          }
        })
      )
    );

    const groups = Array.from(
      new Set(reconciledItems.map((item) => `${item.companyId}:${item.periodId}`))
    ).map((token) => {
      const [companyId, periodId] = token.split(':');
      return { companyId, periodId };
    });

    for (const group of groups) {
      await this.recalculateDerivedValues(group.companyId, group.periodId);
    }

    // Bump statementsVersion + contentUpdatedAt on every touched company so
    // Medusa's reconciliation cron can spot the drift on its next poll.
    const companyIds = Array.from(new Set(groups.map((g) => g.companyId)));
    if (companyIds.length) {
      await this.prisma.company.updateMany({
        where: { id: { in: companyIds } },
        data: {
          statementsVersion: { increment: 1 },
          contentUpdatedAt: new Date()
        }
      });
    }

    // Invalidate the snapshot cache BEFORE webhooks fire. Otherwise Medusa's
    // webhook handler hits the 5s-stale cached snapshot and saves it under
    // the new version number — "locking in" the pre-edit data until the
    // next write.
    if (companyIds.length) {
      const touched = await this.prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { isin: true }
      });
      for (const c of touched) this.snapshotsService.invalidate(c.isin);
    }

    // Sync to Medusa (non-blocking, fire-and-forget per company)
    for (const companyId of companyIds) {
      this.webhookService.syncToMedusa(companyId).catch(() => {});
    }

    const first = reconciledItems[0];
    return this.companyPeriodFinancials(first.companyId, first.periodId);
  }

  private async recalculateDerivedValues(companyId: string, periodId: string) {
    const [lineItems, existingValues] = await Promise.all([
      this.prisma.financialLineItem.findMany({
        select: { id: true, code: true, parentId: true, isCalculated: true, formula: true }
      }),
      this.prisma.financialMetric.findMany({
        where: { companyId, periodId },
        include: { lineItem: { select: { code: true } } }
      })
    ]);

    const codeToValue = new Map<string, number>();
    for (const row of existingValues) {
      codeToValue.set(row.lineItem.code, Number(row.value));
    }

    const calculated = lineItems.filter((row) => row.isCalculated && row.formula);
    if (!calculated.length) return;

    // Build parent code -> direct child codes and descendant codes maps for @SUM_* templates.
    const idToItem = new Map(lineItems.map((row) => [row.id, row]));
    const childrenByParentCode = new Map<string, string[]>();
    const descendantsByParentCode = new Map<string, string[]>();
    for (const row of lineItems) {
      if (!row.parentId) continue;
      const parent = idToItem.get(row.parentId);
      if (!parent) continue;
      const arr = childrenByParentCode.get(parent.code) ?? [];
      arr.push(row.code);
      childrenByParentCode.set(parent.code, arr);
    }
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
    const ctx = { childrenByParentCode, descendantsByParentCode };

    const pending = new Map<string, number>();

    for (let pass = 0; pass < calculated.length; pass += 1) {
      let changed = false;
      for (const item of calculated) {
        const next = this.evaluateFormula(item.formula ?? '', codeToValue, {
          currentCode: item.code,
          ...ctx
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

    if (!pending.size) return;

    await this.prisma.$transaction(
      Array.from(pending.entries()).map(([lineItemId, value]) =>
        this.prisma.financialMetric.upsert({
          where: {
            companyId_periodId_lineItemId: { companyId, periodId, lineItemId }
          },
          update: {
            value,
            currency: 'INR',
            valueSource: MetricValueSource.derived
          },
          create: {
            companyId,
            periodId,
            lineItemId,
            value,
            currency: 'INR',
            valueSource: MetricValueSource.derived
          }
        })
      )
    );
  }

  private static readonly IDENT_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  private static readonly SAFE_RE = /[^0-9+\-*/().\s]/;
  private static readonly TEMPLATE_RE =
    /@SUM_CHILDREN_EXCEPT\s*\(([^)]*)\)|@SUM_CHILDREN\b|@SUM_DESCENDANTS\b/gi;
  private readonly formulaIdentCache = new Map<string, string[]>();

  private expandTemplates(
    formula: string,
    ctx: {
      currentCode: string;
      childrenByParentCode: Map<string, string[]>;
      descendantsByParentCode: Map<string, string[]>;
    }
  ): string {
    return formula.replace(FinancialsService.TEMPLATE_RE, (match, exceptList?: string) => {
      const upper = match.toUpperCase();
      let codes: string[] = [];
      if (upper.startsWith('@SUM_CHILDREN_EXCEPT')) {
        const excluded = new Set(
          (exceptList ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
        codes = (ctx.childrenByParentCode.get(ctx.currentCode) ?? []).filter(
          (c) => !excluded.has(c)
        );
      } else if (upper === '@SUM_CHILDREN') {
        codes = ctx.childrenByParentCode.get(ctx.currentCode) ?? [];
      } else if (upper === '@SUM_DESCENDANTS') {
        codes = ctx.descendantsByParentCode.get(ctx.currentCode) ?? [];
      }
      if (!codes.length) return '0';
      return `(${codes.join(' + ')})`;
    });
  }

  private evaluateFormula(
    formula: string,
    codeToValue: Map<string, number>,
    ctx?: {
      currentCode: string;
      childrenByParentCode: Map<string, string[]>;
      descendantsByParentCode: Map<string, string[]>;
    }
  ): number | null {
    if (!formula.trim()) return null;

    const expanded = ctx ? this.expandTemplates(formula, ctx) : formula;

    let identifiers = this.formulaIdentCache.get(expanded);
    if (!identifiers) {
      identifiers = Array.from(new Set(expanded.match(FinancialsService.IDENT_RE) ?? []));
      this.formulaIdentCache.set(expanded, identifiers);
    }

    for (const id of identifiers) {
      if (!codeToValue.has(id)) return null;
    }

    const replaced = expanded.replace(FinancialsService.IDENT_RE, (code) => String(codeToValue.get(code)));
    if (FinancialsService.SAFE_RE.test(replaced)) return null;

    try {
      const value = Function(`"use strict"; return (${replaced});`)() as number;
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      return value;
    } catch {
      return null;
    }
  }

  private async applyRemainderReconciliation(items: UpsertFinancialValueInput[]) {
    const uniqueGroups = Array.from(
      new Set(items.map((item) => `${item.companyId}:${item.periodId}`))
    ).map((token) => {
      const [companyId, periodId] = token.split(':');
      return { companyId, periodId };
    });

    const [lineItems, mappings] = await Promise.all([
      this.prisma.financialLineItem.findMany({
        select: { id: true, parentId: true, isCalculated: true }
      }),
      this.prisma.$queryRaw<RemainderMapping[]>`
        SELECT parent_line_item_id::text AS "parentLineItemId", remainder_line_item_id::text AS "remainderLineItemId"
        FROM financial_remainder_mappings
      `
    ]);

    if (!mappings.length) return items;

    const lineItemById = new Map(lineItems.map((row) => [row.id, row]));
    const childrenByParentId = new Map<string, string[]>();
    for (const row of lineItems) {
      if (!row.parentId) continue;
      const current = childrenByParentId.get(row.parentId) ?? [];
      current.push(row.id);
      childrenByParentId.set(row.parentId, current);
    }

    const existingByGroup = new Map<string, Map<string, number>>();
    for (const group of uniqueGroups) {
      const rows = await this.prisma.financialMetric.findMany({
        where: {
          companyId: group.companyId,
          periodId: group.periodId
        },
        select: {
          lineItemId: true,
          value: true
        }
      });
      existingByGroup.set(
        `${group.companyId}:${group.periodId}`,
        new Map(rows.map((row) => [row.lineItemId, Number(row.value)]))
      );
    }

    const byGroupIncoming = new Map<string, UpsertFinancialValueInput[]>();
    for (const item of items) {
      const key = `${item.companyId}:${item.periodId}`;
      const bucket = byGroupIncoming.get(key) ?? [];
      bucket.push(item);
      byGroupIncoming.set(key, bucket);
    }

    const result = [...items];
    const dedupe = new Set(items.map((item) => `${item.companyId}:${item.periodId}:${item.lineItemId}`));

    for (const [groupKey, incoming] of byGroupIncoming.entries()) {
      const merged = new Map(existingByGroup.get(groupKey) ?? []);
      for (const row of incoming) {
        merged.set(row.lineItemId, row.value);
      }

      for (const mapping of mappings) {
        const parentEdited = incoming.some((row) => row.lineItemId === mapping.parentLineItemId);
        const childIds = (childrenByParentId.get(mapping.parentLineItemId) ?? []).filter(
          (id) => id !== mapping.remainderLineItemId
        );

        if (parentEdited) {
          const parentValue = merged.get(mapping.parentLineItemId);
          if (parentValue === undefined) continue;
          let childTotal = 0;
          for (const childId of childIds) {
            const child = lineItemById.get(childId);
            if (!child || child.isCalculated) continue;
            const v = merged.get(childId);
            if (v === undefined || !Number.isFinite(v)) continue;
            childTotal += v;
          }
          const remainderValue = parentValue - childTotal;
          merged.set(mapping.remainderLineItemId, remainderValue);
          const [companyId, periodId] = groupKey.split(':');
          const remainderItem: UpsertFinancialValueInput = {
            companyId,
            periodId,
            lineItemId: mapping.remainderLineItemId,
            value: remainderValue,
            currency: 'INR',
            valueSource: MetricValueSource.manual
          };
          const remainderKey = `${companyId}:${periodId}:${mapping.remainderLineItemId}`;
          if (!dedupe.has(remainderKey)) {
            result.push(remainderItem);
            dedupe.add(remainderKey);
          } else {
            const idx = result.findIndex(
              (row) =>
                row.companyId === companyId &&
                row.periodId === periodId &&
                row.lineItemId === mapping.remainderLineItemId
            );
            if (idx >= 0) result[idx] = remainderItem;
          }
          continue;
        }

        const hasAnyChildValue = (childrenByParentId.get(mapping.parentLineItemId) ?? []).some((id) => merged.has(id));
        if (!hasAnyChildValue) continue;

        let sumChildren = 0;
        for (const childId of childrenByParentId.get(mapping.parentLineItemId) ?? []) {
          const child = lineItemById.get(childId);
          if (!child || child.isCalculated) continue;
          const v = merged.get(childId);
          if (v === undefined || !Number.isFinite(v)) continue;
          sumChildren += v;
        }

        merged.set(mapping.parentLineItemId, sumChildren);
        const [companyId, periodId] = groupKey.split(':');
        const parentItem: UpsertFinancialValueInput = {
          companyId,
          periodId,
          lineItemId: mapping.parentLineItemId,
          value: sumChildren,
          currency: 'INR',
          valueSource: MetricValueSource.derived
        };
        const parentKey = `${companyId}:${periodId}:${mapping.parentLineItemId}`;
        if (!dedupe.has(parentKey)) {
          result.push(parentItem);
          dedupe.add(parentKey);
        } else {
          const idx = result.findIndex(
            (row) =>
              row.companyId === companyId &&
              row.periodId === periodId &&
              row.lineItemId === mapping.parentLineItemId
          );
          if (idx >= 0) result[idx] = parentItem;
        }
      }
    }

    return result;
  }
}
