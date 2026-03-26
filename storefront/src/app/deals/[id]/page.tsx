"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";
import { ArrowLeft, TrendingUp, ShoppingCart, Info, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";

export default function DealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [deal, setDeal] = useState<Deal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addItem } = useCart();
    const { user } = useUser();

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                let regionId: string | undefined;
                try {
                    const { regions } = await medusaClient.regions.list();
                    regionId = regions?.[0]?.id;
                } catch (regionError) {
                    console.error("Error fetching regions:", regionError);
                }

                const { product } = await medusaClient.products.retrieve(id, regionId);
                console.log("variant zero:", product.variants[0]);
                console.log(product.thumbnail);
                console.log(product.images);
                setDeal(mapMedusaToDeal(product));
            } catch (error) {
                console.error("Error fetching deal:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDeal();
    }, [id]);

    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (deal) {
            setQuantity(deal.minInvestment || 1);
        }
    }, [deal]);

    const handleAddToCart = () => {
        if (!user) {
            router.push(`/login?redirect=/deals/${id}`);
            return;
        }
        if (deal) {
            addItem(deal.variants?.[0]?.id, quantity);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold mb-4">Deal Not Found</h1>
                <Link href="/deals" className="text-primary font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    const renderBuyBox = () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl relative">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price per share</p>
                    <p className="text-3xl font-bold text-slate-900">₹{deal.price.toLocaleString()}</p>
                </div>
                <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-wider">
                    High Demand
                </span>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <label className="text-sm font-medium text-slate-700">
                        Quantity <span className="text-slate-400 font-normal">(Lot size {deal.lotSize || deal.minInvestment || 1})</span>
                    </label>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1">
                        <button
                            onClick={() => setQuantity(Math.max(deal.lotSize || deal.minInvestment || 1, quantity - (deal.lotSize || deal.minInvestment || 1)))}
                            className="h-8 w-8 rounded bg-white border border-slate-200 flex items-center justify-center text-sm font-bold hover:bg-slate-50 transition-all font-mono"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(deal.lotSize || deal.minInvestment || 1, parseInt(e.target.value) || (deal.lotSize || deal.minInvestment || 1)))}
                            className="w-12 bg-transparent text-center text-sm font-bold focus:outline-none border-none p-0"
                        />
                        <button
                            onClick={() => setQuantity(quantity + (deal.lotSize || deal.minInvestment || 1))}
                            className="h-8 w-8 rounded bg-white border border-slate-200 flex items-center justify-center text-sm font-bold hover:bg-slate-50 transition-all font-mono"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3 mb-8">
                <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Investment Value</span>
                    <span className="text-sm font-bold">₹{(deal.price * quantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Processing Fee (2%)</span>
                    <span className="text-sm font-bold">₹{(deal.price * quantity * 0.02).toLocaleString()}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-100">
                    <span className="text-base font-bold text-slate-900">Total Payable</span>
                    <span className="text-lg font-bold text-slate-900">₹{(deal.price * quantity * 1.02).toLocaleString()}</span>
                </div>
            </div>

            <button
                disabled={deal.price <= 0 || (user && user.metadata?.kyc_status !== "approved" && user.metadata?.kyc_status !== "verified")}
                onClick={handleAddToCart}
                className="w-full py-4 rounded-xl bg-[#083021] text-white font-bold hover:bg-[#052015] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {deal.price > 0 ? "Buy Shares" : "Price Unavailable"}
            </button>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-start gap-2">
                <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                    Prices are indicative and subject to market availability. All transactions are handled securely through escrow.
                </p>
            </div>

            {user && user.metadata?.kyc_status !== "approved" && user.metadata?.kyc_status !== "verified" && (
                <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-800">KYC Verification Required</p>
                    <Link href="/dashboard" className="text-[10px] font-bold text-emerald-700 hover:underline mt-1 block">
                        Go to Dashboard {"->"}
                    </Link>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Navbar />
            <main className="flex-grow py-12 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <Link href="/deals" className="text-emerald-900 font-medium hover:underline flex items-center gap-2 mb-8 text-sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Marketplace
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Logo & Header */}
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={deal.logo || "/assets/logos/placeholder.png"}
                                        alt={deal.name}
                                        width={80}
                                        height={80}
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{deal.name}</h1>
                                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mt-1">{deal.sector || "-"} • {deal.shareType || "UNLISTED"}</p>
                                </div>
                            </div>

                            {/* MOBILE ONLY: Buy Panel right under Header */}
                            <div className="block lg:hidden">
                                {renderBuyBox()}
                            </div>

                            {/* Chart Section */}
                            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Share Price</p>
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-4xl font-bold">₹{deal.price.toLocaleString()}</h2>
                                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                ~ +0.0% (1Y)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {['1W', '1M', '6M', '1Y'].map(tf => (
                                            <button key={tf} className={`px-3 py-1 text-xs font-bold rounded-md ${tf === '1Y' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50'}`}>
                                                {tf}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Placeholder Chart Area */}
                                <div className="h-48 w-full relative">
                                    {/* Mock curved svg line */}
                                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                                        <path d="M0,25 C20,25 30,30 50,15 C70,0 80,10 100,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                                        <path d="M0,25 C20,25 30,30 50,15 C70,0 80,10 100,5 L100,30 L0,30 Z" fill="url(#gradient)" stroke="none" />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                            </div>

                            {/* Metrics Row */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                    { label: "ISIN", value: deal.isin || "-" },
                                    { label: "MKT CAP", value: deal.marketCap || "-" },
                                    { label: "P/E RATIO", value: deal.peRatio || "-" },
                                    { label: "ROE", value: deal.roe ? `${deal.roe}%` : "-" },
                                    { label: "REVENUE", value: deal.revenue || "-" }
                                ].map((metric, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-[10px] text-slate-500 font-bold mb-1">{metric.label}</p>
                                        <p className="font-bold text-slate-900 text-sm overflow-hidden text-ellipsis">{metric.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Company Overview */}
                            <div className="pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                    <h3 className="text-xl font-bold">Company Overview</h3>
                                </div>
                                <div className="text-slate-600 text-sm leading-relaxed prose prose-slate">
                                    {deal.description || deal.summary || "-"}
                                </div>
                            </div>

                            {/* Financials */}
                            <div className="pt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                    <h3 className="text-xl font-bold">Financials</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex justify-between shadow-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">REVENUE (FY24)</p>
                                            <h4 className="text-2xl font-bold mb-1">{deal.revenueValue || "-"}</h4>
                                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                ↑ {deal.revenueGrowth || "-"} YoY
                                            </p>
                                        </div>
                                        <BarChart3 className="h-10 w-10 text-emerald-700 opacity-20 mt-auto" />
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex justify-between shadow-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">PROFIT AFTER TAX</p>
                                            <h4 className="text-2xl font-bold mb-1">{deal.profitValue || "-"}</h4>
                                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                ↑ {deal.profitGrowth || "-"} YoY
                                            </p>
                                        </div>
                                        <BarChart3 className="h-10 w-10 text-emerald-700 opacity-20 mt-auto" />
                                    </div>
                                </div>
                            </div>

                            {/* Company Details Grid */}
                            <div className="pt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                    <h3 className="text-xl font-bold">Company Details</h3>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    {[
                                        { label: "Founded", value: deal.founded || "-" },
                                        { label: "Headquarters", value: deal.headquarters || "-" },
                                        { label: "Valuation", value: deal.valuation || "-" },
                                        { label: "Face Value", value: deal.faceValue ? `₹${deal.faceValue}` : "-" },
                                        { label: "Share Type", value: deal.shareType || "-" },
                                        { label: "Depository", value: deal.depository || "-" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-slate-200 pb-3 last:border-0 md:[&:nth-last-child(2)]:border-0 md:last:border-b-0">
                                            <span className="text-xs text-slate-500">{item.label}</span>
                                            <span className="text-sm font-bold text-slate-900">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Buy Panel (Desktop right) */}
                        <div className="hidden lg:block lg:sticky lg:top-8 h-fit lg:col-span-1">
                            {renderBuyBox()}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
