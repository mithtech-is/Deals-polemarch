import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const productModule = req.scope.resolve(Modules.PRODUCT) as any

    const product = await productModule.retrieveProduct(id, {
      relations: ["variants"],
    })

    if (!product || product.deleted_at) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json({ product })
  } catch (error: any) {
    console.error("Failed to fetch marketplace product:", error)
    res.status(500).json({
      message: error?.message || "Failed to fetch marketplace product",
    })
  }
}
