import Link from "next/link";
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook } from "lucide-react";

const Footer = () => {
    return (
        <footer className="bg-slate-50 border-t pt-16 pb-8">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-white font-bold text-xl">P</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Polemarch Deals</span>
                        </Link>
                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            Empowering investors with access to high-potential unlisted shares and pre-IPO opportunities. Transparent, secure, and professional.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                                <Linkedin className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                                <Twitter className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                                <Facebook className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link href="/deals" className="text-sm text-slate-600 hover:text-primary transition-colors">Unlisted Shares</Link></li>
                            <li><Link href="/pre-ipo" className="text-sm text-slate-600 hover:text-primary transition-colors">Pre-IPO Deals</Link></li>
                            <li><Link href="/how-it-works" className="text-sm text-slate-600 hover:text-primary transition-colors">How it works</Link></li>
                            <li><Link href="/pricing" className="text-sm text-slate-600 hover:text-primary transition-colors">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6">Resources</h4>
                        <ul className="space-y-4">
                            <li><Link href="/knowledge" className="text-sm text-slate-600 hover:text-primary transition-colors">Knowledge Base</Link></li>
                            <li><Link href="/blog" className="text-sm text-slate-600 hover:text-primary transition-colors">Blog</Link></li>
                            <li><Link href="/glossary" className="text-sm text-slate-600 hover:text-primary transition-colors">Glossary</Link></li>
                            <li><Link href="/faq" className="text-sm text-slate-600 hover:text-primary transition-colors">FAQs</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold mb-6">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-slate-600">
                                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>Rajajinagar<br />Bengaluru, Karnataka, India</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600">
                                <Phone className="h-4 w-4 text-primary shrink-0" />
                                <span>+91 90087 70738</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail className="h-4 w-4 text-primary shrink-0" />
                                <span>contact@polemarch.in</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t pt-8">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <p className="text-xs text-slate-500">
                            © {new Date().getFullYear()} Polemarch Financial Services. All rights reserved.
                        </p>
                        <div className="flex gap-6">
                            <Link href="/privacy" className="text-xs text-slate-500 hover:text-primary">Privacy Policy</Link>
                            <Link href="/terms" className="text-xs text-slate-500 hover:text-primary">Terms of Service</Link>
                            <Link href="/disclaimer" className="text-xs text-slate-500 hover:text-primary">Risk Disclaimer</Link>
                        </div>
                    </div>
                    <div className="mt-8 p-4 bg-slate-100 rounded-lg">
                        <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                            Disclaimer: Investment in unlisted shares involves high risk. Investors should be aware that their capital is at risk and the value of investments can go down as well as up. Past performance is not indicative of future results. Please consult with a financial advisor before making any investment decisions.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
