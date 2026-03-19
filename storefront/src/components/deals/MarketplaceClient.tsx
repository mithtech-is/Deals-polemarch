"use client";

import { useState, useMemo } from "react";
import DealFilters from "./DealFilters";
import DealCard from "@/components/home/DealCard";
import { Deal } from "@/data/deals";

interface MarketplaceClientProps {
    initialDeals: Deal[];
}

const MarketplaceClient = ({ initialDeals }: MarketplaceClientProps) => {
    const [search, setSearch] = useState("");
    const [sector, setSector] = useState("All Sectors");
    const [marketCap, setMarketCap] = useState("All Market Caps");
    const [sortBy, setSortBy] = useState("latest");

    const filteredDeals = useMemo(() => {
        let result = [...initialDeals];

        // Search filter
        if (search) {
            const query = search.toLowerCase();
            result = result.filter(
                (deal) =>
                    deal.name.toLowerCase().includes(query) ||
                    deal.sector.toLowerCase().includes(query)
            );
        }

        // Sector filter
        if (sector && sector !== "All Sectors") {
            const query = sector.toLowerCase();
            result = result.filter((deal) => deal.sector.toLowerCase() === query);
        }

        if (marketCap && marketCap !== "All Market Caps") {
            const query = marketCap.toLowerCase();
            result = result.filter((deal) => deal.marketCap.toLowerCase() === query);
        }

        // Sorting
        if (sortBy === "price-low") {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
            result.sort((a, b) => b.price - a.price);
        }

        return result;
    }, [initialDeals, marketCap, search, sector, sortBy]);

    return (
        <div className="container mx-auto">
            <div className="max-w-4xl mb-12">
                <h1 className="text-5xl font-bold tracking-tight mb-4">Unlisted Marketplace</h1>
                <p className="text-xl text-slate-600">
                    Discover and invest in India's most promising private companies and pre-IPO opportunities.
                </p>
            </div>

            <DealFilters
                search={search}
                setSearch={setSearch}
                sector={sector}
                setSector={setSector}
                marketCap={marketCap}
                setMarketCap={setMarketCap}
                sortBy={sortBy}
                setSortBy={setSortBy}
                totalDeals={filteredDeals.length}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDeals.length > 0 ? (
                    filteredDeals.map((deal) => (
                        <DealCard key={deal.id} {...deal} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
                        <p className="text-slate-500 mb-2">No deals found matching your criteria.</p>
                        <button
                            onClick={() => { setSearch(""); setSector("All Sectors"); setMarketCap("All Market Caps"); }}
                            className="text-primary font-bold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-20 p-12 rounded-[40px] bg-primary text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="max-w-2xl relative z-10">
                    <h2 className="text-3xl font-bold mb-4">Can't find a specific company?</h2>
                    <p className="text-primary-foreground/80 text-lg">
                        Let us know what you're looking for and our team will try to source it for you from our global network.
                    </p>
                </div>
                <button className="px-8 py-4 rounded-full bg-white text-primary font-bold hover:bg-slate-100 transition-all whitespace-nowrap relative z-10">
                    Request a Deal
                </button>
            </div>
        </div>
    );
};

export default MarketplaceClient;
