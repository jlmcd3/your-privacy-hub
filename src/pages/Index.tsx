import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import LatestUpdates from "@/components/LatestUpdates";
import EnforcementTracker from "@/components/EnforcementTracker";
import WeeklyBriefTeaser from "@/components/WeeklyBriefTeaser";
import PremiumBanner from "@/components/PremiumBanner";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import EmailSignup from "@/components/EmailSignup";
import FeaturedBriefCard from "@/components/home/FeaturedBriefCard";
import EnforcementStatsBanner from "@/components/home/EnforcementStatsBanner";
import TopicLaneScroller from "@/components/home/TopicLaneScroller";
import RegionFeedStrip from "@/components/home/RegionFeedStrip";

interface Update {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  category: string;
  regulator: string | null;
  published_at: string;
  source_name: string | null;
}

const CATEGORY_META: Record<string, { flag: string; jurisdiction: string }> = {
  "eu-uk": { flag: "🇪🇺", jurisdiction: "EU & UK" },
  "us-federal": { flag: "🇺🇸", jurisdiction: "U.S. Federal" },
  "us-states": { flag: "🗺️", jurisdiction: "U.S. States" },
  "global": { flag: "🌐", jurisdiction: "Global" },
  "enforcement": { flag: "⚖️", jurisdiction: "Enforcement" },
  "ai-privacy": { flag: "🤖", jurisdiction: "AI & Privacy" },
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
  const [isFirstVisit] = useState(() => {
    const visited = localStorage.getItem("eup_visited");
    if (!visited) localStorage.setItem("eup_visited", "1");
    return !visited;
  });

  const [topArticle, setTopArticle] = useState<Update | null>(null);
  const [regionItems, setRegionItems] = useState<any[]>([]);
  const [laneData, setLaneData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function load() {
      // Fetch recent updates for featured card, region strip, and lanes
      const { data } = await supabase
        .from("updates")
        .select("id,title,summary,url,category,regulator,published_at,source_name")
        .order("published_at", { ascending: false })
        .limit(100);

      const articles = (data as Update[]) || [];

      // Featured: most recent article
      if (articles.length > 0) setTopArticle(articles[0]);

      // Region feed: one from eu-uk, us-federal, global
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
        }));
      setRegionItems(regions);

      // Topic lanes — deduplicate by ID
      function dedupeById<T extends { id: string }>(arr: T[]): T[] {
        const seen = new Set<string>();
        return arr.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      }

      const lanes: Record<string, any[]> = {};
      const laneConfigs = [
        { key: "ai-privacy", take: 8 },
        { key: "us-states", take: 8 },
        { key: "enforcement", take: 8 },
        { key: "eu-uk", take: 8 },
      ];
      for (const lane of laneConfigs) {
        lanes[lane.key] = dedupeById(articles.filter((a) => a.category === lane.key))
          .slice(0, lane.take)
          .map((a) => ({
            title: a.title,
            excerpt: a.summary || "",
            jurisdiction: CATEGORY_META[a.category]?.jurisdiction,
            flag: CATEGORY_META[a.category]?.flag,
            href: a.url,
            date: formatDate(a.published_at),
          }));
      }
      setLaneData(lanes);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Global Privacy Regulation Intelligence | EndUserPrivacy</title>
        <meta name="description" content="Monitor 119 privacy authorities across 150+ jurisdictions. AI-summarized enforcement actions, GDPR, CCPA, AI Act and global privacy updates." />
      </Helmet>
      <Topbar />
      <BreakingNewsBanner />
      <Navbar />
      <SearchBar />

      {/* First-visit hero — slim banner */}
      {isFirstVisit && (
        <div className="bg-gradient-to-br from-navy to-steel text-white text-center py-10 px-4 mb-0">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-display font-bold text-3xl md:text-4xl mb-3">
              Every regulator tracked. Every update summarized.
            </h1>
            <p className="text-blue-200 mb-5 text-sm">
              119 authorities · 150+ jurisdictions · monitored 24/7
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/updates" className="bg-white text-navy font-bold px-6 py-2.5 rounded-xl text-sm no-underline">
                Browse Free →
              </Link>
              <Link to="/subscribe" className="bg-blue/30 text-white font-semibold px-6 py-2.5 rounded-xl text-sm no-underline border border-white/20">
                Get Premium
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard content */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 md:pt-8">
        {/* Featured brief */}
        {topArticle && (
          <FeaturedBriefCard
            headline={topArticle.title}
            summary={decodeHtml(topArticle.summary)}
            jurisdiction={CATEGORY_META[topArticle.category]?.jurisdiction || topArticle.category}
            jurisdictionFlag={CATEGORY_META[topArticle.category]?.flag || "🌐"}
            category={topArticle.category}
            date={formatDate(topArticle.published_at)}
            href={topArticle.url}
          />
        )}

        {/* Enforcement stats */}
        <EnforcementStatsBanner />

        {/* Region feed strip */}
        {regionItems.length > 0 && <RegionFeedStrip items={regionItems} />}

        {/* Topic lane scrollers */}
        {(laneData["ai-privacy"]?.length ?? 0) > 0 && (
          <TopicLaneScroller
            laneTitle="AI & Privacy"
            laneIcon="🤖"
            laneHref="/category/ai-privacy"
            cards={laneData["ai-privacy"]}
          />
        )}
        {(laneData["us-states"]?.length ?? 0) > 0 && (
          <TopicLaneScroller
            laneTitle="U.S. State Developments"
            laneIcon="🗺️"
            laneHref="/category/us-states"
            cards={laneData["us-states"]}
          />
        )}
        {(laneData["enforcement"]?.length ?? 0) > 0 && (
          <TopicLaneScroller
            laneTitle="Enforcement Actions"
            laneIcon="⚖️"
            laneHref="/category/enforcement"
            cards={laneData["enforcement"]}
          />
        )}
        {(laneData["eu-uk"]?.length ?? 0) > 0 && (
          <TopicLaneScroller
            laneTitle="EU & UK Developments"
            laneIcon="🇪🇺"
            laneHref="/category/eu-uk"
            cards={laneData["eu-uk"]}
          />
        )}
      </div>

      <AdBanner variant="leaderboard" className="py-4 bg-paper" />
      <EmailSignup variant="strip" />
      <LatestUpdates />
      <div className="h-px bg-fog" />
      <EnforcementTracker />
      <AdBanner variant="inline" className="py-4 bg-paper" />
      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
