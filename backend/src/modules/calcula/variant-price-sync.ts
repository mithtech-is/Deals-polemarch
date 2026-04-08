import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Reverse-sync: propagate the latest price from a freshly-pulled Calcula
 * snapshot into the linked Medusa product variant's INR price.
 *
 * This lives OUTSIDE the custom calcula module because Medusa v2 module
 * service containers are isolated — they don't contain `Modules.QUERY`
 * nor access to core workflows. Running this from inside the module
 * silently fails. Call it from a route handler (req.scope) or a
 * subscriber (container arg) instead.
 *
 * Behaviour:
 *   - Looks up the first product whose metadata.isin === isin
 *   - Reads the first INR price on the first variant
 *   - If it already matches `latestPrice`, no-ops
 *   - Otherwise sets a short-TTL "do-not-push" guard (loop-breaker for
 *     the calcula-price-sync subscribers) and runs
 *     updateProductVariantsWorkflow to set the new amount
 *   - Returns a structured result so the caller can log the outcome
 *
 * Never throws. A failure here logs + returns {ok:false}; it must not
 * break the webhook response path.
 */
export async function syncLatestPriceToMedusaVariant(
  container: any,
  isin: string,
  latestPrice: number | null
): Promise<{
  ok: boolean
  skipped?: boolean
  reason?: string
  previous?: number | null
  next?: number
  error?: string
}> {
  if (!isin) return { ok: false, skipped: true, reason: "no isin" }
  if (latestPrice === null || !Number.isFinite(latestPrice)) {
    return { ok: false, skipped: true, reason: "no price" }
  }

  // Value-based loop-breaker: remember the exact price we just received
  // FROM Calcula for this ISIN. The subscribers compare outgoing pushes
  // against this value — if equal, it's a loop echo (skip); if different,
  // it's a legitimate new edit (push). This is race-free, unlike a time
  // window, and never loses legitimate updates.
  //
  // We used to set a time-windowed "do-not-push" guard here. That worked
  // for bulk-editor saves, but blocked legitimate new edits made from the
  // standard product detail page within 5s of any reverse sync. The
  // price-equality check is stricter and correct for every scenario.
  const lastFromCalcula: Map<string, number> =
    (globalThis as any).__calculaLastFromCalcula ?? new Map()
  ;(globalThis as any).__calculaLastFromCalcula = lastFromCalcula
  lastFromCalcula.set(isin, latestPrice)

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "variants.id", "variants.prices.*"],
      // Medusa v2 supports filtering on JSONB metadata keys with the
      // dotted-path syntax. `metadata: { isin }` does NOT work — it
      // compares the whole metadata blob. Use a top-level `metadata.isin`.
      // Fallback: fetch and filter in memory if this filter is rejected.
    })

    // In-memory filter — the query graph JSONB filter is inconsistent
    // across Medusa versions. Cheap scan over products (there are usually
    // tens, not thousands, of deal products).
    const products: any[] = Array.isArray(data) ? data : []
    const product = products.find((p) => {
      const meta = p?.metadata || {}
      return typeof meta.isin === "string" && meta.isin.trim() === isin
    })
    if (!product) {
      return { ok: false, skipped: true, reason: "no linked product" }
    }

    const variant = product.variants?.[0]
    if (!variant) {
      return { ok: false, skipped: true, reason: "no variant" }
    }

    // Read the current INR price so we can skip no-op writes.
    const inrPrice = variant.prices?.find(
      (p: any) => p?.currency_code?.toLowerCase?.() === "inr"
    )
    let currentInrAmount: number | null = null
    if (inrPrice) {
      const raw = (inrPrice as any).amount
      const num = Number(
        typeof raw === "object" && raw !== null
          ? raw?.numeric ?? raw?.value ?? raw
          : raw
      )
      if (Number.isFinite(num)) currentInrAmount = num
    }

    if (currentInrAmount !== null && Math.abs(currentInrAmount - latestPrice) < 1e-9) {
      // Already matches. The do-not-push guard is already set at the top
      // of this function so any product.updated event that arrives in the
      // next 5s (e.g. from the bulk editor's own metadata save) will be
      // correctly ignored by the subscribers.
      return { ok: true, skipped: true, reason: "already matches", previous: currentInrAmount, next: latestPrice }
    }

    await updateProductVariantsWorkflow(container).run({
      input: {
        selector: { id: variant.id, product_id: product.id },
        update: {
          // Replaces only the INR price; other currencies are untouched.
          prices: [{ currency_code: "inr", amount: latestPrice }],
        },
      },
    })

    console.log(
      `[variant-price-sync] ${isin} variant ${variant.id} ${currentInrAmount ?? "null"} → ${latestPrice}`
    )
    return { ok: true, previous: currentInrAmount, next: latestPrice }
  } catch (err: any) {
    console.error(`[variant-price-sync] ${isin} failed:`, err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}
