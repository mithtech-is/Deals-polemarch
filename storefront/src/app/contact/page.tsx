import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Send, Instagram, Facebook, Twitter, Linkedin } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50">
            <Navbar />
            <main className="flex-grow py-24 px-4 sm:px-6">
                <div className="container mx-auto">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h1 className="text-5xl font-bold tracking-tight mb-4 text-foreground">Contact Us</h1>
                            <p className="text-xl text-foreground/60">We're here to help you navigate the unlisted market.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Contact Info */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                                    <h3 className="text-2xl font-bold mb-8 text-foreground">Our Offices</h3>
                                    <div className="space-y-8">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                                <MapPin className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Headquarters</p>
                                                <p className="text-foreground/60 leading-relaxed">
                                                    9th Cross Rd, E block, 2nd Stage<br />
                                                    Rajajinagar, Bengaluru, Karnataka
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                                <Mail className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Email Support</p>
                                                <a href="mailto:support@polemarch.in" className="text-foreground/60 hover:text-primary transition-colors">
                                                    support@polemarch.in
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                                <Phone className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Phone</p>
                                                <a href="tel:+919008770738" className="text-foreground/60 hover:text-primary transition-colors">
                                                    +91 90087 70738
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary text-white p-10 rounded-[40px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <h3 className="text-2xl font-bold mb-4 relative z-10">Follow Us</h3>
                                    <p className="text-primary-foreground/70 mb-8 relative z-10 text-sm">Join our community for the latest deal updates and market insights.</p>
                                    <div className="flex flex-wrap gap-3 relative z-10">
                                        <a href="https://instagram.com/polemarch_in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-medium text-sm">
                                            <Instagram className="h-4 w-4" />
                                            Instagram
                                        </a>
                                        <a href="https://facebook.com/Polemarch" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-medium text-sm">
                                            <Facebook className="h-4 w-4" />
                                            Facebook
                                        </a>
                                        <a href="#" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-medium text-sm">
                                            <Twitter className="h-4 w-4" />
                                            Twitter
                                        </a>
                                        <a href="#" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-medium text-sm">
                                            <Linkedin className="h-4 w-4" />
                                            LinkedIn
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="lg:col-span-7">
                                <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-full">
                                    <h3 className="text-2xl font-bold mb-8 text-foreground">Send us a message</h3>
                                    <form className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">First Name</label>
                                                <input type="text" placeholder="John" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">Last Name</label>
                                                <input type="text" placeholder="Doe" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">Email Address</label>
                                                <input type="email" placeholder="john@example.com" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">Phone/Mobile</label>
                                                <input type="tel" placeholder="+91 98765 43210" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-foreground/40 uppercase tracking-widest pl-1">Your Message</label>
                                            <textarea rows={6} placeholder="How can we help you?" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"></textarea>
                                        </div>
                                        <button type="submit" className="w-full py-5 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group">
                                            Send Message
                                            <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </form>
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
