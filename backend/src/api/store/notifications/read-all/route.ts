import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = (req as any).auth_context?.auth_metadata?.customer_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const notificationModule = req.scope.resolve("notifications") as any

  await notificationModule.updateNotifications({
    selector: { customer_id: customerId, read: false },
    data: { read: true }
  })

  res.json({ message: "All notifications marked as read" })
}
