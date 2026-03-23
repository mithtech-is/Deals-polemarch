import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Handshake, Users, Building2, TrendingUp, CheckCircle, ArrowRight, FileCheck, Headphones, Target } from "lucide-react";
import Link from "next/link";

export default function PartnerWithUsPage() {
    const partnerTypes = [
        {
            icon: Users,
            title: "Brokers & Intermediaries",
            description: "Entities facilitating investor access to alternative investment opportunities",
        },
        {
            icon: TrendingUp,
            title: "Investment Professionals",
            description: "Individuals or teams experienced in evaluating and managing private market allocations",
        },
        {
            icon: Building2,
            title: "Wealth Advisors",
            description: "Advisors supporting clients with long-term portfolio construction strategies",
        },
        {
            icon: Handshake,
            title: "Institutions & Corporates",
            description: "Organizations seeking structured access to unlisted and pre-IPO opportunities",
        },
    ];

    const benefits = [
        {
            icon: Target,
            title: "Access to Private Markets",
            description: "Gain access to curated unlisted and pre-IPO allocations through our platform",
        },
        {
            icon: FileCheck,
            title: "Transparent & Structured Process",
            description: "Defined processes, documentation standards, and execution protocols",
        },
        {
            icon: CheckCircle,
            title: "Compliance-Aligned Operations",
            description: "Operate under regulatory discipline and risk awareness frameworks",
        },
        {
            icon: Headphones,
            title: "Dedicated Partner Support",
            description: "Relationship-focused engagement with ongoing operational assistance",
        },
    ];

    const process = [
        {
            step: "01",
            title: "Submit Partnership Interest",
            description: "Share your details through our application form to express interest",
        },
        {
            step: "02",
            title: "Review & Onboarding",
            description: "Internal evaluation followed by discussion and documentation",
        },
        {
            step: "03",
            title: "Collaboration & Execution",
            description: "Begin structured collaboration based on agreed scope and terms",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="py-24 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">Partner With Us</h1>
                        <p className="text-xl text-foreground/60 leading-relaxed">
                            Join Polemarch as a partner and gain structured, compliance-focused access to India's pre-listing equity segment. We collaborate with professional counterparts aligned with regulatory discipline and responsible capital allocation.
                        </p>
                    </div>
                </section>

                {/* Partner Types */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Who Can Partner</h2>
                            <p className="text-foreground/60">We collaborate with a diverse range of professional entities</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {partnerTypes.map((type) => (
                                <div key={type.title} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-xl transition-all">
                                    <type.icon className="h-10 w-10 text-primary mb-4" />
                                    <h3 className="text-xl font-bold mb-2">{type.title}</h3>
                                    <p className="text-foreground/60">{type.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefits */}
                <section className="py-20 px-4 sm:px-6 bg-slate-900 text-white">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Partner Benefits</h2>
                            <p className="text-slate-400">What you gain by partnering with Polemarch</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {benefits.map((benefit) => (
                                <div key={benefit.title} className="p-8 rounded-3xl bg-white/5 border border-white/10">
                                    <benefit.icon className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                                    <p className="text-slate-400 text-sm">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Process */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Partnership Process</h2>
                            <p className="text-foreground/60">Three simple steps to get started</p>
                        </div>
                        <div className="space-y-8">
                            {process.map((step, index) => (
                                <div key={step.step} className="flex gap-6 items-start">
                                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-primary">{step.step}</span>
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                        <p className="text-foreground/60">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 px-4 sm:px-6 bg-primary/5">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h2 className="text-3xl font-bold mb-6">Ready to Partner With Us?</h2>
                        <p className="text-foreground/60 mb-8">
                            There is no predefined minimum volume requirement. Partnerships are evaluated based on professional background and alignment. All partnerships remain subject to applicable regulatory, compliance, and due-diligence requirements.
                        </p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all group"
                        >
                            Apply Now
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
