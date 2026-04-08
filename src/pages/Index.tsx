import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import LatestUpdates from "@/components/LatestUpdates";
import WeeklyBriefTeaser from "@/components/WeeklyBriefTeaser";
import PremiumBanner from "@/components/PremiumBanner";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import EmailSignup from "@/components/EmailSignup";

import EnforcementStatsBanner from "@/components/home/EnforcementStatsBanner";
import RegionFeedStrip from "@/components/home/RegionFeedStrip";

import SearchFirstHero from "@/components/home/SearchFirstHero";
import ChooseYourMode from "@/components/home/ChooseYourMode";
import ThisWeekInPrivacy from "@/components/home/ThisWeekInPrivacy";
import UpcomingDeadlines from "@/components/home/UpcomingDeadlines";
import ToolkitSection from "@/components/home/ToolkitSection";

import FreeVsPaidStrip from "@/components/FreeVsPaidStrip";
import SearchStrip from "@/components/home/SearchStrip";

interface Update {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  category: string;
  regulator: string | null;
  published_at: string;
  source_name: string | null;
  ai_summary?: any;
}

const CATEGORY_META: Record<string, { flag: string; jurisdiction: string }> = {
  "eu-uk": { flag: "🇪🇺", jurisdiction: "EU & UK" },
  "us-federal": { flag: "🇺🇸", jurisdiction: "U.S. Federal" },
  "us-states": { flag: "🗺️", jurisdiction: "U.S. States" },
  "global": { flag: "🌐", jurisdiction: "Global" },
  "enforcement": { flag: "⚖️", jurisdiction: "Enforcement" },
  "ai-privacy": { flag: "🤖", jurisdiction: "AI & Privacy" },
  "adtech":      { flag: "📡", jurisdiction: "AdTech" },
};

function decodeHtml(str: string | null | undefined): string {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const Index = () => {
  const [regionItems, setRegionItems] = useState<any[]>([]);
  

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("updates")
        .select("id,title,summary,url,category,regulator,published_at,source_name,ai_summary")
        .order("published_at", { ascending: false })
        .limit(100);

      const articles = (data as Update[]) || [];



      // Region feed
      const regionCats = ["eu-uk", "us-federal", "global"];
      const regions = regionCats
        .map((cat) => articles.find((a) => a.category === cat))
        .filter(Boolean)
        .map((a) => ({
          flag: CATEGORY_META[a!.category]?.flag || "🌐",
          jurisdiction: CATEGORY_META[a!.category]?.jurisdiction || a!.category,
          headline: a!.title,
          category: a!.category,
          href: `/category/${a!.category}`,
          date: formatDate(a!.published_at),
          whyItMatters: (a as any).ai_summary?.why_it_matters ?? null,
          urgency: (a as any).ai_summary?.urgency ?? null,
        }));
      setRegionItems(regions);

    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>US State Privacy Laws, GDPR Fines &amp; AI Act Tracker 2026 | EndUserPrivacy</title>
        <meta name="description" content="Free daily privacy intelligence. Track GDPR enforcement, US state privacy laws, EU AI Act compliance, and enforcement actions from 119 regulators. For privacy professionals." />
      </Helmet>

      {/* Layer 1: Topbar */}
      <Topbar />

      {/* Layer 2: Navbar — sticky, must be near top so it anchors immediately */}
      <Navbar />

      {/* Layer 3: Breaking news */}
      <BreakingNewsBanner />

      {/* Layer 4: Hero panels */}
      <SearchFirstHero />

      {/* Layer 5: Search strip */}
      <SearchStrip />
      <FreeVsPaidStrip />

      {/* Layer 6: Main editorial content */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-7 md:pt-9">

        {/* Two-column layout: main content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* === LEFT COLUMN === */}
          <div className="min-w-0">
            {/* This Week in Privacy */}
            <ThisWeekInPrivacy />

            {/* Choose your mode — shown after first editorial content */}
            <ChooseYourMode />

            {/* Region strip */}
            {regionItems.length > 0 && <RegionFeedStrip items={regionItems} />}

            {/* Latest Updates — replaces topic lane strips */}
            <LatestUpdates />
          </div>

          {/* === RIGHT SIDEBAR === */}
          <aside className="hidden lg:flex flex-col gap-6">

            {/* Weekly brief sidebar card */}
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-5 text-white">
              <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                ⭐ Weekly Intelligence Brief
              </div>
              <p className="font-display font-bold text-[15px] leading-snug mb-2">
                Every Monday. Free. 8-section AI analysis.
              </p>
              <p className="text-blue-200 text-[12px] leading-relaxed mb-4">
                Enforcement table · trend signals · GC/CPO action items ·
                regional analysis. Always free with registration.
              </p>
              <Link
                to="/sample-brief"
                className="block text-center text-[12px] font-semibold text-navy bg-white hover:opacity-90 px-4 py-2 rounded-lg no-underline mb-3"
              >
                See a sample brief →
              </Link>
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1.5">
                  ⭐ Pro — $20/month
                </p>
                <p className="text-[11px] text-blue-200 leading-snug mb-2">
                  Re-written for your industry and jurisdictions.
                </p>
                <Link
                  to="/subscribe"
                  className="block text-center text-[11px] font-bold text-navy bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline"
                >
                  Get Intelligence →
                </Link>
              </div>
            </div>

            {/* Enforcement stats */}
            <EnforcementStatsBanner />

            {/* Upcoming deadlines */}
            <UpcomingDeadlines />

            {/* Search */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate mb-2">
                Search the platform
              </p>
              <SearchBar />
            </div>

          </aside>

        </div>
      </div>

      {/* Below-fold content */}
      <AdBanner variant="leaderboard" adSlot="eup-home-bottom" className="py-4 bg-paper hidden" />
      <EmailSignup variant="strip" />

      <div className="h-px bg-fog" />
      <AdBanner variant="inline" adSlot="eup-home-mid2" className="py-4 bg-paper hidden" />
      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <ToolkitSection />
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
