import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const kycModule = req.scope.resolve("kyc") as any

  const kyc_request = await kycModule.retrieveKycRequest(id)
  const reviews = await kycModule.listKycReviews({ kyc_request_id: id })

  res.json({ kyc_request, reviews })
}

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { status, review_notes } = req.body as any
  const kycModule = req.scope.resolve("kyc") as any
  const adminUser = (req as any).auth_context?.actor_id || "admin"

  const updatedRequest = await kycModule.updateKycRequests({
    id,
    status
  })

  // Add to audit trail
  await kycModule.createKycReviews({
    kyc_request_id: id,
    action: status,
    review_notes,
    reviewed_by: adminUser
  })

  // Trigger event for subscribers to handle notifications
  const eventBus = req.scope.resolve("event_bus")
  if (eventBus) {
    await eventBus.emit({
      name: `kyc.${status}`,
      data: { id, customer_id: updatedRequest.customer_id }
    })
  }

  res.json({ kyc_request: updatedRequest })
}
