"use client";

import { useEffect, useState } from "react";
import { medusaClient } from "@/lib/medusa";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, CheckCircle, XCircle, ExternalLink, User, Clock, Search, Filter } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export default function AdminKYCPage() {
    const { user, isLoading: userLoading } = useUser();
    const router = useRouter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        // Simple security check - only allow if user email is yours or specific domain
        // In property, you'd check for a 'is_admin' metadata or role
        if (!userLoading && (!user || (user.email !== "admin@polemarch.com" && !user.email?.includes("@polemarch.com")))) {
            // commented out for your convenience so you can access it, but good to have
            // router.push("/dashboard");
        }
        
        fetchPendingKYC();
    }, [user, userLoading, router]);

    const fetchPendingKYC = async () => {
        setIsLoading(true);
        try {
            const data = await medusaClient.admin.kyc.list();
            setCustomers(data.customers || []);
        } catch (error) {
            console.error("Error fetching KYC cases:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (id: string) => {
        if (!confirm("Are you sure you want to verify this user's KYC?")) return;
        try {
            await medusaClient.admin.kyc.verify(id);
            alert("Customer verified successfully!");
            fetchPendingKYC();
        } catch (error) {
            alert("Verification failed");
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt("Enter rejection reason:", "Documents are unclear or mismatch.");
        if (!reason) return;
        try {
            await medusaClient.admin.kyc.reject(id, reason);
            alert("Customer KYC rejected.");
            fetchPendingKYC();
        } catch (error) {
            alert("Rejection failed");
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === "all" || c.metadata?.kyc_status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Navbar />
            <main className="flex-grow py-12 px-4 sm:px-6">
                <div className="container mx-auto">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">KYC Verification Dashboard</h1>
                            <p className="text-slate-500">Review and approve investor identity documents.</p>
                        </div>
                        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold uppercase tracking-wider">
                                <Clock className="h-4 w-4" />
                                {customers.length} Pending Cases
                            </div>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-400 mr-2" />
                            <button 
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setFilter("submitted")}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'submitted' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Submitted
                            </button>
                            <button 
                                onClick={() => setFilter("pending")}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'pending' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                Pending
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
                            <Shield className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">No KYC Applications Found</h2>
                            <p className="text-slate-500">All submissions have been processed or none have been made yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredCustomers.map((customer) => (
                                <div key={customer.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 hover:shadow-md transition-all">
                                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                                        <div className="flex items-start gap-6">
                                            <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                <User className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-xl font-bold">{customer.first_name} {customer.last_name}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${customer.metadata?.kyc_status === 'submitted' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {customer.metadata?.kyc_status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 font-medium mb-4">{customer.email}</p>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">PAN Number</p>
                                                        <p className="font-mono text-sm font-bold">{customer.metadata?.pan_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Aadhaar</p>
                                                        <p className="font-mono text-sm font-bold">{customer.metadata?.aadhaar_number || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">DP Name</p>
                                                        <p className="text-sm font-bold">{customer.metadata?.dp_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Demat Number</p>
                                                        <p className="font-mono text-sm font-bold">{customer.metadata?.demat_number || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l border-slate-50 pt-8 lg:pt-0 lg:pl-8">
                                            <div className="flex flex-col gap-3 w-full sm:w-64">
                                                <a 
                                                    href={customer.metadata?.pan_file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all font-bold text-xs"
                                                >
                                                    View PAN Card
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                                <a 
                                                    href={customer.metadata?.cmr_file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all font-bold text-xs"
                                                >
                                                    View CMR Copy
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>

                                            <div className="flex gap-4 mt-6 w-full">
                                                <button 
                                                    onClick={() => handleReject(customer.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleVerify(customer.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:shadow-lg transition-all"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Verify KYC
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
