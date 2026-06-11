import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { supabase } from "@/integrations/supabase/client";
import { TieredFeed } from "@/components/TieredFeed";
import type { ArticleItem } from "@/components/ArticleCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import usStatesRaw from "@/data/us_state_privacy_authorities.json";
import { useStateLawOverrides, applyOverride } from "@/hooks/useStateLawOverrides";
import { ResearchSynthesisBlock } from "@/components/research/ResearchSynthesisBlock";
import { ResearchToolCTA } from "@/components/research/ResearchToolCTA";

const RELATED_LINKS = [
  { icon: "📊", label: "U.S. State Law Comparison", href: "/compare/us-states" },
  { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
  { icon: "⚖️", label: "Enforcement Tracker", href: "/enforcement-tracker" },
  { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
];

const FEDERAL_AUTHORITIES = [
  {
    name: "Federal Trade Commission",
    abbr: "FTC",
    scope: "General consumer privacy & data security (all sectors)",
    authority: "FTC Act Section 5; COPPA; GLBA Privacy & Safeguards Rules",
    website: "https://www.ftc.gov/privacy",
  },
  {
    name: "Federal Communications Commission",
    abbr: "FCC",
    scope: "Telecommunications & broadband providers",
    authority: "Communications Act; CPNI rules (47 CFR Part 64); broadband data security orders",
    website: "https://www.fcc.gov/consumers/guides/protecting-your-privacy",
  },
  {
    name: "Consumer Financial Protection Bureau",
    abbr: "CFPB",
    scope: "Financial products and services",
    authority: "Gramm-Leach-Bliley Act; Dodd-Frank Section 1033; Fair Credit Reporting Act",
    website: "https://www.consumerfinance.gov/data-privacy",
  },
  {
    name: "HHS Office for Civil Rights",
    abbr: "HHS/OCR",
    scope: "Healthcare providers, health plans, and business associates",
    authority: "HIPAA Privacy Rule (45 CFR Part 164); HITECH Act",
    website: "https://www.hhs.gov/hipaa",
  },
  {
    name: "Dept. of Education — Student Privacy Policy Office",
    abbr: "SPPO",
    scope: "Educational agencies and institutions receiving federal funding",
    authority: "FERPA (20 U.S.C. § 1232g); PPRA",
    website: "https://studentprivacy.ed.gov",
  },
];

const STATUS_STYLE: Record<
  string,
  { stripe: string; pill: string; subtitle: (d: string | null) => string }
> = {
  Enacted: {
    stripe: "bg-emerald-600",
    pill: "text-emerald-700 bg-emerald-600/10",
    subtitle: (d) => (d ? `Effective ${d}` : "Enacted"),
  },
  Pending: {
    stripe: "bg-amber-600",
    pill: "text-amber-700 bg-amber-600/10",
    subtitle: (d) => (d ? `Effective ${d}` : "Pending legislation"),
  },
  None: {
    stripe: "bg-slate-400",
    pill: "text-slate bg-slate-400/15",
    subtitle: () => "No statute",
  },
};

const getStatusStyle = (s: string | null) =>
  STATUS_STYLE[s || "None"] || STATUS_STYLE.None;

const TAB_ITEMS = [
  { label: "Federal Authorities", anchor: "federal-authorities" },
  { label: "Authority Directory", anchor: "authority-directory" },
  { label: "Recent Developments", anchor: "recent-developments" },
];

const USPrivacyLaws = () => {
  const [recentArticles, setRecentArticles] = useState<ArticleItem[]>([]);
  
  const [authStatusFilter, setAuthStatusFilter] = useState("Enacted");
  const [activeTab, setActiveTab] = useState("federal-authorities");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setRef = useCallback(
    (anchor: string) => (el: HTMLDivElement | null) => {
      sectionRefs.current[anchor] = el;
    },
    []
  );

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

  const overrides = useStateLawOverrides();
  const usStates = (usStatesRaw as any[]).map((s) => applyOverride(s, overrides));

  const enactedCount = usStates.filter((s: any) => s.statute_status === "Enacted").length;
  const pendingCount = usStates.filter((s: any) => s.statute_status === "Pending").length;
  const noneCount = usStates.filter((s: any) => !s.statute_status || s.statute_status === "None").length;

  const filteredAuthorities = usStates.filter((state: any) => {
    if (authStatusFilter === "All") return true;
    if (authStatusFilter === "None") return !state.statute_status || state.statute_status === "None";
    return state.statute_status === authStatusFilter;
  });

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from("updates")
        .select("*")
        .eq("is_hidden", false)
        .or("category.eq.us-federal,category.eq.us-states")
        .order("published_at", { ascending: false })
        .limit(8);
      if (data) {
        setRecentArticles(
          (data as any[]).map((a) => ({ ...a, source_url: a.url })) as ArticleItem[]
        );
      }
    }
    load();
  }, []);

  // Handle deep-link hash on mount.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  const scrollTo = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>U.S. Privacy Laws Guide 2026 | End User Privacy</title>
        <meta
          name="description"
          content="A complete guide to the U.S. privacy regulatory framework — federal enforcement authorities, state-level authorities and privacy laws across all 50 states, and the latest regulatory developments."
        />
        <meta property="og:title" content="U.S. Privacy Laws | End User Privacy" />
        <meta
          property="og:description"
          content="Federal & state privacy law guide covering FTC, FCC, CFPB, HHS/OCR, SPPO, CPPA and all 50 state privacy statutes."
        />
      </Helmet>
      <Navbar />

      {/* Page Header */}
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🇺🇸 Intelligence Guide
          </span>
          <h1 className="font-serif text-white mb-3">
            U.S. Privacy Laws
          </h1>
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
            A complete guide to the U.S. privacy regulatory framework — federal
            enforcement authorities, state-level authorities and privacy laws across all 50 states,
            and the latest regulatory developments.
          </p>



          <div className="flex flex-wrap gap-1.5 mt-5 overflow-x-auto">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.anchor}
                onClick={() => scrollTo(tab.anchor)}
                className={`px-3 py-1.5 text-meta md:text-meta font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer bg-transparent ${
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
      </header>

      {/* Landscape at a glance */}
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ResearchToolCTA
          toolName="Privacy Programme Assessment"
          toolDescription="See where your privacy program stands against the state laws on this page — a structured, enforcement-calibrated assessment across ten governance domains."
          href="/governance-assessment"
        />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Enacted", count: enactedCount, stripe: "bg-emerald-600", text: "text-emerald-700", bg: "bg-emerald-600/5" },
            { label: "Pending", count: pendingCount, stripe: "bg-amber-600", text: "text-amber-700", bg: "bg-amber-600/5" },
            { label: "No statute", count: noneCount, stripe: "bg-slate-400", text: "text-slate", bg: "bg-slate-400/5" },
          ].map((t) => (
            <div key={t.label} className={`grid grid-cols-[4px_1fr] items-stretch rounded-lg border border-brand-cloud overflow-hidden ${t.bg}`}>
              <div className={`${t.stripe} self-stretch`} aria-hidden="true" />
              <div className="px-4 py-3">
                <div className={`font-display text-2xl md:text-3xl leading-none ${t.text}`}>{t.count}</div>
                <div className="text-meta uppercase tracking-wider text-brand-mist mt-1">{t.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdBanner variant="leaderboard" className="my-4" />

      {/* Recent Developments CTA */}
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          onClick={() => scrollTo("recent-developments")}
          className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-brand-mist/10 to-brand-navy/5 border border-brand-mist/30 hover:border-brand-mist/60 hover:shadow-eup-sm rounded-xl px-4 py-3 transition-all text-left group"
        >
          <span className="text-sm md:text-sm text-brand-navy font-bold">
            See the latest U.S. privacy regulatory developments and enforcement actions.
          </span>
          <span className="text-brand-mist whitespace-nowrap group-hover:translate-x-0.5 transition-transform font-bold text-sm">
            Jump to Recent Developments →
          </span>
        </button>
        
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Federal Authorities ── */}
        <div
          ref={setRef("federal-authorities")}
          id="federal-authorities"
          className="mb-12 scroll-mt-24"
        >
          <h2 className="font-display text-brand-navy mb-2">
            U.S. Federal Privacy Authorities
          </h2>
          <p className="text-sm text-slate leading-relaxed mb-4">
            Federal regulators with privacy and data-protection enforcement authority
            across U.S. sectors. Each oversees a distinct slice of the privacy
            regulatory landscape.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FEDERAL_AUTHORITIES.map((a) => (
              <div
                key={a.abbr}
                className="grid grid-cols-[4px_1fr] items-stretch bg-card rounded-lg border border-brand-cloud hover:border-brand-navy/30 hover:shadow-eup-sm transition overflow-hidden"
              >
                <div className="bg-brand-teal self-stretch" aria-hidden="true" />
                <div className="px-4 py-3 md:px-5 md:py-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-display text-base md:text-[17px] leading-tight text-brand-navy">
                      {a.name}
                    </div>
                    <span className="text-eyebrow px-2 py-0.5 rounded bg-brand-teal/10 text-brand-teal border border-brand-teal/20 shrink-0">
                      {a.abbr}
                    </span>
                  </div>
                  <div className="text-meta uppercase tracking-wider text-brand-mist mb-2">
                    Federal regulator
                  </div>
                  <div className="text-meta text-slate mb-1.5">
                    <span className="font-semibold text-brand-navy/80">Scope:</span> {a.scope}
                  </div>
                  <div className="text-meta italic text-brand-navy/80 mb-2 leading-snug">
                    {a.authority}
                  </div>
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-meta font-medium text-brand-teal hover:text-brand-navy no-underline"
                  >
                    Site ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
          <ResearchSynthesisBlock sectionKey="us_privacy__federal" compact />
        </div>

        {/* ── State Authority Directory ── */}
        <div
          ref={setRef("authority-directory")}
          id="authority-directory"
          className="mt-12 mb-10 scroll-mt-24"
        >
          <h2 className="font-display text-brand-navy mb-2">
            U.S. State Privacy Authority Directory
          </h2>
          <p className="text-sm text-slate leading-relaxed mb-4">
            Browse the enforcement authorities responsible for privacy regulation in
            every U.S. state and Washington, D.C. Use the search and status filters
            below to find specific states, statutes, or agencies.
          </p>

          {/* Prominent Compare CTA — sticky above grid */}
          <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-4">
            <Link
              to="/compare/us-states"
              className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-teal/10 to-brand-navy/5 border border-brand-teal/40 hover:border-brand-teal rounded-xl px-4 py-3 shadow-eup-sm transition-all no-underline group"
            >
              <span className="text-sm font-bold text-brand-navy">
                Compare enacted state laws side by side
              </span>
              <span className="text-brand-teal whitespace-nowrap font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                Open comparison →
              </span>
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-3 items-center mb-4 p-4 bg-card rounded-xl border border-brand-cloud shadow-sm">
            <span className="text-meta font-semibold tracking-wider uppercase text-slate">
              Show:
            </span>
            {[
              { value: "All", label: "All" },
              { value: "Enacted", label: "Enacted" },
              { value: "Pending", label: "Pending" },
              { value: "None", label: "No statute" },
            ].map((f) => (
              <span
                key={f.value}
                onClick={() => setAuthStatusFilter(f.value)}
                className={`px-3.5 py-1.5 text-xs font-medium border rounded-full cursor-pointer transition-all ${
                  authStatusFilter === f.value
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "bg-card text-slate border-brand-cloud hover:bg-brand-navy hover:text-white hover:border-brand-navy"
                }`}
              >
                {f.label}
              </span>
            ))}
            <span className="ml-auto text-meta text-slate">
              {filteredAuthorities.length} results
            </span>
          </div>



          {/* Compact card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredAuthorities.map((state: any) => {
              const status = state.statute_status || "None";
              const style = getStatusStyle(state.statute_status);
              const showView = status === "Enacted" || status === "Pending";
              const slug = slugify(state.state);
              return (
                <div
                  key={state.id}
                  className="grid grid-cols-[4px_1fr] items-stretch bg-card rounded-lg border border-brand-cloud hover:border-brand-navy/30 hover:shadow-eup-sm transition overflow-hidden"
                >
                  <div className={`${style.stripe} self-stretch`} aria-hidden="true" />
                  <div className="px-4 py-3 md:px-5 md:py-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link
                        to={`/jurisdiction/${slug}`}
                        className="font-display text-base md:text-[17px] leading-tight text-brand-navy no-underline hover:underline"
                      >
                        {state.state}
                      </Link>
                      <span
                        className={`text-eyebrow px-2 py-0.5 rounded shrink-0 ${style.pill}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="text-meta uppercase tracking-wider text-brand-mist mb-2">
                      {style.subtitle(state.effective_date)}
                    </div>
                    <div className="text-meta font-semibold text-brand-navy leading-snug">
                      {state.authority_name}
                    </div>
                    <div className="text-xs text-slate mt-0.5 mb-1.5">
                      {state.authority_type}
                    </div>
                    {state.statute_name && state.statute_url ? (
                      <a
                        href={state.statute_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-meta italic text-brand-teal hover:text-brand-navy no-underline leading-snug mb-2"
                      >
                        {state.statute_name} ↗
                      </a>
                    ) : state.statute_name ? (
                      <div className="text-meta italic text-brand-navy/80 leading-snug mb-2">
                        {state.statute_name}
                      </div>
                    ) : (
                      <div className="text-meta italic text-brand-mist leading-snug mb-2">
                        No statute enacted
                      </div>
                    )}
                    {showView && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta font-medium">
                        <Link
                          to={`/jurisdiction/${slug}`}
                          className="text-brand-teal hover:text-brand-navy no-underline font-semibold"
                        >
                          View →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ResearchSynthesisBlock sectionKey="us_privacy__state_directory" compact />
        </div>

        {/* ── Recent Developments ── */}
        {recentArticles.length > 0 && (
          <div
            ref={setRef("recent-developments")}
            id="recent-developments"
            className="mt-12 mb-8 scroll-mt-24"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-brand-navy">
                Recent U.S. Privacy Developments
              </h2>
              <span className="text-eyebrow px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                Live
              </span>
            </div>
            <p className="text-sm text-slate leading-relaxed mb-2">
              Stay current with the latest federal and state privacy actions,
              rulemakings, and enforcement updates.
            </p>
            <ResearchSynthesisBlock sectionKey="us_privacy__page" promoteHeading />
            <TieredFeed
              articles={recentArticles}
              previewCount={1}
              seeAllHref="/updates"
              showSeeAll={true}
            />
          </div>
        )}

        {/* CPPA Risk Assessment CTA */}
        <div className="mt-12 rounded-xl border border-accent/30 bg-gradient-to-br from-[hsl(var(--accent)/0.05)] to-card p-6">
          <p className="text-eyebrow mb-2 text-accent">Assessment tool</p>
          <h3 className="font-display text-brand-navy mb-2">CPPA Risk Assessment</h3>
          <p className="text-sm text-slate leading-relaxed mb-4">
            Generate a CPPA-aligned risk assessment calibrated to California enforcement patterns - covers ADMT, sensitive data, and high-risk processing.
          </p>
          <Link
            to="/cppa-risk-assessment"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent no-underline hover:underline"
          >
            Run Assessment <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Related Resources */}
        <div className="mt-12 pt-8 border-t border-brand-cloud">
          <h3 className="text-brand-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group bg-card border border-brand-cloud rounded-xl p-5 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all"
              >
                <span className="text-2xl block mb-2">{link.icon}</span>
                <p className="font-display font-bold text-brand-navy text-sm mb-1 group-hover:text-brand-teal transition-colors">
                  {link.label}
                </p>
                <span className="text-brand-teal text-meta font-semibold">Explore →</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-navy to-brand-ocean rounded-2xl p-6 md:p-8 text-center">
          <div className="text-eyebrow text-brand-mist mb-2">
            ⭐ Intelligence
          </div>
          <h3 className="text-white mb-3">
            Get weekly intelligence on U.S. Privacy Laws
          </h3>
          <p className="text-sm text-brand-mist mb-5 max-w-[500px] mx-auto">
            Intelligence subscribers receive a structured weekly brief covering every
            material development in this area — enforcement actions, regulatory
            guidance, and what it means for your compliance posture.
          </p>
          <Link
            to="/subscribe"
            className="inline-block px-6 py-3 text-sm font-semibold text-brand-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline"
          >
            Unlock Weekly Intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default USPrivacyLaws;
