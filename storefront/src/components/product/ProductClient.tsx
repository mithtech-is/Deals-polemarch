"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FinancialTable from "@/components/product/FinancialTable";
import InvestmentCalculator from "@/components/product/InvestmentCalculator";
import { FileText, Download, Building, MapPin, Briefcase, ShieldCheck } from "lucide-react";

interface ProductClientProps {
    product: any;
    displayProduct: any;
}

export default function ProductClient({ product, displayProduct }: ProductClientProps) {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow pt-12">
                <div className="container mx-auto px-4 sm:px-6">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/40 mb-8">
                        <a href="/" className="hover:text-primary">Home</a>
                        <span>/</span>
                        <a href="/deals" className="hover:text-primary">Deals</a>
                        <span>/</span>
                        <span className="text-foreground">{displayProduct.name}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
                        {/* Left Column: Content */}
                        <div className="lg:col-span-8">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-center gap-8 mb-16 underline-none">
                                <div className="h-24 w-24 rounded-3xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img src={displayProduct.logo} alt={displayProduct.name} className="object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-foreground">{displayProduct.name}</h1>
                                    <div className="flex flex-wrap items-center gap-6">
                                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">{displayProduct.sector}</span>
                                        <div className="flex items-center gap-2 text-foreground/50 text-sm font-medium">
                                            <MapPin className="h-4 w-4" />
                                            {displayProduct.headquarters}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="space-y-20">
                                {/* About Section */}
                                <section>
                                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-foreground">
                                        <Building className="h-6 w-6 text-primary" />
                                        Company Overview
                                    </h2>
                                    <p className="text-foreground/70 leading-relaxed text-lg mb-8">
                                        {displayProduct.description}
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {displayProduct.metrics && displayProduct.metrics.filter((m: any) => !m.label.toLowerCase().includes('minimum') && !m.label.toLowerCase().includes('invest')).map((m: any) => (
                                            <div key={m.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">{m.label}</p>
                                                <p className="font-bold text-foreground">{m.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Financials Section */}
                                <section>
                                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-foreground">
                                        <Briefcase className="h-6 w-6 text-primary" />
                                        Financial Performance
                                    </h2>
                                    <FinancialTable data={displayProduct.financials.map((f: any) => ({
                                        ...f,
                                        revenue: typeof f.revenue === 'string' ? parseInt(f.revenue.replace(/[^0-9]/g, '')) : f.revenue,
                                        ebitda: typeof f.ebitda === 'string' ? parseInt(f.ebitda.replace(/[^0-9-]/g, '')) : f.ebitda,
                                        pat: typeof f.pat === 'string' ? parseInt(f.pat.replace(/[^0-9-]/g, '')) : f.pat,
                                        eps: typeof f.eps === 'string' ? parseFloat(f.eps) : f.eps
                                    }))} />
                                    <p className="mt-4 text-xs text-foreground/40 italic">
                                        *All figures are in INR Crores unless otherwise specified.
                                    </p>
                                </section>

                                {/* Documents Section */}
                                <section>
                                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-foreground">
                                        <FileText className="h-6 w-6 text-primary" />
                                        Documents & Reports
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {displayProduct.documents.map((doc: any) => (
                                            <div key={doc.title} className="flex items-center justify-between p-6 rounded-3xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all group cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground group-hover:text-primary transition-colors">{doc.title}</p>
                                                        <p className="text-xs text-foreground/40">{doc.size}</p>
                                                    </div>
                                                </div>
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                    <Download className="h-4 w-4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Right Column: Calculator */}
                        <div className="lg:col-span-4">
                            <InvestmentCalculator
                                product={product}
                                price={displayProduct.price}
                                minLot={displayProduct.minInvestment}
                            />

                            <div className="mt-8 p-6 rounded-3xl border border-slate-100 bg-slate-50">
                                <h4 className="font-bold mb-4 text-foreground flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Your Protection
                                </h4>
                                <ul className="space-y-3">
                                    <li className="text-xs text-foreground/60 flex gap-2">
                                        <div className="h-1 w-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                        Shares are transferred directly through CDSL/NSDL
                                    </li>
                                    <li className="text-xs text-foreground/60 flex gap-2">
                                        <div className="h-1 w-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                        Secure escrow payment mechanism
                                    </li>
                                    <li className="text-xs text-foreground/60 flex gap-2">
                                        <div className="h-1 w-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                        Verified financial data and company reports
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
