import { Injectable, NotFoundException } from '@nestjs/common';
import { ScaleUnit } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ResolvedValueIn,
  displayLabel,
  fromCanonical,
  isPerShare,
  isUnitless,
  pickDisplayScale,
  resolveValueIn,
  toCanonical,
} from '../../common/value-in/value-in';

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

const STATEMENT_TYPES = ['balance_sheet', 'pnl', 'cashflow', 'change_in_equity', 'ratios_valuations', 'auxiliary_data'] as const;

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

type DisplayHint = {
  currency: string;      // canonical/base currency (always 'INR' for now)
  scale: ScaleUnit;      // auto-picked for storefront display
  label: string;         // e.g. "All values in ₹ Crores"
};

type StatementBlock = {
  rows: StatementRow[];
  displayHint: DisplayHint;
};

type ValueInWarning = {
  periodId: string;
  statementType: StatementKey;
  reason: 'missing_value_in' | 'missing_fx_rate';
  resolved: { currency: string; scale: ScaleUnit; source: string };
};

type StatementsGroup = {
  periods: PeriodHeader[];
  statements: Record<StatementKey, StatementBlock>;
};

export type StatementsSnapshot = {
  isin: string;
  statementsVersion: number;
  contentUpdatedAt: string;
  /** Canonical base currency — always INR in the current deployment. */
  currency: string;
  /**
   * Per-period resolved ValueIn (what the admin set or inherited). Indexed
   * by `${periodId}:${statementType}`. Useful for admin display.
   */
  valueIn: Record<string, { currency: string; scale: ScaleUnit; source: string; missing: boolean }>;
  valueInWarnings: ValueInWarning[];
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
  profile_version: number;
  content_updated_at: string;
};

// ── Profile (company details + valuations) ─────────────────────
export type CompanyDetailsSnapshot = {
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  crunchbaseUrl: string | null;
  founded: string | null;
  incorporationCountry: string | null;
  legalEntityType: string | null;
  registeredOffice: string | null;
  headquarters: string | null;
  auditor: string | null;
  panNumber: string | null;
  rta: string | null;
  depository: string | null;
  employeeCount: number | null;
  subsidiariesCount: number | null;
  fiscalYearEnd: string | null;
  shareType: string | null;
  faceValue: string | null;
  totalShares: string | null;
  lotSize: number | null;
  availabilityPercent: string | null;
  fiftyTwoWeekHigh: string | null;
  fiftyTwoWeekLow: string | null;
  lastRoundType: string | null;
  lastRoundDate: string | null;
  lastRoundRaised: string | null;
  lastRoundLead: string | null;
  lastRoundValuation: string | null;
};

/**
 * Discriminated-union entry. The `payload` shape varies by method. Pure
 * JSON for wire/storage; the admin and storefront share a typed union in
 * TypeScript (types/domain.ts mirror).
 */
export type ValuationModelEntry = {
  id: string;
  methodType: string;
  label: string;
  weight: number;
  impliedValueLow: number | null;
  impliedValueBase: number | null;
  impliedValueHigh: number | null;
  notes: string | null;
  payload: Record<string, unknown>;
};

export type ValuationsSnapshot = {
  baseCurrency: string;
  asOfDate: string | null;
  summary: string | null;
  models: ValuationModelEntry[];
};

export type ProfileSnapshot = {
  isin: string;
  profileVersion: number;
  contentUpdatedAt: string;
  details: CompanyDetailsSnapshot | null;
  valuations: ValuationsSnapshot | null;
};

export type NewsEventItem = {
  id: string;
  occurredAt: string;
  category: 'C' | 'N' | 'R' | string;
  sentiment: 'G' | 'R' | 'B' | null;
  impactScore: number | null;
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
    financialInsights: string | null;
    industryAnalysis: string | null;
    sectorAnalysis: string | null;
    activityAnalysis: string | null;
  } | null;
  prosCons: {
    pros: string;
    cons: string;
  } | null;
  faq: {
    items: Array<{ question: string; answer: string }>;
  } | null;
  team: {
    members: Array<{
      name: string;
      role: string;
      since: string | null;
      bio: string | null;
      linkedinUrl: string | null;
      photoUrl: string | null;
    }>;
  } | null;
  shareholders: {
    entries: Array<{
      name: string;
      type: string;
      stakePercent: string | null;
      since: string | null;
      note: string | null;
    }>;
  } | null;
  competitors: {
    entries: Array<{
      name: string;
      isin: string | null;
      link: string | null;
      theirEdge: string | null;
      ourEdge: string | null;
      note: string | null;
    }>;
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
  private profileCache = new Map<string, CacheEntry<ProfileSnapshot>>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cached read of the site-wide defaults (currency + display scale).
   * Kept in SnapshotsService (not SiteSettingsService) to avoid a
   * circular module dependency — snapshot builds are on the hot path and
   * can't import the settings service back. Cache TTL mirrors the other
   * snapshot caches.
   */
  private siteDefaults: { expiresAt: number; payload: { currency: string; scale: ScaleUnit | 'auto' } } | null = null;
  private async getSiteDefaults(): Promise<{ currency: string; scale: ScaleUnit | 'auto' }> {
    if (this.siteDefaults && this.siteDefaults.expiresAt > Date.now()) {
      return this.siteDefaults.payload;
    }
    try {
      const rows = await this.prisma.siteSetting.findMany({
        where: { key: { in: ['default_currency', 'default_scale'] } }
      });
      const map = new Map(rows.map((r) => [r.key, r.value]));
      const currency = (map.get('default_currency') || 'INR').toUpperCase();
      const rawScale = map.get('default_scale') || 'auto';
      const allowed: ScaleUnit[] = ['units', 'thousands', 'lakhs', 'crores', 'millions', 'billions'];
      const scale = (allowed as string[]).includes(rawScale)
        ? (rawScale as ScaleUnit)
        : ('auto' as const);
      const payload = { currency, scale };
      this.siteDefaults = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
      return payload;
    } catch {
      return { currency: 'INR', scale: 'auto' };
    }
  }

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
        profileVersion: true,
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
      profile_version: company.profileVersion,
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
        profileVersion: true,
        contentUpdatedAt: true
      }
    });
    return rows.map((r) => ({
      isin: r.isin,
      statements_version: r.statementsVersion,
      price_version: r.priceVersion,
      news_version: r.newsVersion,
      editorial_version: r.editorialVersion,
      profile_version: r.profileVersion,
      content_updated_at: r.contentUpdatedAt.toISOString()
    }));
  }

  async statementsByIsin(isin: string): Promise<StatementsSnapshot> {
    const cached = this.statementsCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const siteDefaults = await this.getSiteDefaults();

    const [periods, lineItems, values, statementValueIns, fxRates] = await Promise.all([
      this.prisma.financialPeriod.findMany({
        where: { companyId: company.id },
        orderBy: [{ fiscalYear: 'asc' }, { fiscalQuarter: 'asc' }]
      }),
      this.prisma.financialLineItem.findMany({}),
      this.prisma.financialMetric.findMany({
        where: { companyId: company.id },
        select: { periodId: true, lineItemId: true, value: true }
      }),
      this.prisma.periodStatementValueIn.findMany({
        where: { period: { companyId: company.id } }
      }),
      this.prisma.currencyRate.findMany({ orderBy: { asOf: 'desc' } })
    ]);

    // FX: pick most-recent row per (from→INR) with asOf <= periodEnd.
    const fxLookup = (fromCcy: string, asOf: Date): { rate: number; missing: boolean } => {
      if (fromCcy === company.defaultCurrency && fromCcy === 'INR') return { rate: 1, missing: false };
      const row = fxRates.find(
        (r) => r.fromCcy === fromCcy && r.toCcy === 'INR' && r.asOf.getTime() <= asOf.getTime()
      );
      if (!row) return { rate: 1, missing: true };
      return { rate: Number(row.rate), missing: false };
    };

    const viByKey = new Map<string, ResolvedValueIn>();
    for (const p of periods) {
      for (const type of STATEMENT_TYPES) {
        const perStatement = statementValueIns.find((r) => r.periodId === p.id && r.statementType === type);
        const vi = resolveValueIn(
          perStatement ? { currency: perStatement.currency, scale: perStatement.scale } : null,
          { currency: p.currency, scale: p.scale },
          { defaultCurrency: company.defaultCurrency, defaultScale: company.defaultScale }
        );
        viByKey.set(`${p.id}:${type}`, vi);
      }
    }
    const warnings: ValueInWarning[] = [];

    // Split periods into yearly (null quarter) vs quarterly (quarter 1..4)
    const yearlyPeriods = periods.filter((p) => p.fiscalQuarter === null).sort((a, b) => this.comparePeriods(a, b));
    const quarterlyPeriods = periods
      .filter((p) => p.fiscalQuarter !== null)
      .sort((a, b) => this.comparePeriods(a, b));

    // Build code lookup for per-line-item classification.
    const codeById = new Map<string, string>();
    const statementTypeById = new Map<string, StatementKey>();
    for (const li of lineItems) {
      codeById.set(li.id, li.code);
      statementTypeById.set(li.id, li.statementType as StatementKey);
    }

    // Index canonical values by "periodId:lineItemId".
    const canonicalByKey = new Map<string, number>();
    const periodById = new Map(periods.map((p) => [p.id, p]));
    for (const v of values) {
      const code = codeById.get(v.lineItemId) ?? '';
      const stType = statementTypeById.get(v.lineItemId);
      if (!stType) continue;
      const vi = viByKey.get(`${v.periodId}:${stType}`);
      if (!vi) continue;
      if (vi.missing) {
        warnings.push({ periodId: v.periodId, statementType: stType, reason: 'missing_value_in', resolved: vi });
      }
      const p = periodById.get(v.periodId);
      const fx = fxLookup(vi.currency, p ? p.periodEnd : new Date());
      if (fx.missing) {
        warnings.push({ periodId: v.periodId, statementType: stType, reason: 'missing_fx_rate', resolved: vi });
      }
      const canonical = toCanonical(Number(v.value), vi, fx.rate, code);
      canonicalByKey.set(`${v.periodId}:${v.lineItemId}`, canonical);
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

        // First pass: collect all canonical values in this statement (excluding
        // unitless / per-share rows) so we can pick the display scale.
        const forScalePick: number[] = [];
        for (const item of flat) {
          if (isUnitless(item.code) || isPerShare(item.code)) continue;
          for (const p of periodRows) {
            const v = canonicalByKey.get(`${p.id}:${item.id}`);
            if (typeof v === 'number' && Number.isFinite(v)) forScalePick.push(v);
          }
        }
        // Honour the site-wide scale override when set; otherwise pick the
        // largest "nice" scale per statement (legacy auto behaviour).
        const displayScale: ScaleUnit =
          siteDefaults.scale === 'auto'
            ? pickDisplayScale(forScalePick)
            : siteDefaults.scale;
        const displayCurrency = siteDefaults.currency || 'INR';
        const displayHint: DisplayHint = {
          currency: displayCurrency,
          scale: displayScale,
          label: displayLabel(displayCurrency, displayScale),
        };

        const rows: StatementRow[] = flat.map((item) => ({
          lineItemId: item.id,
          code: item.code,
          name: item.name,
          depth: item.depth,
          orderCode: item.orderCode,
          isCalculated: item.isCalculated,
          formula: item.formula,
          values: periodRows.map((p) => {
            const canonical = canonicalByKey.get(`${p.id}:${item.id}`);
            if (canonical === undefined) return null;
            return fromCanonical(canonical, displayScale, item.code);
          })
        }));
        statements[type] = { rows, displayHint };
      }

      return { periods: headers, statements };
    };

    const valueInByKey: StatementsSnapshot['valueIn'] = {};
    for (const [k, vi] of viByKey.entries()) {
      valueInByKey[k] = { currency: vi.currency, scale: vi.scale, source: vi.source, missing: vi.missing };
    }

    // Deduplicate warnings per (periodId, statementType, reason).
    const seenWarn = new Set<string>();
    const dedupedWarnings = warnings.filter((w) => {
      const k = `${w.periodId}:${w.statementType}:${w.reason}`;
      if (seenWarn.has(k)) return false;
      seenWarn.add(k);
      return true;
    });

    const snapshot: StatementsSnapshot = {
      isin: company.isin,
      statementsVersion: company.statementsVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      currency: 'INR',
      valueIn: valueInByKey,
      valueInWarnings: dedupedWarnings,
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
        sentiment: (r.sentiment ?? null) as 'G' | 'R' | 'B' | null,
        impactScore: r.impactScore ?? null,
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

    const [overview, prosCons, faq, team, shareholders, competitors] = await Promise.all([
      this.prisma.companyOverview.findUnique({ where: { companyId: company.id } }),
      this.prisma.prosCons.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyFaq.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyTeam.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyShareholders.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyCompetitors.findUnique({ where: { companyId: company.id } })
    ]);

    const normalizeFaqItems = (raw: unknown): Array<{ question: string; answer: string }> => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          question: typeof r.question === 'string' ? r.question : '',
          answer: typeof r.answer === 'string' ? r.answer : ''
        }))
        .filter((r) => r.question.trim() && r.answer.trim());
    };

    const faqItems = faq ? normalizeFaqItems(faq.items) : [];

    type TeamMember = EditorialSnapshot['team'] extends { members: (infer M)[] } | null
      ? M
      : never;
    const normalizeTeamMembers = (raw: unknown): TeamMember[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          name: typeof r.name === 'string' ? r.name : '',
          role: typeof r.role === 'string' ? r.role : '',
          since: typeof r.since === 'string' ? r.since : null,
          bio: typeof r.bio === 'string' ? r.bio : null,
          linkedinUrl: typeof r.linkedinUrl === 'string' ? r.linkedinUrl : null,
          photoUrl: typeof r.photoUrl === 'string' ? r.photoUrl : null
        }))
        .filter((r) => r.name.trim() && r.role.trim());
    };
    const teamMembers = team ? normalizeTeamMembers(team.members) : [];

    type Shareholder = EditorialSnapshot['shareholders'] extends { entries: (infer S)[] } | null
      ? S
      : never;
    const normalizeShareholderEntries = (raw: unknown): Shareholder[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          name: typeof r.name === 'string' ? r.name : '',
          type: typeof r.type === 'string' ? r.type : '',
          stakePercent: typeof r.stakePercent === 'string' ? r.stakePercent : null,
          since: typeof r.since === 'string' ? r.since : null,
          note: typeof r.note === 'string' ? r.note : null
        }))
        .filter((r) => r.name.trim() && r.type.trim());
    };
    const shareholderEntries = shareholders
      ? normalizeShareholderEntries(shareholders.entries)
      : [];

    type Competitor = EditorialSnapshot['competitors'] extends { entries: (infer C)[] } | null
      ? C
      : never;
    const normalizeCompetitorEntries = (raw: unknown): Competitor[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          name: typeof r.name === 'string' ? r.name : '',
          isin: typeof r.isin === 'string' ? r.isin : null,
          link: typeof r.link === 'string' ? r.link : null,
          theirEdge: typeof r.theirEdge === 'string' ? r.theirEdge : null,
          ourEdge: typeof r.ourEdge === 'string' ? r.ourEdge : null,
          note: typeof r.note === 'string' ? r.note : null
        }))
        .filter((r) => r.name.trim());
    };
    const competitorEntries = competitors
      ? normalizeCompetitorEntries(competitors.entries)
      : [];

    const snapshot: EditorialSnapshot = {
      isin: company.isin,
      editorialVersion: company.editorialVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      overview: overview
        ? {
            summary: overview.summary,
            businessModel: overview.businessModel,
            competitiveMoat: overview.competitiveMoat,
            risks: overview.risks,
            financialInsights: overview.financialInsights,
            industryAnalysis: overview.industryAnalysis,
            sectorAnalysis: overview.sectorAnalysis,
            activityAnalysis: overview.activityAnalysis
          }
        : null,
      prosCons: prosCons
        ? { pros: prosCons.pros, cons: prosCons.cons }
        : null,
      faq: faqItems.length ? { items: faqItems } : null,
      team: teamMembers.length ? { members: teamMembers } : null,
      shareholders: shareholderEntries.length ? { entries: shareholderEntries } : null,
      competitors: competitorEntries.length ? { entries: competitorEntries } : null
    };

    this.editorialCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  async profileByIsin(isin: string): Promise<ProfileSnapshot> {
    const cached = this.profileCache.get(isin);
    if (cached && cached.expiresAt > Date.now()) return cached.payload;

    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) throw new NotFoundException('Company not found');

    const [details, valuations] = await Promise.all([
      this.prisma.companyDetails.findUnique({ where: { companyId: company.id } }),
      this.prisma.companyValuations.findUnique({ where: { companyId: company.id } })
    ]);

    const decStr = (v: unknown): string | null =>
      v == null ? null : (v as { toString(): string }).toString();

    const normalizeValuationModels = (raw: unknown): ValuationModelEntry[] => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          id: typeof r.id === 'string' ? r.id : `${Math.random().toString(36).slice(2)}`,
          methodType: typeof r.methodType === 'string' ? r.methodType : 'unknown',
          label: typeof r.label === 'string' ? r.label : '',
          weight: typeof r.weight === 'number' ? r.weight : 1,
          impliedValueLow: typeof r.impliedValueLow === 'number' ? r.impliedValueLow : null,
          impliedValueBase: typeof r.impliedValueBase === 'number' ? r.impliedValueBase : null,
          impliedValueHigh: typeof r.impliedValueHigh === 'number' ? r.impliedValueHigh : null,
          notes: typeof r.notes === 'string' ? r.notes : null,
          payload:
            typeof r.payload === 'object' && r.payload !== null
              ? (r.payload as Record<string, unknown>)
              : {}
        }));
    };

    const snapshot: ProfileSnapshot = {
      isin: company.isin,
      profileVersion: company.profileVersion,
      contentUpdatedAt: company.contentUpdatedAt.toISOString(),
      details: details
        ? {
            logoUrl: details.logoUrl,
            website: details.website,
            linkedinUrl: details.linkedinUrl,
            twitterUrl: details.twitterUrl,
            crunchbaseUrl: details.crunchbaseUrl,
            founded: details.founded,
            incorporationCountry: details.incorporationCountry,
            legalEntityType: details.legalEntityType,
            registeredOffice: details.registeredOffice,
            headquarters: details.headquarters,
            auditor: details.auditor,
            panNumber: details.panNumber,
            rta: details.rta,
            depository: details.depository,
            employeeCount: details.employeeCount,
            subsidiariesCount: details.subsidiariesCount,
            fiscalYearEnd: details.fiscalYearEnd,
            shareType: details.shareType,
            faceValue: decStr(details.faceValue),
            totalShares: details.totalShares,
            lotSize: details.lotSize,
            availabilityPercent: decStr(details.availabilityPercent),
            fiftyTwoWeekHigh: decStr(details.fiftyTwoWeekHigh),
            fiftyTwoWeekLow: decStr(details.fiftyTwoWeekLow),
            lastRoundType: details.lastRoundType,
            lastRoundDate: details.lastRoundDate,
            lastRoundRaised: details.lastRoundRaised,
            lastRoundLead: details.lastRoundLead,
            lastRoundValuation: details.lastRoundValuation
          }
        : null,
      valuations: valuations
        ? {
            baseCurrency: valuations.baseCurrency,
            asOfDate: valuations.asOfDate ? valuations.asOfDate.toISOString() : null,
            summary: valuations.summary,
            models: normalizeValuationModels(valuations.models)
          }
        : null
    };

    this.profileCache.set(isin, { expiresAt: Date.now() + CACHE_TTL_MS, payload: snapshot });
    return snapshot;
  }

  /** Drop cache entries for an ISIN so the next read rebuilds fresh. */
  invalidate(isin: string) {
    this.statementsCache.delete(isin);
    this.priceCache.delete(isin);
    this.newsCache.delete(isin);
    this.editorialCache.delete(isin);
    this.profileCache.delete(isin);
  }

  /** Drop every cached snapshot. Used when a site-wide setting changes
   *  (e.g. default display scale / currency) so the next read of any
   *  company rebuilds with the new configuration. */
  invalidateAll() {
    this.statementsCache.clear();
    this.priceCache.clear();
    this.newsCache.clear();
    this.editorialCache.clear();
    this.profileCache.clear();
  }
}
