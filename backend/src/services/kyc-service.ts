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
        return await this.customerModule.updateCustomers(id, {
            metadata: {
                ...(customer.metadata || {}),
                kyc_status: "verified",
                verified_at: new Date().toISOString()
            }
        });
    }

    async reject(id: string, reason: string) {
        const customer = await this.customerModule.retrieveCustomer(id);
        return await this.customerModule.updateCustomers(id, {
            metadata: {
                ...(customer.metadata || {}),
                kyc_status: "rejected",
                kyc_rejection_reason: reason,
                rejected_at: new Date().toISOString()
            }
        });
    }
}
