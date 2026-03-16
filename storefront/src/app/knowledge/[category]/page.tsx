"use client";

import { useParams } from "next/navigation";
import { KNOWLEDGE_CATEGORIES, ARTICLES } from "@/data/knowledge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ArrowLeft, Book, HelpCircle, FileText, TrendingUp, Search, ArrowRight } from "lucide-react";

const IconMap: any = { Book, TrendingUp, FileText, HelpCircle };

export default function CategoryPage() {
    const params = useParams();
    const categorySlug = params.category as string;

    const category = KNOWLEDGE_CATEGORIES.find(c => c.slug === categorySlug);
    const categoryArticles = ARTICLES.filter(a => a.categoryId === category?.id);

    if (!category) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-4">Category Not Found</h1>
                <Link href="/knowledge" className="text-primary font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Knowledge Hub
                </Link>
            </div>
        );
    }

    const Icon = IconMap[category.icon];

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Header */}
                <section className="bg-slate-50 py-20 px-4">
                    <div className="container mx-auto">
                        <Link href="/knowledge" className="text-primary font-bold hover:underline flex items-center gap-2 mb-8">
                            <ArrowLeft className="h-4 w-4" />
                            Knowledge Hub
                        </Link>
                        <div className="flex items-center gap-6 mb-8">
                            <div className={`h-20 w-20 rounded-[32px] ${category.color} flex items-center justify-center`}>
                                <Icon className="h-10 w-10" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{category.title}</h1>
                        </div>
                        <p className="text-xl text-slate-500 max-w-3xl leading-relaxed">
                            {category.description}
                        </p>
                    </div>
                </section>

                {/* Articles List */}
                <section className="py-24 px-4 sm:px-6">
                    <div className="container mx-auto">
                        <h2 className="text-2xl font-bold mb-12">{categoryArticles.length} Articles in this category</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {categoryArticles.map((art, i) => (
                                <Link href={`/knowledge/articles/${art.slug}`} key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">{art.category}</span>
                                        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{art.title}</h3>
                                        <p className="text-slate-400 text-sm font-medium">{art.time}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full border border-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {categoryArticles.length === 0 && (
                            <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                                <p className="text-slate-400">No articles found in this category yet.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
