import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, StatusBadge } from "@medusajs/ui"

const CustomerKycWidget = ({ data }: { data: any }) => {
  const customerId = data.id
  const [kycRequest, setKycRequest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchKyc = async () => {
      try {
        const response = await fetch(`/admin/kyc?customer_id=${customerId}`)
        const json = await response.json()
        if (json.kyc_requests && json.kyc_requests.length > 0) {
          setKycRequest(json.kyc_requests[0])
        }
      } catch (e) {
        console.error("Failed to fetch KYC", e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchKyc()
  }, [customerId])

  if (isLoading) return <Container rounded="large"><Text>Loading KYC data...</Text></Container>
  if (!kycRequest) return null

  const handleAction = async (status: string) => {
    try {
      await fetch(`/admin/kyc/${kycRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      window.location.reload()
    } catch (e) {
      console.error("Action failed", e)
    }
  }

  return (
    <Container className="mt-4 p-6">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2" {...({} as any)}>KYC Details</Heading>
        <StatusBadge color={
          kycRequest.status === 'approved' ? 'green' : 
          kycRequest.status === 'rejected' ? 'red' : 
          kycRequest.status === 'on_hold' ? 'orange' : 'grey'
        }>
          {kycRequest.status.toUpperCase()}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">PAN Number</Text>
          <Text>{kycRequest.pan_number}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">Aadhaar Number</Text>
          <Text>{kycRequest.aadhaar_number}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">DP Name</Text>
          <Text>{kycRequest.dp_name}</Text>
        </div>
        <div>
          <Text size="small" className="text-ui-fg-subtle font-semibold">Demat Number</Text>
          <Text>{kycRequest.demat_number}</Text>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <a href={kycRequest.pan_file_url} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="small">View PAN File</Button>
        </a>
        <a href={kycRequest.cmr_file_url} target="_blank" rel="noreferrer">
          <Button variant="secondary" size="small">View CMR File</Button>
        </a>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="primary" 
          size="small" 
          onClick={() => handleAction('approved')} 
          disabled={kycRequest.status === 'approved'}
        >
          Approve
        </Button>
        <Button 
          variant="danger" 
          size="small" 
          onClick={() => handleAction('rejected')} 
          disabled={kycRequest.status === 'rejected'}
        >
          Reject
        </Button>
        <Button 
          variant="secondary" 
          size="small" 
          onClick={() => handleAction('on_hold')} 
          disabled={kycRequest.status === 'on_hold'}
        >
          Hold
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default CustomerKycWidget
