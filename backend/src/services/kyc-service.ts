import { ICustomerModuleService } from "@medusajs/types";
import { Modules } from "@medusajs/framework/utils";
import { MedusaContainer } from "@medusajs/framework/types";

export default class KycService {
    protected customerModule: any;

    constructor(container: MedusaContainer) {
        this.customerModule = container.resolve(Modules.CUSTOMER);
    }

    async listPending() {
        const result = await this.customerModule.listCustomers({}, {
            select: ["id", "email", "first_name", "last_name", "metadata", "created_at"]
        });
        const customers = Array.isArray(result) ? result : [];
        return customers.filter((c: any) => 
            c.metadata?.kyc_status === "submitted" || c.metadata?.kyc_status === "pending"
        );
    }

    async verify(id: string) {
        const customer = await this.customerModule.retrieveCustomer(id);
        const updatedCustomer = await this.customerModule.updateCustomers(id, {
            metadata: {
                ...(customer.metadata || {}),
                kyc_status: "approved",
                verified_at: new Date().toISOString()
            }
        });

        // Add notification logic
        try {
            const polemarchModule = (this as any).customerModule.__container__.resolve("polemarch");
            await polemarchModule.createNotifications({
                customer_id: id,
                title: "KYC Approved 🎉",
                message: "Congratulations! Your KYC verification has been successfully approved. You can now start investing in Pre-IPO and unlisted shares on Polemarch.",
                type: "kyc_approval"
            });
        } catch (e) {
            console.error("Failed to create notification", e);
        }

        return updatedCustomer;
    }

    async approve(id: string) {
        return this.verify(id);
    }

    async reject(id: string, reason: string) {
        const customer = await this.customerModule.retrieveCustomer(id);
        const updatedCustomer = await this.customerModule.updateCustomers(id, {
            metadata: {
                ...(customer.metadata || {}),
                kyc_status: "rejected",
                kyc_rejection_reason: reason,
                rejected_at: new Date().toISOString()
            }
        });

        // Add notification for rejection
        try {
            const polemarchModule = (this as any).customerModule.__container__.resolve("polemarch");
            await polemarchModule.createNotifications({
                customer_id: id,
                title: "KYC Rejected",
                message: `Your KYC verification was rejected. Reason: ${reason}. Please re-submit with correct details.`,
                type: "kyc_rejection"
            });
        } catch (e) {
            console.error("Failed to create rejection notification", e);
        }

        return updatedCustomer;
    }
}
