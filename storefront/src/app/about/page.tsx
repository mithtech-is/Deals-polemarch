import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, Target, TrendingUp, Users } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-96 w-96 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">About Polemarch</h1>
                        <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                            Bridging the gap between ambitious investors and high-growth unlisted opportunities.
                        </p>
                    </div>
                </section>

                {/* Content Section */}
                <section className="py-24 px-4 sm:px-6">
                    <div className="container mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            <div>
                                <h2 className="text-4xl font-bold mb-8 text-foreground">What we do</h2>
                                <div className="space-y-6 text-lg text-foreground/70 leading-relaxed">
                                    <p>
                                        Polemarch delivers structured access to unlisted and Pre-IPO investment opportunities across the private markets landscape. We enable investors to evaluate, understand, and participate in companies during their early growth stages, prior to public listing.
                                    </p>
                                    <p>
                                        Our framework is grounded in clarity, disciplined execution, and research-oriented assessment — not speculation or short-term momentum. Operating in a market that is frequently fragmented and information-constrained, we emphasize transparency, standardized processes, and insight-driven communication.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100">
                                    <h3 className="text-4xl font-bold text-primary mb-2">1500+</h3>
                                    <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Active Investors</p>
                                </div>
                                <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 mt-12">
                                    <h3 className="text-4xl font-bold text-primary mb-2">₹500Cr+</h3>
                                    <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Total Valuation</p>
                                </div>
                                <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100">
                                    <h3 className="text-4xl font-bold text-primary mb-2">50+</h3>
                                    <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Premium Deals</p>
                                </div>
                                <div className="p-8 rounded-[40px] bg-slate-50 border border-slate-100 mt-12">
                                    <h3 className="text-4xl font-bold text-primary mb-2">24h</h3>
                                    <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Support Response</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission Section */}
                <section className="py-24 bg-primary text-white">
                    <div className="container mx-auto px-4 sm:px-6">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-4xl font-bold mb-8">Why Polemarch Exists</h2>
                            <p className="text-xl text-primary-foreground/80 leading-relaxed mb-12">
                                Most investors encounter opportunities only after companies enter public markets, when information is widely available and pricing has already adjusted. Polemarch exists to bridge this gap. We focus on bringing structure, clarity, and transparency to early-stage investing, helping investors understand opportunities before listing—rather than reacting after market attention, speculation, and noise take over.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { title: "Transparency", icon: Shield, desc: "Clear pricing and verified listings." },
                                    { title: "Clarity", icon: Target, desc: "Insight-driven communication." },
                                    { title: "Access", icon: TrendingUp, desc: "Exclusive pre-IPO opportunities." },
                                ].map((item, i) => (
                                    <div key={i} className="p-8 rounded-[32px] bg-white/5 border border-white/10">
                                        <item.icon className="h-8 w-8 mb-6 mx-auto text-white" />
                                        <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                        <p className="text-sm text-primary-foreground/60">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
