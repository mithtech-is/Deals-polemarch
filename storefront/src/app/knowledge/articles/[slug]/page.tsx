"use client";

import { useParams } from "next/navigation";
import { ARTICLES } from "@/data/knowledge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ArrowLeft, Share2, Printer, Clock } from "lucide-react";

export default function ArticlePage() {
    const params = useParams();
    const slug = params.slug as string;

    const article = ARTICLES.find(a => a.slug === slug);

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
                <Link href="/knowledge" className="text-primary font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Knowledge Hub
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                <section className="py-20 px-4">
                    <div className="container mx-auto max-w-4xl">
                        <Link href="/knowledge" className="text-primary font-bold hover:underline flex items-center gap-2 mb-12">
                            <ArrowLeft className="h-4 w-4" />
                            Knowledge Hub
                        </Link>

                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                                    {article.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                                    <Clock className="h-4 w-4" />
                                    {article.time}
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-8 tracking-tight leading-[1.1]">
                                {article.title}
                            </h1>
                            <div className="flex items-center justify-between border-y border-slate-100 py-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                        P
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Polemarch Research</p>
                                        <p className="text-xs text-slate-400 font-medium">Updated 2 days ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-slate-400">
                                        <Share2 className="h-5 w-5" />
                                    </button>
                                    <button className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-slate-400">
                                        <Printer className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <article className="prose prose-slate prose-xl max-w-none mb-20 text-slate-600 leading-relaxed">
                            <p className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">
                                {article.content}
                            </p>

                            <h2 className="text-3xl font-bold text-slate-900 mt-12 mb-6">Key Considerations</h2>
                            <p>
                                When exploring opportunities in the private markets, it is crucial to understand that liquidity is different from public markets. Price discovery happens through bilateral negotiations or platforms like Polemarch...
                            </p>

                            <h2 className="text-3xl font-bold text-slate-900 mt-12 mb-6">The Process</h2>
                            <p>
                                We've streamlined the entire lifecycle of unlisted share transactions. From selection to demat transfer (T+2), our platform ensures transparency and security at every step.
                            </p>
                        </article>

                        <div className="bg-slate-900 p-12 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 mb-20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-2">Ready to start investing?</h3>
                                <p className="text-slate-400">Join 50,000+ investors building their private equity portfolio.</p>
                            </div>
                            <Link href="/register" className="px-8 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all relative z-10">
                                Create Account
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
