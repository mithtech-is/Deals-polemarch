import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.app_metadata?.customer_id

  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const polemarchModule = req.scope.resolve("polemarch") as any
  const { limit = 20, offset = 0 } = req.query as any

  const [notifications, count] = await polemarchModule.listAndCountNotifications(
    { customer_id: customerId },
    { skip: parseInt(offset as string), take: parseInt(limit as string), order: { created_at: "DESC" } }
  )

  res.json({ notifications, count })
}
