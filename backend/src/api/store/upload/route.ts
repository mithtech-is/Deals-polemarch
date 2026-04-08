import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const file = (req as any).file

  if (!file) {
    return res.status(400).json({ message: "Missing file" })
  }

  try {
    const polemarchModule = req.scope.resolve("polemarch") as any
    const { url } = await polemarchModule.uploadLocal(file)

    res.json({ url })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const url = (req.query?.url as string) || ""

  if (!url) {
    return res.status(400).json({ message: "Missing url query parameter" })
  }

  try {
    const polemarchModule = req.scope.resolve("polemarch") as any
    const result = await polemarchModule.deleteFile(url)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
