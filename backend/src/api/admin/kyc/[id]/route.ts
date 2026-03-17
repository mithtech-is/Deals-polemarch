import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const polemarchModule = req.scope.resolve("polemarch") as any

  const kyc_request = await polemarchModule.retrieveKycRequest(id)
  const reviews = await polemarchModule.listKycReviews({ kyc_request_id: id })

  res.json({ kyc_request, reviews })
}

export const PATCH = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { status, review_notes } = req.body as any
  const polemarchModule = req.scope.resolve("polemarch") as any
  const adminUser = (req as any).auth_context?.actor_id || "admin"

  console.log(`[KYC PATCH] Triggered for ID: ${id}, Status: ${status}, Admin: ${adminUser}`);

  // 1. Resolve KYC Request (Handle both kyc_request_id and customer_id)
  let kycRequest = await polemarchModule.retrieveKycRequest(id).catch(() => null)
  
  if (!kycRequest) {
    console.log(`[KYC PATCH] Request not found by ID ${id}, searching by customer_id...`);
    const requests = await polemarchModule.listKycRequests({ customer_id: id }, { take: 1, order: { created_at: "DESC" } })
    if (requests && requests.length > 0) {
      kycRequest = requests[0]
      console.log(`[KYC PATCH] Found KYC Request ID: ${kycRequest.id} for Customer: ${id}`);
    }
  }

  if (!kycRequest) {
    console.error(`[KYC PATCH] KYC request not found for ID: ${id}`);
    return res.status(404).json({ message: "KYC request not found" })
  }

  // 2. Update KYC Request Status
  const updatedRequest = await polemarchModule.updateKycRequests({
    id: kycRequest.id,
    status
  })
  console.log(`[KYC PATCH] Module status updated to: ${status}`);

  // 3. Sync with Customer Metadata
  if (kycRequest.customer_id) {
    try {
      const { run } = updateCustomersWorkflow(req.scope)
      await run({
        input: {
          selector: { id: kycRequest.customer_id },
          update: {
            metadata: {
              kyc_status: status,
              kyc_submitted_at: kycRequest.created_at
            }
          }
        }
      })
      console.log(`[KYC PATCH] Customer ${kycRequest.customer_id} metadata synced with status: ${status}`);
    } catch (error: any) {
      console.error(`[KYC PATCH] Failed to sync customer metadata: ${error.message}`);
    }
  }

  // 4. Add to audit trail
  await polemarchModule.createKycReviews({
    kyc_request_id: kycRequest.id,
    action: status,
    review_notes,
    reviewed_by: adminUser
  })

  // 5. Trigger event for subscribers
  const eventBus = req.scope.resolve("event_bus")
  if (eventBus) {
    await eventBus.emit({
      name: `kyc.${status}`,
      data: { id: kycRequest.id, customer_id: kycRequest.customer_id }
    })
  }

  console.log(`[KYC PATCH] Process completed successfully for ${id}`);
  res.json({ kyc_request: updatedRequest })
}
