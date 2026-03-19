import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import FeaturedDeals from "@/components/home/FeaturedDeals";
import TrendingSectors from "@/components/home/TrendingSectors";
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <FeaturedDeals />
        <TrendingSectors />
        {/* Education Section will go here */}
        <EducationSection />
        {/* Newsletter Section will go here */}
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}

import { HOW_IT_WORKS } from "@/data/deals";

const EducationSection = () => (
  <section className="py-24 bg-white">
    <div className="container mx-auto px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold mb-6 text-foreground">How it Works</h2>
        <p className="text-lg text-foreground/70">
          Empowering you with a structured, secure, and transparent way to invest in unlisted shares.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {HOW_IT_WORKS.map((item, i) => (
          <div key={i} className="p-10 rounded-[40px] border border-slate-100 hover:border-primary/20 hover:shadow-2xl transition-all group">
            <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-2xl mb-8 group-hover:bg-primary group-hover:text-white transition-all">
              {i + 1}
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">{item.title}</h3>
            <p className="text-foreground/60 text-base leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const NewsletterSection = () => (
  <section className="py-24 bg-primary text-white overflow-hidden relative">
    <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
    <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-6">Stay Ahead of the Market</h2>
        <p className="text-primary-foreground/80 text-lg mb-10">
          Get exclusive deal alerts and research reports delivered straight to your inbox.
        </p>
        <form className="flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-grow px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button className="px-8 py-4 rounded-full bg-white text-primary font-bold hover:bg-slate-100 transition-colors">
            Subscribe Now
          </button>
        </form>
        <p className="mt-6 text-xs text-primary-foreground/60">
          Zero spam. Unsubscribe at any time.
        </p>
      </div>
    </div>
  </section>
);
