import { Metadata } from "next";
import { medusaClient, mapMedusaToDeal } from "./medusa";
import { formatPrice } from "./format";
import type { Deal } from "@/data/deals";

export async function generateDealMetadata(id: string): Promise<Metadata> {
    let deal: Deal | null = null;

    try {
        const { product } = await medusaClient.products.retrieve(id);
        deal = mapMedusaToDeal(product);
    } catch {
        return {
            title: "Unlisted Share Deal | Polemarch",
            description: "Invest in high-growth unlisted shares with Polemarch.",
        };
    }

    if (!deal) {
        return {
            title: "Unlisted Share Deal | Polemarch",
            description: "Invest in high-growth unlisted shares with Polemarch.",
        };
    }

    const title = `Buy ${deal.name} Unlisted Shares | Current Price & Valuation | Polemarch`;
    const description = `Invest in ${deal.name} unlisted shares at ₹${formatPrice(deal.price)}. ${deal.summary} Get verified listings, direct demat credit, and secure transactions at Polemarch.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: deal.logo,
                    width: 800,
                    height: 600,
                    alt: `${deal.name} Logo`,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [deal.logo],
        },
        keywords: [
            deal.name,
            "unlisted shares",
            "pre-IPO shares",
            "buy unlisted shares India",
            "Polemarch deals",
            deal.sector,
        ],
    };
}
