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
import FeaturedBriefCard from "@/components/home/FeaturedBriefCard";
import EnforcementStatsBanner from "@/components/home/EnforcementStatsBanner";
import TopicLaneScroller from "@/components/home/TopicLaneScroller";
import RegionFeedStrip from "@/components/home/RegionFeedStrip";
import HeadlinesTicker from "@/components/home/HeadlinesTicker";
import IdentityBand from "@/components/home/IdentityBand";

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
  const [topArticle, setTopArticle] = useState<Update | null>(null);
  const [regionItems, setRegionItems] = useState<any[]>([]);
  const [laneData, setLaneData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("updates")
        .select("id,title,summary,url,category,regulator,published_at,source_name,ai_summary")
        .order("published_at", { ascending: false })
        .limit(100);

      const articles = (data as Update[]) || [];

      // Featured card priority: enforcement → immediate urgency → any ai_summary → most recent
      const enforcementArticle = articles.find(a => a.category === "enforcement");
      const immediateArticle = articles.find(
        a => (a as any).ai_summary?.urgency === "Immediate"
      );
      const anyAiArticle = articles.find(a => (a as any).ai_summary != null);
      const featured = enforcementArticle ?? immediateArticle ?? anyAiArticle ?? articles[0] ?? null;
      if (featured) setTopArticle(featured);

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

      // Topic lanes
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
        { key: "adtech", take: 8 },
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
            urgency: (a as any).ai_summary?.urgency ?? null,
            whyItMatters: (a as any).ai_summary?.why_it_matters ?? null,
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
        <meta name="description" content="The intelligence platform for privacy professionals. Monitor 119 privacy authorities across 150+ jurisdictions — GDPR, AI Act, CCPA, PIPL, enforcement actions, and global developments." />
      </Helmet>

      {/* Layer 1: Topbar */}
      <Topbar />

      {/* Layer 2: Breaking news */}
      <BreakingNewsBanner />

      {/* Layer 3: Identity band */}
      <IdentityBand />

      {/* Free brief registration — the primary conversion to the email funnel */}
      <div className="bg-navy border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-[12px] text-white/70 flex-shrink-0">
              📬 <strong className="text-white">Get the full weekly Intelligence Brief free</strong>
              {" "}— delivered every Monday morning.
            </p>
            <div className="flex gap-2 flex-1 max-w-sm">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 px-3 py-1.5 text-[12px] rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-sky transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    if (val.includes("@")) {
                      window.location.href = `/signup?email=${encodeURIComponent(val)}&redirect=/dashboard`;
                    }
                  }
                }}
              />
              <button
                className="px-4 py-1.5 text-[12px] font-bold text-navy bg-white rounded-lg hover:bg-white/90 transition-colors flex-shrink-0"
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  const val = input?.value || "";
                  if (val.includes("@")) {
                    window.location.href = `/signup?email=${encodeURIComponent(val)}&redirect=/dashboard`;
                  } else {
                    window.location.href = "/signup?redirect=/dashboard";
                  }
                }}
              >
                Get free brief
              </button>
            </div>
            <p className="text-[10px] text-white/40 hidden lg:block flex-shrink-0">
              No credit card · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Layer 4: Headlines ticker */}
      <HeadlinesTicker />

      {/* Layer 5: Navbar */}
      <Navbar />

      {/* Layer 6: Main editorial content */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-7 md:pt-9">

        {/* Two-column layout: main content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* === LEFT COLUMN === */}
          <div>
            {/* Featured story */}
            {topArticle && (
              <FeaturedBriefCard
                headline={topArticle.title}
                summary={decodeHtml(topArticle.summary)}
                jurisdiction={CATEGORY_META[topArticle.category]?.jurisdiction || topArticle.category}
                jurisdictionFlag={CATEGORY_META[topArticle.category]?.flag || "🌐"}
                category={topArticle.category}
                date={formatDate(topArticle.published_at)}
                href={topArticle.url}
                aiSummary={(topArticle as any).ai_summary ?? null}
              />
            )}

            {/* Region strip */}
            {regionItems.length > 0 && <RegionFeedStrip items={regionItems} />}

            {/* Ad — below editorial content */}
            <AdBanner variant="leaderboard" adSlot="eup-home-top" className="py-3 bg-paper hidden" />

            {/* Topic lanes */}
            {(laneData["ai-privacy"]?.length ?? 0) > 0 && (
              <TopicLaneScroller
                laneTitle="AI & Privacy" laneIcon="🤖" laneHref="/category/ai-privacy"
                cards={laneData["ai-privacy"]}
              />
            )}
            {(laneData["adtech"]?.length ?? 0) > 0 && (
              <TopicLaneScroller
                laneTitle="AdTech & Advertising Privacy" laneIcon="📡" laneHref="/category/adtech"
                cards={laneData["adtech"]}
              />
            )}
            <AdBanner variant="inline" adSlot="eup-home-mid" className="py-3 hidden" />
            {(laneData["us-states"]?.length ?? 0) > 0 && (
              <TopicLaneScroller
                laneTitle="U.S. State Developments" laneIcon="🗺️" laneHref="/category/us-states"
                cards={laneData["us-states"]}
              />
            )}
            {(laneData["enforcement"]?.length ?? 0) > 0 && (
              <TopicLaneScroller
                laneTitle="Enforcement Actions" laneIcon="⚖️" laneHref="/category/enforcement"
                cards={laneData["enforcement"]}
              />
            )}
            {(laneData["eu-uk"]?.length ?? 0) > 0 && (
              <TopicLaneScroller
                laneTitle="EU & UK Developments" laneIcon="🇪🇺" laneHref="/category/eu-uk"
                cards={laneData["eu-uk"]}
              />
            )}
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
                  ⭐ Pro — $25/month
                </p>
                <p className="text-[11px] text-blue-200 leading-snug mb-2">
                  Re-written for your industry and jurisdictions.
                </p>
                <Link
                  to="/subscribe"
                  className="block text-center text-[11px] font-bold text-navy bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline"
                >
                  Get your analyst →
                </Link>
              </div>
            </div>

            {/* Enforcement stats */}
            <EnforcementStatsBanner />

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
      <AdBanner variant="leaderboard" adSlot="eup-home-bottom" className="py-4 bg-paper" />
      <EmailSignup variant="strip" />
      <LatestUpdates />
      <div className="h-px bg-fog" />
      <AdBanner variant="inline" adSlot="eup-home-mid2" className="py-4 bg-paper" />
      <div className="h-px bg-fog" />
      <WeeklyBriefTeaser />
      <PremiumBanner />
      <Footer />
    </div>
  );
};

export default Index;
