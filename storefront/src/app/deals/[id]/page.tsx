"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";
import { Deal } from "@/data/deals";
import { ArrowLeft, Info, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
    getCompanyFinancials,
    getOverviewValue,
    getRatioValue,
    formatFinancialValue,
    type CalculaCompanyData,
} from "@/lib/calcula";
import { PriceChart } from "@/components/product/PriceChart";
import { FinancialStatements } from "@/components/product/FinancialStatements";
import { CompanyOverviewPanel } from "@/components/product/CompanyOverviewPanel";
import { ProsConsPanel } from "@/components/product/ProsConsPanel";
import { EditorialHtmlPanels } from "@/components/product/EditorialHtmlPanels";
import { EventTimeline } from "@/components/product/EventTimeline";
import { FaqPanel } from "@/components/product/FaqPanel";
import { TeamPanel } from "@/components/product/TeamPanel";
import { ShareholdersPanel } from "@/components/product/ShareholdersPanel";
import { CompetitorsPanel } from "@/components/product/CompetitorsPanel";
import { CompanyDetailsGrid } from "@/components/product/CompanyDetailsGrid";
import { ValuationPanel } from "@/components/product/ValuationPanel";
import { DealPageToc } from "@/components/product/DealPageToc";
import { formatPrice, formatPriceForSchema } from "@/lib/format";

export default function DealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [deal, setDeal] = useState<Deal | null>(null);
    const [financials, setFinancials] = useState<CalculaCompanyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addItem } = useCart();
    const { user } = useUser();
    const currencySymbol = "₹"; // INR-only platform

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

                if (!product) {
                    setDeal(null);
                    return;
                }

                const mappedDeal = mapMedusaToDeal(product);
                setDeal(mappedDeal);

                // Fetch live financial data from Medusa's synced Calcula store (matched by ISIN)
                if (mappedDeal.isin) {
                    getCompanyFinancials(mappedDeal.isin).then(setFinancials);
                }
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
            setQuantity(1000);
        }
    }, [deal]);

    const QUICK_QTYS = [1000, 5000, 10000, 50000, 100000];

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

    const isKycApproved = user ? user.metadata?.kyc_status === "approved" || user.metadata?.kyc_status === "verified" : false;

    const renderBuyBox = () => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl relative">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price per share</p>
                    <p className="text-3xl font-bold text-slate-900">Rs. {formatPrice(deal.price)}</p>
                </div>
                <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-[9px] font-bold uppercase tracking-wider">
                    High Demand
                </span>
            </div>

            {(() => {
                const investment = deal.price * quantity;
                const processingFee = investment * 0.02;
                const lowQtyFee = investment > 0 && investment < 10000 ? 250 : 0;
                const total = investment + processingFee + lowQtyFee;
                return (
                    <>
                        <div className="mb-6 border-b border-slate-100 pb-5">
                            <div className="flex items-baseline justify-between mb-2">
                                <label htmlFor="qty-input" className="text-sm font-medium text-slate-700">
                                    Quantity
                                </label>
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                    Custom qty supported
                                </span>
                            </div>
                            <input
                                id="qty-input"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                value={quantity}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setQuantity(Number.isFinite(v) && v >= 1 ? v : 1);
                                }}
                                placeholder="Type any quantity, e.g. 1,27,500"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-base font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                            />
                            <p className="text-[10px] text-slate-500 mt-1.5">
                                Type your own number above or pick a preset below.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {QUICK_QTYS.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => setQuantity(q)}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                                            quantity === q
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        }`}
                                    >
                                        {q.toLocaleString("en-IN")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Investment Value</span>
                                <span className="text-sm font-bold">Rs. {formatPrice(investment)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-500">Processing Fee (2%)</span>
                                <span className="text-sm font-bold">Rs. {formatPrice(processingFee)}</span>
                            </div>
                            {lowQtyFee > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-amber-700">
                                        Low Quantity Fee
                                        <span className="block text-[10px] text-amber-600 font-normal">Order below Rs. 10,000</span>
                                    </span>
                                    <span className="text-sm font-bold text-amber-700">Rs. {formatPrice(lowQtyFee)}</span>
                                </div>
                            )}

                            <div className="flex justify-between pt-3 border-t border-slate-100">
                                <span className="text-base font-bold text-slate-900">Total Payable</span>
                                <span className="text-lg font-bold text-slate-900">Rs. {formatPrice(total)}</span>
                            </div>
                        </div>
                    </>
                );
            })()}

            <button
                disabled={deal.price <= 0 || (Boolean(user) && !isKycApproved)}
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

            {user && !isKycApproved && (
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

                    {/* Product + BreadcrumbList JSON-LD for SEO/GEO */}
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "Product",
                                name: `${deal.name} Unlisted Shares`,
                                image: deal.logo || undefined,
                                description:
                                    deal.description ||
                                    `Buy ${deal.name} unlisted shares on Polemarch. Verified pricing, KYC-ready, transparent transfers.`,
                                sku: deal.isin || undefined,
                                brand: { "@type": "Brand", name: deal.name },
                                offers: deal.price
                                    ? {
                                          "@type": "Offer",
                                          priceCurrency: "INR",
                                          price: formatPriceForSchema(deal.price),
                                          availability: "https://schema.org/InStock",
                                          url: typeof window !== "undefined" ? window.location.href : undefined,
                                      }
                                    : undefined,
                            }),
                        }}
                    />
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "BreadcrumbList",
                                itemListElement: [
                                    { "@type": "ListItem", position: 1, name: "Home", item: "https://deals.polemarch.in/" },
                                    { "@type": "ListItem", position: 2, name: "Marketplace", item: "https://deals.polemarch.in/deals" },
                                    { "@type": "ListItem", position: 3, name: deal.name },
                                ],
                            }),
                        }}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="h-20 w-20 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={deal.logo || "/assets/logos/placeholder.png"}
                                        alt={`${deal.name} logo`}
                                        width={80}
                                        height={80}
                                        className="object-contain"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{deal.name}</h1>
                                    <p className="text-slate-500 uppercase text-xs font-bold tracking-wider mt-1">{deal.sector || "-"} / {deal.shareType || "UNLISTED"}</p>
                                </div>
                            </div>

                            <div className="block lg:hidden mb-8">
                                {renderBuyBox()}
                            </div>

                            <DealPageToc />

                            <div className="space-y-8 min-w-0 pt-6">

                            {deal.isin && (
                                <section id="price">
                                    <PriceChart isin={deal.isin} />
                                </section>
                            )}

                            <section id="about" className="pt-6">
                                {deal.isin ? (
                                    <CompanyOverviewPanel isin={deal.isin} />
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                            <h3 className="text-xl font-bold">Company Overview</h3>
                                        </div>
                                        <div className="text-slate-600 text-sm leading-relaxed prose prose-slate max-w-none">
                                            {deal.description || deal.summary || "-"}
                                        </div>
                                    </>
                                )}
                            </section>

                            <div id="company-details" className="pt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                    <h3 className="text-xl font-bold">Company Details</h3>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                                    {[
                                        { label: "Sector", value: financials?.sector || deal.sector || "-" },
                                        { label: "Market Cap", value: financials?.market_cap || deal.marketCap || "-" },
                                        { label: "Industry", value: financials?.industry || deal.industry || "-" },
                                        { label: "P/E Ratio", value: financials?.pe_ratio || deal.peRatio || "N/A" },
                                        { label: "Share Type", value: financials?.share_type || deal.shareType || "-" },
                                        { label: "P/B Ratio", value: financials?.pb_ratio || deal.pbRatio || "N/A" },
                                        { label: "Lot Size", value: (() => {
                                            const ls = financials?.lot_size || deal.lotSize;
                                            return ls ? `${ls.toLocaleString()} Shares` : "-";
                                        })() },
                                        { label: "Debt to Equity", value: financials?.debt_to_equity || deal.debtToEquity || "N/A" },
                                        { label: "52 Week High", value: (() => {
                                            const v = financials?.fifty_two_week_high || deal.fiftyTwoWeekHigh;
                                            return v ? `${currencySymbol} ${v}` : "-";
                                        })() },
                                        { label: "ROE (%)", value: (() => {
                                            const liveRoe = getRatioValue(financials?.ratios ?? null, "roe");
                                            if (liveRoe !== null) return `${(liveRoe * 100).toFixed(1)}%`;
                                            return financials?.roe_value || deal.roe || "N/A";
                                        })() },
                                        { label: "52 Week Low", value: (() => {
                                            const v = financials?.fifty_two_week_low || deal.fiftyTwoWeekLow;
                                            return v ? `${currencySymbol} ${v}` : "-";
                                        })() },
                                        { label: "Book Value", value: financials?.book_value || deal.bookValue || "N/A" },
                                        { label: "Depository", value: financials?.depository || deal.depository || "-" },
                                        { label: "Face Value", value: (() => {
                                            const v = financials?.face_value || deal.faceValue;
                                            return v ? `${currencySymbol} ${v}` : "-";
                                        })() },
                                        { label: "PAN Number", value: financials?.pan_number || deal.panNumber || "N/A" },
                                        { label: "Total Shares", value: (() => {
                                            const v = financials?.total_shares || deal.totalShares;
                                            return v ? Number(v).toLocaleString("en-IN") : "-";
                                        })() },
                                        { label: "ISIN Number", value: financials?.isin || deal.isin || "-" },
                                        { label: "Founded", value: financials?.founded || deal.founded || "-" },
                                        { label: "CIN", value: financials?.cin || deal.cin || "N/A" },
                                        { label: "Headquarters", value: financials?.headquarters || deal.headquarters || "-" },
                                        { label: "RTA", value: financials?.rta || deal.rta || "N/A" },
                                        { label: "Valuation", value: financials?.valuation || deal.valuation || "-" },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-slate-200 py-3">
                                            <span className="text-xs text-slate-500">{item.label}</span>
                                            <span className="text-sm font-bold text-slate-900">{item.value}</span>
                                        </div>
                                    ))}
                                    {deal.isin && <CompanyDetailsGrid isin={deal.isin} />}
                                </div>
                            </div>

                            <div id="financials" className="pt-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-6 w-1 bg-emerald-700 rounded-full"></div>
                                    <h3 className="text-xl font-bold">Financials</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex justify-between shadow-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">REVENUE</p>
                                            <h4 className="text-2xl font-bold mb-1">
                                                {formatFinancialValue(getOverviewValue(financials?.overview ?? null, "revenue")) !== "—"
                                                    ? formatFinancialValue(getOverviewValue(financials?.overview ?? null, "revenue"))
                                                    : deal.revenueValue || "-"}
                                            </h4>
                                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                {deal.revenueGrowth ? `Up ${deal.revenueGrowth} YoY` : "\u00A0"}
                                            </p>
                                        </div>
                                        <BarChart3 className="h-10 w-10 text-emerald-700 opacity-20 mt-auto" />
                                    </div>
                                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex justify-between shadow-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">PROFIT AFTER TAX</p>
                                            <h4 className="text-2xl font-bold mb-1">
                                                {formatFinancialValue(getOverviewValue(financials?.overview ?? null, "net_profit")) !== "—"
                                                    ? formatFinancialValue(getOverviewValue(financials?.overview ?? null, "net_profit"))
                                                    : deal.profitValue || "-"}
                                            </h4>
                                            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                {deal.profitGrowth ? `Up ${deal.profitGrowth} YoY` : "\u00A0"}
                                            </p>
                                        </div>
                                        <BarChart3 className="h-10 w-10 text-emerald-700 opacity-20 mt-auto" />
                                    </div>
                                </div>

                                {/* Additional ratios from Calcula */}
                                {financials?.ratios && financials.ratios.length > 0 && (
                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                        {[
                                            { label: "Debt/Equity", code: "debt_to_equity", format: (v: number) => v.toFixed(2) },
                                            { label: "ROE", code: "roe", format: (v: number) => `${(v * 100).toFixed(1)}%` },
                                            { label: "Current Ratio", code: "current_ratio", format: (v: number) => v.toFixed(2) },
                                        ].map((item, idx) => {
                                            const val = getRatioValue(financials.ratios, item.code);
                                            return (
                                                <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                                                    <p className="text-[10px] text-slate-500 font-bold mb-1">{item.label}</p>
                                                    <p className="font-bold text-slate-900 text-lg">
                                                        {val !== null ? item.format(val) : "-"}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {deal.isin && <FinancialStatements isin={deal.isin} />}
                            {deal.isin && (
                                <section id="editorial-financial">
                                    <EditorialHtmlPanels isin={deal.isin} only="financial" />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="valuations">
                                    <ValuationPanel isin={deal.isin} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="key-takeaways">
                                    <ProsConsPanel isin={deal.isin} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="team">
                                    <TeamPanel isin={deal.isin} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="shareholders">
                                    <ShareholdersPanel isin={deal.isin} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="competitors">
                                    <CompetitorsPanel isin={deal.isin} companyName={deal.name} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="timeline">
                                    <EventTimeline isin={deal.isin} />
                                </section>
                            )}
                            {deal.isin && (
                                <section id="faq">
                                    <FaqPanel isin={deal.isin} />
                                </section>
                            )}

                            </div>
                        </div>

                        <div className="hidden lg:block lg:sticky lg:top-24 h-fit lg:col-span-1">
                            {renderBuyBox()}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
