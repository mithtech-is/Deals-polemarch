import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AlertCircle, Clock, FileX, RefreshCcw, ShieldAlert } from "lucide-react";

export default function CancellationPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero */}
                <section className="py-20 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl font-bold tracking-tight mb-6 text-foreground">Cancellation Policy</h1>
                        <p className="text-xl text-foreground/60">
                            Understanding our cancellation and refund procedures
                        </p>
                    </div>
                </section>

                <section className="py-16 px-4 sm:px-6">
                    <div className="container mx-auto max-w-4xl">
                        <div className="space-y-8">
                            {/* Cancellation Requirements */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                <div className="flex items-start gap-4">
                                    <FileX className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Cancellation Requirements</h2>
                                        <p className="text-foreground/70 mb-4">
                                            Cancellation requires <strong>written requests</strong> submitted before execution commences.
                                            Once processed, transactions are <strong>generally non-cancellable</strong> due to settlement
                                            cycles and counterparty commitments.
                                        </p>
                                        <p className="text-foreground/70">
                                            To request a cancellation, please contact us immediately at{" "}
                                            <a href="mailto:support@polemarch.in" className="text-primary hover:underline">support@polemarch.in</a>{" "}
                                            with your transaction details.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Refund Policy */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                <div className="flex items-start gap-4">
                                    <RefreshCcw className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Refund Policy</h2>
                                        <p className="text-foreground/70 mb-4">
                                            Refunds, if approved, will be transferred within <strong>3 to 7 business days</strong>
                                            minus applicable processing fees. The refund will be credited to the original
                                            payment method used for the transaction.
                                        </p>
                                        <p className="text-foreground/70">
                                            Please note that processing fees are non-refundable once the transaction
                                            has been initiated.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                <div className="flex items-start gap-4">
                                    <Clock className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Deficiency Reporting Timeline</h2>
                                        <p className="text-foreground/70">
                                            Any deficiencies in transactions must be reported within{" "}
                                            <strong>48 hours</strong> of initiation. Reports submitted after this period
                                            may not be eligible for review or resolution.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Authority */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                                <div className="flex items-start gap-4">
                                    <ShieldAlert className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Final Authority</h2>
                                        <p className="text-foreground/70 mb-4">
                                            Polemarch maintains final authority on all cancellation and refund decisions.
                                            Each request is evaluated on a case-by-case basis considering the transaction
                                            status, settlement obligations, and applicable regulatory requirements.
                                        </p>
                                        <p className="text-foreground/70">
                                            Polemarch is <strong>not responsible for delays</strong> from banking providers
                                            or statutory obligations under SEBI regulations.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Notice */}
                            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-amber-700 text-sm">
                                            <strong>Important:</strong> All cancellations and refunds are subject to applicable
                                            regulatory requirements and SEBI guidelines. We recommend consulting with our
                                            support team before initiating any cancellation request.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 p-6 text-center">
                            <p className="text-foreground/60">
                                For cancellation requests, please contact:{" "}
                                <a href="mailto:support@polemarch.in" className="text-primary hover:underline font-medium">
                                    support@polemarch.in
                                </a>
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
