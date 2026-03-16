import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, StatusBadge, Button, Text } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"

const KycRequestsPage = () => {
    const [requests, setRequests] = useState<any[]>([])
    const [count, setCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    const fetchRequests = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/admin/customers")
            const json = await response.json()
            const allCustomers = json.customers || []
            
            // Filter customers who have any KYC metadata
            const kycRequests = allCustomers.filter((c: any) => 
                c.metadata?.kyc_status || c.metadata?.kyc_pan_number || c.metadata?.kyc_demat_number
            ).map((c: any) => ({
                id: c.id,
                customer_id: c.id,
                email: c.email,
                name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
                pan_number: c.metadata?.kyc_pan_number,
                demat_number: c.metadata?.kyc_demat_number,
                dp_name: c.metadata?.kyc_dp_name,
                pan_url: c.metadata?.kyc_pan_file_url,
                cmr_url: c.metadata?.kyc_cmr_file_url,
                status: c.metadata?.kyc_status,
                created_at: c.metadata?.kyc_submitted_at || c.created_at
            }))

            setRequests(kycRequests)
            setCount(kycRequests.length)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleAction = async (customerId: string, status: string) => {
        try {
            const endpoint = status === 'approved' ? 'verify' : 'reject'
            await fetch(`/admin/kyc/${customerId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: status === 'rejected' ? JSON.stringify({ reason: "Documents unclear" }) : undefined
            })
            fetchRequests()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Container className="p-6">
            <div className="flex items-center justify-between mb-6">
                <Heading level="h1">KYC Submissions</Heading>
                <Text className="text-ui-fg-subtle">Total {count} submissions</Text>
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
                        <Table.Row key={request.id}>
                            <Table.Cell className="cursor-pointer hover:underline" onClick={() => navigate(`/admin/customers/${request.customer_id}`)}>
                                <div className="flex flex-col">
                                    <span className="font-bold text-ui-fg-base">{request.name}</span>
                                    <span className="text-xs text-ui-fg-subtle">{request.email}</span>
                                </div>
                            </Table.Cell>
                            <Table.Cell>{request.pan_number || "N/A"}</Table.Cell>
                            <Table.Cell>{request.demat_number || "N/A"}</Table.Cell>
                            <Table.Cell>{new Date(request.created_at).toLocaleDateString()}</Table.Cell>
                            <Table.Cell>
                                <div className="flex flex-col gap-1">
                                    {request.pan_url && (
                                        <a href={request.pan_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs font-medium">
                                            PAN Card
                                        </a>
                                    )}
                                    {request.cmr_url && (
                                        <a href={request.cmr_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs font-medium">
                                            CMR Copy
                                        </a>
                                    )}
                                    {!request.pan_url && !request.cmr_url && "No docs"}
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <StatusBadge color={
                                    request.status === 'approved' || request.status === 'verified' ? 'green' : 
                                    request.status === 'rejected' ? 'red' : 
                                    request.status === 'pending' || request.status === 'submitted' ? 'orange' : 'grey'
                                }>
                                    {(request.status || "UNKNOWN").toUpperCase()}
                                </StatusBadge>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="flex gap-2">
                                    {request.status !== 'approved' && request.status !== 'verified' && (
                                        <Button variant="primary" size="small" onClick={() => handleAction(request.customer_id, 'approved')}>Approve</Button>
                                    )}
                                    {request.status !== 'rejected' && (
                                        <Button variant="danger" size="small" onClick={() => handleAction(request.customer_id, 'rejected')}>Reject</Button>
                                    )}
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                    {requests.length === 0 && !isLoading && (
                        <Table.Row>
                            <Table.Cell colSpan={7} className="text-center py-10 text-ui-fg-subtle">
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
