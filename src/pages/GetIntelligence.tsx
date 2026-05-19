import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BriefBuilder from "@/components/subscribe/BriefBuilder";

const GetIntelligence = () => (
  <div className="min-h-screen bg-paper">
    <Helmet>
      <title>Build Your Sample Privacy Intelligence Report | End User Privacy</title>
      <meta
        name="description"
        content="Choose your jurisdiction, role, and topic tracks to preview the Monday Privacy Intelligence Report format — written for your practice."
      />
    </Helmet>
    <Navbar />
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <header className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gold mb-2">
          Weekly Privacy Intelligence Report
        </p>
        <h1 className="font-display font-bold text-navy leading-tight mb-3">
          Build your sample Privacy Intelligence Report
        </h1>
        <p className="text-slate text-[15px] leading-relaxed">
          Select your jurisdiction, role, and topic tracks. We'll assemble a
          representative brief showing exactly the depth and format you'll
          receive every Monday — written for your practice.
        </p>
      </header>
      <BriefBuilder />
    </main>
    <Footer />
  </div>
);

export default GetIntelligence;
