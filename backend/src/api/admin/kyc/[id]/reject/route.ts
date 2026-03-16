import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import KycService from "../../../../../services/kyc-service"

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.params
    const { reason } = req.body as { reason?: string }
    const kycService = req.scope.resolve("kycService") as KycService

    try {
        await kycService.reject(id, reason || "Documents unclear")
        res.json({ message: "KYC Rejected successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
