import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import usStates from "@/data/us_state_privacy_authorities.json";


const RELATED_LINKS = [
  { icon: "🏢", label: "U.S. State Privacy Authority Directory", href: "/us-state-privacy-authorities" },
  { icon: "📊", label: "U.S. State Law Comparison", href: "/compare/us-states" },
  { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
  { icon: "⚖️", label: "Enforcement Tracker", href: "/enforcement-tracker" },
];

const authorityStatusClass = (s: string | null) => {
  if (!s) return "bg-muted text-muted-foreground";
  if (s === "Enacted") return "bg-green-100 text-green-800";
  if (s === "Pending") return "bg-yellow-100 text-yellow-800";
  return "bg-muted text-muted-foreground";
};

const TAB_ITEMS = [
  { label: "Authority Directory", anchor: "state-authorities" },
  { label: "Recent Developments", anchor: "recent-developments" },
];

const USPrivacyLaws = () => {
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [authSearch, setAuthSearch] = useState("");
  const [authStatusFilter, setAuthStatusFilter] = useState("All");
  const [authorityExpanded, setAuthorityExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("state-authorities");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setRef = useCallback((anchor: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[anchor] = el;
  }, []);

  // IntersectionObserver for active tab highlighting
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    TAB_ITEMS.forEach(({ anchor }) => {
      const el = sectionRefs.current[anchor];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveTab(anchor);
        },
        { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [recentArticles]);

  const filteredAuthorities = usStates.filter((state: any) => {
    const matchesSearch = !authSearch ||
      state.state.toLowerCase().includes(authSearch.toLowerCase()) ||
      state.authority_name.toLowerCase().includes(authSearch.toLowerCase()) ||
      (state.statute_name && state.statute_name.toLowerCase().includes(authSearch.toLowerCase()));
    const matchesStatus = authStatusFilter === "All" || state.statute_status === authStatusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_name,image_url,published_at")
        .or("category.eq.us-federal,category.eq.us-states")
        .order("published_at", { ascending: false })
        .limit(8);
      if (data) setRecentArticles(data);
    }
    load();
  }, []);

  const scrollTo = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>U.S. Privacy Laws — Federal & State Privacy Guide 2026 | Your Privacy Hub</title>
        <meta name="description" content="A complete guide to the U.S. privacy regulatory framework — federal statutes, FTC enforcement authority, and state-level comprehensive privacy laws across all 50 states." />
        <meta property="og:title" content="U.S. Privacy Laws | Your Privacy Hub" />
        <meta property="og:description" content="Federal & state privacy law guide covering FTC authority, HIPAA, COPPA, and all 50 state privacy statutes." />
      </Helmet>
      <Navbar />

      {/* Page Header */}
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            🇺🇸 Intelligence Guide
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">U.S. Privacy Laws</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">
            A complete guide to the U.S. privacy regulatory framework — federal statutes, FTC enforcement authority, and state-level comprehensive privacy laws across all 50 states.
          </p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: March 10, 2026</div>

          {/* Functional tab navigation */}
          <div className="flex flex-wrap gap-1.5 mt-5 overflow-x-auto">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.anchor}
                onClick={() => scrollTo(tab.anchor)}
                className={`px-3 py-1.5 text-[11px] md:text-[12px] font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer bg-transparent ${
                  activeTab === tab.anchor
                    ? "border-white text-white bg-white/15"
                    : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-pillar-top" className="py-3" />

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">


        {/* ── Section: State Authorities Directory (collapsed by default) ── */}
        <div ref={setRef("state-authorities")} id="state-authorities" className="mt-12 mb-10 scroll-mt-24">
          <h2 className="font-display text-[20px] md:text-[24px] text-foreground mb-2">U.S. State Privacy Authority Directory</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">Browse the enforcement authorities responsible for privacy regulation in every U.S. state. Use the search and status filters below to find specific states, statutes, or agencies.</p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mb-4 p-4 bg-card rounded-xl border border-border shadow-sm">
            <div className="relative flex-1 min-w-[200px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                className="w-full py-2 pl-10 pr-4 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors"
                placeholder="Search states, authorities, or statutes…"
                value={authSearch}
                onChange={(e) => setAuthSearch(e.target.value)}
              />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Status:</span>
            {["All", "Enacted", "Pending", "None"].map((f) => (
              <span
                key={f}
                onClick={() => setAuthStatusFilter(f)}
                className={`px-3.5 py-1.5 text-[12.5px] font-medium border rounded-full cursor-pointer transition-all ${
                  authStatusFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                }`}
              >
                {f}
              </span>
            ))}
            <span className="ml-auto text-[12px] text-muted-foreground">{filteredAuthorities.length} results</span>
          </div>

          {/* Collapse toggle */}
          {!authorityExpanded && (
            <button
              onClick={() => setAuthorityExpanded(true)}
              className="w-full py-3 text-[13px] font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
            >
              View all {filteredAuthorities.length} states ↓
            </button>
          )}

          {/* Table (shown only when expanded) */}
          {authorityExpanded && (
            <>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {["State", "Authority", "Statute", "Status", "Effective Date", "Links"].map((h) => (
                          <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground text-left border-b border-border">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuthorities.map((state: any) => (
                        <tr key={state.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-[13px] text-foreground font-medium border-b border-border whitespace-nowrap">
                            <Link
                              to={`/jurisdiction/${slugify(state.state)}`}
                              className="text-primary hover:underline font-medium no-underline"
                            >
                              {state.state}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-foreground border-b border-border">
                            <div className="font-medium">{state.authority_name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{state.authority_type}</div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-foreground border-b border-border">
                            {state.statute_name || <span className="text-muted-foreground italic">None</span>}
                          </td>
                          <td className="px-4 py-3 border-b border-border">
                            <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${authorityStatusClass(state.statute_status)}`}>
                              {state.statute_status || "None"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-foreground border-b border-border whitespace-nowrap">
                            {state.effective_date || "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] border-b border-border">
                            <div className="flex gap-2">
                              <a href={state.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline no-underline text-[12px]">Website ↗</a>
                              {state.complaint_portal && (
                                <a href={state.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline no-underline text-[12px]">Complaints ↗</a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button
                onClick={() => setAuthorityExpanded(false)}
                className="w-full mt-3 py-3 text-[13px] font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
              >
                Collapse table ↑
              </button>
            </>
          )}
        </div>

        {/* ── Section 3: Recent Developments ── */}
        {recentArticles.length > 0 && (
          <div ref={setRef("recent-developments")} id="recent-developments" className="mt-12 mb-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl text-navy">Recent U.S. Privacy Developments</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Live</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">Stay current with the latest federal and state privacy actions, rulemakings, and enforcement updates. This feed pulls the most recent developments so you can track what's changing across U.S. jurisdictions.</p>
            <div className="divide-y divide-fog">
              {recentArticles.map((a: any) => (
                <ArticleCard
                  key={a.id}
                  item={{
                    id: a.id,
                    title: a.title,
                    summary: a.summary,
                    source_name: a.source_name,
                    published_at: a.published_at,
                    source_url: a.url,
                  } as ArticleItem}
                  variant="full"
                />
              ))}
            </div>
          </div>
        )}

        {/* Related Resources — styled cards */}
        <div className="mt-12 pt-8 border-t border-fog">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group bg-card border border-fog rounded-xl p-5 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all"
              >
                <span className="text-2xl block mb-2">{link.icon}</span>
                <p className="font-display font-bold text-navy text-[14px] mb-1 group-hover:text-blue transition-colors">{link.label}</p>
                <span className="text-blue text-[12px] font-semibold">Explore →</span>
              </Link>
            ))}
          </div>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-pillar-bottom" className="py-6" />

        {/* Premium CTA (bottom — kept) */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Intelligence Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly intelligence on U.S. Privacy Laws</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Intelligence subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.</p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Unlock Weekly Intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default USPrivacyLaws;
