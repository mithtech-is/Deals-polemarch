import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { parseCsvToObjects } from "../../../../../utils/csv"

/**
 * POST /admin/calcula/prices/bulk
 *
 * Accepts either:
 *   - application/json: { rows: [{ isin, date, price, volume? }, ...] }
 *   - multipart/form-data: a "file" CSV with header `isin,date,price[,volume]`
 *
 * Merges price points into each ISIN's cached price_snapshot, skipping
 * duplicates (same timestamp + same price). Returns a summary.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const calculaModule = req.scope.resolve("calcula") as any

    let rows: Array<{ isin: string; date: string; price: number | string; volume?: number | string }> = []

    const file = (req as any).file as { buffer?: Buffer; originalname?: string } | undefined
    if (file?.buffer) {
      const text = file.buffer.toString("utf8")
      rows = parseCsv(text)
    } else {
      const body = (req.body || {}) as { rows?: any[] }
      rows = Array.isArray(body.rows) ? body.rows : []
    }

    if (rows.length === 0) {
      return res.status(400).json({ message: "No rows provided (empty CSV or empty rows[])" })
    }

    const summary = await calculaModule.bulkUpsertPrices(rows)
    res.json({ success: true, total: rows.length, ...summary })
  } catch (error: any) {
    console.error("Admin calcula prices/bulk error:", error)
    res.status(500).json({ message: error?.message || "Bulk price upload failed" })
  }
}

/**
 * Required CSV columns: isin, date, price. Optional: volume.
 */
function parseCsv(text: string): Array<{ isin: string; date: string; price: string; volume?: string }> {
  const { header, rows } = parseCsvToObjects(text)
  if (!header.includes("isin") || !header.includes("date") || !header.includes("price")) {
    throw new Error("CSV must have headers: isin, date, price (and optional volume)")
  }
  return rows.map((r) => ({
    isin: r.isin,
    date: r.date,
    price: r.price,
    volume: r.volume,
  }))
}
