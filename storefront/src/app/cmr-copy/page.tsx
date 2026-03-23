import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FileText, ExternalLink, CheckCircle, AlertCircle, Play } from "lucide-react";

const brokerVideos = [
    {
        name: "Zerodha",
        logo: "/assets/brokers/zerodha.png",
        videoId: "VIDEO_ID_HERE",
        description: "Learn how to download CMR copy from Zerodha Kite console"
    },
    {
        name: "Groww",
        logo: "/assets/brokers/groww.png",
        videoId: "VIDEO_ID_HERE",
        description: "Step-by-step guide to get CMR copy from Groww app"
    },
    {
        name: "Angel One",
        logo: "/assets/brokers/angelone.png",
        videoId: "VIDEO_ID_HERE",
        description: "Download your Client Master Report from Angel One"
    },
    {
        name: "Upstox",
        logo: "/assets/brokers/upstox.png",
        videoId: "VIDEO_ID_HERE",
        description: "Get CMR copy from Upstox Pro app"
    },
    {
        name: "5paisa",
        logo: "/assets/brokers/5paisa.png",
        videoId: "VIDEO_ID_HERE",
        description: "Download CMR from 5paisa mobile app"
    },
    {
        name: "Dhan",
        logo: "/assets/brokers/dhan.png",
        videoId: "VIDEO_ID_HERE",
        description: "How to get CMR copy from Dhan trading app"
    },
    {
        name: "ICICI Direct",
        logo: "/assets/brokers/icici.png",
        videoId: "VIDEO_ID_HERE",
        description: "Download CMR from ICICI Direct portal"
    }
];

export default function CMRCopyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
                {/* Hero */}
                <section className="py-20 px-4 sm:px-6 bg-slate-50/50">
                    <div className="container mx-auto max-w-4xl text-center">
                        <h1 className="text-5xl font-bold tracking-tight mb-6 text-foreground">How to Get CMR Copy</h1>
                        <p className="text-xl text-foreground/60">
                            A Client Master Report (CMR) is required to transfer unlisted shares to your demat account
                        </p>
                    </div>
                </section>

                {/* What is CMR */}
                <section className="py-16 px-4 sm:px-6">
                    <div className="container mx-auto max-w-4xl">
                        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 mb-12">
                            <div className="flex items-start gap-4">
                                <FileText className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                                <div>
                                    <h2 className="text-2xl font-bold mb-3">What is CMR?</h2>
                                    <p className="text-foreground/70 leading-relaxed">
                                        Client Master Report (CMR) is a document that contains your demat account details including your
                                        DP ID, Client ID, and other account information. It is required for transferring unlisted shares
                                        to your demat account and serves as proof of your demat account ownership.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                    For CDSL Demat Account
                                </h3>
                                <ol className="space-y-4 text-foreground/70">
                                    <li>Visit <a href="https://www.cdslindia.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cdslindia.com</a></li>
                                    <li>Click on "Login" and select "CDSL eCAS"</li>
                                    <li>Enter your PAN, DP ID, and Client ID</li>
                                    <li>Request your Client Master Report</li>
                                    <li>Download the PDF for your records</li>
                                </ol>
                                <a
                                    href="https://www.cdslindia.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all"
                                >
                                    Visit CDSL Portal
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                    For NSDL Demat Account
                                </h3>
                                <ol className="space-y-4 text-foreground/70">
                                    <li>Visit <a href="https://www.nsdl.co.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.nsdl.co.in</a></li>
                                    <li>Click on "e-Services" → "I-PASS"</li>
                                    <li>Login with your credentials</li>
                                    <li>Navigate to "Client Master Data"</li>
                                    <li>Download or print your CMR</li>
                                </ol>
                                <a
                                    href="https://www.nsdl.co.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all"
                                >
                                    Visit NSDL Portal
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        {/* Important Notes */}
                        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-amber-800 mb-2">Important Notes</h3>
                                    <ul className="space-y-2 text-amber-700 text-sm">
                                        <li>CMR copy must be recent (within last 3 months)</li>
                                        <li>Ensure all details match your KYC documents</li>
                                        <li>Downloaded CMR should be in PDF format</li>
                                        <li>Contact your DP if you face any issues accessing CMR</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Video Tutorials Section */}
                <section className="py-16 px-4 sm:px-6 bg-slate-50">
                    <div className="container mx-auto max-w-6xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground">
                                Video Tutorials by Broker
                            </h2>
                            <p className="text-lg text-foreground/60">
                                Watch step-by-step guides for your specific broker app
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {brokerVideos.map((broker) => (
                                <div key={broker.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                                    <div className="relative aspect-video bg-slate-100">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${broker.videoId}`}
                                            title={`How to get CMR Copy from ${broker.name}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-full"
                                        />
                                        {broker.videoId === "VIDEO_ID_HERE" && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90">
                                                <Play className="h-16 w-16 text-white/50 mb-4" />
                                                <p className="text-white/70 text-sm">Video coming soon</p>
                                                <p className="text-white/50 text-xs mt-1">Replace VIDEO_ID_HERE with YouTube video ID</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg mb-1">{broker.name}</h3>
                                        <p className="text-sm text-foreground/60">{broker.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}