import Link from "next/link";
import DealCard from "./DealCard";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";

const FeaturedDeals = async () => {
    let deals: Deal[] = [];
    try {
        const { products } = await medusaClient.products.list();
        deals = products.map(mapMedusaToDeal).filter((d: Deal) => d.isTrending).slice(0, 3);
    } catch (error) {
        console.error("Error fetching featured deals:", error);
    }

    if (deals.length === 0) return null;

    return (
        <section className="py-24 bg-slate-50/50">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl font-bold tracking-tight mb-4 text-foreground">Trending Shares</h2>
                        <p className="text-lg text-foreground/70">
                            High-demand unlisted opportunities carefully curated for growth potential in the current market.
                        </p>
                    </div>
                    <Link href="/deals" className="inline-flex items-center justify-center text-primary font-bold hover:underline">
                        View all deals
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {deals.map((deal: Deal) => (
                        <DealCard key={deal.id} {...deal} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedDeals;
