import React, { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui"

type PostHogStatus = {
  configured: boolean
  host: string
  maskedKey: string | null
  provider: string
}

const PostHogStatusPage = () => {
  const [status, setStatus] = useState<PostHogStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/admin/posthog-status", {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Failed to load PostHog status")
        }

        const json = await response.json()
        setStatus(json)
      } catch (error) {
        console.error("Failed to fetch PostHog status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  return (
    <Container className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Heading level="h1">PostHog Status</Heading>
        {!isLoading && (
          <StatusBadge color={status?.configured ? "green" : "orange"}>
            {status?.configured ? "Configured" : "Not Configured"}
          </StatusBadge>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Text className="text-ui-fg-subtle">Provider</Text>
          <Text>{status?.provider || "@medusajs/analytics-posthog"}</Text>
        </div>

        <div>
          <Text className="text-ui-fg-subtle">PostHog Host</Text>
          <Text>{status?.host || "https://eu.i.posthog.com"}</Text>
        </div>

        <div>
          <Text className="text-ui-fg-subtle">Events API Key</Text>
          <Text>{status?.maskedKey || "Not set"}</Text>
        </div>

        <div className="pt-4">
          <Text className="text-ui-fg-subtle">
            {status?.configured
              ? "PostHog analytics is configured in the backend env and the provider can boot."
              : "Set POSTHOG_EVENTS_API_KEY in backend/.env and restart the backend to activate PostHog analytics."}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "PostHog Status",
})

export default PostHogStatusPage
