import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /admin/calcula/bulk
 *
 * Bulk upsert of static (admin-editable) company_record fields.
 * Body: { rows: Array<{ isin: string, sector?: string, market_cap?: string, ... }> }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body || {}) as { rows?: any[] }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return res.status(400).json({ message: "rows[] is required" })
    }
    const calculaModule = req.scope.resolve("calcula") as any
    const results = await calculaModule.bulkUpsertStaticFields(rows)
    const okCount = results.filter((r: any) => r.ok).length
    res.json({ success: true, total: rows.length, ok: okCount, results })
  } catch (error: any) {
    console.error("Admin calcula bulk error:", error)
    res.status(500).json({ message: error?.message || "Bulk upsert failed" })
  }
}
