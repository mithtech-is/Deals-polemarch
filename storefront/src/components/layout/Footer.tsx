import Image from "next/image";
import Link from "next/link";
import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";

const Footer = () => {
    return (
        <footer className="border-t bg-slate-50 pt-16 pb-8">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="mb-6 inline-flex items-center">
                            <Image
                                src="/assets/logos/polemarch_logo.png"
                                alt="Polemarch Deals"
                                width={168}
                                height={42}
                                className="h-10 w-auto max-w-[168px] object-contain"
                                style={{ width: "auto", height: "auto" }}
                            />
                        </Link>
                        <p className="mb-6 text-sm leading-relaxed text-slate-600">
                            Empowering investors with access to high-potential unlisted shares and pre-IPO opportunities. Transparent, secure, and professional.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white">
                                <Linkedin className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white">
                                <Twitter className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-white">
                                <Facebook className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-6 font-bold">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link href="/deals" className="text-sm text-slate-600 transition-colors hover:text-primary">Unlisted Shares</Link></li>
                            <li><Link href="/why-choose-us" className="text-sm text-slate-600 transition-colors hover:text-primary">Why Choose Us</Link></li>
                            <li><Link href="/partner-with-us" className="text-sm text-slate-600 transition-colors hover:text-primary">Partner With Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-6 font-bold">Resources</h4>
                        <ul className="space-y-4">
                            <li><Link href="/knowledge" className="text-sm text-slate-600 transition-colors hover:text-primary">Knowledge Base</Link></li>
                            <li><Link href="/about" className="text-sm text-slate-600 transition-colors hover:text-primary">About Us</Link></li>
                            <li><Link href="/careers" className="text-sm text-slate-600 transition-colors hover:text-primary">Careers</Link></li>
                            <li><Link href="/sebi-guidelines" className="text-sm text-slate-600 transition-colors hover:text-primary">SEBI Guidelines</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-6 font-bold">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-slate-600">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <span>Rajajinagar<br />Bengaluru, Karnataka, India</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600">
                                <Phone className="h-4 w-4 shrink-0 text-primary" />
                                <span>+91 90087 70738</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail className="h-4 w-4 shrink-0 text-primary" />
                                <span>contact@polemarch.in</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t pt-8">
                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                        <p className="text-xs text-slate-500">
                            Copyright {new Date().getFullYear()} Polemarch Financial Services. All rights reserved.
                        </p>
                        <div className="flex flex-wrap gap-6">
                            <Link href="/privacy" className="text-xs text-slate-500 hover:text-primary">Privacy Policy</Link>
                            <Link href="/terms" className="text-xs text-slate-500 hover:text-primary">Terms of Service</Link>
                            <Link href="/disclaimer" className="text-xs text-slate-500 hover:text-primary">Risk Disclaimer</Link>
                            <Link href="/cancellation-policy" className="text-xs text-slate-500 hover:text-primary">Cancellation Policy</Link>
                        </div>
                    </div>
                    <div className="mt-8 rounded-lg bg-slate-100 p-4">
                        <p className="text-center text-[10px] leading-relaxed text-slate-500">
                            Disclaimer: Investment in unlisted shares involves high risk. Investors should be aware that their capital is at risk and the value of investments can go down as well as up. Past performance is not indicative of future results. Please consult with a financial advisor before making any investment decisions.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
