import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Target, Shield, Eye, Users, CheckCircle, ArrowRight, TrendingUp, FileCheck, Handshake } from "lucide-react";
import Link from "next/link";

export default function WhyChooseUsPage() {
    const pillars = [
        {
            icon: Target,
            title: "Structured Access to Private Markets",
            description: "Curated opportunities in pre-IPO and unlisted shares, selected through rigorous evaluation processes",
        },
        {
            icon: Shield,
            title: "Compliance-Aligned Execution",
            description: "Mandatory KYC verification and comprehensive documentation standards for every transaction",
        },
        {
            icon: Eye,
            title: "Transparency at Every Stage",
            description: "Clear communication on processes, documentation requirements, pricing discussions, and execution timelines",
        },
        {
            icon: Users,
            title: "Assisted & Guided Transactions",
            description: "Dedicated support offering workflow assistance and settlement guidance throughout your investment journey",
        },
    ];

    const methodology = [
        {
            step: "01",
            title: "Review",
            description: "We review opportunities against investor profiles and requirements",
        },
        {
            step: "02",
            title: "Verify",
            description: "KYC and CMR requirements verification for compliance alignment",
        },
        {
            step: "03",
            title: "Execute",
            description: "Structured demat transfers with proper documentation and settlement support",
        },
    ];

    const differentiators = [
        {
            icon: FileCheck,
            title: "Documentation-First Approach",
            description: "Every transaction follows standardized documentation protocols ensuring transparency and compliance",
        },
        {
            icon: Handshake,
            title: "Long-Term Collaboration Focus",
            description: "Built for sustainable partnerships, not transactional arrangements",
        },
        {
            icon: TrendingUp,
            title: "Process-Led, Not Transaction-Led",
            description: "Prioritizing suitability, clarity, and informed decision-making over speed",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero */}
                <section className="py-24 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">Why Choose Polemarch</h1>
                        <p className="text-xl text-foreground/60 leading-relaxed">
                            Smart, transparent, and compliant access to India's pre-IPO and unlisted share markets.
                            We emphasize a structured, compliance-focused approach over transactional speed.
                        </p>
                    </div>
                </section>

                {/* Four Pillars */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Our Four Pillars</h2>
                            <p className="text-foreground/60">What defines the Polemarch experience</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pillars.map((pillar) => (
                                <div key={pillar.title} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all">
                                    <pillar.icon className="h-10 w-10 text-primary mb-4" />
                                    <h3 className="text-xl font-bold mb-2">{pillar.title}</h3>
                                    <p className="text-foreground/60">{pillar.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Methodology */}
                <section className="py-20 px-4 sm:px-6 bg-slate-900 text-white">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Our Methodology</h2>
                            <p className="text-slate-400">A process-led approach to private market investing</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {methodology.map((step) => (
                                <div key={step.step} className="text-center">
                                    <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/20 items-center justify-center mb-4">
                                        <span className="text-2xl font-bold text-primary">{step.step}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                    <p className="text-slate-400">{step.description}</p>
                                </div>
                            ))}
                        </div>                    </div>
                </section>

                {/* Differentiators */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">What Sets Us Apart</h2>
                            <p className="text-foreground/60">Why investors choose Polemarch over alternatives</p>
                        </div>
                        <div className="space-y-6">
                            {differentiators.map((diff) => (
                                <div key={diff.title} className="flex gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <diff.icon className="h-6 w-6 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">{diff.title}</h3>
                                        <p className="text-foreground/60">{diff.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 px-4 sm:px-6 bg-primary/5">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
                        <p className="text-foreground/60 mb-8">
                            Experience a smarter way to access India's private markets
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/deals"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all group"
                            >
                                Browse Deals
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-foreground font-bold border border-slate-200 hover:border-primary/20 transition-all"
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
