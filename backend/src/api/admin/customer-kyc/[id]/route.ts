import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const { status, review_notes } = req.body as {
      status?: "approved" | "rejected"
      review_notes?: string
    }

    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ message: "Invalid KYC status" })
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const polemarchModule = req.scope.resolve("polemarch") as any
    const customer = await customerModule.retrieveCustomer(id)

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const currentStatus = customer.metadata?.kyc_status

    if (!currentStatus) {
      return res.status(400).json({ message: "Customer has no KYC submission" })
    }

    if (currentStatus === status || (currentStatus === "verified" && status === "approved")) {
      return res.json({
        ok: true,
        customer_id: id,
        status: currentStatus === "verified" ? "approved" : status,
        metadata: customer.metadata || {},
        skipped: true,
      })
    }

    if (polemarchModule?.listKycRequests && polemarchModule?.updateKycRequests) {
      const requests = await polemarchModule.listKycRequests(
        { customer_id: id },
        { take: 1, order: { created_at: "DESC" } }
      )

      if (Array.isArray(requests) && requests[0]) {
        await polemarchModule.updateKycRequests({
          id: requests[0].id,
          status,
        })
      } else if (polemarchModule?.createKycRequests) {
        await polemarchModule.createKycRequests({
          customer_id: id,
          pan_number: customer.metadata?.kyc_pan_number || "",
          aadhaar_number: customer.metadata?.kyc_aadhaar_number || "",
          dp_name: customer.metadata?.kyc_dp_name || "",
          demat_number: customer.metadata?.kyc_demat_number || "",
          pan_file_url: customer.metadata?.kyc_pan_file_url || "",
          cmr_file_url: customer.metadata?.kyc_cmr_file_url || "",
          status,
        })
      }
    }

    if (polemarchModule?.createNotifications) {
      await polemarchModule.createNotifications({
        customer_id: id,
        title: status === "approved" ? "KYC Approved" : "KYC Rejected",
        message:
          status === "approved"
            ? "Your KYC has been approved. You can now access investment features."
            : `Your KYC was rejected.${review_notes ? ` Reason: ${review_notes}` : ""}`,
        type: status === "approved" ? "kyc_approval" : "kyc_rejection",
      })
    }

      res.json({
      ok: true,
      customer_id: id,
      status,
      metadata: customer.metadata || {},
    })
  } catch (error: any) {
    console.error("Failed to update customer KYC:", error)
    res.status(500).json({
      message: error?.message || "Failed to update KYC status",
    })
  }
}
