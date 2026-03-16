import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { pan_number, aadhaar_number, dp_name, demat_number, pan_file_url, cmr_file_url } = req.body as any
  const customerId = (req as any).auth_context?.app_metadata?.customer_id

  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  try {
    const polemarchModule = req.scope.resolve("polemarch") as any
    
    const kycRequest = await polemarchModule.createKycRequests({
      customer_id: customerId,
      pan_number,
      aadhaar_number,
      dp_name,
      demat_number,
      pan_file_url,
      cmr_file_url,
      status: "pending"
    })

    res.json({ kyc_request: kycRequest })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
