"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { AlertCircle, Clock, Mail, Phone, MapPin, ShieldAlert } from "lucide-react";

export default function DisclaimerPage() {
    const lastUpdated = "March 2024";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-16 shadow-2xl shadow-primary/5">
                        <div className="flex items-center gap-4 mb-8 text-primary">
                            <ShieldAlert className="h-8 w-8" />
                            <span className="font-bold tracking-widest uppercase text-sm">Legal & Compliance</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">Risk Disclaimer</h1>
                        <div className="flex items-center gap-2 text-slate-400 mb-12 font-medium">
                            <Clock className="h-4 w-4" />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>

                        <div className="p-6 rounded-3xl bg-red-50 border border-red-100 mb-12 flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 shrink-0" />
                            <p className="text-red-800 text-sm leading-relaxed">
                                <strong>High Risk Investment</strong>: Investing in unlisted shares and pre-IPO opportunities is highly speculative and carries a significant risk of capital loss. These investments are not suitable for all investors.
                            </p>
                        </div>

                        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 leading-relaxed">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">No Investment Advice or Offer to Sell</h2>
                            <p>
                                The material presented on this Site is strictly for informational purposes only and is not intended to constitute investment, legal, accounting, tax, or any other professional advice. The contents herein should not be construed as a solicitation, recommendation, endorsement, or offer to buy or sell any unlisted/pre-IPO share, security, or financial product. Any decision to invest should be made after consulting with a qualified financial advisor and considering your individual financial circumstances, investment objectives, and risk tolerance.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">Risks Associated with Unlisted Securities</h2>
                            <p>
                                Investing in unlisted or pre-IPO securities and the private market involves substantial risk, including the risk of loss of principal. Such investments may be illiquid, subject to less regulatory oversight, and may not provide timely or regular financial disclosures. There is no assurance that investments in unlisted securities will achieve their objectives or deliver returns. Past performance is not indicative of future results. Any performance data, valuations, or trends discussed on the Site are illustrative in nature and should not be interpreted as a guarantee of any specific outcome.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">No Regulatory Authorization</h2>
                            <p>
                                Polemarch is not a stock exchange and does not intend to be recognized as one under the Securities Contracts (Regulation) Act, 1956. Polemarch is not authorized or registered with the Securities and Exchange Board of India (SEBI) to solicit public investments, act as a broker, portfolio manager, or investment advisor. Any services offered are limited to facilitating access to information related to private market investment opportunities.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">Accuracy of Information</h2>
                            <p>
                                While we strive to ensure that the information on this Site is accurate, complete, and up to date, Polemarch makes no warranties or representations, express or implied, regarding the timeliness, accuracy, reliability, or completeness of any content. All data, charts, news, and other materials presented are obtained from sources believed to be reliable, but Polemarch does not guarantee their accuracy.
                            </p>
                            <p>
                                The content may be updated, modified, or removed at any time without prior notice, and Polemarch bears no responsibility for maintaining content continuity or data history.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">Limitation of Liability</h2>
                            <p>
                                Under no circumstances shall Polemarch, its directors, officers, employees, agents, affiliates, or representatives be held liable for any direct, indirect, incidental, consequential, punitive, or special damages, including but not limited to financial loss, loss of opportunity, or data, incurred by any user or third party due to reliance on the content provided on this Site.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">User Responsibility</h2>
                            <p>
                                Visitors to the Site are solely responsible for their decisions regarding investments, partnerships, or any financial actions based on the information provided herein. We strongly encourage users to conduct their own due diligence and seek independent professional advice prior to making any investment decisions.
                            </p>
                            <p className="mt-8 font-bold">
                                By accessing this Site, you acknowledge that you have read, understood, and agreed to this Disclaimer.
                            </p>

                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-6 not-prose mt-12">
                                <div className="flex items-start gap-4">
                                    <MapPin className="h-6 w-6 text-primary mt-1" />
                                    <div>
                                        <p className="font-bold text-slate-900">Polemarch Financial Services</p>
                                        <p className="text-slate-600">Rajajinagar, Bengaluru, Karnataka, India</p>
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
