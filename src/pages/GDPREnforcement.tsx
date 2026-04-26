import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { useAuth } from "@/hooks/useAuth";

const GDPR_HERO_STATS = [
  { value: "€4.5B+", label: "GDPR fines issued" },
  { value: "45+", label: "DPAs active" },
  { value: "Top 5", label: "DPAs by fine volume" },
  { value: "Art. 83", label: "penalty framework" },
];

const SECTIONS = [
  {
    id: "gdpr-framework",
    heading: "The GDPR Enforcement Framework",
    content: "GDPR enforcement operates through a decentralized network of independent Data Protection Authorities in each EU member state, coordinated by the European Data Protection Board (EDPB). The one-stop-shop mechanism designates a lead supervisory authority based on a company's main establishment, while the consistency mechanism ensures uniform application across member states. DPAs can impose administrative fines up to €20 million or 4% of global annual turnover, whichever is higher. Beyond fines, DPAs can issue warnings, reprimands, orders to comply, temporary or definitive processing bans, and orders to communicate data breaches to affected individuals."
  },
  {
    id: "enforcement-actions",
    heading: "Landmark Enforcement Actions",
    content: "The largest GDPR fines include Meta's €1.2 billion fine from the Irish DPC for transfers to the U.S. without adequate safeguards (2023), Amazon's €746 million fine from Luxembourg's CNPD for targeted advertising violations (2021), and multiple fines against Google, TikTok, and Clearview AI across various jurisdictions. These landmark cases have established important precedents on consent, legitimate interest, data transfers, and transparency requirements. In 2026, the EDPB's binding guidance on AI training data represents a significant expansion of enforcement scope into artificial intelligence."
  },
];

const MORE_SECTIONS = [
  {
    heading: "DPA Activity by Jurisdiction",
    content: "Enforcement activity varies significantly across EU member states. The most active DPAs by fine volume include Ireland (DPC), France (CNIL), Luxembourg (CNPD), Italy (Garante), and Spain (AEPD). Ireland's DPC has been particularly significant due to its role as lead authority for major technology companies with European headquarters in Dublin. France's CNIL has been notable for its willingness to act unilaterally on matters it considers urgent, including enforcement against Clearview AI and Google Analytics. Germany's federal structure creates additional complexity, with 17 separate DPAs operating across federal and state levels."
  },
  {
    heading: "Cross-Border Enforcement Challenges",
    content: "The one-stop-shop mechanism has faced criticism for delays in cross-border cases. The EDPB has increasingly used its dispute resolution powers to resolve disagreements between DPAs, including binding decisions that have overridden lead authority draft decisions. The EDPB's 2026 guidance on AI training data represents a coordinated enforcement approach that bypasses some of the delays inherent in individual DPA proceedings. Proposed reforms to the GDPR's procedural rules aim to streamline cross-border enforcement."
  },
  {
    heading: "Enforcement Trends",
    content: "Key enforcement trends in 2025-2026 include: increased focus on AI and automated decision-making, accelerating enforcement against data brokers and adtech, growing scrutiny of dark patterns and deceptive design, expansion of enforcement to smaller organizations beyond big tech, increasing use of temporary processing bans as an enforcement tool, and coordinated enforcement actions across multiple DPAs simultaneously. The EDPB's coordinated enforcement framework has enabled DPAs to align on priority topics, with cookie compliance, data subject access rights, and AI being recent focus areas."
  },
];

const UK_COMPARISON = [
  { dimension: "Enforcing Authority", eu: "National DPAs (27 authorities)", uk: "Information Commissioner's Office (ICO)" },
  { dimension: "Maximum Fine", eu: "€20M or 4% global turnover", uk: "£17.5M or 4% global turnover" },
  { dimension: "International Transfer Mechanism", eu: "SCCs, BCRs, adequacy decisions", uk: "UK IDTA, UK BCRs, UK adequacy regulations" },
  { dimension: "Adequacy with EU", eu: "N/A", uk: "In force (subject to periodic review)" },
  { dimension: "Key Divergences", eu: "Strict consent model, EDPB coordination", uk: "DUA 2025, research exemptions, ICO enforcement priorities" },
];

const TAB_ITEMS = [
  { label: "GDPR Framework", anchor: "gdpr-framework" },
  { label: "Enforcement Actions", anchor: "enforcement-actions" },
  { label: "UK Privacy", anchor: "uk-privacy" },
  { label: "Recent Developments", anchor: "gdpr-recent" },
];

const RELATED_LINKS = [
  { icon: "🌍", label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
  { icon: "⚖️", label: "Enforcement Tracker", href: "/enforcement-tracker" },
  { icon: "🤖", label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
  { icon: "🌐", label: "Global Privacy Laws", href: "/global-privacy-laws" },
  { icon: "📋", label: "Legitimate Interest Tracker", href: "/legitimate-interest-tracker" },
];

const GDPREnforcement = () => {
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("gdpr-framework");
  const [ukExpanded, setUkExpanded] = useState(false);
  const { user } = useAuth();
  const [gdprEmail, setGdprEmail] = useState("");
  const [gdprEmailSent, setGdprEmailSent] = useState(false);

  const handleGdprEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdprEmail) return;
    try {
      await (supabase as any)
        .from("email_signups")
        .insert({ email: gdprEmail.toLowerCase().trim(), source: "gdpr-hero" });
    } catch {
      /* swallow */
    }
    setGdprEmailSent(true);
  };

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const setRef = useCallback((anchor: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[anchor] = el;
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    TAB_ITEMS.forEach(({ anchor }) => {
      const el = sectionRefs.current[anchor];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveTab(anchor); },
        { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [recentArticles]);

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_name,image_url,published_at")
        .eq("category", "eu-uk")
        .order("published_at", { ascending: false })
        .limit(6);
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
        <title>GDPR & UK Privacy — EU & UK Data Protection Guide 2026 | Your Privacy Hub</title>
        <meta name="description" content="Track GDPR and UK GDPR enforcement decisions, DPA activity, major fines, and the UK ICO framework. Updated weekly from regulatory sources." />
        <meta property="og:title" content="GDPR & UK Privacy | Your Privacy Hub" />
        <meta property="og:description" content="Track GDPR and UK GDPR enforcement decisions, DPA activity, major fines, and the UK ICO framework." />
      </Helmet>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            ⚖️ Intelligence Guide
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">GDPR & UK Privacy</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">
            Enforcement history, regulatory framework, and key developments across the European Union and United Kingdom.
          </p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: March 8, 2026</div>

          {/* Tabs */}
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
        {/* Intro */}
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <p className="text-[15px] text-navy leading-relaxed">
            The General Data Protection Regulation (GDPR) has established itself as the world's most consequential privacy enforcement framework since taking effect in May 2018. Through March 2026, European Data Protection Authorities (DPAs) have collectively imposed over €4.5 billion in fines, with enforcement activity accelerating year over year. This guide provides a comprehensive overview of the GDPR enforcement landscape, including the regulatory framework, major enforcement actions, cross-border cooperation mechanisms, and emerging enforcement trends.
          </p>
        </div>

        {/* GDPR Framework + Enforcement Actions */}
        <div className="space-y-8">
          {SECTIONS.map((sec) => (
            <div key={sec.id} ref={setRef(sec.id)} id={sec.id} className="scroll-mt-24">
              <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
              <p className="text-[14px] text-slate leading-relaxed">{sec.content}</p>
            </div>
          ))}
        </div>

        {/* More sections */}
        <div className="space-y-8 mt-8">
          {MORE_SECTIONS.map((sec, i) => (
            <div key={i}>
              <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
              <p className="text-[14px] text-slate leading-relaxed">{sec.content}</p>
            </div>
          ))}
        </div>

        {/* ── UK Privacy Framework ── */}
        <div ref={setRef("uk-privacy")} id="uk-privacy" className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy-mid))] rounded-2xl p-5 md:p-8 mt-12 mb-10 scroll-mt-24">
          <h2 className="font-display text-[20px] md:text-[24px] text-white mb-4 flex items-center gap-2">
            🇬🇧 UK Privacy Framework
          </h2>
          <div className="text-[13px] text-slate-light leading-relaxed space-y-3">
            <p>
              <strong className="text-white">UK GDPR and the Data Protection Act 2018</strong> Following the UK's departure from the EU, the United Kingdom retained its own version of the GDPR — known as the UK GDPR — alongside the Data Protection Act 2018. The UK GDPR mirrors the EU GDPR's core structure but operates as a separate legal framework enforced by the Information Commissioner's Office (ICO).
            </p>
            <p>
              The ICO is the UK's independent supervisory authority for data protection and information rights. It has enforcement powers broadly equivalent to EU DPAs, including the ability to issue fines up to £17.5 million or 4% of global annual turnover. The ICO has published extensive practical guidance including a detailed Legitimate Interests Assessment (LIA) framework, sector-specific guidance, and codes of practice for areas including children's privacy, direct marketing, and AI.
            </p>
            <p>
              Key UK-specific considerations include: the UK's adequacy decision from the EU (currently in force, subject to periodic review), the UK's own adequacy assessment framework for international transfers, divergence from EU GDPR in areas including research exemptions and the UK's Data (Use and Access) Act 2025, and the ICO's published enforcement priorities. Practitioners operating in both the EU and UK must account for the two frameworks as distinct legal obligations, even where their requirements substantially overlap.
            </p>
          </div>

          {ukExpanded && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
              {/* Comparison table */}
              <div>
                <h3 className="font-display text-[17px] text-white/90 mb-3">EU GDPR vs UK GDPR</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 text-white/70 font-semibold border-b border-white/10">Dimension</th>
                        <th className="text-left px-3 py-2 text-white/70 font-semibold border-b border-white/10">EU GDPR</th>
                        <th className="text-left px-3 py-2 text-white/70 font-semibold border-b border-white/10">UK GDPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {UK_COMPARISON.map((row) => (
                        <tr key={row.dimension} className="border-b border-white/5">
                          <td className="px-3 py-2 text-sky font-medium">{row.dimension}</td>
                          <td className="px-3 py-2 text-slate-light">{row.eu}</td>
                          <td className="px-3 py-2 text-slate-light">{row.uk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ICO Guidance */}
              <div>
                <h3 className="font-display text-[17px] text-white/90 mb-3">ICO Primary Guidance Documents</h3>
                <ul className="space-y-1.5 text-[13px] text-slate-light list-disc list-inside">
                  <li>UK GDPR Guide</li>
                  <li>Legitimate Interests Assessment (LIA) Framework</li>
                  <li>Children's Code (Age Appropriate Design Code)</li>
                  <li>Direct Marketing Code of Practice</li>
                </ul>
              </div>
            </div>
          )}

          <button
            onClick={() => setUkExpanded(!ukExpanded)}
            className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-sky hover:text-sky/80 transition-colors bg-transparent border-none cursor-pointer"
          >
            {ukExpanded ? (
              <>Hide <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show full UK privacy framework <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* ── Legitimate Interest Tracker callout ── */}
        <div className="bg-sky/5 border-l-4 border-[hsl(var(--navy))] rounded-xl p-5 md:p-6 mb-10">
          <h3 className="font-display text-[18px] text-navy mb-2">Legitimate Interest Under GDPR & UK GDPR</h3>
          <p className="text-[13px] text-slate leading-relaxed mb-4">
            Article 6(1)(f) of both the EU GDPR and UK GDPR permits processing where a legitimate interest exists that is not overridden by the data subject's rights. The EDPB and ICO have both issued detailed guidance on the three-part assessment required. Our Legitimate Interest Tracker compiles regulatory positions from enforcement decisions, official guidance, and regulatory statements across the EU and UK — updated weekly.
          </p>
          <Link
            to="/legitimate-interest-tracker"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline"
          >
            → View the Legitimate Interest Tracker
          </Link>
        </div>

        {/* ── Recent Developments ── */}
        {recentArticles.length > 0 && (
          <div ref={setRef("gdpr-recent")} id="gdpr-recent" className="mt-12 mb-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl text-navy">Recent Developments</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Live</span>
            </div>
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
            {RELATED_LINKS.slice(0, 4).map((link) => (
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
          {/* Fifth card — full width */}
          <div className="mt-4">
            <Link
              to={RELATED_LINKS[4].href}
              className="group bg-card border border-fog rounded-xl p-5 no-underline hover:shadow-eup-md hover:-translate-y-0.5 transition-all block"
            >
              <span className="text-2xl block mb-2">{RELATED_LINKS[4].icon}</span>
              <p className="font-display font-bold text-navy text-[14px] mb-1 group-hover:text-blue transition-colors">{RELATED_LINKS[4].label}</p>
              <span className="text-blue text-[12px] font-semibold">Explore →</span>
            </Link>
          </div>
          <div className="mt-6">
            <Link to="/global-privacy-authorities" className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline">
              Browse All EU DPAs →
            </Link>
          </div>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-pillar-bottom" className="py-6" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Intelligence Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly intelligence on GDPR & UK Privacy</h3>
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

export default GDPREnforcement;
