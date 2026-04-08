import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/calcula
 *
 * List all company records with optional filters.
 * Query params: sector, market_cap, share_type, industry
 *
 * Examples:
 *   /store/calcula?sector=Technology
 *   /store/calcula?market_cap=Large+Cap
 *   /store/calcula?sector=Technology&share_type=UNLISTED
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const calculaModule = req.scope.resolve("calcula") as any
    const { sector, market_cap, share_type, industry, listing_status } = req.query as Record<string, string>

    const filters: Record<string, string> = {}
    if (sector) filters.sector = sector
    if (market_cap) filters.market_cap = market_cap
    if (share_type) filters.share_type = share_type
    if (industry) filters.industry = industry
    if (listing_status) filters.listing_status = listing_status

    const hasFilters = Object.keys(filters).length > 0
    const companies = hasFilters
      ? await calculaModule.listByFilters(filters)
      : await calculaModule.getAllSynced()

    res.json({
      companies,
      count: companies.length,
    })
  } catch (error: any) {
    console.error("Calcula list error:", error)
    res.status(500).json({ message: error?.message || "Failed to list companies" })
  }
}
