import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { file, userName, docType } = req.body as any

  if (!file || !userName || !docType) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  try {
    const polemarchModule = req.scope.resolve("polemarch") as any
    const { url } = await polemarchModule.uploadLocal(file, userName, docType)
    
    res.json({ url })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
