import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncLatestPriceToMedusaVariant } from "../../../../../modules/calcula/variant-price-sync"

/**
 * POST /admin/calcula/:isin/refresh
 *
 * Force-refresh the snapshot cache for a single ISIN. Useful when ops need
 * an immediate pull-through without waiting for the next cron or webhook.
 *
 * After the snapshot is refreshed, we also propagate the latest price into
 * the linked Medusa product variant. See `variant-price-sync.ts` for why
 * that must happen at the route scope rather than inside the module.
 *
 * Auth: user session/bearer (already applied via the existing /admin/calcula*
 * middleware matcher in api/middlewares.ts).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params
    const calculaModule = req.scope.resolve("calcula") as any
    const result = await calculaModule.forceRefresh(isin)

    let variantSync: Awaited<ReturnType<typeof syncLatestPriceToMedusaVariant>> | null = null
    if (result?.ok && typeof result?.latestPrice === "number") {
      variantSync = await syncLatestPriceToMedusaVariant(req.scope, isin, result.latestPrice)
    }

    res.json({ success: true, isin, result, variantSync })
  } catch (error: any) {
    console.error("Calcula refresh route error:", error)
    res.status(500).json({ message: error?.message || "Force refresh failed" })
  }
}
