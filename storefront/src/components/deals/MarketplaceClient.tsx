"use client";

import { useState, useMemo } from "react";
import DealFilters from "./DealFilters";
import DealCard from "@/components/home/DealCard";
import { Deal } from "@/data/deals";

interface MarketplaceClientProps {
    initialDeals: Deal[];
    title?: string;
    description?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    showRequestDealCta?: boolean;
}

const normalizeValue = (value?: string) => (value || "").trim().toLowerCase();

const MarketplaceClient = ({
    initialDeals,
    title = "Unlisted Marketplace",
    description = "Discover and invest in India's most promising private companies and pre-IPO opportunities.",
    emptyTitle = "No deals found matching your criteria.",
    emptyDescription = "",
    showRequestDealCta = true,
}: MarketplaceClientProps) => {
    const [search, setSearch] = useState("");
    const [sector, setSector] = useState("All Sectors");
    const [marketCap, setMarketCap] = useState("All Market Caps");
    const [sortBy, setSortBy] = useState("latest");

    const sectorOptions = useMemo(() => {
        const uniqueSectors = Array.from(
            new Set(
                initialDeals
                    .map((deal) => deal.sector?.trim())
                    .filter((value): value is string => Boolean(value))
            )
        ).sort((first, second) => first.localeCompare(second));

        return ["All Sectors", ...uniqueSectors];
    }, [initialDeals]);

    const marketCapOptions = useMemo(() => {
        const uniqueMarketCaps = Array.from(
            new Set(
                initialDeals
                    .map((deal) => deal.marketCap?.trim())
                    .filter((value): value is string => Boolean(value))
            )
        ).sort((first, second) => first.localeCompare(second));

        return ["All Market Caps", ...uniqueMarketCaps];
    }, [initialDeals]);

    const filteredDeals = useMemo(() => {
        let result = [...initialDeals];

        // Search filter
        if (search) {
            const query = normalizeValue(search);
            result = result.filter(
                (deal) =>
                    normalizeValue(deal.name).includes(query) ||
                    normalizeValue(deal.sector).includes(query)
            );
        }

        // Sector filter
        if (sector && sector !== "All Sectors") {
            const query = normalizeValue(sector);
            result = result.filter((deal) => normalizeValue(deal.sector) === query);
        }

        if (marketCap && marketCap !== "All Market Caps") {
            const query = normalizeValue(marketCap);
            result = result.filter((deal) => normalizeValue(deal.marketCap) === query);
        }

        // Sorting
        if (sortBy === "latest") {
            result.sort((a, b) => {
                const firstDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const secondDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

                return secondDate - firstDate;
            });
        } else if (sortBy === "price-low") {
            result.sort((a, b) => a.price - b.price);
        } else if (sortBy === "price-high") {
            result.sort((a, b) => b.price - a.price);
        }

        return result;
    }, [initialDeals, marketCap, search, sector, sortBy]);

    return (
        <div className="container mx-auto">
            <div className="max-w-4xl mb-12">
                <h1 className="text-5xl font-bold tracking-tight mb-4">{title}</h1>
                <p className="text-xl text-slate-600">
                    {description}
                </p>
            </div>

            <DealFilters
                search={search}
                setSearch={setSearch}
                sector={sector}
                setSector={setSector}
                sectorOptions={sectorOptions}
                marketCap={marketCap}
                setMarketCap={setMarketCap}
                marketCapOptions={marketCapOptions}
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
                        <p className="text-slate-500 mb-2">{emptyTitle}</p>
                        {emptyDescription ? (
                            <p className="mb-3 text-sm text-slate-400">{emptyDescription}</p>
                        ) : null}
                        <button
                            onClick={() => { setSearch(""); setSector("All Sectors"); setMarketCap("All Market Caps"); }}
                            className="text-primary font-bold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {showRequestDealCta ? (
                <div className="mt-20 p-12 rounded-[40px] bg-primary text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="max-w-2xl relative z-10">
                        <h2 className="text-3xl font-bold mb-4">Can&apos;t find a specific company?</h2>
                        <p className="text-primary-foreground/80 text-lg">
                            Let us know what you&apos;re looking for and our team will try to source it for you from our global network.
                        </p>
                    </div>
                    <button className="px-8 py-4 rounded-full bg-white text-primary font-bold hover:bg-slate-100 transition-all whitespace-nowrap relative z-10">
                        Request a Deal
                    </button>
                </div>
            ) : null}
        </div>
    );
};

export default MarketplaceClient;
