import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

/**
 * Seeds ISIN-linked data when a product is created WITH an ISIN in
 * `additional_data`. Does NOT enforce ISIN at create time.
 *
 * Why ISIN is optional here:
 * Medusa v2's admin UI has no `product.create` injection zone — custom
 * fields cannot be added to the stock Create Product form, so the stock
 * form can never send `additional_data.isin`. Enforcing it here blocked
 * product creation entirely. Instead, ISIN is set post-create via the
 * `calcula-fields.tsx` widget on `product.details.after`, which PATCHes
 * `metadata.isin` on /admin/products/:id. Products without an ISIN are
 * tolerated everywhere else in the pipeline (the calcula-price-sync
 * subscribers explicitly skip them).
 *
 * If `additional_data.isin` IS provided (e.g. via CSV import or a custom
 * admin route), we still do the original seeding: persist to
 * product.metadata and upsert the calcula company_record row.
 */
createProductsWorkflow.hooks.productsCreated(
  async ({ products, additional_data }, { container }) => {
    const isin = ((additional_data?.isin as string | undefined) || "").trim()
    if (!isin) {
      console.log(
        "[validate-product-isin] no ISIN on create — skipping seed. Set via calcula-fields widget."
      )
      return
    }

    const companyName =
      ((additional_data?.company_name as string | undefined) || "").trim() ||
      products[0]?.title ||
      isin

    // 1) Persist ISIN onto product.metadata for each created product
    try {
      const productModule: any = container.resolve(Modules.PRODUCT)
      await productModule.upsertProducts(
        products.map((p: any) => ({
          id: p.id,
          metadata: { ...(p.metadata || {}), isin },
        }))
      )
    } catch (err) {
      console.error("[validate-product-isin] metadata upsert failed:", err)
    }

    // 2) Seed the calcula company_record so the widget has a row to load
    try {
      const calcula: any = container.resolve("calcula")
      await calcula.upsertStaticFields(isin, { company_name: companyName })
    } catch (err) {
      console.error("[validate-product-isin] calcula seed failed:", err)
    }
  }
)
