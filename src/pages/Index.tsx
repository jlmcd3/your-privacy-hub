import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Hero from "@/components/Hero";
import LatestUpdates from "@/components/LatestUpdates";
import EnforcementTracker from "@/components/EnforcementTracker";
import DirectoriesPreview from "@/components/DirectoriesPreview";
import WeeklyBriefTeaser from "@/components/WeeklyBriefTeaser";
import ResearchTopics from "@/components/ResearchTopics";
import PremiumBanner from "@/components/PremiumBanner";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <SearchBar />
      <Hero />
      <LatestUpdates />
      <div className="h-px bg-fog" />
      <EnforcementTracker />
      <div className="h-px bg-fog" />
      <DirectoriesPreview />
      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <div className="h-px bg-fog" />
      <ResearchTopics />
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
