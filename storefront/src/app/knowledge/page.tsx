import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Book, HelpCircle, FileText, TrendingUp, Search, ArrowRight } from "lucide-react";
import { KNOWLEDGE_CATEGORIES, ARTICLES } from "@/data/knowledge";
import Link from "next/link";

const IconMap: any = { Book, TrendingUp, FileText, HelpCircle };

export default function KnowledgePage() {
    const categories = KNOWLEDGE_CATEGORIES;
    const articles = ARTICLES;

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="bg-slate-900 py-24 text-white text-center px-4">
                    <div className="container mx-auto">
                        <h1 className="text-5xl font-bold tracking-tight mb-8">Polemarch Knowledge Hub</h1>
                        <div className="max-w-2xl mx-auto relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search articles, guides and glossary..."
                                className="w-full pl-16 pr-6 py-6 rounded-[32px] bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-lg"
                            />
                        </div>
                    </div>
                </section>

                {/* Categories */}
                <section className="py-24 px-4 sm:px-6">
                    <div className="container mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {categories.map((cat, i) => {
                                const Icon = IconMap[cat.icon];
                                return (
                                    <Link href={`/knowledge/${cat.slug}`} key={i} className="group p-8 rounded-[40px] border border-slate-100 hover:border-primary/20 hover:shadow-2xl transition-all cursor-pointer bg-white">
                                        <div className={`h-16 w-16 rounded-3xl ${cat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{cat.title}</h3>
                                        <p className="text-slate-500 text-sm font-medium">{cat.count} Articles</p>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Featured Articles */}
                <section className="py-24 bg-slate-50/50 px-4 sm:px-6">
                    <div className="container mx-auto">
                        <div className="flex items-center justify-between mb-16">
                            <h2 className="text-4xl font-bold tracking-tight">Recent Articles</h2>
                            <button className="text-primary font-bold hover:underline">View All</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {articles.map((art, i) => (
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
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

