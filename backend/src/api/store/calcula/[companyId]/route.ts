import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/calcula/:companyId
 *
 * Returns synced financial data for a company.
 * Public route — no auth required.
 * companyId is the Calcula company UUID.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { companyId } = req.params
    const calculaModule = req.scope.resolve("calcula") as any
    const data = await calculaModule.getByCompanyId(companyId)

    if (!data) {
      return res.status(404).json({ message: "Company financial data not found" })
    }

    res.json({
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
    })
  } catch (error: any) {
    console.error("Calcula store route error:", error)
    res.status(500).json({ message: error?.message || "Failed to fetch financial data" })
  }
}
