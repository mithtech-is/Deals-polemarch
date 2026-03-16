import Link from "next/link";
import Image from "next/image";
import { TrendingUp, ArrowRight } from "lucide-react";

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

const DealCard = ({ id, name, logo, sector, price, minInvestment, quantity, summary, isTrending }: DealCardProps) => {
    return (
        <Link href={`/deals/${id}`} className="block">
            <div className="group relative bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500 h-full">
                {isTrending && (
                    <div className="absolute top-4 right-4 z-10">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-600 font-bold text-[10px] uppercase tracking-wider">
                            <TrendingUp className="h-3 w-3" />
                            Trending
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                    <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                        <Image
                            src={logo || "/assets/logos/placeholder.png"}
                            alt={name}
                            width={56}
                            height={56}
                            unoptimized={logo?.startsWith('http')}
                            className="object-contain grayscale group-hover:grayscale-0 transition-all"
                        />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{name}</h3>
                        <p className="text-sm text-foreground/60 font-medium">{sector}</p>
                    </div>
                </div>

                <p className="text-foreground/70 text-sm line-clamp-2 mb-8 h-10 leading-relaxed">
                    {summary}
                </p>

                <div className="mb-8 pt-6 border-t border-slate-50">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-foreground/40 font-bold mb-1">Deal Price</p>
                        <p className="text-2xl font-bold text-foreground">₹{price.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-foreground/60">
                        <span className="font-bold text-foreground">{quantity.toLocaleString('en-IN')}</span> shares available
                    </div>
                    <div
                        className="flex items-center gap-2 text-sm font-bold text-primary group-hover:gap-3 transition-all"
                    >
                        View Deal
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default DealCard;
