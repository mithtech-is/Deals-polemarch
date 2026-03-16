import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, StatusBadge } from "@medusajs/ui"

const CustomerKycWidget = ({ data: customer }: { data: any }) => {
  const customerId = customer.id
  const metadata = customer.metadata || {}
  
  if (!metadata.kyc_status && !metadata.kyc_pan_number) {
    return null
  }

  const handleAction = async (status: string) => {
    try {
      const endpoint = status === 'verified' ? 'verify' : 'reject'
      await fetch(`/admin/kyc/${customerId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: status === 'rejected' ? JSON.stringify({ reason: "Documents unclear" }) : undefined
      })
      window.location.reload()
    } catch (e) {
      console.error("Action failed", e)
    }
  }

  return (
    <Container className="mt-4 p-6 font-['Space_Grotesk']">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">KYC Details</Heading>
        <StatusBadge color={
          metadata.kyc_status === 'verified' || metadata.kyc_status === 'approved' ? 'green' : 
          metadata.kyc_status === 'rejected' ? 'red' : 
          metadata.kyc_status === 'pending' || metadata.kyc_status === 'submitted' ? 'orange' : 'grey'
        }>
          {(metadata.kyc_status || "UNKNOWN").toUpperCase()}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">PAN Number</Text>
          <Text>{metadata.kyc_pan_number || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">Aadhaar Number</Text>
          <Text>{metadata.aadhaar_number || metadata.kyc_aadhaar_number || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">DP Name</Text>
          <Text>{metadata.kyc_dp_name || "N/A"}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">Demat Number</Text>
          <Text>{metadata.kyc_demat_number || "N/A"}</Text>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-6">
        {metadata.kyc_pan_file_url && (
            <a href={metadata.kyc_pan_file_url} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="small">View PAN File</Button>
            </a>
        )}
        {metadata.kyc_cmr_file_url && (
            <a href={metadata.kyc_cmr_file_url} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="small">View CMR File</Button>
            </a>
        )}
      </div>
      <div className="flex gap-2">
        <Button 
          variant="primary" 
          size="small" 
          onClick={() => handleAction('verified')} 
          disabled={metadata.kyc_status === 'verified'}
        >
          Approve
        </Button>
        <Button 
          variant="danger" 
          size="small" 
          onClick={() => handleAction('rejected')} 
          disabled={metadata.kyc_status === 'rejected'}
        >
          Reject
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default CustomerKycWidget
