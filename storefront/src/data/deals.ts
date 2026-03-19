import FinancialsTable from "@/components/product/FinancialsTable";

export interface Deal {
    id: string;
    handle?: string;
    name: string;
    logo: string;
    sector: string;
    marketCap: string;
    price: number;
    minInvestment: number; // in units
    quantity: number;
    summary: string;
    description: string;
    isTrending?: boolean;
    isin: string;
    financials: {
        year: string;
        revenue: number;
        ebitda: number;
        pat: number;
    }[];
    metadata?: Record<string, any>;
    variants?: any[];
}

// MIGRATED_DEALS removed - using Medusa backend as source of truth.

export const HOW_IT_WORKS = [
    {
        title: "Discover Pre-IPO Shares",
        description: "Browse curated unlisted and Pre-IPO opportunities with verified availability and indicative pricing. Review company background, business model, sector positioning, and key financial highlights to assess suitability."
    },
    {
        title: "Verify & Place Order",
        description: "Confirm pricing, minimum investment quantity, and settlement terms with our team. Once verified, proceed with order placement through a structured process designed for clarity and compliance."
    },
    {
        title: "Settlement & Holding",
        description: "Upon successful settlement, shares are transferred directly to your demat account. You receive confirmation of execution and holding details. Investors can track allocations, corporate actions, and company updates."
    }
];
