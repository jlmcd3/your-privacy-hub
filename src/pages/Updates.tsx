import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import AISummaryPanel from "@/components/AISummaryPanel";
import NewsfeedList from "@/components/NewsfeedList";
import { ExternalLink } from "lucide-react";

interface Update {
    id: string;
    title: string;
    summary: string | null;
    url: string;
    source_name: string | null;
    source_domain: string | null;
    image_url: string | null;
    category: string;
    regulator: string | null;
    published_at: string;
    is_premium: boolean;
    ai_summary?: any;
}

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 U.S. Federal" },
  { key: "us-states", label: "🗺️ U.S. States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
  { key: "enforcement", label: "⚖️ Enforcement" },
  { key: "ai-privacy", label: "🤖 AI & Privacy" },
  ];

const DATE_RANGES = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All" },
  ];

const CATEGORY_TAG: Record<string, { label: string; classes: string }> = {
    "eu-uk": { label: "🇪🇺 EU & UK", classes: "bg-blue/10 text-blue" },
    "us-federal": { label: "🇺🇸 U.S. Federal", classes: "bg-navy/10 text-navy" },
    "us-states": { label: "🗺️ U.S. States", classes: "bg-accent/10 text-accent" },
    "enforcement": { label: "⚖️ Enforcement", classes: "bg-red-50 text-red-600" },
    "ai-privacy": { label: "🤖 AI & Privacy", classes: "bg-purple-50 text-purple-600" },
    "global": { label: "🌐 Global", classes: "bg-fog text-slate" },
    "adtech": { label: "📡 AdTech", classes: "bg-orange-50 text-orange-600" },
};

const FALLBACK_IMAGES: Record<string, string> = {
    "us-federal": "https://picsum.photos/seed/federal-law/400/200",
    "us-states": "https://picsum.photos/seed/state-capitol/400/200",
    "eu-uk": "https://picsum.photos/seed/european-union/400/200",
    "global": "https://picsum.photos/seed/global-privacy/400/200",
    "enforcement": "https://picsum.photos/seed/legal-court/400/200",
    "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
    });
}

const Updates = () => {
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [activeFilter, setActiveFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState("all");
    const [sourcePills, setSourcePills] = useState<string[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const buildQuery = useCallback((offset: number) => {
          let q = supabase
            .from("updates")
            .select("*")
            .order("published_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);
          return q;
    }, []);

    const loadPage = useCallback(async (offset: number, replace: boolean) => {
          if (offset === 0) setLoading(true);
          else setLoadingMore(true);

                                     const { data, error } = await buildQuery(offset);
          if (error) {
                  console.error("Updates fetch error:", error);
          } else {
                  const articles = (data as Update[]) || [];
                  setUpdates((prev) => replace ? articles : [...prev, ...articles]);
                  setHasMore(articles.length === PAGE_SIZE);
                  setPage(offset);

            if (replace) {
                      const domainCounts: Record<string, number> = {};
                      articles.forEach((a) => {
                                  const d = a.source_domain;
                                  if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
                      });
                      const topDomains = Object.entries(domainCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 8)
                        .map(([d]) => d);
                      setSourcePills(topDomains);
            }
          }

                                     setLoading(false);
          setLoadingMore(false);
    }, [buildQuery]);

    // Initial load
    useEffect(() => {
          loadPage(0, true);
    }, [loadPage]);

    // Supabase realtime subscription — push new rows to top of feed
    useEffect(() => {
          if (channelRef.current) {
                  supabase.removeChannel(channelRef.current);
          }
          const channel = supabase
            .channel("updates-realtime")
            .on(
                      "postgres_changes",
              { event: "INSERT", schema: "public", table: "updates" },
                      (payload) => {
                                  setUpdates((prev) => [payload.new as Update, ...prev]);
                      }
                    )
            .subscribe();
          channelRef.current = channel;

                  return () => {
                          supabase.removeChannel(channel);
                  };
    }, []);

    const handleLoadMore = useCallback(() => {
          loadPage(page + PAGE_SIZE, false);
    }, [loadPage, page]);

    const filtered = updates.filter((u) => {
          if (activeFilter !== "all" && u.category !== activeFilter) return false;
          if (searchTerm) {
                  const q = searchTerm.toLowerCase();
                  if (!u.title.toLowerCase().includes(q) && !(u.summary || "").toLowerCase().includes(q)) return false;
          }
          if (dateRange !== "all") {
                  const days = parseInt(dateRange);
                  const cutoff = Date.now() - days * 86400000;
                  if (new Date(u.published_at).getTime() < cutoff) return false;
          }
          if (activeSource && u.source_domain !== activeSource) return false;
          return true;
    });

    const tag = (cat: string) => CATEGORY_TAG[cat] || CATEGORY_TAG["global"];

    return (
          <div className="min-h-screen flex flex-col bg-background">
                <Helmet>
                        <title>Privacy Regulatory Updates | EndUserPrivacy</title>title>
                        <meta name="description" content="Daily intelligence from 119 monitored regulatory sources — filtered by jurisdiction, topic, date, and source." />
                </Helmet>Helmet>
                <Topbar />
                <Navbar />
                <section className="bg-gradient-to-br from-navy via-navy to-navy/90 py-14 px-4 md:px-8">
                        <div className="max-w-[1280px] mx-auto text-center">
                                  <h1 className="font-display text-[28px] md:text-[36px] tracking-tig</div>
