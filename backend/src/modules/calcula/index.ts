import { Module, MedusaService } from "@medusajs/framework/utils"
import { CompanyRecord } from "./models/company-record"

type VersionEnvelope = {
  isin: string
  company_id?: string
  company_name?: string
  statements_version: number
  price_version: number
  news_version?: number
  editorial_version?: number
  profile_version?: number
  content_updated_at: string
}

type StaticFields = {
  sector?: string
  industry?: string
  cin?: string
  description?: string
  listing_status?: string
  market_cap?: string
  share_type?: string
  lot_size?: string
  face_value?: string
  depository?: string
  pan_number?: string
  rta?: string
  total_shares?: string
  fifty_two_week_high?: string
  fifty_two_week_low?: string
  founded?: string
  headquarters?: string
  valuation?: string
  pe_ratio?: string
  pb_ratio?: string
  roe_value?: string
  debt_to_equity?: string
  book_value?: string
  company_name?: string
}

const CALCULA_URL = process.env.CALCULA_API_URL || "http://localhost:4100"
const CALCULA_SECRET = process.env.CALCULA_WEBHOOK_SECRET || ""

/**
 * In-process throttle for `last_accessed_at` writes. Each ISIN is updated at
 * most once per window. Lives at module scope so it survives across requests
 * within a Node process.
 */
const LAST_ACCESS_THROTTLE_MS = 60 * 60 * 1000 // 1 hour
const lastAccessWrites = new Map<string, number>()

/**
 * Value-based loop-breaker for Calcula ↔ Medusa price propagation.
 *
 * When handleVersionEnvelope pulls a new price snapshot from Calcula and
 * `syncLatestPriceToMedusaVariant` updates (or matches) the variant, the
 * subsequent `product.updated` / `product-variant.updated` events would
 * cause our own subscribers to push the same price BACK to Calcula, loop
 * forever.
 *
 * We remember the exact price we last received from Calcula per ISIN on
 * `globalThis.__calculaLastFromCalcula`. The subscribers compare the
 * outgoing push against this value:
 *   - Equal → loop echo, skip.
 *   - Different → a legitimate new edit, push.
 *
 * This is race-free (no time window) and never loses a legitimate update,
 * unlike the previous "do-not-push-for-5s" guard which blocked real edits
 * made within the window.
 */
export function isLoopEchoPush(isin: string, outgoingPrice: number): boolean {
  const map = (globalThis as any).__calculaLastFromCalcula as
    | Map<string, number>
    | undefined
  if (!map) return false
  const last = map.get(isin)
  if (typeof last !== "number") return false
  return Math.abs(last - outgoingPrice) < 1e-9
}
;(globalThis as any).__calculaIsLoopEchoPush = isLoopEchoPush

/**
 * Drops the store route's process-local LRU cache entry for this ISIN.
 * Looked up via globalThis to avoid a circular import between the module
 * and the route file. Safe no-op if the route module hasn't loaded yet.
 */
function invalidateRouteCacheForIsin(isin: string) {
  const fn = (globalThis as any).__calculaInvalidateRouteCache as
    | ((isin: string) => void)
    | undefined
  if (typeof fn === "function" && isin) fn(isin)
}

/**
 * Bounded-concurrency parallel map. Used by syncDrift to run
 * handleVersionEnvelope on multiple envelopes at once without slamming
 * Calcula with hundreds of simultaneous requests.
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (t: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  const n = Math.min(limit, items.length)
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++
      try {
        out[idx] = await fn(items[idx], idx)
      } catch (err) {
        // Caller decides whether to rethrow; we just record the rejection
        out[idx] = err as any
      }
    }
  })
  await Promise.all(workers)
  return out
}

async function callCalcula(path: string, init?: RequestInit) {
  const res = await fetch(`${CALCULA_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": CALCULA_SECRET,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    throw new Error(`Calcula ${path} -> HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Extract the most recent price point from a price_snapshot JSON blob.
 * Exported so the webhook route can run it against the raw snapshot it
 * just cached. Pure function — no container access.
 */
export function extractLatestPriceFromSnapshot(snap: any): number | null {
  const arr = snap?.prices
  if (!Array.isArray(arr) || arr.length === 0) return null
  // prices is sorted ascending by time (see Calcula's snapshots.service.ts),
  // so the last tuple is the latest.
  const last = arr[arr.length - 1]
  if (!Array.isArray(last) || last.length < 2) return null
  const p = Number(last[1])
  return Number.isFinite(p) ? p : null
}

class CalculaModuleService extends MedusaService({
  CompanyRecord,
}) {
  constructor(container) {
    super(container)
  }

  // ── Version envelope sync (called from /webhooks/calcula) ────

  /**
   * Accepts the version envelope that Calcula pushes after any write. If the
   * envelope's versions are newer than what we have locally, we pull the
   * stale snapshot(s) from Calcula and overwrite.
   */
  async handleVersionEnvelope(payload: VersionEnvelope) {
    if (!payload.isin) {
      console.warn("[calcula.handleVersionEnvelope] skipped — payload has no isin:", payload)
      return { skipped: true }
    }

    // Defensive validation: if the upstream returned camelCase (the bug we
    // just fixed in snapshots.service.ts), these would be undefined and
    // `undefined > anything` is always false, which silently no-ops the
    // whole refresh. Fail loudly instead.
    if (
      typeof payload.statements_version !== "number" ||
      typeof payload.price_version !== "number"
    ) {
      console.error(
        `[calcula.handleVersionEnvelope] MALFORMED ENVELOPE for ${payload.isin} — ` +
          `expected snake_case numeric versions, got:`,
        payload
      )
      return { skipped: true, reason: "malformed envelope" }
    }

    const existing = await this.listCompanyRecords({ isin: payload.isin })
    const row = existing[0]
    const localStatementsVersion = row ? parseInt(row.statements_version || "0", 10) : -1
    const localPriceVersion = row ? parseInt(row.price_version || "0", 10) : -1
    const localNewsVersion = row ? parseInt((row as any).news_version || "0", 10) : -1
    const localEditorialVersion = row
      ? parseInt((row as any).editorial_version || "0", 10)
      : -1
    const localProfileVersion = row
      ? parseInt((row as any).profile_version || "0", 10)
      : -1

    const needStatements = payload.statements_version > localStatementsVersion
    const needPrices = payload.price_version > localPriceVersion
    // news_version / editorial_version / profile_version are optional on the
    // envelope for back-compat with older Calcula deployments.
    const needNews =
      typeof payload.news_version === "number" &&
      payload.news_version > localNewsVersion
    const needEditorial =
      typeof payload.editorial_version === "number" &&
      payload.editorial_version > localEditorialVersion
    const needProfile =
      typeof payload.profile_version === "number" &&
      payload.profile_version > localProfileVersion

    console.log(
      `[calcula.handleVersionEnvelope] ${payload.isin} ` +
        `local(s=${localStatementsVersion},p=${localPriceVersion},n=${localNewsVersion},e=${localEditorialVersion},pr=${localProfileVersion}) ` +
        `remote(s=${payload.statements_version},p=${payload.price_version},` +
        `n=${payload.news_version ?? "-"},e=${payload.editorial_version ?? "-"},pr=${payload.profile_version ?? "-"}) ` +
        `→ needStatements=${needStatements} needPrices=${needPrices} ` +
        `needNews=${needNews} needEditorial=${needEditorial} needProfile=${needProfile}`
    )

    if (!needStatements && !needPrices && !needNews && !needEditorial && !needProfile && row) {
      // Nothing to do other than touching metadata
      return { updated: false }
    }

    const updates: any = {
      isin: payload.isin,
      company_id: payload.company_id ?? row?.company_id ?? "",
      company_name: payload.company_name ?? row?.company_name ?? payload.isin,
      statements_version: String(payload.statements_version),
      price_version: String(payload.price_version),
      content_updated_at: payload.content_updated_at,
    }
    if (typeof payload.news_version === "number") {
      updates.news_version = String(payload.news_version)
    }
    if (typeof payload.editorial_version === "number") {
      updates.editorial_version = String(payload.editorial_version)
    }
    if (typeof payload.profile_version === "number") {
      updates.profile_version = String(payload.profile_version)
    }

    let priceSnapshotJson: any = null
    if (needStatements) {
      const snap = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(payload.isin)}/snapshot/statements`
      )
      updates.statements_snapshot = JSON.stringify(snap)
    }
    if (needPrices) {
      priceSnapshotJson = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(payload.isin)}/snapshot/prices`
      )
      updates.price_snapshot = JSON.stringify(priceSnapshotJson)
    }
    if (needNews) {
      const snap = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(payload.isin)}/snapshot/news`
      )
      updates.news_snapshot = JSON.stringify(snap)
    }
    if (needEditorial) {
      const snap = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(payload.isin)}/snapshot/editorial`
      )
      updates.editorial_snapshot = JSON.stringify(snap)
    }
    if (needProfile) {
      const snap = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(payload.isin)}/snapshot/profile`
      )
      updates.profile_snapshot = JSON.stringify(snap)
    }

    if (row) {
      await this.updateCompanyRecords({ id: row.id, ...updates })
    } else {
      await this.createCompanyRecords(this.buildCreatePayload(payload.isin, updates))
    }
    invalidateRouteCacheForIsin(payload.isin)

    // Compute the latest price from the snapshot we just cached and return
    // it so the caller (webhook route) can propagate it to the Medusa
    // product variant. The variant update cannot happen inside a module
    // service — Medusa v2 module containers don't have the Query Graph or
    // core workflows, so `updateProductVariantsWorkflow(this.container)`
    // silently fails. The route handler has `req.scope` which does.
    const latestPrice =
      needPrices && priceSnapshotJson ? extractLatestPriceFromSnapshot(priceSnapshotJson) : null

    return {
      updated: true,
      statements: needStatements,
      prices: needPrices,
      news: needNews,
      editorial: needEditorial,
      latestPrice,
      isin: payload.isin,
    }
  }

  /**
   * Unconditionally refetch BOTH snapshots for an ISIN, bypassing the
   * version comparison in handleVersionEnvelope. Used by the admin
   * "force refresh" button and by ops when a stale snapshot got stored
   * under the correct version number (e.g. the snapshot-cache race we
   * fixed where Calcula served a cached pre-edit blob to the pull).
   *
   * Version comparison is INTENTIONALLY skipped here — if you only want
   * to refresh when something changed, call handleVersionEnvelope instead.
   */
  async forceRefresh(isin: string) {
    const versions = (await callCalcula(
      `/api/companies/by-isin/${encodeURIComponent(isin)}/versions`
    )) as VersionEnvelope

    if (
      typeof versions?.statements_version !== "number" ||
      typeof versions?.price_version !== "number"
    ) {
      console.error(
        `[calcula.forceRefresh] ${isin} got malformed versions envelope:`,
        versions
      )
      return { ok: false, error: "malformed versions envelope" }
    }

    // Pull all five snapshots in parallel. News / editorial / profile are
    // best-effort — older Calcula deployments without the endpoints will
    // 404 and we swallow that to keep forceRefresh usable during a rollout.
    const [statementsSnap, pricesSnap, newsSnap, editorialSnap, profileSnap] =
      await Promise.all([
        callCalcula(
          `/api/companies/by-isin/${encodeURIComponent(isin)}/snapshot/statements`
        ),
        callCalcula(
          `/api/companies/by-isin/${encodeURIComponent(isin)}/snapshot/prices`
        ),
        callCalcula(
          `/api/companies/by-isin/${encodeURIComponent(isin)}/snapshot/news`
        ).catch(() => null),
        callCalcula(
          `/api/companies/by-isin/${encodeURIComponent(isin)}/snapshot/editorial`
        ).catch(() => null),
        callCalcula(
          `/api/companies/by-isin/${encodeURIComponent(isin)}/snapshot/profile`
        ).catch(() => null),
      ])

    const existing = await this.listCompanyRecords({ isin })
    const row = existing[0]

    const updates: any = {
      isin,
      company_id: row?.company_id ?? "",
      company_name: row?.company_name ?? isin,
      statements_version: String(versions.statements_version),
      price_version: String(versions.price_version),
      content_updated_at: versions.content_updated_at,
      statements_snapshot: JSON.stringify(statementsSnap),
      price_snapshot: JSON.stringify(pricesSnap),
    }
    if (typeof versions.news_version === "number") {
      updates.news_version = String(versions.news_version)
    }
    if (typeof versions.editorial_version === "number") {
      updates.editorial_version = String(versions.editorial_version)
    }
    if (typeof versions.profile_version === "number") {
      updates.profile_version = String(versions.profile_version)
    }
    if (newsSnap) updates.news_snapshot = JSON.stringify(newsSnap)
    if (editorialSnap) updates.editorial_snapshot = JSON.stringify(editorialSnap)
    if (profileSnap) updates.profile_snapshot = JSON.stringify(profileSnap)

    if (row) {
      await this.updateCompanyRecords({ id: row.id, ...updates })
    } else {
      await this.createCompanyRecords(this.buildCreatePayload(isin, updates))
    }
    invalidateRouteCacheForIsin(isin)

    // Return the latest price so the route handler (with full container
    // access) can propagate it to the Medusa variant.
    const latestPrice = extractLatestPriceFromSnapshot(pricesSnap)

    console.log(
      `[calcula.forceRefresh] ${isin} refreshed — statements_version=${versions.statements_version} price_version=${versions.price_version} latestPrice=${latestPrice}`
    )
    return {
      ok: true,
      updated: true,
      statements_version: versions.statements_version,
      price_version: versions.price_version,
      latestPrice,
      isin,
    }
  }

  /**
   * Push a price update to Calcula. Used by:
   *   - Deals Manager save (when variant_price changed)
   *   - product.updated subscriber (when a price was edited from the
   *     standard Medusa product detail page)
   *
   * Datetime defaults to NOW. Originally this was rounded to start-of-day
   * UTC so multiple same-day edits overwrote the same Calcula row instead
   * of stacking. That was wrong: if Calcula already had intraday rows
   * (from the admin UI or an importer), the new start-of-day row was NOT
   * the latest by datetime, and `extractLatestPriceFromSnapshot` would
   * pick the older intraday row instead of the user's just-saved value.
   * The reverse-sync then clobbered the Medusa variant with the wrong
   * number and the user's save appeared to do nothing.
   *
   * Using `new Date()` guarantees our new row is strictly after any
   * existing row (barring clock skew), so it's always the tail of the
   * sorted snapshot and the reverse-sync picks the correct value.
   * Multiple edits in the same minute create multiple rows, which is
   * acceptable — dedup in the chart UI, not in this write path.
   */
  async pushPriceToCalcula(opts: {
    isin: string
    price: number
    datetime?: string
    note?: string
    link?: string
  }) {
    if (!opts.isin) return { skipped: true, reason: "no isin" }
    if (!Number.isFinite(opts.price)) return { skipped: true, reason: "invalid price" }

    const datetime = opts.datetime || new Date().toISOString()

    const url = `${CALCULA_URL}/api/companies/by-isin/${encodeURIComponent(opts.isin)}/price`
    console.log(
      `[calcula.pushPriceToCalcula] POST ${url} body=`,
      { datetime, price: opts.price, note: opts.note ?? null, link: opts.link ?? null },
      `secretPresent=${CALCULA_SECRET ? "yes" : "NO"}`
    )
    try {
      const result = await callCalcula(
        `/api/companies/by-isin/${encodeURIComponent(opts.isin)}/price`,
        {
          method: "POST",
          body: JSON.stringify({
            datetime,
            price: opts.price,
            note: opts.note ?? null,
            link: opts.link ?? null,
          }),
        }
      )
      console.log(
        `[calcula.pushPriceToCalcula] ${opts.isin} @ ${opts.price} OK:`,
        JSON.stringify(result)
      )
      return { ok: true, result }
    } catch (err: any) {
      console.error(
        `[calcula.pushPriceToCalcula] ${opts.isin} @ ${opts.price} failed:`,
        err?.message || err
      )
      return { ok: false, error: err?.message || String(err) }
    }
  }

  /**
   * Reconciliation job: asks Calcula for all ISINs whose content has changed
   * since our high-water mark and pulls snapshots for each stale one.
   */
  async syncDrift(): Promise<{
    checked: number
    updated: number
    /** ISINs whose price snapshot was (re)pulled. The cron uses this list
     * to propagate latest prices to Medusa variants at route scope. */
    priceUpdatedIsins: string[]
  }> {
    // High-water = max(content_updated_at). Projected single-row query so we
    // don't drag every blob into Node memory. Previously this loaded the
    // entire company_record table once per minute.
    const topRow = await this.listCompanyRecords(
      {},
      {
        select: ["content_updated_at"],
        take: 1,
        order: { content_updated_at: "DESC" },
      }
    )
    const highWater = topRow[0]?.content_updated_at || ""
    const since = highWater || new Date(0).toISOString()

    const drifted = (await callCalcula(
      `/api/snapshots/versions-since?since=${encodeURIComponent(since)}&limit=500`
    )) as VersionEnvelope[]

    // Bounded-concurrency parallel reconciliation. Keeps per-ISIN failures
    // isolated and avoids hammering Calcula with 500 concurrent requests.
    let updated = 0
    const priceUpdatedIsins: string[] = []
    await mapLimit(drifted, 8, async (envelope) => {
      try {
        const res = await this.handleVersionEnvelope(envelope)
        if (res.updated) {
          updated += 1
          // Track which ISINs got a new price snapshot so the cron can
          // propagate the latest price into the Medusa product variant
          // afterwards (done at route scope because module scope can't
          // run core workflows).
          if ((res as any).prices) priceUpdatedIsins.push(envelope.isin)
        }
      } catch (err) {
        console.error(`[calcula.syncDrift] ${envelope.isin} failed:`, err)
      }
    })
    return { checked: drifted.length, updated, priceUpdatedIsins }
  }

  // ── Read paths (used by Medusa store routes) ─────────────────

  /**
   * Throttled update of last_accessed_at. Writes at most once per ISIN per
   * LAST_ACCESS_THROTTLE_MS window (default 1h). Called by getRawRow.
   * Fire-and-forget; failures are swallowed because this is telemetry-only.
   */
  private touchLastAccessed(id: string, isin: string) {
    const now = Date.now()
    const last = lastAccessWrites.get(isin) || 0
    if (now - last < LAST_ACCESS_THROTTLE_MS) return
    lastAccessWrites.set(isin, now)
    this.updateCompanyRecords({
      id,
      last_accessed_at: new Date(now).toISOString(),
    }).catch(() => {})
  }

  /**
   * Returns the raw row for this ISIN with only the columns needed for the
   * requested `kind`, so /store/calcula snapshot reads never drag extra JSON
   * blobs off disk when the client only needs one.
   *
   * The raw snapshot columns are returned AS TEXT — callers that stream the
   * response can avoid a parse+stringify round-trip entirely.
   */
  async getRawRow(
    isin: string,
    kind: "prices" | "statements" | "news" | "editorial" | "profile" | "both" = "both"
  ) {
    const select = [
      "id",
      "isin",
      "company_name",
      "statements_version",
      "price_version",
      "news_version",
      "editorial_version",
      "content_updated_at",
    ]
    if (kind === "statements" || kind === "both") select.push("statements_snapshot")
    if (kind === "prices" || kind === "both") select.push("price_snapshot")
    if (kind === "news") select.push("news_snapshot")
    if (kind === "editorial") select.push("editorial_snapshot")
    if (kind === "profile") {
      select.push("profile_snapshot")
      select.push("profile_version")
    }

    const results = await this.listCompanyRecords({ isin }, { select })
    const row = results[0]
    if (!row) return null

    this.touchLastAccessed(row.id, isin)
    return row
  }

  // ── Helpers for existing static fields + legacy payload ──────

  private buildCreatePayload(isin: string, overrides: any = {}) {
    return {
      isin,
      company_name: overrides.company_name || isin,
      company_id: overrides.company_id || "",
      cin: "",
      sector: "",
      industry: "",
      description: "",
      listing_status: "",
      overview_data: "",
      ratios_data: "",
      trends_data: "",
      synced_at: new Date().toISOString(),
      market_cap: "",
      share_type: "",
      lot_size: "",
      face_value: "",
      depository: "",
      pan_number: "",
      rta: "",
      total_shares: "",
      fifty_two_week_high: "",
      fifty_two_week_low: "",
      founded: "",
      headquarters: "",
      valuation: "",
      pe_ratio: "",
      pb_ratio: "",
      roe_value: "",
      debt_to_equity: "",
      book_value: "",
      statements_snapshot: "",
      statements_version: "0",
      price_snapshot: "",
      price_version: "0",
      news_snapshot: "",
      news_version: "0",
      editorial_snapshot: "",
      editorial_version: "0",
      profile_snapshot: "",
      profile_version: "0",
      content_updated_at: "",
      last_accessed_at: "",
      ...overrides,
    }
  }

  async upsertStaticFields(isin: string, data: StaticFields) {
    const existing = await this.listCompanyRecords({ isin })
    const staticFields: any = {}
    const fieldKeys: (keyof StaticFields)[] = [
      "sector",
      "industry",
      "cin",
      "description",
      "listing_status",
      "market_cap",
      "share_type",
      "lot_size",
      "face_value",
      "depository",
      "pan_number",
      "rta",
      "total_shares",
      "fifty_two_week_high",
      "fifty_two_week_low",
      "founded",
      "headquarters",
      "valuation",
      "pe_ratio",
      "pb_ratio",
      "roe_value",
      "debt_to_equity",
      "book_value",
    ]
    for (const key of fieldKeys) {
      if (data[key] !== undefined) staticFields[key] = String(data[key])
    }

    let result: any
    if (existing.length > 0) {
      result = await this.updateCompanyRecords({ id: existing[0].id, ...staticFields })
    } else {
      result = await this.createCompanyRecords(
        this.buildCreatePayload(isin, {
          ...staticFields,
          company_name: data.company_name || isin,
        })
      )
    }
    invalidateRouteCacheForIsin(isin)
    return result
  }

  async getByIsin(isin: string) {
    const results = await this.listCompanyRecords({ isin })
    if (!results[0]) return null
    const r = results[0]
    return {
      ...r,
      statements: r.statements_snapshot ? JSON.parse(r.statements_snapshot) : null,
      prices: r.price_snapshot ? JSON.parse(r.price_snapshot) : null,
    }
  }

  async getByCompanyId(companyId: string) {
    const results = await this.listCompanyRecords({ company_id: companyId })
    if (!results[0]) return null
    const r = results[0]
    return {
      ...r,
      statements: r.statements_snapshot ? JSON.parse(r.statements_snapshot) : null,
      prices: r.price_snapshot ? JSON.parse(r.price_snapshot) : null,
    }
  }

  async getAllSynced() {
    const results = await this.listCompanyRecords({})
    return results.map((r) => ({
      ...r,
      statements: r.statements_snapshot ? JSON.parse(r.statements_snapshot) : null,
      prices: r.price_snapshot ? JSON.parse(r.price_snapshot) : null,
    }))
  }

  // ── Bulk operations ─────────────────────────────────────────

  /**
   * Bulk upsert of static (admin-editable) fields keyed by ISIN.
   * Accepts an array of partial rows. Returns per-row outcomes so the
   * caller can surface row-level errors in the admin UI.
   */
  async bulkUpsertStaticFields(
    rows: Array<{ isin: string } & StaticFields>
  ): Promise<Array<{ isin: string; ok: boolean; error?: string }>> {
    const out: Array<{ isin: string; ok: boolean; error?: string }> = []
    for (const row of rows || []) {
      if (!row?.isin) {
        out.push({ isin: row?.isin || "", ok: false, error: "missing isin" })
        continue
      }
      try {
        const { isin, ...data } = row
        await this.upsertStaticFields(isin, data as StaticFields)
        out.push({ isin, ok: true })
      } catch (err: any) {
        out.push({ isin: row.isin, ok: false, error: err?.message || "unknown" })
      }
    }
    return out
  }

  /**
   * Bulk merge of daily price points into the cached price_snapshot JSON.
   * Input rows: { isin, date (ISO or YYYY-MM-DD), price, volume? }.
   * - Groups by ISIN, loads current snapshot
   * - Merges points, deduping by timestamp; updates only if price differs
   * - Bumps price_version when anything changed; otherwise leaves row alone
   * Returns { inserted, updated, skipped, errors }.
   */
  async bulkUpsertPrices(
    rows: Array<{ isin: string; date: string; price: number | string; volume?: number | string }>
  ): Promise<{
    inserted: number
    updated: number
    skipped: number
    errors: Array<{ row: number; isin?: string; error: string }>
  }> {
    const errors: Array<{ row: number; isin?: string; error: string }> = []
    let inserted = 0
    let updated = 0
    let skipped = 0

    // Group by ISIN
    const groups = new Map<string, Array<{ ts: number; price: number; volume?: number; row: number }>>()
    rows.forEach((r, idx) => {
      const isin = (r?.isin || "").trim()
      if (!isin) {
        errors.push({ row: idx, error: "missing isin" })
        return
      }
      const d = new Date(r.date)
      if (isNaN(d.getTime())) {
        errors.push({ row: idx, isin, error: `invalid date: ${r.date}` })
        return
      }
      const price = Number(r.price)
      if (!Number.isFinite(price)) {
        errors.push({ row: idx, isin, error: `invalid price: ${r.price}` })
        return
      }
      const volume = r.volume !== undefined && r.volume !== "" ? Number(r.volume) : undefined
      if (!groups.has(isin)) groups.set(isin, [])
      groups.get(isin)!.push({ ts: d.getTime(), price, volume, row: idx })
    })

    for (const [isin, points] of groups) {
      const existing = await this.listCompanyRecords({ isin })
      const row = existing[0]
      if (!row) {
        errors.push({ row: points[0].row, isin, error: "isin not found in company_record" })
        skipped += points.length
        continue
      }

      // Load existing snapshot (match storefront PriceSnapshot shape)
      let snap: any = {}
      try {
        snap = row.price_snapshot ? JSON.parse(row.price_snapshot) : {}
      } catch {
        snap = {}
      }
      const priceArr: Array<[number, number]> = Array.isArray(snap.prices) ? snap.prices : []
      const byTs = new Map<number, number>()
      for (const [ts, p] of priceArr) byTs.set(ts, p)

      let changed = false
      for (const pt of points) {
        const prev = byTs.get(pt.ts)
        if (prev === undefined) {
          byTs.set(pt.ts, pt.price)
          inserted += 1
          changed = true
        } else if (prev !== pt.price) {
          byTs.set(pt.ts, pt.price)
          updated += 1
          changed = true
        } else {
          skipped += 1
        }
      }

      if (!changed) continue

      const merged = Array.from(byTs.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ts, p]) => [ts, p] as [number, number])

      const nextVersion = String((parseInt(row.price_version || "0", 10) || 0) + 1)
      const nowIso = new Date().toISOString()
      const nextSnap = {
        isin,
        priceVersion: Number(nextVersion),
        contentUpdatedAt: nowIso,
        prices: merged,
        events: Array.isArray(snap.events) ? snap.events : [],
      }

      await this.updateCompanyRecords({
        id: row.id,
        price_snapshot: JSON.stringify(nextSnap),
        price_version: nextVersion,
        content_updated_at: nowIso,
      })
      invalidateRouteCacheForIsin(isin)
    }

    return { inserted, updated, skipped, errors }
  }

  async listByFilters(filters: any) {
    const where: any = {}
    if (filters.sector) where.sector = filters.sector
    if (filters.market_cap) where.market_cap = filters.market_cap
    if (filters.share_type) where.share_type = filters.share_type
    if (filters.industry) where.industry = filters.industry
    const results = await this.listCompanyRecords(where)
    return results.map((r) => ({
      ...r,
      statements: r.statements_snapshot ? JSON.parse(r.statements_snapshot) : null,
      prices: r.price_snapshot ? JSON.parse(r.price_snapshot) : null,
    }))
  }
}

export default Module("calcula", {
  service: CalculaModuleService,
})
