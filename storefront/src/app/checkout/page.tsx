"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CheckCircle2, ArrowLeft, Briefcase, ShieldCheck, Loader2, Landmark, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { medusaClient } from "@/lib/medusa";

interface CheckoutUser {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
}

interface CheckoutOrderItem {
    title?: string | null;
    quantity?: number | null;
}

interface CheckoutOrder {
    id: string;
    display_id?: string | number | null;
    items?: CheckoutOrderItem[];
    total?: number | null;
}

interface ErrorWithMessage {
    message?: string;
}

export default function CheckoutPage() {
    const { items, totalAmount, totalProcessingFee, totalLowQtyFee, totalPayable, cartId, clearCart } = useCart();
    const { user, isLoading: userLoading } = useUser();
    const router = useRouter();

    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<"payment" | "success">("payment");
    const [order, setOrder] = useState<CheckoutOrder | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push("/login?redirect=/checkout");
        }
    }, [user, userLoading, router]);

    const handleConfirmPayment = async () => {
        if (!cartId || !user) return;

        setIsProcessing(true);
        setError(null);

        try {
            await medusaClient.carts.update(cartId, { email: user.email });

            const { shipping_options } = await medusaClient.carts.listShippingOptions(cartId);

            if (shipping_options && shipping_options.length > 0) {
                await medusaClient.carts.addShippingMethod(cartId, shipping_options[0].id);
            }

            const { payment_collection: paymentCollection } = await medusaClient.carts.createPaymentCollection(cartId);
            await medusaClient.carts.initializePaymentSession(paymentCollection.id, "pp_system_default");

            const result = await medusaClient.carts.complete(cartId);

            if (result.type === "order") {
                const orderData = result.order || result.data;
                setOrder(orderData);
                setStep("success");
                clearCart();
            } else {
                throw new Error(result.message || "Failed to complete order. Please try again.");
            }
        } catch (err: unknown) {
            const errorMessage = (err as ErrorWithMessage)?.message;
            setError(errorMessage || "An unexpected error occurred during checkout. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (userLoading || (items.length === 0 && step === "payment" && !order)) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-slate-500 font-medium">Preparing your checkout...</p>
            </div>
        );
    }

    if (step === "success" && order) {
        const firstItem = order.items?.[0] || {};
        const customer = user as CheckoutUser;
        const customerName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email;

        const message = encodeURIComponent(`Hello Polemarch Team,

I have placed an order on Polemarch.

Order ID: ${order.display_id || order.id}
Name: ${customerName}
Email: ${customer.email}

Company: ${firstItem.title || "Unlisted Shares"}
Quantity: ${firstItem.quantity || 0}
Investment Amount: Rs. ${order.total?.toLocaleString("en-IN")}

Please guide me on the next steps to complete this transaction.`);

        const whatsappUrl = `https://wa.me/919008770738?text=${message}`;

        return (
            <div className="flex flex-col min-h-screen bg-white">
                <Navbar />
                <main className="flex-grow py-24 px-4 sm:px-6">
                    <div className="container mx-auto max-w-2xl text-center">
                        <div className="h-24 w-24 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-8 animate-bounce">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4 tracking-tight text-slate-900">Thank you for your order!</h1>
                        <p className="text-slate-600 text-lg mb-12">
                            We have received your investment request. <br />
                            Our team will contact you on WhatsApp to proceed with the transaction.
                        </p>

                        <div className="bg-slate-50 rounded-[40px] p-8 mb-12 text-left border border-slate-100">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Order Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                    <span className="text-slate-500 font-medium">Order ID</span>
                                    <span className="font-bold text-slate-900">#{order.display_id || order.id}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                    <span className="text-slate-500 font-medium">Company Name</span>
                                    <span className="font-bold text-slate-900">{firstItem.title || "Unlisted Shares"}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                    <span className="text-slate-500 font-medium">Quantity</span>
                                    <span className="font-bold text-slate-900">{firstItem.quantity || 0} Shares</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-slate-500 font-medium">Total Investment</span>
                                    <span className="text-xl font-bold text-primary">Rs. {order.total?.toLocaleString("en-IN")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 hover:scale-105 transition-all shadow-lg shadow-green-200"
                            >
                                <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.483 8.413-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.308 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.438-9.89 9.886-.001 2.15.652 3.791 1.646 5.491l-1.032 3.743 3.876-.935zm11.083-7.438c.302-.15.302-.15.45-.225s.227-.225.263-.3.037-.45-.038-.6-.263-.225-.563-.375-.525-.225-.976-.375c-.45-.15-.75-.225-.9-.225s-.15 0-.3.075-.45.225-.6.375-.375.375-.525.45-.3.15-.6.075c-.3-.075-1.275-.472-2.43-1.503-1.155-1.031-1.425-1.275-1.65-1.5-.15-.15-.15-.3-.075-.45s.15-.225.3-.375.225-.225.3-.375c.075-.15.037-.3-.038-.45s-.6-1.425-.825-1.95c-.225-.525-.45-.45-.6-.45-.15 0-.3 0-.6.075s-1.05.45-1.05 1.05c0 .6.375 1.125.45 1.2s.15.15.15.15c.675.9.825 1.05 1.65 2.1 1.2 1.575 1.575 1.8 2.7 2.4.9.45 1.425.45 1.8.375s.9-.375 1.2-.675c.3-.3.3-.6.3-.6s0-.15-.15-.225z" />
                                </svg>
                                Contact on WhatsApp
                            </a>
                            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all">
                                Go to Dashboard
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex items-center gap-4 mb-12">
                        <Link href="/cart" className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Link>
                        <h1 className="text-4xl font-bold tracking-tight">Complete Investment</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="bg-slate-900 text-white rounded-[40px] p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Landmark className="h-8 w-8 text-primary" />
                                        <h2 className="text-3xl font-bold">Manual Bank Transfer</h2>
                                    </div>

                                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 mb-10">
                                        <p className="text-slate-400 text-sm mb-6 font-medium">Please transfer the total amount to the bank account listed below:</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Account Name</p>
                                                <p className="text-lg font-bold">Polemarch Deals Private Limited</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Bank Name</p>
                                                <p className="text-lg font-bold">HDFC Bank</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Account Number</p>
                                                <p className="text-xl font-mono font-bold text-primary tracking-wider">50200021345678</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">IFSC Code</p>
                                                <p className="text-xl font-mono font-bold text-primary tracking-wider">HDFC0001234</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-white/10">
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Transfer Exactly</p>
                                            <p className="text-4xl font-bold text-white">Rs. {totalPayable.toLocaleString()}</p>
                                        </div>

                                        <button
                                            onClick={handleConfirmPayment}
                                            disabled={isProcessing}
                                            className="w-full sm:w-auto px-12 py-5 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Confirm Transfer Made
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {error && <p className="mt-4 text-red-400 text-sm font-bold text-center">{error}</p>}
                                </div>
                            </div>

                            <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 flex gap-4">
                                <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
                                <div>
                                    <p className="text-blue-900 font-bold mb-1">Secure Escrow Transfer</p>
                                    <p className="text-blue-800/70 text-sm leading-relaxed">
                                        All transactions are processed through SEBI/RBI regulated frameworks. Your funds are held in a secure escrow account until share transfer is initiated.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm h-fit sticky top-24">
                                <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                    Investment Summary
                                </h3>

                                <div className="space-y-4 mb-8">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 leading-tight mb-1">{item.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.quantity} Shares</p>
                                            </div>
                                            <p className="font-bold text-slate-900 text-sm">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-bold">Rs. {totalAmount.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Processing Fee (2%)</span>
                                        <span className="font-bold">Rs. {totalProcessingFee.toLocaleString("en-IN")}</span>
                                    </div>
                                    {totalLowQtyFee > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-amber-700">
                                                Low Quantity Fee
                                                <span className="block text-[10px] text-amber-600 font-normal">Per ISIN below Rs. 10,000</span>
                                            </span>
                                            <span className="font-bold text-amber-700">Rs. {totalLowQtyFee.toLocaleString("en-IN")}</span>
                                        </div>
                                    )}
                                    <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Payable</span>
                                        <span className="text-2xl font-bold text-primary">Rs. {totalPayable.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
