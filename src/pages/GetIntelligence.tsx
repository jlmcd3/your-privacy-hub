import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import GetIntelligenceEmailCapture from "@/components/subscribe/GetIntelligenceEmailCapture";
import MondayReportWhatYouGet from "@/components/subscribe/MondayReportWhatYouGet";

const GetIntelligence = () => (
  <div className="min-h-screen bg-brand-cloud">
    <Helmet>
      <title>Build Your Sample Weekly Brief | End User Privacy</title>
      <meta
        name="description"
        content="Choose your jurisdiction, role, and topic tracks to preview the subscriber Weekly Brief (Weekly Privacy Intelligence Report) format — written for your practice."
      />
    </Helmet>
    <Navbar />
    <header className="bg-[#2d7a8a] text-white py-12">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
          ⭐ Weekly Privacy Intelligence Report (subscribers)
        </span>
        <h1 className="font-serif text-white mb-3">
          Build your sample Weekly Brief
        </h1>
        <p className="text-slate-300 text-lg max-w-3xl">
          Select your jurisdiction, role, and topic tracks. We'll assemble a
          representative Weekly Brief showing exactly the depth and format
          subscribers receive every Monday — written for your practice.
        </p>
        <p className="text-amber-200/90 text-sm mt-3">
          Preview appears instantly on this page — no email required.
        </p>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <BriefBuilder />
      <div className="mt-10">
        <p className="text-[11px] font-bold tracking-widest uppercase text-brand-steel mb-2">
          Not looking for the subscriber Weekly Brief?
        </p>
        <p className="text-sm text-gray-700 mb-3">
          Registered (free) users receive a different, shorter product — the
          Monday Privacy Intelligence Report. Here is what that includes:
        </p>
        <MondayReportWhatYouGet variant="compact" />
      </div>
      <GetIntelligenceEmailCapture />
    </main>
    <Footer />
  </div>
);

export default GetIntelligence;

