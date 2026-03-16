import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = (req as any).auth_context?.auth_metadata?.customer_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const { id } = req.params
  const notificationModule = req.scope.resolve("notifications") as any

  const notification = await notificationModule.retrieveNotification(id)
  
  if (notification.customer_id !== customerId) {
    return res.status(403).json({ message: "Unauthorized" })
  }

  const updated = await notificationModule.updateNotifications({
    id,
    read: true
  })

  res.json({ notification: updated })
}
