import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * calcula-variant-price-sync
 *
 * Companion to `calcula-price-sync`. Where that one fires on `product.updated`
 * (which catches PATCH /admin/products/:id and the bulk editor save), this
 * one fires on `product-variant.updated` — emitted by Medusa's
 * `updateProductVariantsWorkflow`, which is what the admin "Edit Prices"
 * spreadsheet uses to save variant-level changes.
 *
 * Payload from product-variant.updated is `{ id: <variantId> }`. We resolve
 * the variant up to its product to read `metadata.isin`, then take the
 * INR price off the same variant and push it to Calcula.
 */
export default async function calculaVariantPriceSync({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const variantId = event?.data?.id
    if (!variantId) return

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
    if (!query) {
      console.warn("[calcula-variant-price-sync] QUERY resolver unavailable — skipping")
      return
    }

    const { data } = await query.graph({
      entity: "variant",
      fields: ["id", "prices.*", "product.id", "product.metadata"],
      filters: { id: variantId },
    })
    const variant = Array.isArray(data) ? data[0] : data
    if (!variant) {
      console.log(`[calcula-variant-price-sync] variant ${variantId} not found`)
      return
    }

    const isin = (variant.product?.metadata?.isin || "").toString().trim()
    if (!isin) {
      console.log(
        `[calcula-variant-price-sync] variant ${variantId} (product ${variant.product?.id}) has no ISIN — skipping`
      )
      return
    }

    const inrPrice = variant.prices?.find(
      (p: any) => p?.currency_code?.toLowerCase?.() === "inr"
    )
    if (!inrPrice) {
      console.log(
        `[calcula-variant-price-sync] variant ${variantId} (${isin}) has no INR price — currencies: ${JSON.stringify(
          variant.prices?.map((p: any) => p?.currency_code) ?? []
        )}`
      )
      return
    }

    // Medusa v2 stores prices in MAJOR units. Amount may be a BigNumber.
    const rawAmount = (inrPrice as any).amount
    const priceInr = Number(
      typeof rawAmount === "object" && rawAmount !== null
        ? rawAmount?.numeric ?? rawAmount?.value ?? rawAmount
        : rawAmount
    )
    if (!Number.isFinite(priceInr)) {
      console.warn(
        `[calcula-variant-price-sync] ${isin} has non-finite amount:`,
        rawAmount
      )
      return
    }

    // Loop-breaker: value-based echo check. See calcula-price-sync.ts
    // for the full rationale. Same mechanism here.
    const isLoopEcho = (globalThis as any).__calculaIsLoopEchoPush as
      | ((isin: string, price: number) => boolean)
      | undefined
    if (typeof isLoopEcho === "function" && isLoopEcho(isin, priceInr)) {
      console.log(
        `[calcula-variant-price-sync] ${isin} @ ₹${priceInr} skipped — echo of last value from Calcula`
      )
      return
    }

    const calculaModule = container.resolve("calcula") as any
    const result = await calculaModule.pushPriceToCalcula({
      isin,
      price: priceInr,
    })
    console.log(
      `[calcula-variant-price-sync] pushed ${isin} = ₹${priceInr} →`,
      JSON.stringify(result)
    )
  } catch (err: any) {
    console.error(
      "[calcula-variant-price-sync] failed:",
      err?.message || err,
      err?.stack
    )
  }
}

export const config: SubscriberConfig = {
  event: "product-variant.updated",
}
