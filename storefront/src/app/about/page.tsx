import React from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { Shield, BarChart3, Users, Zap, CheckCircle2, Globe, TrendingUp, Handshake, Target, Lock } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-['Space_Grotesk']">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50 -z-10" />
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
          
          <div className="container mx-auto max-w-5xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
              About <span className="text-primary font-black">Us</span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-6">
                <p className="text-xl md:text-2xl text-slate-800 leading-relaxed font-medium">
                  Polemarch is a specialized investment platform providing access to unlisted and Pre-IPO shares within India’s Unlisted Equity Segment.
                </p>
                <p className="text-lg text-slate-500 leading-relaxed">
                  We enable early participation in pre-listing opportunities while facilitating structured liquidity for existing shareholders.
                </p>
              </div>
              <div className="p-8 bg-white rounded-[40px] border border-slate-100 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                <p className="text-lg text-slate-700 leading-relaxed italic">
                  "Operating under Mithtech Innovative Solutions Private Limited (est. 2016), Polemarch combines a robust technology framework with disciplined execution standards to deliver transparent and efficiently managed transactions."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Expertise Section */}
        <section className="py-24 px-6 bg-slate-50/50">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">Trusted Expertise in India’s Pre-IPO Markets</h2>
              <p className="text-xl text-primary font-bold max-w-3xl">
                Partnering with investors to provide smart, compliant access to India’s Pre-IPO and unlisted shares with transparency and ease.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard 
                icon={<BarChart3 className="h-8 w-8 text-primary" />}
                title="Transactions Executed"
                value="₹80 Cr+"
                desc="From deal structuring to final settlement, our team has executed high-value secondary market transactions across sought-after pre-IPO names."
              />
              <StatCard 
                icon={<Users className="h-8 w-8 text-primary" />}
                title="Shares Traded"
                value="30 Lakhs+"
                desc="We have handled millions of shares across private companies, helping investors unlock value while strictly adhering to regulatory and compliance standards."
              />
              <StatCard 
                icon={<Globe className="h-8 w-8 text-primary" />}
                title="Market Presence"
                value="Active Since 2019"
                desc="With a strong presence in India’s unlisted share market, we have built credibility and trust among investors, founders, and early-stage stakeholders."
              />
              <StatCard 
                icon={<Zap className="h-8 w-8 text-primary" />}
                title="High-Value Opportunities"
                value="Pre-IPO Access"
                desc="We provide structured access to pre-listing allocations, supporting ESOP transfers and liquidity requirements through defined execution frameworks."
              />
            </div>
          </div>
        </section>

        {/* Investment Approach */}
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-6xl text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900">Our Structured Investment Approach</h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full shadow-sm" />
          </div>

          <div className="container mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <ApproachCard 
              icon={<TrendingUp className="h-8 w-8" />}
              title="Pre-IPO & Unlisted Shares"
              desc="Curated access to companies in their pre-listing phase, enabling early participation ahead of public market discovery."
            />
            <ApproachCard 
              icon={<Handshake className="h-8 w-8" />}
              title="ESOP Exit Solutions"
              desc="Facilitating compliant and structured equity transfers for employees seeking liquidity."
            />
            <ApproachCard 
              icon={<Target className="h-8 w-8" />}
              title="Liquidity Solutions for Investors"
              desc="Defined exit pathways for investors looking to monetize holdings within established execution frameworks."
            />
            <ApproachCard 
              icon={<Lock className="h-8 w-8" />}
              title="Curated IPO Opportunities"
              desc="Selective access to companies preparing for listing, positioned ahead of exchange debut."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function StatCard({ icon, title, value, desc }: { icon: React.ReactNode, title: string, value: string, desc: string }) {
  return (
    <div className="p-8 bg-white rounded-[32px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all group">
      <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-400 mb-2">{title}</h3>
      <div className="text-3xl font-bold text-primary mb-4">{value}</div>
      <p className="text-sm text-slate-500 leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  )
}

function ApproachCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-6 p-8 bg-white rounded-[40px] border border-slate-100 hover:border-primary/20 hover:bg-slate-50/50 transition-all shadow-sm hover:shadow-lg">
      <div className="flex-shrink-0 h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-white">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
        <p className="text-slate-500 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  )
}
