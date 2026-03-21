import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const maskKey = (value?: string) => {
  if (!value) {
    return null
  }

  if (value.length <= 8) {
    return "********"
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const eventsKey = process.env.POSTHOG_EVENTS_API_KEY || ""
  const host = process.env.POSTHOG_HOST || "https://eu.i.posthog.com"

  res.json({
    configured: Boolean(eventsKey),
    host,
    maskedKey: maskKey(eventsKey),
    provider: "@medusajs/analytics-posthog",
  })
}
