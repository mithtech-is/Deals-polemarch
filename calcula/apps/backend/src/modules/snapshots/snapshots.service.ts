import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * SnapshotsService builds the columnar payloads that Medusa caches and the
 * storefront renders from. It is called by:
 *   - The snapshot REST endpoints (on-demand fetch from Medusa)
 *   - The WebhookService (to know when versions have changed)
 *
 * Snapshots are built from the live DB with no schema side-effects. A 5s
 * in-memory cache per ISIN absorbs burst reads so a refresh cycle only pays
 * the query cost once.
 */

const STATEMENT_TYPES = ['balance_sheet', 'pnl', 'cashflow', 'derived'] as const;

type StatementKey = (typeof STATEMENT_TYPES)[number];

type PeriodHeader = {
  id: string;
  label: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  start: string;
  end: string;
  isAudited: boolean;
};

type StatementRow = {
  lineItemId: string;
  code: string;
  name: string;
  depth: number;
  orderCode: string;
  isCalculated: boolean;
  formula: string | null;
  values: (number | null)[];
};

type StatementBlock = {
  rows: StatementRow[];
};

type StatementsGroup = {
  periods: PeriodHeader[];
  statements: Record<StatementKey, StatementBlock>;
};

export type StatementsSnapshot = {
  isin: string;
  statementsVersion: number;
  contentUpdatedAt: string;
  currency: string;
  yearly: StatementsGroup;
  quarterly: StatementsGroup;
};

export type PriceSnapshot = {
  isin: string;
  priceVersion: number;
  contentUpdatedAt: string;
  /** [timestampMs, price] tuples, ordered ascending. */
  prices: [number, number][];
  events: {
    datetime: string;
    price: number;
    note: string | null;
    link: string | null;
    /** 'C' | 'N' | 'R' | null — see price.dto.ts PRICE_EVENT_CATEGORIES. */
    category: string | null;
  }[];
};

/**
 * Wire format is snake_case because Medusa's handleVersionEnvelope
 * (backend/src/modules/calcula/index.ts) reads these keys directly from the
 * JSON payload. Prior camelCase responses silently no-op'd drift sync:
 * `payload.statements_version` was undefined, so `undefined > local` always
 * returned false and no snapshot was ever pulled.
 */
export type VersionEnvelope = {
  isin: string;
  statements_version: number;
  price_version: number;
  news_version: number;
  editorial_version: number;
  content_updated_at: string;
};

export type NewsEventItem = {
  id: string;
  occurredAt: string;
  category: 'C' | 'N' | 'R' | string;
  title: string;
  body: string;
  sourceUrl: string | null;
};

export type NewsSnapshot = {
  isin: string;
  newsVersion: number;
  contentUpdatedAt: string;
  events: NewsEventItem[];
};

export type EditorialSnapshot = {
  isin: string;
  editorialVersion: number;
  contentUpdatedAt: string;
  overview: {
    summary: string;
    businessModel: string | null;
    competitiveMoat: string | null;
    risks: string | null;
  } | null;
  prosCons: {
    pros: string;
    cons: string;
  } | null;
};

// ── In-memory cache ────────────────────────────────────────────

type CacheEntry<T> = { expiresAt: number; payload: T };
const CACHE_TTL_MS = 5000;

@Injectable()
export class SnapshotsService {
  private statementsCache = new Map<string, CacheEntry<StatementsSnapshot>>();
  private priceCache = new Map<string, CacheEntry<PriceSnapshot>>();
  private newsCache = new Map<string, CacheEntry<NewsSnapshot>>();
  private editorialCache = new Map<string, CacheEntry<EditorialSnapshot>>();

  constructor(private readonly prisma: PrismaService) {}

  private periodLabel(fiscalYear: number, fiscalQuarter: number | null) {
    return fiscalQuarter ? `Q${fiscalQuarter} ${fiscalYear}` : `FY${fiscalYear}`;
  }

  private comparePeriods(
    a: { fiscalYear: number; fiscalQuarter: number | null },
    b: { fiscalYear: number; fiscalQuarter: number | null }
  ) {
    if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
    return (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0);
  }

  /**
   * Walks line-item tree in the same order the admin editor uses and returns
   * a flat array with depth pre-computed.
   */
  private flattenLineItems<
    T extends {
      id: string;
      parentId: string | null;
      statementType: string;
      orderCode: string;
      code: string;
    }
  >(items: T[], statementType: StatementKey): (T & { depth: number })[] {
    const filtered = items.filter((item) => item.statementType === statementType);
    const byParent = new Map<string | null, T[]>();
    for (const item of filtered) {
      const key = item.parentId ?? null;
      const rows = byParent.get(key) ?? [];
      rows.push(item);
      byParent.set(key, rows);
    }
    for (const rows of byParent.values()) {
      rows.sort((a, b) => {
        if (a.orderCode !== b.orderCode) return a.orderCode.localeCompare(b.orderCode);
        return a.code.localeCompare(b.code);
      });
    }
    const out: (T & { depth: number })[] = [];
    const seen = new Set<string>();
    const walk = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) ?? [];
      for (const child of children) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        out.push({ ...child, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    for (const item of filtered) {
      if (!seen.has(item.id)) out.push({ ...item, depth: 0 });
    }
    return out;
  }

  async versionsByIsin(isin: string): Promise<VersionEnvelope> {
    const company = await this.prisma.company.findUnique({
      where: { isin },
      select: {
        isin: true,
        statementsVersion: true,
        priceVersion: true,
        newsVersion: true,
        editorialVersion: true,
        contentUpdatedAt: true
      }
    });
    if (!company) throw new NotFoundException('Company not found');
    return {
      isin: company.isin,
      statements_version: company.statementsVersion,
      price_version: company.priceVersion,
      news_version: company.newsVersion,
      editorial_version: company.editorialVersion,
      content_updated_at: company.contentUpdatedAt.toISOString()
    };
  }

  async versionsSince(sinceIso: string, limit = 200): Promise<VersionEnvelope[]> {
    const sinceDate = new Date(sinceIso);
    if (Number.isNaN(sinceDate.getTime())) {
      throw new NotFoundException('Invalid since timestamp');
    }
    const rows = await this.prisma.company.findMany({
      where: { contentUpdatedAt: { gt: sinceDate } },
      orderBy: { contentUpdatedAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 1000),
      select: {
        isin: true,
        statementsVersion: true,
        priceVersion: true,
        newsVersion: true,
        editorialVersion: true,
        contentUpdatedAt: true
      }
    });
    return rows.map((r) => ({
      isin: r.isin,
      statements_version: r.statementsVersion,
      price_version: r.priceVersion,
      news_version: r.newsVersion,
      editorial_version: r.editorialVersion,
      content_updated_at: r.contentUpdatedAt.toISOString()
    }));
  }

  async statementsByIsin(isin: string): Promise<StatementsSnapshot> {
    const cached = this.statementsCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const [periods, lineItems, values] = await Promise.all([
      this.prisma.financialPeriod.findMany({
        where: { companyId: company.id },
        orderBy: [{ fiscalYear: 'asc' }, { fiscalQuarter: 'asc' }]
      }),
      this.prisma.financialLineItem.findMany({}),
      this.prisma.financialMetric.findMany({
        where: { companyId: company.id },
        select: { periodId: true, lineItemId: true, value: true }
      })
    ]);

    // Split periods into yearly (null quarter) vs quarterly (quarter 1..4)
    const yearlyPeriods = periods.filter((p) => p.fiscalQuarter === null).sort((a, b) => this.comparePeriods(a, b));
    const quarterlyPeriods = periods
      .filter((p) => p.fiscalQuarter !== null)
      .sort((a, b) => this.comparePeriods(a, b));

    // Index values by "periodId:lineItemId" → number
    const valueByKey = new Map<string, number>();
    for (const v of values) {
      valueByKey.set(`${v.periodId}:${v.lineItemId}`, Number(v.value));
    }

    const buildGroup = (periodRows: typeof yearlyPeriods): StatementsGroup => {
      const headers: PeriodHeader[] = periodRows.map((p) => ({
        id: p.id,
        label: this.periodLabel(p.fiscalYear, p.fiscalQuarter),
        fiscalYear: p.fiscalYear,
        fiscalQuarter: p.fiscalQuarter,
        start: p.periodStart.toISOString(),
        end: p.periodEnd.toISOString(),
        isAudited: p.isAudited
      }));

      const statements = {} as Record<StatementKey, StatementBlock>;
      for (const type of STATEMENT_TYPES) {
        const flat = this.flattenLineItems(lineItems, type);
        const rows: StatementRow[] = flat.map((item) => ({
          lineItemId: item.id,
          code: item.code,
          name: item.name,
          depth: item.depth,
          orderCode: item.orderCode,
          isCalculated: item.isCalculated,
          formula: item.formula,
          values: periodRows.map((p) => {
            const v = valueByKey.get(`${p.id}:${item.id}`);
            return v === undefined ? null : v;
          })
        }));
        statements[type] = { rows };
      }

      return { periods: headers, statements };
    };

    const snapshot: StatementsSnapshot = {
      isin: company.isin,
      statementsVersion: company.statementsVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      currency: 'INR',
      yearly: buildGroup(yearlyPeriods),
      quarterly: buildGroup(quarterlyPeriods)
    };

    this.statementsCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  async pricesByIsin(isin: string): Promise<PriceSnapshot> {
    const cached = this.priceCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const rows = await this.prisma.companyPriceHistory.findMany({
      where: { companyId: company.id },
      orderBy: { datetime: 'asc' }
    });

    const prices: [number, number][] = [];
    const events: PriceSnapshot['events'] = [];
    for (const row of rows) {
      const t = row.datetime.getTime();
      const p = Number(row.price.toString());
      prices.push([t, p]);
      // Any row with a category OR any legacy text annotation counts as an
      // event. A category-only row with no note/link is valid (e.g.
      // "dividend declared, no commentary") — the chart still needs to
      // render a coloured marker for it.
      if (row.note || row.link || row.category) {
        events.push({
          datetime: row.datetime.toISOString(),
          price: p,
          note: row.note ?? null,
          link: row.link ?? null,
          category: row.category ?? null
        });
      }
    }

    const snapshot: PriceSnapshot = {
      isin: company.isin,
      priceVersion: company.priceVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      prices,
      events
    };

    this.priceCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  async newsByIsin(isin: string): Promise<NewsSnapshot> {
    const cached = this.newsCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const rows = await this.prisma.newsEvent.findMany({
      where: { companyId: company.id },
      orderBy: { occurredAt: 'desc' }
    });

    const snapshot: NewsSnapshot = {
      isin: company.isin,
      newsVersion: company.newsVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      events: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt.toISOString(),
        category: r.category,
        title: r.title,
        body: r.body,
        sourceUrl: r.sourceUrl
      }))
    };

    this.newsCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  async editorialByIsin(isin: string): Promise<EditorialSnapshot> {
    const cached = this.editorialCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const [overview, prosCons] = await Promise.all([
      this.prisma.companyOverview.findUnique({ where: { companyId: company.id } }),
      this.prisma.prosCons.findUnique({ where: { companyId: company.id } })
    ]);

    const snapshot: EditorialSnapshot = {
      isin: company.isin,
      editorialVersion: company.editorialVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      overview: overview
        ? {
            summary: overview.summary,
            businessModel: overview.businessModel,
            competitiveMoat: overview.competitiveMoat,
            risks: overview.risks
          }
        : null,
      prosCons: prosCons
        ? { pros: prosCons.pros, cons: prosCons.cons }
        : null
    };

    this.editorialCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  /** Drop cache entries for an ISIN so the next read rebuilds fresh. */
  invalidate(isin: string) {
    this.statementsCache.delete(isin);
    this.priceCache.delete(isin);
    this.newsCache.delete(isin);
    this.editorialCache.delete(isin);
  }
}
