import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /admin/calcula/:isin
 *
 * Set or update static deal fields for a company by ISIN.
 * Used by admins when setting up a new deal.
 * Does not touch Calcula-synced fields (overview, ratios, trends).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params
    const calculaModule = req.scope.resolve("calcula") as any
    const result = await calculaModule.upsertStaticFields(isin, req.body)

    res.json({ success: true, isin, data: result })
  } catch (error: any) {
    console.error("Admin calcula error:", error)
    res.status(500).json({ message: error?.message || "Failed to update company data" })
  }
}

/**
 * GET /admin/calcula/:isin
 *
 * Get the full company record by ISIN (admin view).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params
    const calculaModule = req.scope.resolve("calcula") as any
    const data = await calculaModule.getByIsin(isin)

    if (!data) {
      return res.status(404).json({ message: "Company not found" })
    }

    res.json(data)
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Failed to fetch company data" })
  }
}
