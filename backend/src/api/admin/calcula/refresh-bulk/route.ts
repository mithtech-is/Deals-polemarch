import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncLatestPriceToMedusaVariant } from "../../../../modules/calcula/variant-price-sync"

/**
 * POST /admin/calcula/refresh-bulk
 *
 * Trigger forceRefresh for each ISIN in the provided list, then propagate
 * the latest price into the linked Medusa product variant. The variant
 * update has to run at the route scope (req.scope) — see
 * variant-price-sync.ts for the reason.
 *
 * Body: { isins: string[] }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body || {}) as { isins?: string[] }
    const isins = Array.isArray(body.isins) ? body.isins.filter(Boolean) : []
    if (isins.length === 0) {
      return res.status(400).json({ message: "isins[] is required" })
    }
    const calculaModule = req.scope.resolve("calcula") as any

    // Sequential so we don't overwhelm Calcula or the price write path.
    // Bulk refresh is admin-initiated and small-N in practice.
    const results: any[] = []
    for (const isin of isins) {
      try {
        const r = await calculaModule.forceRefresh(isin)
        let variantSync: any = null
        if (r?.ok && typeof r?.latestPrice === "number") {
          variantSync = await syncLatestPriceToMedusaVariant(req.scope, isin, r.latestPrice)
        }
        results.push({ isin, ok: !!r?.ok, updated: !!r?.updated, variantSync })
      } catch (err: any) {
        results.push({ isin, ok: false, error: err?.message || "unknown" })
      }
    }
    const updated = results.filter((r) => r.updated).length
    res.json({ success: true, total: isins.length, updated, results })
  } catch (error: any) {
    console.error("Admin calcula refresh-bulk error:", error)
    res.status(500).json({ message: error?.message || "Bulk refresh failed" })
  }
}
