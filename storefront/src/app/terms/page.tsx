"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FileText, Clock, Mail, Phone, MapPin, AlertCircle } from "lucide-react";

export default function TermsPage() {
    const lastUpdated = "March 2024";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-16 shadow-2xl shadow-primary/5">
                        <div className="flex items-center gap-4 mb-8 text-primary">
                            <FileText className="h-8 w-8" />
                            <span className="font-bold tracking-widest uppercase text-sm">Legal & Compliance</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">Terms of Service</h1>
                        <div className="flex items-center gap-2 text-slate-400 mb-12 font-medium">
                            <Clock className="h-4 w-4" />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>

                        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 mb-12 flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-amber-800 text-sm leading-relaxed">
                                <strong>Important Notice</strong>: Please read these terms carefully before using the Platform. These terms define the legal agreement between you and Polemarch regarding your use of our platform and investment facilitation services.
                            </p>
                        </div>

                        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 leading-relaxed">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">Cancellation & Refund Policy</h2>

                            <h3 className="text-xl font-bold mt-8 mb-4">1. Scope of This Policy</h3>
                            <p>This policy applies to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Investment-related requests submitted through the Polemarch platform</li>
                                <li>Service requests, consultations, or onboarding processes</li>
                                <li>Any paid or unpaid engagement initiated digitally or offline through Polemarch</li>
                            </ul>
                            <p className="mt-4">This policy does not override or replace any statutory rights available under applicable Indian laws.</p>

                            <h3 className="text-xl font-bold mt-12 mb-4">2. Cancellation of Investment Request</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Requests to cancel an investment must be submitted before execution of the transaction.</li>
                                <li>Once an investment order has been processed, confirmed, or executed, cancellation may not be possible.</li>
                                <li>Polemarch does not guarantee cancellation after execution, as unlisted share transactions are subject to counterparty availability, settlement cycles, and regulatory constraints.</li>
                                <li>Transactions once confirmed on the Platform are generally non-cancellable, as they initiate processes involving third parties such as depository participants, escrow trustees, and counterparty actions.</li>
                            </ul>

                            <h3 className="text-xl font-bold mt-12 mb-4">3. Non-Cancellable Scenarios</h3>
                            <p>Polemarch reserves the right to deny cancellation in any of the following situations:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>If the transfer of shares has already been initiated or completed (via DIS, e-DIS, CDSL Easiest, or NSDL Speed-E).</li>
                                <li>If funds have already been deposited into escrow or released to the Seller.</li>
                                <li>If regulatory filings, contracts, or share ownership records have been executed or recorded.</li>
                                <li>If the Seller or Buyer has materially relied upon the confirmation to fulfill compliance, taxation, or other statutory obligations.</li>
                            </ul>

                            <h3 className="text-xl font-bold mt-12 mb-4">4. Deficiencies or Transaction Errors</h3>
                            <p>In rare instances where a transaction is impacted due to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Incorrect share delivery</li>
                                <li>Seller’s inability to transfer agreed-upon securities</li>
                                <li>Errors in buyer demat details or payment issues</li>
                            </ul>
                            <p className="mt-4">Such issues must be reported within <strong>48 hours</strong> of the transaction initiation by writing to <a href="mailto:support@polemarch.in" className="text-primary font-bold">support@polemarch.in</a> with all supporting evidence.</p>

                            <h3 className="text-xl font-bold mt-12 mb-4">5. Refund Policy</h3>
                            <p>If a cancellation or refund is approved:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>The refund amount, if applicable, will be transferred back to the originating bank account of the Buyer after deducting any processing fees, Platform service charges, or applicable statutory levies.</li>
                                <li>Refunds may take <strong>3 to 7 business days</strong> to reflect in the end customer&rsquo;s account, depending on the banking system and Trustee&rsquo;s release protocols.</li>
                            </ul>

                            <h2 className="text-2xl font-bold mt-20 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">General Terms of Use</h2>
                            <p>By accessing this platform, you agree to be bound by our platform use policies, and you acknowledge that unlisted investments carry inherent liquidity and market risks.</p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">Contact Information</h2>
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-6 not-prose mt-8">
                                <div className="flex items-start gap-4">
                                    <MapPin className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <p className="font-bold text-slate-900">Polemarch Financial Services</p>
                                        <p className="text-slate-600">616/A, 9th Cross Rd, E block, 2nd Stage, Rajajinagar, Bengaluru, Karnataka 560010</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Mail className="h-6 w-6 text-primary" />
                                    <p className="text-slate-600 font-medium">Support@polemarch.in</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Phone className="h-6 w-6 text-primary" />
                                    <p className="text-slate-600 font-medium">+91 9008770738</p>
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
