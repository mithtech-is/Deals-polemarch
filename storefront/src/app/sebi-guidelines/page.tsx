import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, AlertTriangle, BookOpen, Scale, FileText } from "lucide-react";

export default function SEBIGuidelinesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero */}
                <section className="py-20 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl font-bold tracking-tight mb-6 text-foreground">SEBI Guidelines</h1>
                        <p className="text-xl text-foreground/60">
                            Understanding the regulatory framework for unlisted securities
                        </p>
                    </div>
                </section>

                {/* Regulatory Notice */}
                <section className="py-12 px-4 sm:px-6">
                    <div className="container mx-auto max-w-4xl">
                        <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100 mb-12">
                            <div className="flex items-start gap-4">
                                <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h2 className="text-xl font-bold text-amber-800 mb-2">Important Regulatory Notice</h2>
                                    <p className="text-amber-700">
                                        Polemarch is <strong>not a stock exchange recognized by SEBI</strong> and does not facilitate secondary market trading.
                                        We operate within India's pre-listing equity segment to facilitate access to information about private market investment opportunities.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <Shield className="h-8 w-8 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">Objective</h3>
                                <p className="text-foreground/60">
                                    To protect investor interests and ensure transparency and fairness in the securities market
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <Scale className="h-8 w-8 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">Compliance</h3>
                                <p className="text-foreground/60">
                                    Users must confirm compliance with SEBI, RBI, FEMA Act, Companies Act 2013
                                </p>
                            </div>
                        </div>

                        <div className="prose prose-slate max-w-none mb-12">
                            <h2 className="text-2xl font-bold mb-4">Delisting Guidelines Overview</h2>
                            <p className="text-foreground/70 mb-4">
                                The Securities and Exchange Board of India (Delisting of Securities) Guidelines, 2003
                                were issued under Section 11(1) and 11A(2) of the SEBI Act, 1992. These guidelines
                                establish the framework for delisting of securities from recognized stock exchanges.
                            </p>

                            <h3 className="text-xl font-bold mb-3">Key Definitions</h3>
                            <ul className="list-disc list-inside text-foreground/70 mb-6">
                                <li><strong>Compulsory Delisting</strong>: Delisting mandated by a stock exchange</li>
                                <li><strong>Exchange</strong>: Any stock exchange recognized under the Securities Contracts Regulation Act, 1956</li>
                            </ul>

                            <h3 className="text-xl font-bold mb-3">Delisting Requirements</h3>
                            <p className="text-foreground/70 mb-4">Companies must maintain:</p>
                            <ul className="list-disc list-inside text-foreground/70 mb-6">
                                <li>Adequate public shareholding</li>
                                <li>Trading liquidity with sufficient volume for price discovery</li>
                                <li>Reasonable revenue/income/profits over last 2-3 years</li>
                                <li>Demonstrated earning power</li>
                            </ul>

                            <h3 className="text-xl font-bold mb-3">Exit Price Rules</h3>
                            <p className="text-foreground/70">
                                Promoters must use the <strong>book-building process</strong> to determine exit prices.
                                The offer must set a <strong>floor price</strong> based on the 26-week average trading price,
                                with no ceiling on maximum price. For infrequently traded securities, SEBI Takeover Regulations apply.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="flex items-start gap-4">
                                <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold mb-2">Disclaimer</h3>
                                    <p className="text-foreground/70 text-sm">
                                        Content is provided for <strong>educational and informational purposes only</strong> and does not constitute
                                        investment advice. The information herein should not be construed as legal, financial,
                                        or professional advice. Users should consult with qualified professionals before making
                                        any investment decisions.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <p className="text-sm text-foreground/50">
                                For complete SEBI guidelines, visit{" "}
                                <a href="https://www.sebi.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    www.sebi.gov.in
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
