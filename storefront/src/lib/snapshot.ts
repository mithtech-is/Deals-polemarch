/**
 * Storefront snapshot client. Pulls columnar statements + price snapshots
 * from Medusa once per tab session and caches them in sessionStorage.
 *
 * The render path is entirely cache-driven — zero network calls once the
 * bundle has been fetched. A background freshness check runs when the user
 * returns to the tab after 60s+.
 */

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

// ── Shared types ─────────────────────────────────────────────

export type SnapshotKind = "prices" | "statements" | "news" | "editorial" | "both";

export type PeriodHeader = {
  id: string;
  label: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  start: string;
  end: string;
  isAudited: boolean;
};

export type StatementRow = {
  lineItemId: string;
  code: string;
  name: string;
  depth: number;
  orderCode: string;
  isCalculated: boolean;
  formula: string | null;
  values: (number | null)[];
};

export type StatementBlock = { rows: StatementRow[] };

export type StatementKey = "balance_sheet" | "pnl" | "cashflow" | "derived";

export type StatementsGroup = {
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

/**
 * Price event tag:
 *   C = Corporate event (earnings, dividend, split, M&A, fundraising)
 *   N = News (media coverage, industry updates, rumors)
 *   R = Regulatory (SEBI notices, compliance, penalties)
 */
export type PriceEventCategory = "C" | "N" | "R";

export type PriceEvent = {
  datetime: string;
  price: number;
  note: string | null;
  link: string | null;
  category: PriceEventCategory | null;
};

export type PriceSnapshot = {
  isin: string;
  priceVersion: number;
  contentUpdatedAt: string;
  prices: [number, number][];
  events: PriceEvent[];
};

/** Editorial news event. Phase 3. */
export type NewsEventItem = {
  id: string;
  occurredAt: string;
  category: PriceEventCategory;
  title: string;
  body: string; // markdown
  sourceUrl: string | null;
};

export type NewsSnapshot = {
  isin: string;
  newsVersion: number;
  contentUpdatedAt: string;
  events: NewsEventItem[];
};

/** Phase 4/5 bundled editorial content. */
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
  faq: {
    items: Array<{ question: string; answer: string }>;
  } | null;
};

/** What /store/calcula/isin/:isin/snapshot returns. */
export type BundleResponse = {
  isin: string;
  company_name: string;
  statements_version: number;
  price_version: number;
  news_version: number;
  editorial_version: number;
  content_updated_at: string;
  statements: StatementsSnapshot | null;
  prices: PriceSnapshot | null;
  news: NewsSnapshot | null;
  editorial: EditorialSnapshot | null;
};

// ── Cache ────────────────────────────────────────────────────

/**
 * TTL is 0: every call issues a conditional GET with the cached ETag.
 * The server replies 304 (no body) if nothing changed and 200 with the new
 * snapshot if it did. The in-memory / sessionStorage entries exist only to
 * hold the last-known body so we can reuse it on 304.
 *
 * Previously this was 60s which meant a tab that had loaded the deal page
 * seconds before an admin edit would keep showing the old price chart for
 * up to a minute without even hitting the network — perceived as "updates
 * aren't syncing" by end users.
 */
const CACHE_TTL_MS = 0;

type CacheEntry = {
  fetchedAt: number;
  payload: BundleResponse;
  /**
   * ETag returned by the server, used for If-None-Match on the next fetch.
   * Format: `"<statements_version>:<price_version>"`.
   */
  etag?: string;
};

/**
 * Cache is keyed by (isin, kind) so PriceChart's `kind=prices` doesn't
 * pollute or get polluted by FinancialStatements' `kind=statements`.
 */
const memoryCache = new Map<string, CacheEntry>();

function cacheKey(isin: string, kind: SnapshotKind) {
  return `${isin}::${kind}`;
}

function sessionKey(isin: string, kind: SnapshotKind) {
  return `calcula:snapshot:${isin}:${kind}`;
}

function readSession(isin: string, kind: SnapshotKind): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(isin, kind));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeSession(isin: string, kind: SnapshotKind, entry: CacheEntry) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sessionKey(isin, kind), JSON.stringify(entry));
  } catch {
    /* quota exceeded, ignore */
  }
}

async function fetchBundle(
  isin: string,
  kind: SnapshotKind,
  etag?: string
): Promise<{ payload: BundleResponse; etag?: string; notModified: boolean }> {
  const url = `${MEDUSA_URL}/store/calcula/isin/${encodeURIComponent(isin)}/snapshot?kind=${kind}`;
  const headers: Record<string, string> = {
    "x-publishable-api-key": PUBLISHABLE_KEY,
  };
  if (etag) headers["if-none-match"] = etag;

  const res = await fetch(url, { headers, cache: "default" });
  if (res.status === 304) {
    return { payload: undefined as any, etag, notModified: true };
  }
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Snapshot not cached yet on Medusa");
    }
    throw new Error(`Snapshot fetch failed: ${res.status}`);
  }
  const payload = (await res.json()) as BundleResponse;
  const newEtag = res.headers.get("etag") || undefined;
  return { payload, etag: newEtag, notModified: false };
}

/**
 * Get the snapshot bundle for this (isin, kind). Returns from cache if fresh;
 * otherwise does a conditional GET with the cached ETag. On 304 we extend the
 * cache entry without re-parsing the body.
 */
export async function getSnapshot(
  isin: string,
  kind: SnapshotKind = "both"
): Promise<BundleResponse> {
  if (!isin) throw new Error("ISIN is required");

  const key = cacheKey(isin, kind);

  // Memory cache (fastest)
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) {
    return mem.payload;
  }

  // Session cache (per tab)
  const ss = readSession(isin, kind);
  if (ss && Date.now() - ss.fetchedAt < CACHE_TTL_MS) {
    memoryCache.set(key, ss);
    return ss.payload;
  }

  // Network — use prior ETag (from expired cache) for conditional GET
  const priorEtag = mem?.etag || ss?.etag;
  const result = await fetchBundle(isin, kind, priorEtag);

  if (result.notModified) {
    // Server says our cached payload is still current. Reuse the parsed
    // body from whichever tier had it, just bump fetchedAt.
    const prior = mem || ss;
    if (prior) {
      const refreshed: CacheEntry = {
        fetchedAt: Date.now(),
        payload: prior.payload,
        etag: prior.etag,
      };
      memoryCache.set(key, refreshed);
      writeSession(isin, kind, refreshed);
      return prior.payload;
    }
    // No prior cache but got 304 — shouldn't happen, fall through to fetch
    const reread = await fetchBundle(isin, kind);
    const entry: CacheEntry = {
      fetchedAt: Date.now(),
      payload: reread.payload,
      etag: reread.etag,
    };
    memoryCache.set(key, entry);
    writeSession(isin, kind, entry);
    return reread.payload;
  }

  const entry: CacheEntry = {
    fetchedAt: Date.now(),
    payload: result.payload,
    etag: result.etag,
  };
  memoryCache.set(key, entry);
  writeSession(isin, kind, entry);
  return result.payload;
}

/**
 * Drop cached entries for this ISIN after a write so the next render pulls
 * a fresh bundle. Clears all kinds.
 */
export function invalidateSnapshot(isin: string) {
  const kinds: SnapshotKind[] = ["prices", "statements", "news", "editorial", "both"];
  for (const k of kinds) {
    memoryCache.delete(cacheKey(isin, k));
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(sessionKey(isin, k));
      } catch {
        /* ignore */
      }
    }
  }
}
