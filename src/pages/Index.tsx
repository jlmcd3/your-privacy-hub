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
import AdBanner from "@/components/AdBanner";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import EmailSignup from "@/components/EmailSignup";

const Index = () => {
  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <BreakingNewsBanner />
      <Navbar />
      <SearchBar />
      <Hero />
      <AdBanner variant="leaderboard" className="py-4 bg-paper" />
      <EmailSignup variant="strip" />
      <LatestUpdates />
      <div className="h-px bg-fog" />
      <EnforcementTracker />
      <AdBanner variant="inline" className="py-4 bg-paper" />
      <div className="h-px bg-fog" />
      <DirectoriesPreview />
      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <AdBanner variant="leaderboard" className="py-4 bg-paper" />
      <div className="h-px bg-fog" />
      <ResearchTopics />
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
