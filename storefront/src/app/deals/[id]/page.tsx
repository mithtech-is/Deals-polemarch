"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";
import { ArrowLeft, ShieldCheck, Zap, TrendingUp, ShoppingCart, Info, BarChart3 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import FinancialsTable from "@/components/product/FinancialsTable";

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
                const { product } = await medusaClient.products.retrieve(id);
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

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow py-12 px-4 sm:px-6">
                <div className="container mx-auto">
                    <Link href="/deals" className="text-primary font-bold hover:underline flex items-center gap-2 mb-12">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Marketplace
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div>
                            <div className="flex items-center gap-6 mb-8">
                                <div className="h-24 w-24 rounded-3xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-center">
                                    <Image
                                        src={deal.logo || "/assets/logos/placeholder.png"}
                                        alt={deal.name}
                                        width={80}
                                        height={80}
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-4xl font-bold tracking-tight">{deal.name}</h1>
                                        {deal.isTrending && (
                                            <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-wider">Trending</span>
                                        )}
                                    </div>
                                    <p className="text-xl text-slate-500 font-medium">{deal.sector}</p>
                                </div>
                            </div>

                            <div className="prose prose-slate max-w-none mb-12">
                                <h3 className="text-2xl font-bold mb-4">Company Overview</h3>
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    {deal.description || deal.summary || "No detailed description available for this company."}
                                </p>
                            </div>

                            {deal.financials && deal.financials.length > 0 && (
                                <FinancialsTable data={deal.financials} />
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <ShieldCheck className="h-6 w-6 text-primary mb-3" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Settlement</p>
                                    <p className="font-bold">NSDL/CDSL</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <Zap className="h-6 w-6 text-orange-600 mb-3" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Transfer Time</p>
                                    <p className="font-bold">T+2 Days</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <BarChart3 className="h-6 w-6 text-blue-600 mb-3" />
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Share Type</p>
                                    <p className="font-bold">Equity</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:sticky lg:top-32 h-fit">
                            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="mb-8 p-6 rounded-3xl bg-slate-50">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Price per share</p>
                                                <p className="text-4xl font-bold text-slate-900">Rs. {deal.price.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-primary flex items-center gap-1 justify-end">
                                                    <TrendingUp className="h-3 w-3" />
                                                    High Demand
                                                </p>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-[75%]" />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Available Inventory: {deal.quantity.toLocaleString()} shares</p>
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Quantity to Buy</label>
                                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-2">
                                            <button
                                                onClick={() => setQuantity(Math.max(deal.minInvestment || 1, quantity - (deal.minInvestment || 1)))}
                                                className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl font-bold transition-all hover:bg-slate-50 active:scale-95"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(deal.minInvestment || 1, parseInt(e.target.value) || (deal.minInvestment || 1)))}
                                                className="flex-grow bg-transparent text-center text-xl font-bold focus:outline-none border-none"
                                            />
                                            <button
                                                onClick={() => setQuantity(quantity + (deal.minInvestment || 1))}
                                                className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl font-bold transition-all hover:bg-slate-50 active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">Step size: {deal.minInvestment || 1} shares</p>
                                    </div>

                                    <div className="space-y-4 mb-8 pt-6 border-t border-slate-50">
                                        <div className="flex justify-between py-1">
                                            <span className="text-slate-500 font-medium">Investment Value</span>
                                            <span className="font-bold">Rs. {(deal.price * quantity).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-slate-500 font-medium">Processing Fee</span>
                                            <span className="font-bold text-green-600">Rs. 0 (Limited Time)</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={deal.price <= 0 || (user && user.metadata?.kyc_status !== "approved" && user.metadata?.kyc_status !== "verified")}
                                        onClick={handleAddToCart}
                                        className="w-full py-5 rounded-2xl bg-primary text-white font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                    >
                                        <ShoppingCart className="h-6 w-6" />
                                        {deal.price > 0 ? "Buy Shares" : "Price Unavailable"}
                                    </button>

                                    {user && user.metadata?.kyc_status !== "approved" && user.metadata?.kyc_status !== "verified" && (
                                        <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-100 flex gap-3">
                                            <Info className="h-5 w-5 text-orange-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-orange-800">KYC Verification Required</p>
                                                <p className="text-xs text-orange-700 mt-1">
                                                    {user.metadata?.kyc_status === "pending" || user.metadata?.kyc_status === "submitted"
                                                        ? "Your KYC verification is pending. You will be able to invest once it is approved."
                                                        : user.metadata?.kyc_status === "rejected"
                                                        ? "Your KYC was rejected. Please update your details in the dashboard."
                                                        : "Please complete your KYC in the dashboard to start investing."
                                                    }
                                                </p>
                                                <Link href="/dashboard" className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
                                                    Go to Dashboard {"->"}
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <Info className="h-5 w-5 text-slate-400 mt-0.5" />
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                            Prices are indicative and subject to market availability. NSDL/CDSL transfer fees may apply.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
