import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/calcula/site-settings
 *
 * Lightweight proxy of Calcula's `/api/site-settings` endpoint. The
 * storefront hits this so it can default its currency symbol + display
 * scale to whatever Calcula admin has configured, without needing a
 * Calcula bearer token.
 *
 * Cached in-process for 30 seconds to absorb the N concurrent storefront
 * requests that hit this on every page navigation. Invalidation is
 * passive — the TTL is short enough that admin edits land within a
 * minute without needing an explicit drop.
 */

type Entry = { exp: number; body: string }
const TTL_MS = 30_000
let cache: Entry | null = null

const CALCULA_URL = process.env.CALCULA_API_URL || "http://localhost:4100"
const CALCULA_SECRET = process.env.CALCULA_WEBHOOK_SECRET || ""

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const now = Date.now()
    if (cache && cache.exp > now) {
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60")
      return res.end(cache.body)
    }

    const url = `${CALCULA_URL}/api/site-settings`
    const response = await fetch(url, {
      headers: CALCULA_SECRET ? { "X-Webhook-Secret": CALCULA_SECRET } : {},
    })
    if (!response.ok) {
      return res
        .status(502)
        .json({ message: `Calcula site-settings fetch failed: ${response.status}` })
    }
    const body = await response.text()
    cache = { exp: now + TTL_MS, body }
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60")
    return res.end(body)
  } catch (error: any) {
    console.error("Calcula site-settings route error:", error)
    return res.status(500).json({ message: error?.message || "Site settings fetch failed" })
  }
}
