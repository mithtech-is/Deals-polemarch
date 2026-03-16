import { ICartModuleService, IProductModuleService } from "@medusajs/types";
import { Modules } from "@medusajs/framework/utils";
import { MedusaContainer } from "@medusajs/framework/types";
import { logger } from "../utils/logger";

export default class InventoryValidationService {
    protected cartModule: any;
    protected productModule: any;

    constructor(container: MedusaContainer) {
        this.cartModule = container.resolve(Modules.CART);
        this.productModule = container.resolve(Modules.PRODUCT);
    }

    async validateInventory(cartId: string) {
        logger.info(`Starting inventory validation for cart: ${cartId}`);
        let cart;
        try {
            // Try different methods as Medusa V2 modules might have different conventions
            if (typeof this.cartModule.retrieve === "function") {
                cart = await this.cartModule.retrieve(cartId, {
                    relations: ["items"]
                });
            } else if (typeof this.cartModule.retrieveCart === "function") {
                cart = await this.cartModule.retrieveCart(cartId, {
                    relations: ["items"]
                });
            } else {
                const methods = Object.keys(this.cartModule).filter(k => typeof this.cartModule[k] === "function");
                throw new Error(`Cart module has no standard retrieve method. Available methods: ${methods.join(", ")}`);
            }
            
            logger.info(`Retrieved cart ${cartId} successfully`);
        } catch (error: any) {
            logger.error(`Failed to retrieve cart ${cartId} in CartService`, { 
                error: error.message,
                cartModuleMethods: Object.keys(this.cartModule).filter(k => typeof this.cartModule[k] === "function")
            });
            throw new Error(`Could not retrieve cart: ${error.message}`);
        }

        if (!cart || !cart.items) {
            throw new Error("Cart not found or empty");
        }

        for (const item of cart.items) {
            const variantId = item.variant_id;
            const quantity = item.quantity;

            if (!variantId) {
                logger.warn(`Cart ${cartId} has item ${item.id} without variant_id`);
                continue;
            }

            const variant = await this.productModule.retrieveVariant(variantId);
            
            if (!variant) {
                logger.error(`Variant ${variantId} not found during cart validation`, { cartId });
                throw new Error(`Item ${item.title || variantId} no longer exists.`);
            }

            if (variant.inventory_quantity < quantity) {
                logger.error(`Inventory insufficient for variant ${variantId}. Requested: ${quantity}, Available: ${variant.inventory_quantity}`);
                throw new Error(`Insufficient inventory for ${variant.title || item.title || "selected shares"}. Available: ${variant.inventory_quantity}, Requested: ${quantity}`);
            }
        }

        return true;
    }
}
