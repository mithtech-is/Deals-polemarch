import React, { useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, StatusBadge, Table, Text } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"
import {
  canApproveKyc,
  canRejectKyc,
  getKycBadgeColor,
  getKycLabel,
  hasKycSubmission,
  KycRecord,
  toKycRecord,
  updateCustomerKycStatus,
} from "../../lib/kyc"

const KycRequestsPage = () => {
  const [requests, setRequests] = useState<KycRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionKey, setActionKey] = useState("")
  const navigate = useNavigate()

  const fetchRequests = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/admin/customers?limit=1000", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }

      const json = await response.json()
      const customers = Array.isArray(json.customers) ? json.customers : []

      const nextRequests = customers
        .filter((customer: any) => hasKycSubmission(customer))
        .map((customer: any) => toKycRecord(customer))
        .sort((a: KycRecord, b: KycRecord) => {
          const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
          const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
          return bTime - aTime
        })

      setRequests(nextRequests)
    } catch (error) {
      console.error("Failed to fetch KYC requests:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAction = async (
    e: React.MouseEvent,
    request: KycRecord,
    status: "approved" | "rejected"
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const reviewNotes =
      status === "rejected"
        ? window.prompt(
            "Enter rejection reason",
            request.rejectionReason || "Documents unclear"
          ) || "Documents unclear"
        : "Approved by admin"

    const nextActionKey = `${request.customerId}:${status}`
    setActionKey(nextActionKey)

    try {
      await updateCustomerKycStatus(
        request.customerId,
        request.metadata,
        status,
        reviewNotes
      )

      await fetchRequests()
    } catch (error: any) {
      console.error("Failed to update KYC request:", error)
      window.alert(`Error: ${error.message}`)
    } finally {
      setActionKey("")
    }
  }

  return (
    <Container className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <Heading level="h1">KYC Requests</Heading>
        <Text className="text-ui-fg-subtle">Total {requests.length} submissions</Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>PAN Number</Table.HeaderCell>
            <Table.HeaderCell>Demat Number</Table.HeaderCell>
            <Table.HeaderCell>Submitted At</Table.HeaderCell>
            <Table.HeaderCell>Documents</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {requests.map((request) => (
            <Table.Row key={request.customerId}>
              <Table.Cell
                className="cursor-pointer hover:underline"
                onClick={() => navigate(`/customers/${request.customerId}`)}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-ui-fg-base">{request.name}</span>
                  <span className="text-xs text-ui-fg-subtle">{request.email}</span>
                </div>
              </Table.Cell>
              <Table.Cell>{request.panNumber || "N/A"}</Table.Cell>
              <Table.Cell>{request.dematNumber || "N/A"}</Table.Cell>
              <Table.Cell>
                {request.submittedAt
                  ? new Date(request.submittedAt).toLocaleDateString()
                  : "N/A"}
              </Table.Cell>
              <Table.Cell>
                <div className="flex flex-col gap-1">
                  {request.panFileUrl && (
                    <a
                      href={request.panFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-500 hover:underline"
                    >
                      PAN Card
                    </a>
                  )}
                  {request.cmrFileUrl && (
                    <a
                      href={request.cmrFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-500 hover:underline"
                    >
                      CMR Copy
                    </a>
                  )}
                  {!request.panFileUrl && !request.cmrFileUrl && "No docs"}
                </div>
              </Table.Cell>
              <Table.Cell>
                <StatusBadge color={getKycBadgeColor(request.status)}>
                  {getKycLabel(request.status)}
                </StatusBadge>
              </Table.Cell>
              <Table.Cell>
                <div className="flex gap-2">
                  {canApproveKyc(request.status) && (
                    <Button
                      type="button"
                      variant="primary"
                      size="small"
                      isLoading={actionKey === `${request.customerId}:approved`}
                      onClick={(e) => handleAction(e, request, "approved")}
                    >
                      Approve
                    </Button>
                  )}
                  {canRejectKyc(request.status) && (
                    <Button
                      type="button"
                      variant="danger"
                      size="small"
                      isLoading={actionKey === `${request.customerId}:rejected`}
                      onClick={(e) => handleAction(e, request, "rejected")}
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
          {requests.length === 0 && !isLoading && (
            <Table.Row>
              <Table.Cell colSpan={7} className="py-10 text-center text-ui-fg-subtle">
                No KYC submissions found.
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "KYC Requests",
})

export default KycRequestsPage
