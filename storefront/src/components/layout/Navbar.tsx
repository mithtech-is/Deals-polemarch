"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShoppingCart, User, ChevronDown, TrendingUp, Zap, ArrowRight, CircleHelp } from "lucide-react";
import { useState } from "react";
import trendingShares from "@/data/trending-shares.json";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTrendingOpen, setIsTrendingOpen] = useState(false);
    const { totalItems, items } = useCart();
    const { user } = useUser();

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/assets/logos/polemarch_logo.png"
                            alt="Polemarch"
                            width={160}
                            height={40}
                            priority
                            className="h-8 w-auto max-w-[140px] object-contain sm:h-9 sm:max-w-[156px] lg:h-10 lg:max-w-[164px]"
                            style={{ width: "auto", height: "auto" }}
                        />
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-8 text-slate-800">
                    <div className="relative group/mega">
                        <button className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors py-8">
                            Trending Shares
                            <ChevronDown className="h-4 w-4 transition-transform group-hover/mega:rotate-180" />
                        </button>

                        <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover/mega:block w-[1000px] bg-white border border-slate-100 shadow-2xl rounded-[40px] p-0 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="py-12 px-8">
                                {/* Shares Grid - Compact */}
                                <div className="grid grid-cols-6 gap-4">
                                    {trendingShares.map((share, idx) => (
                                        <Link
                                            key={idx}
                                            href={`/deals/${share.handle}`}
                                            className="group/item flex flex-col items-center justify-center gap-4 p-6 rounded-[24px] bg-white border border-slate-50/50 hover:bg-slate-50 hover:shadow-lg transition-all duration-300"
                                        >
                                            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-50 flex items-center justify-center overflow-hidden group-hover/item:scale-110 transition-transform duration-500">
                                                {share.logo ? (
                                                    <Image src={share.logo} alt={share.name} width={56} height={56} className="object-contain p-1.5" />
                                                ) : (
                                                    <div className="h-full w-full bg-slate-50/50" />
                                                )}
                                            </div>
                                            <div className="text-sm font-bold text-slate-800 group-hover/item:text-primary transition-colors text-center lowercase">
                                                {share.name}
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Menu Footer - More Compact */}
                                <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-3">
                                    <CircleHelp className="h-4 w-4 text-slate-300" />
                                    <span className="text-xs text-slate-500 font-medium tracking-tight">Need assistance with your unlisted investments?</span>
                                    <Link href="/contact" className="text-xs font-bold text-slate-900 hover:text-primary transition-colors px-1 border-b border-slate-200">
                                        Contact our advisors
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href="/deals" className="text-sm font-medium hover:text-primary transition-colors">
                        Marketplace
                    </Link>
                    <Link href="/knowledge" className="text-sm font-medium hover:text-primary transition-colors">
                        Knowledge
                    </Link>
                    <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                        About
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/cart" className="p-2 hover:bg-muted rounded-full transition-colors relative">
                            <ShoppingCart className="h-5 w-5" />
                            {totalItems > 0 && (
                                <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary text-[8px] flex items-center justify-center text-white animate-in zoom-in duration-300">
                                    {totalItems}
                                </span>
                            )}
                        </Link>
                        {user ? (
                            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary bg-primary text-white hover:bg-primary/90 transition-all text-sm font-medium">
                                <User className="h-4 w-4" />
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-all text-sm font-medium">
                                <User className="h-4 w-4" />
                                Investor Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center gap-4">
                        <NotificationBell />
                        <Link href="/cart" className="p-2 transition-colors relative">
                            <ShoppingCart className="h-5 w-5" />
                        </Link>
                        <button onClick={() => setIsOpen(!isOpen)} className="p-2 transition-colors">
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isOpen && (
                <div className="lg:hidden absolute top-20 left-0 w-full bg-white border-b shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto px-4 py-6 space-y-6 animate-in slide-in-from-top duration-300 z-40">
                    <div className="space-y-4">
                        <button
                            onClick={() => setIsTrendingOpen(!isTrendingOpen)}
                            className="w-full text-lg font-medium flex items-center justify-between"
                        >
                            <span>Trending Shares</span>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isTrendingOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isTrendingOpen && (
                            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-1 fade-in duration-200 mt-4 pl-2">
                                {trendingShares.slice(0, 6).map((share, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/deals/${share.handle}`}
                                        className="flex items-center gap-4 p-3 rounded-[20px] bg-slate-50 border border-slate-100 transition-all active:scale-[0.98]"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {share.logo ? (
                                                <Image src={share.logo} alt={share.name} width={40} height={40} className="object-contain p-1.5" />
                                            ) : (
                                                <div className="h-full w-full bg-slate-100" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="text-sm font-bold text-slate-900 lowercase">{share.name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{share.sector}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    <div className="space-y-6">
                        <Link href="/deals" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                            Marketplace
                        </Link>
                        <Link href="/knowledge" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                            Knowledge
                        </Link>
                        <Link href="/about" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                            About
                        </Link>
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        {user ? (
                            <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-white font-medium" onClick={() => setIsOpen(false)}>
                                <User className="h-5 w-5" />
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-white font-medium" onClick={() => setIsOpen(false)}>
                                <User className="h-5 w-5" />
                                Investor Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
