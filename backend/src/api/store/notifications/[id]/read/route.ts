import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = (req as any).auth_context?.app_metadata?.customer_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const { id } = req.params
  const polemarchModule = req.scope.resolve("polemarch") as any

  const notification = await polemarchModule.retrieveNotification(id)
  
  if (notification.customer_id !== customerId) {
    return res.status(403).json({ message: "Unauthorized" })
  }

  const updated = await polemarchModule.updateNotifications({
    id,
    is_read: true
  })

  res.json({ notification: updated })
}
