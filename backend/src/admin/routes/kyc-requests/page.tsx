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
            const response = await fetch("/admin/kyc")
            const json = await response.json()
            setRequests(json.kyc_requests || [])
            setCount(json.count || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleAction = async (id: string, status: string) => {
        try {
            await fetch(`/admin/kyc/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            fetchRequests()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Container className="p-6">
            <div className="flex items-center justify-between mb-6">
                <Heading level="h1" {...({} as any)}>KYC Requests</Heading>
                <Text className="text-ui-fg-subtle">Total {count} requests</Text>
            </div>
            <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Customer ID</Table.HeaderCell>
                        <Table.HeaderCell>PAN</Table.HeaderCell>
                        <Table.HeaderCell>Demat Number</Table.HeaderCell>
                        <Table.HeaderCell>Submitted At</Table.HeaderCell>
                        <Table.HeaderCell>Status</Table.HeaderCell>
                        <Table.HeaderCell>Actions</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {requests.map((request) => (
                        <Table.Row key={request.id}>
                            <Table.Cell className="cursor-pointer hover:underline" onClick={() => navigate(`/admin/customers/${request.customer_id}`)}>
                                {request.customer_id}
                            </Table.Cell>
                            <Table.Cell>{request.pan_number}</Table.Cell>
                            <Table.Cell>{request.demat_number}</Table.Cell>
                            <Table.Cell>{new Date(request.created_at).toLocaleDateString()}</Table.Cell>
                            <Table.Cell>
                                <StatusBadge color={
                                    request.status === 'approved' ? 'green' : 
                                    request.status === 'rejected' ? 'red' : 
                                    request.status === 'on_hold' ? 'orange' : 'grey'
                                }>
                                    {request.status.toUpperCase()}
                                </StatusBadge>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="small" onClick={() => handleAction(request.id, 'approved')}>Approve</Button>
                                    <Button variant="secondary" size="small" onClick={() => handleAction(request.id, 'rejected')}>Reject</Button>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "KYC Requests",
})

export default KycRequestsPage
