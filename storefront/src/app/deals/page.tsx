import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceClient from "@/components/deals/MarketplaceClient";

import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";

export default async function MarketplacePage() {
    let deals: Deal[] = [];
    try {
        // Fetch region first to get correct pricing context
        const { regions } = await medusaClient.regions.list();
        const regionId = regions?.[0]?.id;

        const { products } = await medusaClient.products.list(regionId);
        deals = products.map(mapMedusaToDeal);
    } catch (error) {
        console.error("Error fetching deals:", error);
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <MarketplaceClient initialDeals={deals} />
            </main>
            <Footer />
        </div>
    );
}
