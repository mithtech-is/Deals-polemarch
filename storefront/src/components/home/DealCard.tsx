import Image from "next/image";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

interface DealCardProps {
    id: string;
    name: string;
    logo: string;
    sector: string;
    price: number;
    minInvestment: number;
    quantity: number;
    summary: string;
    isTrending?: boolean;
}

const DealCard = ({ id, name, logo, sector, price, quantity, summary, isTrending }: DealCardProps) => {
    return (
        <Link href={`/deals/${id}`} className="block">
            <div className="group relative h-full rounded-3xl border border-slate-100 bg-white p-6 transition-all duration-500 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5">
                {isTrending && (
                    <div className="absolute top-4 right-4 z-10">
                        <div className="flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            <TrendingUp className="h-3 w-3" />
                            Trending
                        </div>
                    </div>
                )}

                <div className="mb-6 flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                        <Image
                            src={logo || "/assets/logos/placeholder.png"}
                            alt={name}
                            width={56}
                            height={56}
                            unoptimized={logo?.startsWith("http")}
                            className="object-contain grayscale transition-all group-hover:grayscale-0"
                        />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground transition-colors group-hover:text-primary">{name}</h3>
                        <p className="text-sm font-medium text-foreground/60">{sector}</p>
                    </div>
                </div>

                <p className="mb-8 h-10 line-clamp-2 text-sm leading-relaxed text-foreground/70">
                    {summary}
                </p>

                <div className="mb-8 border-t border-slate-50 pt-6">
                    <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Deal Price</p>
                        <p className="text-2xl font-bold text-foreground">Rs. {price.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-foreground/60">
                        <span className="font-bold text-foreground">{quantity.toLocaleString("en-IN")}</span> shares available
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-primary transition-all group-hover:gap-3">
                        View Deal
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default DealCard;
