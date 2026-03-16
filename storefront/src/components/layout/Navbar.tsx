"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
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
                            className="h-10 w-auto object-contain"
                            style={{ height: 'auto' }}
                        />
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
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

                <div className="hidden md:flex items-center gap-4">
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
                <div className="md:hidden flex items-center gap-4">
                    <NotificationBell />
                    <Link href="/cart" className="p-2 transition-colors relative">
                        <ShoppingCart className="h-5 w-5" />
                    </Link>
                    <button onClick={() => setIsOpen(!isOpen)} className="p-2 transition-colors">
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isOpen && (
                <div className="md:hidden border-t bg-background px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300">
                    <Link href="/deals" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                        Marketplace
                    </Link>
                    <Link href="/knowledge" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                        Knowledge
                    </Link>
                    <Link href="/about" className="block text-lg font-medium" onClick={() => setIsOpen(false)}>
                        About
                    </Link>
                    <div className="pt-4 border-t space-y-4">
                        {user ? (
                            <Link href="/dashboard" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-medium" onClick={() => setIsOpen(false)}>
                                <User className="h-5 w-5" />
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-medium" onClick={() => setIsOpen(false)}>
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
