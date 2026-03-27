import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceClient from "@/components/deals/MarketplaceClient";
import { getTrendingSectorProducts } from "@/lib/api/trendingSectors";

export const dynamic = "force-dynamic";

export default async function TrendingSectorsPage() {
    const deals = await getTrendingSectorProducts();

    return (
        <div className="flex min-h-screen flex-col bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <MarketplaceClient
                    initialDeals={deals}
                    title="Trending Sectors"
                    description="Explore companies highlighted across the strongest-performing sectors in the private market."
                    emptyTitle="No sector deals found for the current selection."
                    emptyDescription="Once shares are assigned to trending sectors, they will appear here automatically."
                />
            </main>
            <Footer />
        </div>
    );
}
