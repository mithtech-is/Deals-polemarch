import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import KycService from "../../../../../services/kyc-service"

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { id } = req.params
    const kycService = req.scope.resolve("kycService") as KycService

    try {
        await kycService.verify(id)
        res.json({ message: "KYC Verified successfully" })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}
