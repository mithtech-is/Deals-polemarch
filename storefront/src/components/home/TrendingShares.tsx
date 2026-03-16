import Link from "next/link";
import DealCard from "./DealCard";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";

const TrendingShares = async () => {
    let deals: Deal[] = [];
    try {
        const { products } = await medusaClient.products.list();
        deals = products.map(mapMedusaToDeal).filter((d: Deal) => d.isTrending);
    } catch (error) {
        console.error("Error fetching trending shares:", error);
    }

    if (deals.length === 0) return null;

    return (
        <section className="py-16 bg-[#124433]">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">Trending Shares</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {deals.map((deal: Deal) => (
                        <DealCard key={deal.id} {...deal} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrendingShares;
