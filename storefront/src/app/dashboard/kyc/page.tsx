"use client";

import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, ArrowLeft, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { medusaClient } from "@/lib/medusa";

export default function KYCPage() {
    const { user, isLoading, checkSession } = useUser();
    const router = useRouter();
    const [kycData, setKycData] = useState<any>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        panNumber: "",
        aadhaarNumber: "",
        fullName: "",
        dpName: "",
        dematNumber: "",
        panFileUrl: "",
        cmrFileUrl: "",
    });
    const [uploadingFile, setUploadingFile] = useState<string | null>(null);

    useEffect(() => {
        const fetchKycStatus = async () => {
            if (!user) return;
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/kyc`, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                    }
                });
                const data = await response.json();
                if (data.kyc_request) {
                    setKycData(data.kyc_request);
                    setFormData({
                        panNumber: data.kyc_request.pan_number || "",
                        aadhaarNumber: data.kyc_request.aadhaar_number || "",
                        fullName: user.first_name + " " + (user.last_name || ""),
                        dpName: data.kyc_request.dp_name || "",
                        dematNumber: data.kyc_request.demat_number || "",
                        panFileUrl: data.kyc_request.pan_file_url || "",
                        cmrFileUrl: data.kyc_request.cmr_file_url || "",
                    });
                }
            } catch (e) {
                console.error("Failed to fetch KYC status", e);
            }
        };
        fetchKycStatus();
    }, [user]);

    if (isLoading || !user) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const currentKycStatus = kycData?.status || "none";

    const validateFields = () => {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.panNumber)) {
            setError("Invalid PAN Format. Example: ABCDE1234F (10 characters)");
            return false;
        }

        const aadhaarRegex = /^[0-9]{12}$/;
        if (!aadhaarRegex.test(formData.aadhaarNumber.replace(/\s/g, ""))) {
            setError("Invalid Aadhaar Number. Must be exactly 12 digits.");
            return false;
        }

        const dematRegex = /^[0-9]{16}$/;
        if (!dematRegex.test(formData.dematNumber)) {
            setError("Invalid Demat Number. Must be exactly 16 digits (8-digit DP ID + 8-digit Client ID).");
            return false;
        }

        if (!formData.panFileUrl || !formData.cmrFileUrl) {
            setError("Please upload both PAN and CMR documents.");
            return false;
        }

        return true;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pan' | 'cmr') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(type);
        setError("");

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("userName", formData.fullName || user?.email || "user");
        uploadData.append("docType", type === 'pan' ? 'pan_card' : 'cmr_copy');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                },
                body: uploadData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Upload failed");
            }

            setFormData(prev => ({
                ...prev,
                [type === 'pan' ? 'panFileUrl' : 'cmrFileUrl']: data.url
            }));
        } catch (err: any) {
            console.error("KYC Upload Error:", err);
            setError(`Failed to upload ${type.toUpperCase()}: ${err.message}`);
        } finally {
            setUploadingFile(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateFields()) return;

        setIsSubmitting(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/kyc`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                },
                body: JSON.stringify({
                    pan_number: formData.panNumber,
                    aadhaar_number: formData.aadhaarNumber.replace(/\s/g, ""),
                    dp_name: formData.dpName,
                    demat_number: formData.dematNumber,
                    pan_file_url: formData.panFileUrl,
                    cmr_file_url: formData.cmrFileUrl,
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to submit KYC");
            }

            setSuccess(true);
            await checkSession();
        } catch (err: any) {
            setError(err.message || "Failed to submit KYC. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success || currentKycStatus === "submitted" || currentKycStatus === "pending") {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50/50">
                <Navbar />
                <main className="flex-grow py-20 px-4">
                    <div className="container mx-auto max-w-2xl text-center">
                        <div className="h-24 w-24 rounded-[32px] bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">KYC Submitted Successfully!</h1>
                        <p className="text-xl text-slate-500 mb-12">
                            Our compliance team is currently reviewing your documents. Your KYC is under review and will be updated in 24-72 working hours.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="px-8 py-4 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-12 px-4">
                <div className="container mx-auto max-w-2xl">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="flex items-center gap-2 text-slate-400 font-bold hover:text-primary transition-colors mb-12"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>

                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                    <Shield className="h-8 w-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">Identity Verification</h1>
                                    <p className="text-slate-500">Secure KYC Process</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-1">Full Name (As per PAN)</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter your full name"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">PAN Number</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={10}
                                            placeholder="ABCDE1234F"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium uppercase"
                                            value={formData.panNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                                setFormData({ ...formData, panNumber: val });
                                            }}
                                        />
                                        <p className="text-[10px] text-slate-400 ml-1">Example: ABCDE1234F (10 Digits)</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">DP Name (e.g. Zerodha, Groww)</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Enter your DP Name"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            value={formData.dpName}
                                            onChange={(e) => setFormData({ ...formData, dpName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Demat Account Number (16 Digits)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={16}
                                            placeholder="12081600..."
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            value={formData.dematNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, "");
                                                setFormData({ ...formData, dematNumber: val });
                                            }}
                                        />
                                        <p className="text-[10px] text-slate-400 ml-1">8 Digit DP ID + 8 Digit Client ID</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Aadhaar Number (12 Digits)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={14} // Allows spaces for formatting if we added it, but let's stick to 12 raw
                                            placeholder="1234 5678 9012"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            value={formData.aadhaarNumber}
                                            onChange={(e) => {
                                                // Simple formatting: xxxx xxxx xxxx
                                                let val = e.target.value.replace(/[^0-9]/g, "");
                                                if (val.length > 12) val = val.slice(0, 12);

                                                let formatted = val;
                                                if (val.length > 4) formatted = val.slice(0, 4) + " " + val.slice(4);
                                                if (val.length > 8) formatted = val.slice(0, 4) + " " + val.slice(4, 8) + " " + val.slice(8);

                                                setFormData({ ...formData, aadhaarNumber: formatted });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="pan-upload"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => handleFileUpload(e, 'pan')}
                                        />
                                        <label
                                            htmlFor="pan-upload"
                                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl text-center hover:bg-slate-50 transition-colors cursor-pointer group ${formData.panFileUrl ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}
                                        >
                                            {uploadingFile === 'pan' ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                                            ) : formData.panFileUrl ? (
                                                <CheckCircle2 className="h-8 w-8 text-green-500 mb-3" />
                                            ) : (
                                                <Upload className="h-8 w-8 text-slate-300 mx-auto mb-3 group-hover:text-primary transition-colors" />
                                            )}
                                            <p className="font-bold text-xs text-slate-600 mb-1">
                                                {formData.panFileUrl ? 'PAN Uploaded' : 'Upload PAN Copy'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">PDF, JPG (Max 5MB)</p>
                                        </label>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="cmr-upload"
                                            className="hidden"
                                            accept=".pdf"
                                            onChange={(e) => handleFileUpload(e, 'cmr')}
                                        />
                                        <label
                                            htmlFor="cmr-upload"
                                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-3xl text-center hover:bg-slate-50 transition-colors cursor-pointer group ${formData.cmrFileUrl ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`}
                                        >
                                            {uploadingFile === 'cmr' ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                                            ) : formData.cmrFileUrl ? (
                                                <CheckCircle2 className="h-8 w-8 text-green-500 mb-3" />
                                            ) : (
                                                <Upload className="h-8 w-8 text-slate-300 mx-auto mb-3 group-hover:text-primary transition-colors" />
                                            )}
                                            <p className="font-bold text-xs text-slate-600 mb-1">
                                                {formData.cmrFileUrl ? 'CMR Uploaded' : 'Upload CMR Copy'}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Digitally Signed PDF</p>
                                        </label>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-2xl bg-red-50 text-red-600 flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="h-5 w-5" />
                                        <p className="text-sm font-bold">{error}</p>
                                    </div>
                                )}

                                <button
                                    disabled={isSubmitting || !!uploadingFile}
                                    type="submit"
                                    className="w-full py-5 rounded-[24px] bg-primary text-white font-bold text-lg hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-primary/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        "Submit Verification Request"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="mt-12 bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">How to get your CMR Copy?</h2>
                                <p className="text-slate-500 font-medium text-sm italic">A Client Master Report (CMR) is mandatory for unlisted share transfers.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">1</div>
                                        <h3 className="font-bold text-slate-800">Locate in Broker App</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed ml-11">
                                        Log in to your broker (Zerodha, Groww, Angel One, etc.). Navigate to Profile &gt; Reports &gt; Client Master Report or Console.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">2</div>
                                        <h3 className="font-bold text-slate-800">Download Digitally Signed PDF</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed ml-11">
                                        Download the report directly in PDF format. Ensure it is digitally signed or officially stamped by your Depository Participant.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">3</div>
                                        <h3 className="font-bold text-slate-800">Verify Authenticity</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed ml-11">
                                        Check that the name, PAN, and Demat details (DP ID & Client ID) match exactly with your platform profile.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">4</div>
                                        <h3 className="font-bold text-slate-800">Upload Above</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed ml-11">
                                        Upload the clean PDF copy in the 'Upload CMR Copy' section of the form above for our team to verify.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100">
                                <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Why is CMR required?
                                </h4>
                                <p className="text-xs text-blue-800/80 leading-relaxed">
                                    A CMR (Client Master Report) copy is an official document issued by your Depository Participant (DP) that verified your Demat account details. It is essential for the legal transfer of unlisted shares into your account and ensures compliance with SEBI guidelines.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
