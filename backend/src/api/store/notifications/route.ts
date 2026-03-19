import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const customerId = (req as any).auth_context?.app_metadata?.customer_id

    if (!customerId) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    const polemarchModule = req.scope.resolve("polemarch") as any
    const { limit = 20, offset = 0 } = req.query as any
    const parsedLimit = Number.parseInt(limit as string, 10) || 20
    const parsedOffset = Number.parseInt(offset as string, 10) || 0

    let allNotifications: any[] = []

    if (typeof polemarchModule.listNotifications === "function") {
      allNotifications = await polemarchModule.listNotifications({
        customer_id: customerId,
      })
    } else if (typeof polemarchModule.listAndCountNotifications === "function") {
      const [notifications] = await polemarchModule.listAndCountNotifications(
        { customer_id: customerId },
        {}
      )
      allNotifications = notifications || []
    }

    const sortedNotifications = [...(allNotifications || [])].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0

      if (aTime !== bTime) {
        return bTime - aTime
      }

      return String(b?.id || "").localeCompare(String(a?.id || ""))
    })

    const notifications = sortedNotifications.slice(parsedOffset, parsedOffset + parsedLimit)

    res.json({ notifications, count: sortedNotifications.length })
  } catch (error: any) {
    console.error("Failed to fetch notifications:", error)
    res.json({ notifications: [], count: 0 })
  }
}
