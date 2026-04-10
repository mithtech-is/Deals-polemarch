import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createProductCollectionsWorkflow } from "@medusajs/medusa/core-flows"

const COLLECTIONS = [
  "DRHP Filed",
  "RHP Filed",
  "SEBI Approved",
  "IPO Upcoming",
  "High Demand",
  "Recently in News",
  "Fundraising Announced",
  "Recently Added",
  "Polemarch Picks",
]

const toHandle = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export default async function seedCollections({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productService = container.resolve(Modules.PRODUCT)

  const desired = COLLECTIONS.map((title) => ({ title, handle: toHandle(title) }))

  const existing = await productService.listProductCollections({
    handle: desired.map((c) => c.handle),
  })
  const existingHandles = new Set(existing.map((c) => c.handle))

  const toCreate = desired.filter((c) => !existingHandles.has(c.handle))

  if (toCreate.length === 0) {
    logger.info("All collections already exist — nothing to create.")
    return
  }

  await createProductCollectionsWorkflow(container).run({
    input: { collections: toCreate },
  })

  logger.info(
    `Created ${toCreate.length} collection(s): ${toCreate
      .map((c) => c.title)
      .join(", ")}`
  )
  if (existingHandles.size > 0) {
    logger.info(
      `Skipped ${existingHandles.size} existing collection(s): ${[...existingHandles].join(", ")}`
    )
  }
}
