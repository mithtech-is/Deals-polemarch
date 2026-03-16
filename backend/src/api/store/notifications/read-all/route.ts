import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = (req as any).auth_context?.app_metadata?.customer_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const polemarchModule = req.scope.resolve("polemarch") as any

  await polemarchModule.updateNotifications({
    selector: { customer_id: customerId, is_read: false },
    data: { is_read: true }
  })

  res.json({ message: "All notifications marked as read" })
}
