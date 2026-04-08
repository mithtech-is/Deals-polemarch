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
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        const fetchKycStatus = async () => {
            if (!user) return;
            try {
                // Fetch customer data to get KYC status from metadata instead of admin route
                const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/customers/me`, {
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                    }
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch customer data");
                }

                const data = await response.json();
                const metadata = data.customer?.metadata || {};
                const defaultFullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

                if (metadata.kyc_status) {
                    setKycData({
                        status: metadata.kyc_status,
                        rejectionReason: metadata.kyc_rejection_reason || "",
                        reviewNotes: metadata.kyc_review_notes || "",
                    });

                    if (metadata.kyc_status !== "rejected") {
                        setFormData({
                            panNumber: metadata.kyc_pan_number || "",
                            aadhaarNumber: metadata.kyc_aadhaar_number || "",
                            fullName: metadata.kyc_full_name || defaultFullName,
                            dpName: metadata.kyc_dp_name || "",
                            dematNumber: metadata.kyc_demat_number || "",
                            panFileUrl: metadata.kyc_pan_file_url || "",
                            cmrFileUrl: metadata.kyc_cmr_file_url || "",
                        });
                    } else {
                        setFormData({
                            panNumber: "",
                            aadhaarNumber: "",
                            fullName: metadata.kyc_full_name || defaultFullName,
                            dpName: "",
                            dematNumber: "",
                            panFileUrl: "",
                            cmrFileUrl: "",
                        });
                    }
                } else {
                    // Set default name if no KYC data exists yet
                    setFormData(prev => ({
                        ...prev,
                        fullName: defaultFullName,
                    }));
                }
            } catch (e) {
                console.error("Failed to fetch KYC status", e);
                // Don't crash, just let the user fill the form
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
    const normalizedAadhaar = formData.aadhaarNumber.replace(/\s/g, "");
    const isFormReady =
        formData.fullName.trim().length > 0 &&
        /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber) &&
        formData.dpName.trim().length > 0 &&
        /^(IN\d{14}|\d{16})$/.test(formData.dematNumber) &&
        /^[0-9]{12}$/.test(normalizedAadhaar) &&
        !!formData.panFileUrl &&
        !!formData.cmrFileUrl &&
        !isSubmitting &&
        !uploadingFile;

    const validateFields = () => {
        if (!formData.fullName.trim()) {
            setError("Full name is required.");
            return false;
        }

        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.panNumber)) {
            setError("Invalid PAN format. Example: ABCDE1234F");
            return false;
        }

        const aadhaarRegex = /^\d{12}$/;
        if (!aadhaarRegex.test(formData.aadhaarNumber.replace(/\s/g, ""))) {
            setError("Invalid Aadhaar Number. Must be exactly 12 digits.");
            return false;
        }

        const dematRegex = /^(IN\d{14}|\d{16})$/;
        if (!dematRegex.test(formData.dematNumber)) {
            setError("Invalid Demat Number. NSDL: IN + 14 digits (e.g. IN12345678901234). CDSL: 16 digits (e.g. 1208160012345678).");
            return false;
        }

        if (!formData.dpName.trim()) {
            setError("DP Name is required.");
            return false;
        }

        if (!formData.panFileUrl || !formData.cmrFileUrl) {
            setError("Please upload both PAN and CMR documents.");
            return false;
        }

        return true;
    };

    const deleteUploadedFile = async (url: string | null | undefined) => {
        if (!url) return;
        try {
            const backend = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
            await fetch(`${backend}/store/upload?url=${encodeURIComponent(url)}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                },
            });
        } catch (err) {
            // Best-effort: don't block on delete failure
            console.warn("Failed to delete previous file:", err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, internalFileType: 'pan' | 'cmr') => {
        const file = e.target.files?.[0];

        // Defensive checks
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }

        setUploadingFile(internalFileType);
        setError("");

        // Delete any previously uploaded file in this slot before uploading the new one
        const previousUrl = internalFileType === 'pan' ? formData.panFileUrl : formData.cmrFileUrl;
        if (previousUrl) {
            await deleteUploadedFile(previousUrl);
        }

        try {
            const uploadData = new FormData();

            // Backend now only requires key "file"
            uploadData.append("file", file);

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
                console.error("Upload response error:", data);
                throw new Error(data.message || data.error || "Upload failed.");
            }

            if (!data.url) {
                throw new Error("Upload succeeded but no URL was returned.");
            }

            setFormData(prev => ({
                ...prev,
                [internalFileType === 'pan' ? 'panFileUrl' : 'cmrFileUrl']: data.url
            }));
        } catch (err: any) {
            console.error("KYC Upload Error:", err);
            setError(`Failed to upload ${internalFileType.toUpperCase()}: ${err.message}`);
        } finally {
            setUploadingFile(null);
            if (e.target) e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateFields()) return;

        setIsSubmitting(true);

        try {
            // Update customer metadata with KYC information
            const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/customers/me`, {
                method: "POST", // Medusa uses POST to update customer
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                },
                body: JSON.stringify({
                    metadata: {
                        ...(user.metadata || {}),
                        kyc_status: "pending",
                        kyc_submitted_at: new Date().toISOString(),
                        kyc_reviewed_at: null,
                        kyc_review_notes: null,
                        kyc_rejection_reason: null,
                        kyc_approved_at: null,
                        kyc_rejected_at: null,
                        kyc_pan_number: formData.panNumber,
                        kyc_aadhaar_number: formData.aadhaarNumber.replace(/\s/g, ""),
                        kyc_dp_name: formData.dpName,
                        kyc_demat_number: formData.dematNumber,
                        kyc_pan_file_url: formData.panFileUrl,
                        kyc_cmr_file_url: formData.cmrFileUrl,
                        kyc_full_name: formData.fullName
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Failed to submit KYC");
            }

            setSuccess(true);
            await checkSession();
        } catch (err: any) {
            setError(err.message || "Failed to submit KYC. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelKyc = async () => {
        if (!user) return;
        const confirmed = typeof window !== "undefined"
            ? window.confirm("This will delete your uploaded documents and reset your KYC. You'll need to fill the form again. Continue?")
            : false;
        if (!confirmed) return;

        setIsCancelling(true);
        setError("");

        // Pull current file URLs from user metadata (form state may be empty after refresh)
        const meta = (user.metadata || {}) as Record<string, any>;
        const panUrl = meta.kyc_pan_file_url as string | undefined;
        const cmrUrl = meta.kyc_cmr_file_url as string | undefined;

        try {
            // Delete uploaded files in parallel (best-effort)
            await Promise.all([deleteUploadedFile(panUrl), deleteUploadedFile(cmrUrl)]);

            // Clear KYC metadata on the customer
            const response = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'}/store/customers/me`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("medusa_auth_token")}`,
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
                },
                body: JSON.stringify({
                    metadata: {
                        ...meta,
                        kyc_status: null,
                        kyc_pan_number: null,
                        kyc_aadhaar_number: null,
                        kyc_full_name: null,
                        kyc_dp_name: null,
                        kyc_demat_number: null,
                        kyc_pan_file_url: null,
                        kyc_cmr_file_url: null,
                        kyc_submitted_at: null,
                        kyc_reviewed_at: null,
                        kyc_approved_at: null,
                        kyc_rejected_at: null,
                        kyc_review_notes: null,
                        kyc_rejection_reason: null,
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Failed to cancel KYC");
            }

            // Reset local state and refresh user
            setFormData({
                panNumber: "",
                aadhaarNumber: "",
                fullName: "",
                dpName: "",
                dematNumber: "",
                panFileUrl: "",
                cmrFileUrl: "",
            });
            setSuccess(false);
            setKycData(null);
            await checkSession();
        } catch (err: any) {
            setError(err.message || "Failed to cancel KYC. Please try again.");
        } finally {
            setIsCancelling(false);
        }
    };

    if (currentKycStatus === "approved" || currentKycStatus === "verified") {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50/50">
                <Navbar />
                <main className="flex-grow py-20 px-4">
                    <div className="container mx-auto max-w-2xl text-center">
                        <div className="h-24 w-24 rounded-[32px] bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">KYC Approved</h1>
                        <p className="text-xl text-slate-500 mb-12">
                            Your KYC has been accepted. You can now access investment features across your dashboard.
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

    if (success || currentKycStatus === "submitted" || currentKycStatus === "pending") {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50/50">
                <Navbar />
                <main className="flex-grow py-20 px-4">
                    <div className="container mx-auto max-w-2xl text-center">
                        <div className="h-24 w-24 rounded-[32px] bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Pending Verification</h1>
                        <p className="text-xl text-slate-500 mb-4">
                            Your KYC documents have been submitted and are awaiting review.
                        </p>
                        <p className="text-base text-slate-400 mb-12">
                            Our compliance team typically reviews submissions within 24–72 working hours.
                        </p>
                        {error && (
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="px-8 py-4 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={handleCancelKyc}
                                disabled={isCancelling}
                                className="px-8 py-4 rounded-2xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCancelling ? "Cancelling..." : "Cancel & Re-submit"}
                            </button>
                        </div>
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
                                {currentKycStatus === "rejected" && (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
                                        <p className="mb-1 text-sm font-bold">Previous submission was rejected</p>
                                        <p className="text-sm">
                                            {kycData?.rejectionReason || "Please correct your details and submit again."}
                                        </p>
                                    </div>
                                )}
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
                                                
                                                if (val.length === 10) {
                                                    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                                                    if (!panRegex.test(val)) {
                                                        setError("Invalid PAN format. Example: ABCDE1234F");
                                                    } else if (error && error.includes("PAN")) {
                                                        setError("");
                                                    }
                                                } else if (error && error.includes("PAN")) {
                                                    setError("");
                                                }
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
                                        <label className="text-sm font-bold text-slate-600 ml-1">Demat Account Number (BO ID)</label>
                                        <input
                                            required
                                            type="text"
                                            maxLength={16}
                                            placeholder="IN30021412345678 or 1208160012345678"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                            value={formData.dematNumber}
                                            onChange={(e) => {
                                                // Allowed: "IN" + up to 14 digits, OR up to 16 digits
                                                const raw = e.target.value.toUpperCase();
                                                let val = "";
                                                if (raw.startsWith("I")) {
                                                    // NSDL path: keep "IN" prefix, then digits only
                                                    if (raw.startsWith("IN")) {
                                                        val = "IN" + raw.slice(2).replace(/\D/g, "").slice(0, 14);
                                                    } else {
                                                        val = "I"; // user typed only "I" so far
                                                    }
                                                } else {
                                                    // CDSL path: digits only
                                                    val = raw.replace(/\D/g, "").slice(0, 16);
                                                }
                                                setFormData({ ...formData, dematNumber: val });
                                            }}
                                        />
                                        <p className="text-[10px] text-slate-400 ml-1">NSDL: IN + 14 digits | CDSL: 16 digits</p>
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
                                                
                                                if (val.length > 0 && val.length < 12) {
                                                    if (error && error.includes("Aadhaar")) {
                                                        // Keep showing error if they are deleting
                                                    }
                                                } else if (val.length === 12) {
                                                    const aadhaarRegex = /^\d{12}$/;
                                                    if (!aadhaarRegex.test(val)) {
                                                        setError("Invalid Aadhaar Number. Must be exactly 12 digits.");
                                                    } else if (error && error.includes("Aadhaar")) {
                                                        setError("");
                                                    }
                                                } else if (error && error.includes("Aadhaar")) {
                                                    setError("");
                                                }
                                            }}
                                            onBlur={(e) => {
                                                let val = e.target.value.replace(/[^0-9]/g, "");
                                                if (val.length > 0 && val.length !== 12) {
                                                    setError("Invalid Aadhaar Number. Must be exactly 12 digits.");
                                                }
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
                                    disabled={!isFormReady}
                                    type="submit"
                                    className="w-full py-5 rounded-[24px] bg-primary text-white font-bold text-lg hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl shadow-primary/20"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        currentKycStatus === "rejected" ? "Re-submit Verification Request" : "Submit Verification Request"
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
