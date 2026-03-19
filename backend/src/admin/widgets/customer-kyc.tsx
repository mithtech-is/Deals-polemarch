import React, { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import {
  canApproveKyc,
  canRejectKyc,
  getKycBadgeColor,
  getKycLabel,
  toKycRecord,
  updateCustomerKycStatus,
} from "../lib/kyc"

const CustomerKycWidget = ({ data: customer }: { data: any }) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const request = toKycRecord(customer)

  if (!request.panNumber && !request.dematNumber && request.status === "none") {
    return null
  }

  const handleAction = async (
    e: React.MouseEvent,
    status: "approved" | "rejected"
  ) => {
    e.preventDefault()

    const reviewNotes =
      status === "rejected"
        ? window.prompt(
            "Enter rejection reason",
            request.rejectionReason || "Documents unclear"
          ) || "Documents unclear"
        : "Approved by admin"

    setIsUpdating(true)

    try {
      await updateCustomerKycStatus(
        request.customerId,
        request.metadata,
        status,
        reviewNotes
      )

      window.location.reload()
    } catch (error: any) {
      console.error("Failed to update customer KYC:", error)
      window.alert(`Error: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Container className="mt-4 p-6">
      <div className="mb-4 flex items-center justify-between">
        <Heading level="h2">KYC Details</Heading>
        <StatusBadge color={getKycBadgeColor(request.status)}>
          {getKycLabel(request.status)}
        </StatusBadge>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <Text size="small" className="font-semibold text-ui-fg-subtle">
            PAN Number
          </Text>
          <Text>{request.panNumber || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="font-semibold text-ui-fg-subtle">
            Aadhaar Number
          </Text>
          <Text>{request.aadhaarNumber || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="font-semibold text-ui-fg-subtle">
            DP Name
          </Text>
          <Text>{request.dpName || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="font-semibold text-ui-fg-subtle">
            Demat Number
          </Text>
          <Text>{request.dematNumber || "N/A"}</Text>
        </div>
      </div>
      <div className="mb-6 flex items-center gap-4">
        {request.panFileUrl && (
          <a href={request.panFileUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary" size="small">
              View PAN File
            </Button>
          </a>
        )}
        {request.cmrFileUrl && (
          <a href={request.cmrFileUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary" size="small">
              View CMR Copy
            </Button>
          </a>
        )}
      </div>
      {request.rejectionReason && (
        <div className="mb-6 rounded-md border border-ui-border-error bg-ui-bg-error p-4">
          <Text size="small" className="font-semibold text-ui-fg-error">
            Rejection Reason
          </Text>
          <Text size="small">{request.rejectionReason}</Text>
        </div>
      )}
      <div className="flex gap-2">
        {canApproveKyc(request.status) && (
          <Button
            type="button"
            variant="primary"
            size="small"
            isLoading={isUpdating}
            onClick={(e) => handleAction(e, "approved")}
          >
            Approve
          </Button>
        )}
        {canRejectKyc(request.status) && (
          <Button
            type="button"
            variant="danger"
            size="small"
            isLoading={isUpdating}
            onClick={(e) => handleAction(e, "rejected")}
          >
            Reject
          </Button>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default CustomerKycWidget
