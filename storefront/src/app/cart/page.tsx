"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { Trash2, ArrowRight, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CartPage() {
    const { items, removeItem, updateItem, totalAmount, totalItems } = useCart();
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleRemove = async (id: string) => {
        setRemovingId(id);
        try {
            await removeItem(id);
        } finally {
            setRemovingId(null);
        }
    };

    const handleUpdateQuantity = async (id: string, newQuantity: number, minLot: number) => {
        if (newQuantity < minLot) return;
        setUpdatingId(id);
        try {
            await updateItem(id, newQuantity);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-5xl">
                    <h1 className="text-4xl font-bold mb-12">Your Deal Cart</h1>

                    {items.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-16 text-center border border-slate-100 shadow-sm">
                            <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <CreditCard className="h-10 w-10" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                            <p className="text-slate-500 mb-10 max-w-sm mx-auto">
                                Looks like you haven't added any unlisted share deals to your interest list yet.
                            </p>
                            <Link href="/deals" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold hover:scale-105 transition-all">
                                Browse Deals
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Items List */}
                            <div className="lg:col-span-8 space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-between gap-6 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-center shrink-0">
                                                <img src={item.logo} alt={item.name} className="object-contain max-h-full" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{item.name}</h3>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-1">
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, item.quantity - item.minInvestment, item.minInvestment)}
                                                            disabled={updatingId === item.id || item.quantity <= item.minInvestment}
                                                            className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-lg font-bold hover:bg-slate-50 disabled:opacity-50"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-12 text-center font-bold text-sm text-slate-900">
                                                            {updatingId === item.id ? <Loader2 className="h-3 w-3 animate-spin mx-auto text-primary" /> : item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, item.quantity + item.minInvestment, item.minInvestment)}
                                                            disabled={updatingId === item.id}
                                                            className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-lg font-bold hover:bg-slate-50 disabled:opacity-50"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">@ ₹{item.price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total</p>
                                                <p className="font-bold text-slate-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                disabled={removingId === item.id}
                                                className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {removingId === item.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary Checkout */}
                            <div className="lg:col-span-4">
                                <div className="bg-slate-900 text-white rounded-[40px] p-8 sticky top-24">
                                    <h3 className="text-2xl font-bold mb-8">Order Summary</h3>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Total Deals</span>
                                            <span className="font-bold">{totalItems}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Subtotal</span>
                                            <span className="font-bold">₹{totalAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Stamp Duty & Charges</span>
                                            <span className="font-bold">₹{Math.ceil(totalAmount * 0.00015).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/10 mb-8">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable</span>
                                            <span className="text-3xl font-bold text-primary">₹{Math.ceil(totalAmount * 1.00015).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <Link href="/checkout" className="w-full py-5 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-3">
                                        Proceed to Checkout
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>

                                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
                                                Secure transaction via RBI regulated clearing corporations.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
