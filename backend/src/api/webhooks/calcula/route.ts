import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncLatestPriceToMedusaVariant } from "../../../modules/calcula/variant-price-sync"

/**
 * POST /webhooks/calcula
 *
 * Receives a tiny version envelope from Calcula whenever a company's data
 * has changed. Authenticated via X-Webhook-Secret header.
 *
 * Payload: {
 *   isin, company_id?, company_name?,
 *   statements_version, price_version, content_updated_at
 * }
 *
 * Medusa compares these integers with its local cache row and pulls the
 * stale snapshot(s) from Calcula if needed. The request returns 200 quickly
 * and the refresh happens in the background so Calcula never has to wait.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const secret = req.headers["x-webhook-secret"]
    const expectedSecret = process.env.CALCULA_WEBHOOK_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({ message: "Invalid webhook secret" })
    }

    const payload = req.body as {
      isin?: string
      company_id?: string
      company_name?: string
      statements_version?: number
      price_version?: number
      news_version?: number
      editorial_version?: number
      profile_version?: number
      content_updated_at?: string
    }

    if (!payload?.isin || typeof payload.statements_version !== "number" || typeof payload.price_version !== "number") {
      return res.status(400).json({ message: "isin, statements_version and price_version are required" })
    }

    const calculaModule = req.scope.resolve("calcula") as any

    // Kick off the refresh without blocking the webhook response.
    // Calcula's cron/webhook retries will catch any transient failure.
    //
    // After handleVersionEnvelope returns, if a new price was pulled we
    // also propagate it into the Medusa product variant. The variant
    // write MUST happen here (with req.scope) and not inside the module
    // service — Medusa v2 module containers do not have the Query Graph
    // or core workflows so running updateProductVariantsWorkflow from
    // there silently fails.
    const kickoff = async () => {
      try {
        const result = await calculaModule.handleVersionEnvelope({
          isin: payload.isin,
          company_id: payload.company_id,
          company_name: payload.company_name,
          statements_version: payload.statements_version,
          price_version: payload.price_version,
          news_version: payload.news_version,
          editorial_version: payload.editorial_version,
          profile_version: payload.profile_version,
          content_updated_at: payload.content_updated_at ?? new Date().toISOString(),
        })
        if (result?.updated && result?.prices && typeof result?.latestPrice === "number") {
          await syncLatestPriceToMedusaVariant(req.scope, payload.isin!, result.latestPrice)
        }
      } catch (err: any) {
        console.error(
          `[webhooks/calcula] handleVersionEnvelope failed for ${payload.isin}:`,
          err
        )
      }
    }
    kickoff()

    res.json({ success: true, isin: payload.isin, queued_at: new Date().toISOString() })
  } catch (error: any) {
    console.error("Calcula webhook error:", error)
    res.status(500).json({ message: error?.message || "Webhook processing failed" })
  }
}
