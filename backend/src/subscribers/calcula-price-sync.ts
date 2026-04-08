import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * calcula-price-sync
 *
 * Fires on `product.updated` (which Medusa emits whenever the product or any
 * of its variants/prices is saved — including from the standard admin
 * product detail page and the Bulk Editor). Reads the first INR variant
 * price and forwards it to Calcula, keyed by the product's `metadata.isin`.
 *
 * IMPORTANT: In Medusa v2, the Product Module does NOT store variant
 * prices — prices live in the Pricing Module via a module link. You must
 * use `query.graph` with the `variants.prices.*` field to fetch them.
 * `productModule.retrieveProduct(id, { relations: ["variants.prices"] })`
 * silently returns variants without a `prices` array.
 */
export default async function calculaPriceSync({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const productId = event?.data?.id
    if (!productId) return

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
    if (!query) {
      console.warn("[calcula-price-sync] QUERY resolver unavailable — skipping")
      return
    }

    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "variants.id", "variants.prices.*"],
      filters: { id: productId },
    })
    const product = Array.isArray(data) ? data[0] : data
    if (!product) {
      console.log(`[calcula-price-sync] product ${productId} not found`)
      return
    }

    const isin = (product.metadata?.isin || "").toString().trim()
    if (!isin) {
      console.log(`[calcula-price-sync] product ${productId} has no ISIN — skipping`)
      return
    }

    const variant = product.variants?.[0]
    if (!variant) {
      console.log(`[calcula-price-sync] product ${productId} (${isin}) has no variants — skipping`)
      return
    }

    const inrPrice = variant.prices?.find(
      (p: any) => p?.currency_code?.toLowerCase?.() === "inr"
    )
    if (!inrPrice) {
      console.log(
        `[calcula-price-sync] variant ${variant.id} (${isin}) has no INR price — prices found: ${JSON.stringify(
          variant.prices?.map((p: any) => p?.currency_code) ?? []
        )}`
      )
      return
    }

    // Medusa v2 stores prices in MAJOR units (₹7.45 as 7.45, not 745).
    // The amount can arrive as a BigNumber-wrapped value, so coerce.
    const rawAmount = (inrPrice as any).amount
    const priceInr = Number(
      typeof rawAmount === "object" && rawAmount !== null
        ? rawAmount?.numeric ?? rawAmount?.value ?? rawAmount
        : rawAmount
    )
    if (!Number.isFinite(priceInr)) {
      console.warn(
        `[calcula-price-sync] ${isin} has non-finite amount:`,
        rawAmount
      )
      return
    }

    // Loop-breaker: if the price we're about to push is the SAME value we
    // most recently received from Calcula for this ISIN, this event is an
    // echo of our own reverse sync. Skip. A different value means a real
    // admin edit and should always go through.
    const isLoopEcho = (globalThis as any).__calculaIsLoopEchoPush as
      | ((isin: string, price: number) => boolean)
      | undefined
    if (typeof isLoopEcho === "function" && isLoopEcho(isin, priceInr)) {
      console.log(
        `[calcula-price-sync] ${isin} @ ₹${priceInr} skipped — echo of last value from Calcula`
      )
      return
    }

    const calculaModule = container.resolve("calcula") as any
    const result = await calculaModule.pushPriceToCalcula({
      isin,
      price: priceInr,
    })
    console.log(
      `[calcula-price-sync] pushed ${isin} = ₹${priceInr} →`,
      JSON.stringify(result)
    )
  } catch (err: any) {
    // Never throw out of a subscriber — it'd dead-letter the event.
    console.error("[calcula-price-sync] failed:", err?.message || err, err?.stack)
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
