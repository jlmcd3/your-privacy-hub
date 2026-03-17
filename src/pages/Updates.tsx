import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LatestUpdates from "@/components/LatestUpdates";
import AdBanner from "@/components/AdBanner";

const Updates = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Topbar />
    <Navbar />

    {/* Page header */}
    <section className="bg-gradient-to-br from-navy via-navy to-navy/90 py-14 px-4 md:px-8">
      <div className="max-w-[1280px] mx-auto text-center">
        <h1 className="font-display text-[28px] md:text-[36px] tracking-tight text-white mb-3">
          Privacy Regulatory Updates
        </h1>
        <p className="text-[15px] text-white/70 max-w-2xl mx-auto">
          Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction and topic.
        </p>
      </div>
    </section>

    <AdBanner variant="leaderboard" adSlot="eup-updates-top" className="py-3 bg-paper" />

    <LatestUpdates />

    <AdBanner variant="leaderboard" adSlot="eup-updates-bottom" className="py-3 bg-paper" />

    <Footer />
  </div>
);

export default Updates;
