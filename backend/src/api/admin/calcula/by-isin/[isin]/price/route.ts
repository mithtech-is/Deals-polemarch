import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /admin/calcula/by-isin/:isin/price
 *
 * Pushes a price update from Medusa to Calcula's authoritative store.
 * Called by the Deals Manager admin page after a variant price edit.
 *
 * Body: { price: number, datetime?: string, note?: string, link?: string }
 *
 * When datetime is omitted, `pushPriceToCalcula` defaults to
 * `new Date().toISOString()` so the new row is strictly after any
 * existing row in Calcula's sorted price series. That guarantees
 * `extractLatestPriceFromSnapshot` picks the user's just-saved value
 * when the webhook bounces back and the reverse variant sync runs.
 * See `backend/src/modules/calcula/index.ts#pushPriceToCalcula` for
 * the history behind this choice.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { isin } = req.params as { isin: string }
    const body = req.body as {
      price?: number
      datetime?: string
      note?: string
      link?: string
    }

    if (!isin) {
      return res.status(400).json({ message: "isin is required" })
    }
    if (typeof body?.price !== "number" || !Number.isFinite(body.price)) {
      return res.status(400).json({ message: "price must be a finite number" })
    }

    const calculaModule = req.scope.resolve("calcula") as any
    const result = await calculaModule.pushPriceToCalcula({
      isin,
      price: body.price,
      datetime: body.datetime,
      note: body.note,
      link: body.link,
    })

    if (!result?.ok && !result?.result) {
      return res.status(502).json({
        message: result?.error || "Failed to push price to Calcula",
        result,
      })
    }

    res.json({ success: true, isin, result })
  } catch (error: any) {
    console.error("Calcula price push route error:", error)
    res.status(500).json({ message: error?.message || "Failed to push price" })
  }
}
