import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Briefcase, Users, Zap, Heart, ArrowRight, MapPin, Clock, GraduationCap } from "lucide-react";
import Link from "next/link";

export default function CareersPage() {
    const values = [
        {
            icon: Zap,
            title: "Innovation First",
            description: "We're building something new in India's financial landscape. Join us in creating solutions.",
        },
        {
            icon: Users,
            title: "Collaborative Culture",
            description: "We believe the best ideas come from diverse perspectives working together.",
        },
        {
            icon: Heart,
            title: "Customer Obsessed",
            description: "Everything we build starts with understanding our customers' needs.",
        },
        {
            icon: GraduationCap,
            title: "Continuous Learning",
            description: "We invest in your growth with learning opportunities and skill development.",
        },
    ];

    const benefits = [
        "Competitive salary and equity",
        "Health insurance for you and family",
        "Flexible work arrangements",
        "Learning and development budget",
        "Team outings and events",
        "Modern office in Bengaluru",
    ];

    const openings = [
        {
            title: "Senior Full Stack Developer",
            department: "Engineering",
            location: "Bengaluru (Hybrid)",
            type: "Full-time",
            experience: "4+ years",
        },
        {
            title: "Product Manager",
            department: "Product",
            location: "Bengaluru",
            type: "Full-time",
            experience: "3+ years",
        },
        {
            title: "Compliance Officer",
            department: "Legal & Compliance",
            location: "Bengaluru",
            type: "Full-time",
            experience: "3+ years",
        },
        {
            title: "Customer Success Manager",
            department: "Operations",
            location: "Bengaluru",
            type: "Full-time",
            experience: "2+ years",
        },
        {
            title: "Business Development Executive",
            department: "Sales",
            location: "Bengaluru",
            type: "Full-time",
            experience: "2+ years",
        },
        {
            title: "Marketing Specialist",
            department: "Marketing",
            location: "Bengaluru (Remote)",
            type: "Full-time",
            experience: "2+ years",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero */}
                <section className="py-24 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">Join Our Team</h1>
                        <p className="text-xl text-foreground/60 leading-relaxed">
                            Help us democratize access to India's private markets. We're looking for passionate
                            individuals who want to make an impact in the fintech space.
                        </p>
                    </div>
                </section>

                {/* Values */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
                            <p className="text-foreground/60">What makes Polemarch a great place to work</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {values.map((value) => (
                                <div key={value.title} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-center hover:border-primary/20 transition-all">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <value.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                                    <p className="text-sm text-foreground/60">{value.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefits */}
                <section className="py-20 px-4 sm:px-6 bg-slate-900 text-white">
                    <div className="container mx-auto max-w-5xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold mb-4">Why Work With Us</h2>
                                <p className="text-slate-400 mb-8">
                                    We take care of our team so they can focus on building great products
                                </p>
                                <ul className="space-y-4">
                                    {benefits.map((benefit) => (
                                        <li key={benefit} className="flex items-center gap-3">
                                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            </div>
                                            <span className="text-slate-300">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
                                <div className="text-center">
                                    <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">Current Openings</p>
                                    <p className="text-5xl font-bold mb-2">{openings.length}+</p>
                                    <p className="text-slate-400">Positions available</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Job Openings */}
                <section className="py-20 px-4 sm:px-6">
                    <div className="container mx-auto max-w-5xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
                            <p className="text-foreground/60">Find your next opportunity</p>
                        </div>
                        <div className="space-y-4">
                            {openings.map((job) => (
                                <div
                                    key={job.title}
                                    className="flex flex-col md:flex-row md:items-center gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{job.title}</h3>
                                        </div>
                                        <p className="text-sm text-foreground/50">{job.department}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-foreground/60">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {job.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {job.type}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <GraduationCap className="h-4 w-4" />
                                            {job.experience}
                                        </span>
                                    </div>
                                    <Link
                                        href="mailto:careers@polemarch.in"
                                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all"
                                    >
                                        Apply
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 px-4 sm:px-6 bg-primary/5">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h2 className="text-3xl font-bold mb-4">Don't See a Perfect Fit?</h2>
                        <p className="text-foreground/60 mb-8">
                            We're always looking for talented people. Send us your resume and we'll keep you in mind for future roles.
                        </p>
                        <Link
                            href="mailto:careers@polemarch.in"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all"
                        >
                            Send Your Resume
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
