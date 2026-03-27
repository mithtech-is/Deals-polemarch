"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setSuccess(false);
            setError("Password reset email is not configured yet. Please contact support for help signing in.");
        } catch {
            setError("Something went wrong. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow flex items-center justify-center py-20 px-4">
                <div className="w-full max-w-md">
                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-slate-500 font-bold hover:text-primary transition-colors mb-8 ml-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>

                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
                            <p className="text-slate-500 mb-8">Enter your email and we&apos;ll guide you with the next step.</p>

                            {success ? (
                                <div className="text-center py-4">
                                    <div className="h-20 w-20 rounded-[28px] bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Check your email</h3>
                                    <p className="text-slate-500 mb-8">We&apos;ve sent a password reset link to <span className="text-slate-900 font-bold">{email}</span></p>
                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="text-primary font-bold hover:underline"
                                    >
                                        Didn&apos;t receive the email? Try again
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                            <input
                                                required
                                                type="email"
                                                placeholder="name@example.com"
                                                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 rounded-2xl bg-red-50 text-red-600 flex items-center gap-3 border border-red-100 italic text-sm">
                                            <AlertCircle className="h-5 w-5" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="w-full py-5 rounded-[24px] bg-primary text-white font-bold text-lg hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/20"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                Checking...
                                            </>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
