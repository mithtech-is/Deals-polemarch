"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, Clock, Mail, Phone, MapPin } from "lucide-react";

export default function PrivacyPage() {
    const lastUpdated = "March 2026";

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-20 px-4 sm:px-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-16 shadow-2xl shadow-primary/5">
                        <div className="flex items-center gap-4 mb-8 text-primary">
                            <Shield className="h-8 w-8" />
                            <span className="font-bold tracking-widest uppercase text-sm">Legal & Compliance</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">Privacy Policy</h1>
                        <div className="flex items-center gap-2 text-slate-400 mb-12 font-medium">
                            <Clock className="h-4 w-4" />
                            <span>Last Updated: {lastUpdated}</span>
                        </div>

                        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 leading-relaxed">
                            <p className="text-lg">
                                Polemarch (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you visit our website or use our services.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">1. Information We Collect</h2>

                            <h3 className="text-xl font-bold mt-8 mb-4">a. Personal Information</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Full Name</li>
                                <li>Email Address</li>
                                <li>Phone Number</li>
                                <li>PAN Card Number</li>
                                <li>Aadhaar Number (if applicable)</li>
                                <li>Bank Account Details (for transactions)</li>
                                <li>KYC Documents</li>
                            </ul>

                            <h3 className="text-xl font-bold mt-8 mb-4">b. Transactional Data</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Investments made in unlisted/pre-IPO shares</li>
                                <li>Payment details</li>
                                <li>Communications regarding share transfers or trading</li>
                            </ul>

                            <h3 className="text-xl font-bold mt-8 mb-4">c. Technical Data</h3>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>IP address</li>
                                <li>Device type</li>
                                <li>Browser type and version</li>
                                <li>Cookies and usage data</li>
                            </ul>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">2. How We Use Your Information</h2>
                            <p>We use your information to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Process investments in unlisted or pre-IPO shares</li>
                                <li>Complete KYC and compliance verifications</li>
                                <li>Communicate updates and transaction statuses</li>
                                <li>Provide customer support</li>
                                <li>Send promotional and informational content (with your consent)</li>
                                <li>Detect and prevent fraud or misuse</li>
                                <li>Comply with legal obligations</li>
                            </ul>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">3. Disclosure of Information</h2>
                            <p>We may share your data with:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>SEBI-registered intermediaries (brokers, custodians, registrars)</li>
                                <li>Regulatory authorities (as required by law)</li>
                                <li>Our service providers (IT, analytics, payment gateways)</li>
                                <li>Legal and tax consultants (only when required)</li>
                            </ul>
                            <p className="font-bold text-primary mt-4 italic">We never sell or rent your personal information.</p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">4. Data Retention</h2>
                            <p>We retain your personal information only as long as necessary for:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Fulfilling the purposes outlined above</li>
                                <li>Complying with legal and regulatory requirements</li>
                            </ul>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">5. Security of Your Information</h2>
                            <p>
                                We use industry-standard encryption and secure servers to protect your information. However, no method of transmission over the internet is 100% secure.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">6. Your Rights</h2>
                            <p>Depending on applicable laws, you may have the right to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Access the personal data we hold about you</li>
                                <li>Request correction or deletion of your data</li>
                                <li>Withdraw your consent for data processing</li>
                                <li>Opt out of marketing communications</li>
                            </ul>
                            <p className="mt-4">To exercise your rights, please contact us at <a href="mailto:support@polemarch.in" className="text-primary font-bold">support@polemarch.in</a>.</p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">7. Cookies</h2>
                            <p>
                                Our website uses cookies to enhance your experience and analyze web traffic. You can manage cookie preferences via your browser settings.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">8. Third-Party Links</h2>
                            <p>
                                Our website may contain links to external sites. We are not responsible for the privacy practices or content of those websites.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">9. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy periodically. Updates will be posted on this page with a revised &ldquo;Last Updated&rdquo; date.
                            </p>

                            <h2 className="text-2xl font-bold mt-12 mb-6 text-slate-900 underline decoration-primary/30 underline-offset-8">10. Contact Us</h2>
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
