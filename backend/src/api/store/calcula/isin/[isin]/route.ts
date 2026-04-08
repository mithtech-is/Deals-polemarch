import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/calcula/isin/:isin
 *
 * Returns the full company record (Calcula financial data + static deal fields).
 * ISIN is the shared identifier between Medusa products and Calcula companies.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params
    const calculaModule = req.scope.resolve("calcula") as any
    const data = await calculaModule.getByIsin(isin)

    if (!data) {
      return res.status(404).json({ message: "Company financial data not found" })
    }

    res.json({
      // Calcula-synced fields
      company_id: data.company_id,
      company_name: data.company_name,
      isin: data.isin,
      cin: data.cin,
      sector: data.sector,
      industry: data.industry,
      description: data.description,
      listing_status: data.listing_status,
      overview: data.overview,
      ratios: data.ratios,
      trends: data.trends,
      synced_at: data.synced_at,
      // Static deal fields
      market_cap: data.market_cap,
      share_type: data.share_type,
      lot_size: data.lot_size,
      face_value: data.face_value,
      depository: data.depository,
      pan_number: data.pan_number,
      rta: data.rta,
      total_shares: data.total_shares,
      fifty_two_week_high: data.fifty_two_week_high,
      fifty_two_week_low: data.fifty_two_week_low,
      founded: data.founded,
      headquarters: data.headquarters,
      valuation: data.valuation,
      pe_ratio: data.pe_ratio,
      pb_ratio: data.pb_ratio,
      roe_value: data.roe_value,
      debt_to_equity: data.debt_to_equity,
      book_value: data.book_value,
    })
  } catch (error: any) {
    console.error("Calcula store route error:", error)
    res.status(500).json({ message: error?.message || "Failed to fetch financial data" })
  }
}
