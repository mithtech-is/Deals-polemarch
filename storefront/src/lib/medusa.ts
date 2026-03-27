const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

const medusaHeaders = {
    "Content-Type": "application/json",
    "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null;
    return {
        ...medusaHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const readTextMetadata = (metadata: Record<string, any> | undefined, keys: string[]) => {
    for (const key of keys) {
        const value = metadata?.[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
};

const readNumberMetadata = (metadata: Record<string, any> | undefined, keys: string[]) => {
    for (const key of keys) {
        const value = metadata?.[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === "string" && value.trim()) {
            const parsed = Number(value.replace(/[^0-9.]/g, ""));
            if (Number.isFinite(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }

    return 0;
};

const normalizeSector = (medusaProduct: any) => {
    const sector =
        readTextMetadata(medusaProduct.metadata, ["sector", "industry", "category"]) ||
        medusaProduct.subtitle ||
        "General / Unlisted";

    return sector.trim();
};

const normalizeMarketCap = (medusaProduct: any) => {
    const rawMarketCap = readTextMetadata(medusaProduct.metadata, [
        "market_cap_bucket",
        "market_cap_category",
        "market_cap",
        "marketCap",
    ]);

    if (!rawMarketCap) {
        return "Unspecified";
    }

    const normalized = rawMarketCap.toLowerCase();

    if (normalized.includes("small")) return "Small Cap";
    if (normalized.includes("mid")) return "Mid Cap";
    if (normalized.includes("large")) return "Large Cap";

    return rawMarketCap;
};

export const medusaClient = {
    products: {
        list: async (regionId?: string) => {
            const query = new URLSearchParams();
            if (regionId) query.append("region_id", regionId);

            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${query.toString()}`, {
                headers: medusaHeaders,
                cache: "no-store",
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch products");
            return response.json();
        },
        retrieve: async (id: string, regionId?: string) => {
            const query = new URLSearchParams();
            if (regionId) query.append("region_id", regionId);

            // Fetch from standard products endpoint to receive calculated pricing
            const isHandle = !id.startsWith("prod_");
            if (isHandle) query.append("handle", id);
            else query.append("id", id);

            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${query.toString()}`, {
                headers: medusaHeaders,
                cache: "no-store",
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch product");
            const data = await response.json();
            return { product: data.products?.[0] || null };
        },
    },
    regions: {
        list: async () => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, {
                headers: medusaHeaders,
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch regions");
            return response.json();
        },
    },
    carts: {
        create: async (regionId: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ region_id: regionId }),
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to create cart");
            return response.json();
        },
        retrieve: async (id: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${id}`, {
                headers: medusaHeaders,
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) throw new Error(`Failed to retrieve cart ${id}`);
            return response.json();
        },
        addItems: async (cartId: string, variantId: string, quantity: number, metadata?: any) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/line-items`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ variant_id: variantId, quantity, metadata }),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to add item to cart ${cartId}`);
            }
            return response.json();
        },
        updateItem: async (cartId: string, lineItemId: string, quantity: number) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/line-items/${lineItemId}`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ quantity }),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) throw new Error("Failed to update item");
            return response.json();
        },
        deleteItem: async (cartId: string, lineItemId: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/line-items/${lineItemId}`, {
                method: "DELETE",
                headers: medusaHeaders,
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) throw new Error("Failed to delete item");
            return response.json();
        },
        update: async (id: string, data: any) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${id}`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify(data),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) throw new Error("Failed to update cart");
            return response.json();
        },
        createPaymentCollection: async (cartId: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/payment-collections`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ cart_id: cartId }),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to create payment collection");
            }
            return response.json();
        },
        initializePaymentSession: async (collectionId: string, providerId: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/payment-collections/${collectionId}/payment-sessions`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ provider_id: providerId }),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to initialize payment session");
            }
            return response.json();
        },
        complete: async (id: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${id}/complete`, {
                method: "POST",
                headers: medusaHeaders,
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to complete checkout");
            }
            return response.json();
        },
        listShippingOptions: async (cartId: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/shipping-options?cart_id=${cartId}`, {
                headers: medusaHeaders,
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) throw new Error("Failed to fetch shipping options");
            return response.json();
        },
        addShippingMethod: async (cartId: string, option_id: string) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/shipping-methods`, {
                method: "POST",
                headers: medusaHeaders,
                body: JSON.stringify({ option_id }),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to add shipping method");
            }
            return response.json();
        },
    },
    orders: {
        list: async () => {
            const query = new URLSearchParams({
                fields: "id,display_id,created_at,canceled_at,fulfillment_status,payment_status,total,shipping_address.*,items.*",
            });
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/orders?${query.toString()}`, {
                method: "GET",
                headers: getAuthHeaders(),
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok) {
                const text = await response.text();
                console.error("Order fetch error:", text);
                throw new Error("Failed to fetch orders");
            }
            return response.json();
        },
    },
    auth: {
        register: async (data: any) => {
            // Medusa V2 Two-Step Registration
            // 1. Create Auth Identity
            const authResponse = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                }),
                credentials: "include",
            });

            if (!authResponse.ok) {
                const errorData = await authResponse.json();
                throw new Error(errorData.message || "Auth registration failed");
            }

            const { token } = await authResponse.json();

            // 2. Create Customer with the registration token
            const customerResponse = await fetch(`${MEDUSA_BACKEND_URL}/store/customers`, {
                method: "POST",
                headers: {
                    ...medusaHeaders,
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: data.email,
                    first_name: data.first_name,
                    last_name: data.last_name,
                }),
                credentials: "include",
            });

            if (!customerResponse.ok) {
                const errorData = await customerResponse.json();
                throw new Error(errorData.message || "Customer creation failed");
            }

            return customerResponse.json();
        },
        login: async (data: any) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Login failed");
            }
            const result = await response.json();
            if (result.token && typeof window !== "undefined") {
                localStorage.setItem("medusa_auth_token", result.token);
            }
            return result;
        },
        logout: async () => {
            if (typeof window !== "undefined") {
                localStorage.removeItem("medusa_auth_token");
            }
            const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/logout`, {
                method: "DELETE",
                headers: medusaHeaders,
                credentials: "include",
            });
            return response.ok;
        },
    },
    customers: {
        retrieve: async () => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
                headers: getAuthHeaders(),
                credentials: "include",
            });
            if (!response.ok) {
                return null;
            }
            return response.json();
        },
        update: async (data: any) => {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Update failed");
            }
            return response.json();
        }
    }
};

// Helper to map Medusa products to our "Deal" interface
export const mapMedusaToDeal = (medusaProduct: any) => {
    // In Medusa V2, we prefer variants[0].calculated_price
    const variant = medusaProduct.variants?.[0];

    const price =
        variant?.calculated_price?.calculated_amount != null
            ? variant.calculated_price.calculated_amount
            : 0;

    const minInvestment = readNumberMetadata(medusaProduct.metadata, ["min_investment", "minimum_investment"]) || 1;
    const sector = normalizeSector(medusaProduct);
    const marketCap = normalizeMarketCap(medusaProduct);

    return {
        id: medusaProduct.id,
        handle: medusaProduct.handle,
        name: medusaProduct.title,
        createdAt: medusaProduct.created_at || medusaProduct.updated_at || "",
        logo: medusaProduct.thumbnail || medusaProduct.images?.[0]?.url || "/assets/logos/placeholder.png",
        sector,
        marketCap,
        price: price,
        minInvestment: minInvestment,
        isin: medusaProduct.metadata?.isin || "",
        quantity: variant?.inventory_quantity || 100000, // Default for deals
        summary: medusaProduct.description || "",
        description: medusaProduct.metadata?.long_description || medusaProduct.description || "",
        isTrending: medusaProduct.metadata?.is_trending === "true" || medusaProduct.metadata?.is_trending === true,
        financials: typeof medusaProduct.metadata?.financials === "string"
            ? JSON.parse(medusaProduct.metadata.financials)
            : medusaProduct.metadata?.financials || [],
        metadata: medusaProduct.metadata || {},
        variants: medusaProduct.variants || [],
        peRatio: medusaProduct.metadata?.pe_ratio,
        roe: medusaProduct.metadata?.roe,
        revenue: medusaProduct.metadata?.revenue,
        founded: medusaProduct.metadata?.founded,
        headquarters: medusaProduct.metadata?.headquarters,
        valuation: medusaProduct.metadata?.valuation,
        faceValue: medusaProduct.metadata?.face_value,
        shareType: medusaProduct.metadata?.share_type,
        depository: medusaProduct.metadata?.depository,
        lotSize: medusaProduct.metadata?.lot_size,
        availability: medusaProduct.metadata?.availability_percent,
        revenueValue: medusaProduct.metadata?.revenue_value,
        profitValue: medusaProduct.metadata?.profit_value,
        revenueGrowth: medusaProduct.metadata?.revenue_growth,
        profitGrowth: medusaProduct.metadata?.profit_growth
    };
};
