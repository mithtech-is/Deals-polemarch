import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const kycModule = req.scope.resolve("kyc") as any
  const { limit = 20, offset = 0, ...filters } = req.query as any

  const [kyc_requests, count] = await kycModule.listAndCountKycRequests(
    filters,
    { 
      skip: parseInt(offset as string) || 0, 
      take: parseInt(limit as string) || 20, 
      order: { created_at: "DESC" } 
    }
  )

  res.json({ kyc_requests, count })
}
