import Link from "next/link";
import DealCard from "./DealCard";
import { type Deal } from "@/data/deals";
import { getMarketplaceProducts } from "@/lib/api/trendingSectors";
import { mapMedusaToDeal } from "@/lib/medusa";

const FeaturedDeals = async () => {
    let deals: Deal[] = [];
    try {
        const products = await getMarketplaceProducts();
        deals = products
            .map(mapMedusaToDeal)
            .filter((deal: Deal) => deal.isTrending)
            .slice(0, 3);
    } catch (error) {
        console.error("Error fetching featured deals:", error);
    }

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

                {deals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {deals.map((deal: Deal) => (
                            <DealCard key={deal.id} {...deal} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center">
                        <p className="text-lg font-bold text-slate-700">No trending shares available yet.</p>
                        <p className="mt-2 text-sm text-slate-500">
                            Highlight shares from the dashboard and they will appear here automatically.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default FeaturedDeals;
