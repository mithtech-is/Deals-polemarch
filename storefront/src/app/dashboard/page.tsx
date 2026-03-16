"use client";

import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { User, Shield, CreditCard, PieChart, LogOut, ArrowRight, Clock, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { medusaClient } from "@/lib/medusa";

export default function DashboardPage() {
    const { user, isLoading, logout, checkSession } = useUser();
    const router = useRouter();
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [manualFormData, setManualFormData] = useState({
        companyName: "",
        amount: "",
        platform: "",
        isin: ""
    });
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(5);

    const fetchOrders = async () => {
        try {
            setOrdersLoading(true);
            const { orders: fetchedOrders } = await medusaClient.orders.list();
            // Sort by created_at DESC (newest first)
            const sortedOrders = (fetchedOrders || []).sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setOrders(sortedOrders);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setOrdersLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        } else if (user) {
            fetchOrders();
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const manualInvestments = user.metadata?.manual_investments || [];
    const totalManualValue = manualInvestments.reduce((sum: number, inv: any) => sum + (parseFloat(inv.amount) || 0), 0);

    const fulfilledOrders = orders.filter(
        (order: any) => order.fulfillment_status === "fulfilled"
    );
    const totalMedusaOrdersValue = fulfilledOrders.reduce(
        (sum: number, order: any) => sum + (order.total || 0),
        0
    );
    const totalPortfolioValue = totalManualValue + totalMedusaOrdersValue;

    const kycStatus = user.metadata?.kyc_status || "pending";
    const kycConfig = {
        pending: {
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-100",
            icon: Clock,
            title: "Action Required",
            desc: "Complete your KYC to unlock all features.",
            btnText: "Start KYC Process",
            pulse: true
        },
        submitted: {
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-100",
            icon: Clock,
            title: "Under Review",
            desc: "Your KYC is under review and will be updated in 24-72 working hours.",
            btnText: "Check Progress",
            pulse: true
        },
        verified: {
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-100",
            icon: Shield,
            title: "Verified",
            desc: "Your identity has been successfully verified.",
            btnText: "View Documents",
            pulse: false
        }
    }[kycStatus as "pending" | "submitted" | "verified"] || {
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-100",
        icon: Clock,
        title: "Action Required",
        desc: "Complete your KYC to unlock all features.",
        btnText: "Start KYC Process",
        pulse: true
    };

    const KycIcon = kycConfig.icon;

    const handleAddManualInvestment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingManual(true);
        try {
            const newInvestment = {
                id: Date.now().toString(),
                ...manualFormData,
                date: new Date().toISOString()
            };

            const updatedManualInvestments = [...manualInvestments, newInvestment];

            await medusaClient.customers.update({
                metadata: {
                    ...user.metadata,
                    manual_investments: updatedManualInvestments
                }
            });

            await checkSession();
            setIsAddingManual(false);
            setManualFormData({ companyName: "", amount: "", platform: "", isin: "" });
        } catch (error) {
            console.error("Error adding manual investment:", error);
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const handleDeleteManualInvestment = async (id: string) => {
        try {
            const updatedManualInvestments = manualInvestments.filter((inv: any) => inv.id !== id);
            await medusaClient.customers.update({
                metadata: {
                    ...user.metadata,
                    manual_investments: updatedManualInvestments
                }
            });
            await checkSession();
        } catch (error) {
            console.error("Error deleting manual investment:", error);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-12 px-4 sm:px-6">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight mb-2">Hello, {user.first_name}!</h1>
                            <p className="text-slate-500">Welcome back to your investor dashboard.</p>
                        </div>
                        <button
                            onClick={() => { logout(); router.push("/"); }}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm shadow-sm"
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* Profile Summary */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
                            <div className="relative z-10">
                                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-4">Investment Profile</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b border-slate-50">
                                        <span className="text-slate-400 text-sm font-medium">Status</span>
                                        <span className={`text-sm font-bold flex items-center gap-1 ${kycStatus === 'verified' ? 'text-green-600' : 'text-orange-600'}`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${kycStatus === 'verified' ? 'bg-green-600' : 'bg-orange-600'} animate-pulse`} />
                                            {kycStatus === 'verified' ? 'Active' : 'Pending Verification'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-slate-50">
                                        <span className="text-slate-400 text-sm font-medium">Email</span>
                                        <span className="text-slate-900 text-sm font-bold max-w-[150px] truncate">{user.email}</span>
                                    </div>
                                    <div className="flex justify-between py-3">
                                        <span className="text-slate-400 text-sm font-medium">Account Type</span>
                                        <span className="text-slate-900 text-sm font-bold">Investor</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* KYC Status */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 h-32 w-32 ${kycConfig.bgColor}/20 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110`} />
                            <div className="relative z-10 h-full flex flex-col">
                                <div className={`h-16 w-16 rounded-3xl ${kycConfig.bgColor} flex items-center justify-center mb-6 ${kycConfig.color}`}>
                                    <KycIcon className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">KYC Verification</h3>
                                <p className="text-slate-500 text-sm mb-6">Required for transacting in unlisted shares.</p>

                                <div className={`p-4 rounded-2xl ${kycConfig.bgColor}/50 border ${kycConfig.borderColor} mb-auto flex items-start gap-4`}>
                                    <kycConfig.icon className={`h-5 w-5 ${kycConfig.color} mt-0.5`} />
                                    <div>
                                        <p className={`${kycConfig.color} font-bold text-sm`}>{kycConfig.title}</p>
                                        <p className="text-slate-600 text-[11px] font-medium leading-tight mt-1">{kycConfig.desc}</p>
                                    </div>
                                </div>

                                <Link
                                    href="/dashboard/kyc"
                                    className={`w-full py-4 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-6 ${kycStatus === 'verified' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                >
                                    {kycConfig.btnText}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Portfolio Summary */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group text-foreground">
                            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center mb-6 text-blue-600">
                                    <PieChart className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-4">Total Portfolio</h3>
                                <div className="text-4xl font-extrabold mb-1 tracking-tight text-primary">₹{totalPortfolioValue.toLocaleString('en-IN')}</div>
                                <p className="text-slate-400 text-xs font-medium mb-6">Aggregate value across all investments.</p>

                                <div className="space-y-3 mt-auto">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Marketplace Deals</span>
                                        <span className="font-bold">₹{totalMedusaOrdersValue.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Manual Tracked</span>
                                        <span className="font-bold">₹{totalManualValue.toLocaleString('en-IN')}</span>
                                    </div>
                                    <button
                                        onClick={() => setIsAddingManual(true)}
                                        className="w-full mt-4 py-4 rounded-2xl border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Manual Holding
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manual Holdings Form Modal (Simple Overlay) */}
                    {isAddingManual && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Add Manual Holding</h3>
                                        <p className="text-slate-500 text-sm">Track investments made on other platforms.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleAddManualInvestment} className="space-y-6">
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 block mb-2">Company Name</label>
                                        <input
                                            required
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 font-medium"
                                            placeholder="e.g. Swiggy, Ola"
                                            value={manualFormData.companyName}
                                            onChange={(e) => setManualFormData({ ...manualFormData, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 block mb-2">Amount Invested (₹)</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 font-medium"
                                            placeholder="50000"
                                            value={manualFormData.amount}
                                            onChange={(e) => setManualFormData({ ...manualFormData, amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 block mb-2">Platform / Source</label>
                                        <input
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 font-medium"
                                            placeholder="e.g. Altius, Precise"
                                            value={manualFormData.platform}
                                            onChange={(e) => setManualFormData({ ...manualFormData, platform: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 block mb-2">ISIN</label>
                                        <input
                                            required
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 font-medium"
                                            placeholder="e.g. INE721I01024"
                                            value={manualFormData.isin}
                                            onChange={(e) => setManualFormData({ ...manualFormData, isin: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingManual(false)}
                                            className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingManual}
                                            className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmittingManual ? "Saving..." : "Save Holding"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Manual Holdings List */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <Wallet className="h-6 w-6 text-primary" />
                                Manual Investments
                            </h2>
                            {manualInvestments.length > 0 ? (
                                <div className="space-y-4">
                                    {manualInvestments.map((inv: any) => (
                                        <div key={inv.id} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50/50 border border-slate-100 group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary font-bold shadow-sm">
                                                    {inv.companyName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{inv.companyName}</p>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs text-slate-400 font-medium">{inv.platform || 'Direct'}</p>
                                                        {inv.isin && <p className="text-[10px] text-primary/60 font-mono font-bold mt-1 uppercase">ISIN: {inv.isin}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <p className="font-bold text-primary">₹{parseFloat(inv.amount).toLocaleString('en-IN')}</p>
                                                <button
                                                    onClick={() => handleDeleteManualInvestment(inv.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <Wallet className="h-8 w-8" />
                                    </div>
                                    <p className="text-slate-400 font-medium">No external investments added yet.</p>
                                    <button
                                        onClick={() => setIsAddingManual(true)}
                                        className="mt-4 text-primary font-bold hover:underline"
                                    >
                                        Add your first holding
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Clock className="h-6 w-6 text-primary" />
                                    Recent Transactions
                                </h2>
                                <button 
                                    onClick={fetchOrders}
                                    className="p-2 hover:bg-slate-50 rounded-full transition-colors group"
                                    title="Refresh Transactions"
                                >
                                    <Clock className={`h-4 w-4 text-slate-400 group-hover:text-primary ${ordersLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {ordersLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
                                    <p className="text-slate-400 text-sm font-medium">Fetching transactions...</p>
                                </div>
                            ) : orders.length > 0 ? (
                                <div className="space-y-4">
                                    {orders.slice(0, visibleCount).map((order: any) => {
                                        const getOrderStatus = (order: any) => {
                                            if (order.canceled_at) return { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-100" };
                                            if (order.fulfillment_status === "fulfilled") return { label: "Shares Delivered", color: "bg-green-50 text-green-600 border-green-100" };
                                            if (order.payment_status === "captured") return { label: "Payment Confirmed", color: "bg-blue-50 text-blue-600 border-blue-100" };
                                            return { label: "Order Received", color: "bg-orange-50 text-orange-600 border-orange-100" };
                                        };

                                        const status = getOrderStatus(order);
                                        const firstItem = order.items?.[0] || {};

                                        return (
                                            <div key={order.id} className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary font-bold shadow-sm">
                                                        {firstItem.thumbnail ? (
                                                            <img src={firstItem.thumbnail} alt="" className="h-6 w-6 object-contain" />
                                                        ) : (
                                                            (firstItem.title || 'O').charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">{firstItem.title || "Order #" + order.display_id}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{firstItem.quantity || 0} Shares</p>
                                                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                            <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900 mb-2">₹{order.total.toLocaleString('en-IN')}</p>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {orders.length > visibleCount && (
                                        <button 
                                            onClick={() => setVisibleCount(prev => prev + 5)}
                                            className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl border border-dashed border-slate-200 hover:bg-slate-100 transition-all text-xs"
                                        >
                                            Load More Transactions
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 text-center">
                                    <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <CreditCard className="h-8 w-8" />
                                    </div>
                                    <p className="text-slate-400 font-medium">No recent transactions found on Polemarch.</p>
                                    <Link href="/deals" className="mt-4 text-primary font-bold hover:underline block">Explore Marketplace</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

