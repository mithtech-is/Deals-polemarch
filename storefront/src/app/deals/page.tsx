import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceClient from "@/components/deals/MarketplaceClient";

import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";

export default async function MarketplacePage() {
    let deals: Deal[] = [];
    try {
        let regionId: string | undefined;

        try {
            const { regions } = await medusaClient.regions.list();
            regionId = regions?.[0]?.id;
        } catch (regionError) {
            console.error("Error fetching regions:", regionError);
        }

        const { products } = regionId
            ? await medusaClient.products.list(regionId).catch(() => medusaClient.products.list())
            : await medusaClient.products.list();

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
