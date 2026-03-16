import React, { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Switch, toast } from "@medusajs/ui"

const ProductTrendingWidget = ({ data: product }: { data: any }) => {
  const [isTrending, setIsTrending] = useState(product?.metadata?.is_trending === true)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/admin/products/${product.id}`, {
        method: "POST", // Medusa V2 uses POST for updates
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            ...product.metadata,
            is_trending: checked,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      setIsTrending(checked)
      toast.success("Success", {
        description: `Product ${checked ? "marked as trending" : "removed from trending"}.`,
      })
    } catch (error) {
      console.error("Error updating trending status:", error)
      toast.error("Error", {
        description: "Could not update trending status.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Container className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h2">Trending Status</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Toggle whether this share appears in the "Trending Shares" section on the homepage.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Switch
            checked={isTrending}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
          <Text size="small" className="font-medium">
            {isTrending ? "Trending" : "Not Trending"}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductTrendingWidget
