import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * POST /webhooks/calcula/create-product
 *
 * Called by Calcula when a new company is created. Creates a matching
 * Medusa product (draft) with the company's ISIN linked via
 * additional_data, which triggers the existing validate-product-isin
 * hook that seeds product.metadata.isin and the calcula company_record.
 *
 * Idempotent: if a product with the same ISIN already exists, returns
 * early with { created: false }.
 *
 * Auth: X-Webhook-Secret header (shared CALCULA_WEBHOOK_SECRET).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Auth
    const secret = req.headers["x-webhook-secret"]
    const expectedSecret = process.env.CALCULA_WEBHOOK_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(401).json({ message: "Invalid webhook secret" })
    }

    const { isin, name, description, sector, industry, listingStatus } = req.body as {
      isin?: string
      name?: string
      description?: string
      sector?: string
      industry?: string
      listingStatus?: string
    }

    if (!isin || !name) {
      return res.status(400).json({ message: "isin and name are required" })
    }

    // Idempotency: check if a calcula company_record with this ISIN exists.
    const calcula: any = req.scope.resolve("calcula")
    const existing = await calcula.listCompanyRecords({ isin })
    if (existing?.length > 0) {
      return res.json({ created: false, reason: "already_exists", isin })
    }

    // Create product via workflow (triggers validate-product-isin hook)
    const handle = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100)

    const productInput: any = {
      title: name,
      handle,
      status: "draft",
      description: description || undefined,
      options: [{ title: "Default", values: ["Default"] }],
      variants: [
        {
          title: "Default",
          prices: [],
          options: { Default: "Default" },
          manage_inventory: false,
        },
      ],
    }

    const result = await createProductsWorkflow(req.scope).run({
      input: {
        products: [productInput],
        additional_data: { isin, company_name: name },
      },
    })

    const createdProduct = (result as any)?.result?.[0]

    // Seed calcula static fields
    try {
      const staticFields: Record<string, any> = { company_name: name }
      if (sector) staticFields.sector = sector
      if (industry) staticFields.industry = industry
      if (description) staticFields.description = description
      if (listingStatus) staticFields.listing_status = listingStatus
      await calcula.upsertStaticFields(isin, staticFields)
    } catch (err: any) {
      console.error("[create-product] calcula upsert failed:", err.message)
    }

    res.json({
      created: true,
      product_id: createdProduct?.id ?? null,
      handle,
      isin,
    })
  } catch (error: any) {
    console.error("[create-product] error:", error)
    res.status(500).json({ message: error?.message || "Failed to create product" })
  }
}
