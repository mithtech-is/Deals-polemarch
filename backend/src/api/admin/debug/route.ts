import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const results = {
        polemarchModule: false,
        fileService: false,
        kycService: false,
        notificationService: false
    }

    try {
        const polemarchModule = req.scope.resolve("polemarch") as any
        if (polemarchModule) {
            results.polemarchModule = true
            results.fileService = !!polemarchModule.uploadLocal
            results.kycService = !!polemarchModule.listKycRequests
            results.notificationService = !!polemarchModule.listAndCountNotifications
        }
    } catch (e) {}

    res.json({
        results,
        keys: req.scope.registrations ? Object.keys(req.scope.registrations) : []
    })
}
