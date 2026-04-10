import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/calcula/isin/:isin/snapshot?kind=prices|statements|both
 *
 * Returns the cached snapshot for this ISIN. Optimised path:
 *   1. Process-local LRU cache (10s) in front of the DB — collapses
 *      concurrent bursts for the same (isin, kind) to a single row read.
 *   2. Column projection — only reads the blob(s) the client asked for.
 *   3. Streams the raw JSON blob straight to the wire (no JSON.parse +
 *      JSON.stringify round-trip).
 *   4. ETag = "<statements_version>:<price_version>" — browsers, CDNs and
 *      service workers can do conditional GETs and skip the whole body.
 *   5. Cache-Control: private, max-age=0, must-revalidate. Clients ALWAYS
 *      revalidate. When the ETag matches the response is a 304 that reads
 *      only two version columns on Medusa — cheap. Browsers cannot serve a
 *      stale price chart after an admin edit. Do NOT re-introduce a
 *      `max-age>0` here without first solving invalidation across the
 *      browser AND any CDN in front of Medusa.
 *
 * Invalidation of the process LRU is driven by the webhook + cron path:
 * any mutation that bumps a version also drops the cache entry for that
 * ISIN so the next read returns the new row.
 */

type Kind = "prices" | "statements" | "news" | "editorial" | "profile" | "both"

type CacheEntry = {
  exp: number
  etag: string
  body: string
}

const ROUTE_CACHE_TTL_MS = 10_000
const ROUTE_CACHE_MAX = 500

// Module-scope process cache. Because Node re-uses process memory across
// requests within the same worker, this amortises DB work across every
// concurrent hit for the same (isin, kind) pair.
const routeCache: Map<string, CacheEntry> = (globalThis as any).__calculaRouteCache ?? new Map()
;(globalThis as any).__calculaRouteCache = routeCache

function cacheKey(isin: string, kind: Kind) {
  return `${isin}::${kind}`
}

function evictIfFull() {
  if (routeCache.size <= ROUTE_CACHE_MAX) return
  // Drop the oldest ~10% by insertion order
  const drop = Math.ceil(ROUTE_CACHE_MAX * 0.1)
  let i = 0
  for (const key of routeCache.keys()) {
    if (i++ >= drop) break
    routeCache.delete(key)
  }
}

/** Public helper so the calcula module can invalidate on writes. */
export function invalidateRouteCache(isin: string) {
  const kinds: Kind[] = ["prices", "statements", "news", "editorial", "profile", "both"]
  for (const k of kinds) routeCache.delete(cacheKey(isin, k))
}
;(globalThis as any).__calculaInvalidateRouteCache = invalidateRouteCache

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params
    const kindParam = (req.query?.kind as string | undefined) ?? "both"
    const validKinds: Kind[] = ["prices", "statements", "news", "editorial", "profile", "both"]
    const kind: Kind = (validKinds as string[]).includes(kindParam)
      ? (kindParam as Kind)
      : "both"

    const now = Date.now()
    const key = cacheKey(isin, kind)
    let entry = routeCache.get(key)

    if (!entry || entry.exp < now) {
      const calculaModule = req.scope.resolve("calcula") as any
      const row = await calculaModule.getRawRow(isin, kind)
      if (!row) {
        return res.status(404).json({ message: "Snapshot not cached yet", isin })
      }

      const statementsVersion = row.statements_version || "0"
      const priceVersion = row.price_version || "0"
      const newsVersion = row.news_version || "0"
      const editorialVersion = row.editorial_version || "0"
      const profileVersion = (row as any).profile_version || "0"
      // ETag composes all version numbers so any kind's bump invalidates
      // every cached body for that ISIN. The format is stable across kinds
      // so conditional GETs still work.
      const etag = `"${statementsVersion}:${priceVersion}:${newsVersion}:${editorialVersion}:${profileVersion}"`

      // Assemble the response body with raw text blobs — no parse/restringify.
      const parts: string[] = []
      parts.push(`{"isin":${JSON.stringify(row.isin || "")}`)
      parts.push(`,"company_name":${JSON.stringify(row.company_name || "")}`)
      parts.push(`,"statements_version":${parseInt(statementsVersion, 10) || 0}`)
      parts.push(`,"price_version":${parseInt(priceVersion, 10) || 0}`)
      parts.push(`,"news_version":${parseInt(newsVersion, 10) || 0}`)
      parts.push(`,"editorial_version":${parseInt(editorialVersion, 10) || 0}`)
      parts.push(`,"profile_version":${parseInt(profileVersion, 10) || 0}`)
      parts.push(`,"content_updated_at":${JSON.stringify(row.content_updated_at || "")}`)
      if (kind === "statements" || kind === "both") {
        parts.push(`,"statements":${row.statements_snapshot || "null"}`)
      }
      if (kind === "prices" || kind === "both") {
        parts.push(`,"prices":${row.price_snapshot || "null"}`)
      }
      if (kind === "news") {
        parts.push(`,"news":${row.news_snapshot || "null"}`)
      }
      if (kind === "editorial") {
        parts.push(`,"editorial":${row.editorial_snapshot || "null"}`)
      }
      if (kind === "profile") {
        parts.push(`,"profile":${(row as any).profile_snapshot || "null"}`)
      }
      parts.push("}")
      const body = parts.join("")

      entry = {
        exp: now + ROUTE_CACHE_TTL_MS,
        etag,
        body,
      }
      routeCache.set(key, entry)
      evictIfFull()
    }

    // Expose the ETag + Cache-Control headers to cross-origin clients.
    // ETag is not a CORS "simple" response header, so browsers hide it from
    // JS unless Access-Control-Expose-Headers lists it explicitly. Without
    // this, the storefront's conditional GET in snapshot.ts never sees the
    // ETag and can never issue an If-None-Match.
    res.setHeader("Access-Control-Expose-Headers", "ETag, Cache-Control")

    // Conditional GET — clients that already have this exact version get 304.
    const inm = req.headers["if-none-match"]
    if (inm && inm === entry.etag) {
      res.setHeader("ETag", entry.etag)
      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate")
      return res.status(304).end()
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("ETag", entry.etag)
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate")
    res.setHeader("Vary", "Accept-Encoding")
    // res.end writes the raw body without a second serialization pass.
    return res.end(entry.body)
  } catch (error: any) {
    console.error("Calcula snapshot route error:", error)
    res.status(500).json({ message: error?.message || "Failed to fetch snapshot" })
  }
}
