import Link from "next/link";
import { Building2, Factory, HeartPulse, Landmark } from "lucide-react";
import { Deal } from "@/data/deals";
import { medusaClient, mapMedusaToDeal } from "@/lib/medusa";

const sectorMeta: Record<string, { icon: any; description: string }> = {
    healthcare: {
        icon: HeartPulse,
        description: "Diagnostics, pharma, and platform-led health businesses attracting private market demand.",
    },
    finance: {
        icon: Landmark,
        description: "NBFCs, fintech rails, and financial distribution businesses with strong investor interest.",
    },
    manufacturing: {
        icon: Factory,
        description: "Industrial, EV, and supply-chain manufacturers building long-term private market momentum.",
    },
    hospitality: {
        icon: Building2,
        description: "Travel, hotel, and consumer experience brands benefiting from renewed premium demand.",
    },
};

const normalizeSectorKey = (sector: string) => {
    const value = sector.toLowerCase();

    if (value.includes("health")) return "healthcare";
    if (value.includes("fin")) return "finance";
    if (value.includes("manufact")) return "manufacturing";
    if (value.includes("hospital")) return "hospitality";

    return value;
};

const TrendingSectors = async () => {
    let deals: Deal[] = [];

    try {
        const { products } = await medusaClient.products.list();
        deals = products.map(mapMedusaToDeal);
    } catch (error) {
        console.error("Error fetching sectors:", error);
    }

    const sectorCounts = deals.reduce((acc, deal) => {
        const key = normalizeSectorKey(deal.sector);
        if (sectorMeta[key]) {
            acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const sectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    return (
        <section className="bg-white py-24">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground">Trending Sectors in Unlisted Shares</h2>
                        <p className="text-lg text-foreground/70">
                            Live sector momentum based on the companies currently available across the marketplace.
                        </p>
                    </div>
                    <Link href="/deals" className="font-bold text-primary hover:underline">
                        Browse marketplace
                    </Link>
                </div>
                {sectors.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {sectors.map(([key, count]) => {
                            const meta = sectorMeta[key];
                            const Icon = meta.icon;

                            return (
                                <div key={key} className="rounded-[32px] border border-slate-100 bg-slate-50/60 p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
                                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary/70">{count} live deals</p>
                                    <h3 className="mb-3 text-2xl font-bold capitalize text-foreground">{key}</h3>
                                    <p className="text-sm leading-relaxed text-foreground/65">{meta.description}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
                        <p className="text-lg font-bold text-slate-700">Trending sectors will appear here once products are available.</p>
                        <p className="mt-2 text-sm text-slate-500">
                            Add sector metadata such as healthcare, finance, manufacturing, or hospitality to products in admin.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TrendingSectors;
