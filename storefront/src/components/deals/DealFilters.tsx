"use client";

import { Search, Filter, ChevronDown, Check } from "lucide-react";
import { useState } from "react";

interface DealFiltersProps {
    search: string;
    setSearch: (val: string) => void;
    sector: string;
    setSector: (val: string) => void;
    marketCap: string;
    setMarketCap: (val: string) => void;
    sortBy: string;
    setSortBy: (val: string) => void;
    totalDeals: number;
}

const DealFilters = ({
    search,
    setSearch,
    sector,
    setSector,
    marketCap,
    setMarketCap,
    sortBy,
    setSortBy,
    totalDeals
}: DealFiltersProps) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 mb-12 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Search */}
                <div className="relative w-full lg:flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by company name or sector..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                </div>

                {/* Filter Tags / Selectors */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <FilterDropdown
                        label="Sector"
                        value={sector}
                        options={["All Sectors", "Finance", "FinTech", "Retail", "Manufacturing", "Tech", "Healthcare", "Hospitality"]}
                        onChange={setSector}
                    />

                    <FilterDropdown
                        label="Market Cap"
                        value={marketCap}
                        options={["All Market Caps", "Small Cap", "Mid Cap", "Large Cap", "Unspecified"]}
                        onChange={setMarketCap}
                    />
                </div>
            </div>

            {/* Active Filters / Results Info */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500 font-medium">
                    Showing <span className="text-slate-900 font-bold">{totalDeals}</span> unlisted share deals
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-slate-900"
                    >
                        <option value="latest">Latest Arrivals</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

const FilterDropdown = ({ label, options, value, onChange }: { label: string; options: string[]; value?: string; onChange?: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = value && value !== "All Sectors" && value !== "All Market Caps";

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${isActive
                        ? "bg-primary/5 text-primary border-primary/20"
                        : "bg-slate-50 text-slate-900 border-transparent hover:border-slate-200"
                    }`}
            >
                {value || label}
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onChange?.(opt);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between group hover:bg-slate-50 transition-colors ${value === opt ? "text-primary bg-primary/5" : "text-slate-600"
                                    }`}
                            >
                                {opt}
                                {value === opt && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default DealFilters;
