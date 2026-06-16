import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BriefBuilder from "@/components/subscribe/BriefBuilder";

const GetIntelligence = () => (
  <div className="min-h-screen bg-brand-cloud">
    <Helmet>
      <title>Build Your Sample Privacy Intelligence Report | End User Privacy</title>
      <meta
        name="description"
        content="Choose your jurisdiction, role, and topic tracks to preview the Monday Privacy Intelligence Report format — written for your practice."
      />
    </Helmet>
    <Navbar />
    <header className="bg-[#2d7a8a] text-white py-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
          ⭐ Weekly Privacy Intelligence Report
        </span>
        <h1 className="font-serif text-white mb-3">
          Build your sample Privacy Intelligence Report
        </h1>
        <p className="text-slate-300 text-lg max-w-3xl">
          Select your jurisdiction, role, and topic tracks. We'll assemble a
          representative brief showing exactly the depth and format you'll
          receive every Monday — written for your practice.
        </p>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <BriefBuilder />
    </main>
    <Footer />
  </div>
);

export default GetIntelligence;
