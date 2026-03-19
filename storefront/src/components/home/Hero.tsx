"use client";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import { useUser } from "@/context/UserContext";

const Hero = () => {
    const { user } = useUser();

    const getCtaLink = () => {
        if (!user) return "/register";
        if (user.metadata?.kyc_status === "verified" || user.metadata?.kyc_status === "approved") return "/deals";
        return "/dashboard/kyc";
    };

    const getCtaText = () => {
        if (!user) return "Register Now";
        if (user.metadata?.kyc_status === "verified" || user.metadata?.kyc_status === "approved") return "Explore Deals";
        return "Complete KYC";
    };

    return (
        <section className="relative overflow-hidden bg-white pt-20 pb-24 md:pt-32 md:pb-40">
            {/* Background patterns */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Live Early Stage Opportunities</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1] text-foreground">
                        Invest in the next <span className="text-primary italic">Unicorn</span> before it goes IPO.
                    </h1>

                    <p className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
                        Polemarch gives you exclusive access to high-growth unlisted shares and pre-IPO deals with transparent pricing and secure transactions.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link
                            href="/deals"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                        >
                            Browse Deals
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            href={getCtaLink()}
                            className="w-full sm:w-auto px-8 py-4 rounded-full border-2 border-slate-200 text-foreground font-bold text-lg hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                        >
                            {getCtaText()}
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 border-t border-slate-100">
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-lg text-foreground">Secure</p>
                                <p className="text-sm text-foreground/50">CDSL/NSDL Settlement</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-lg text-foreground">Curated</p>
                                <p className="text-sm text-foreground/50">Premium Opportunities</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                                <Zap className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-lg text-foreground">Fast</p>
                                <p className="text-sm text-foreground/50">T+2 Day Delivery</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
