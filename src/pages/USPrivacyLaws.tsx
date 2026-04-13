import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock, ChevronDown, ChevronUp, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard, type ArticleItem } from "@/components/ArticleCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import usStates from "@/data/us_state_privacy_authorities.json";

const FEDERAL_SECTIONS = [
  {
    heading: "FTC Authority and Enforcement",
    content: "The Federal Trade Commission serves as the primary federal privacy and data security enforcement authority, operating under Section 5 of the FTC Act which prohibits 'unfair or deceptive acts or practices.' The FTC has used this broad authority to bring hundreds of enforcement actions for privacy and data security violations, establishing de facto privacy standards through consent decrees. Key FTC enforcement areas include: deceptive privacy practices, inadequate data security, children's privacy (COPPA), health data sharing, and dark patterns. In March 2026, the FTC proposed expanding COPPA protections to require verifiable parental consent for targeted advertising directed at children under 16."
  },
  {
    heading: "Sector-Specific Federal Privacy Laws",
    content: "Major federal privacy statutes include: HIPAA (Health Insurance Portability and Accountability Act) governing protected health information; COPPA (Children's Online Privacy Protection Act) protecting children under 13 online; GLBA (Gramm-Leach-Bliley Act) governing financial institution data practices; FERPA (Family Educational Rights and Privacy Act) protecting student education records; ECPA (Electronic Communications Privacy Act) governing wiretapping and electronic surveillance; and the Video Privacy Protection Act. Each statute has its own scope, requirements, enforcement mechanisms, and regulatory authority."
  },
  {
    heading: "Federal Privacy Bill Landscape",
    content: "Multiple comprehensive federal privacy bills have been introduced but none enacted as of March 2026. The American Data Privacy and Protection Act (ADPPA) advanced furthest in 2022, passing the House Energy and Commerce Committee with bipartisan support before stalling. Key points of contention include: federal preemption of state laws (particularly California's CPRA), private right of action provisions, FTC rulemaking authority, and algorithmic accountability requirements. The political dynamics remain challenging, with industry groups, consumer advocates, and state attorneys general holding divergent positions on preemption and enforcement mechanisms."
  },
  {
    heading: "Executive Orders and Agency Actions",
    content: "In the absence of comprehensive legislation, executive orders and agency actions have shaped federal privacy policy. Executive orders on AI safety include provisions addressing privacy risks from AI systems. The FTC has pursued an active rulemaking agenda, including commercial surveillance rules and updated COPPA rules. The HHS Office for Civil Rights continues to update HIPAA guidance for emerging technologies. The CFPB has addressed data privacy in the financial sector through its rulemaking on open banking and data rights. These agency actions, while significant, are subject to changes in administration priorities and judicial review."
  },
  {
    heading: "Implications for Compliance",
    content: "The sectoral approach creates significant compliance complexity for organizations operating across industries. Organizations must navigate overlapping and sometimes conflicting requirements from multiple federal statutes, FTC enforcement precedent, and the growing body of state privacy laws. Key compliance considerations include: identifying all applicable federal statutes based on data types and industry sectors, monitoring FTC enforcement trends and consent decree requirements, maintaining compliance with evolving state laws in the absence of federal preemption, and preparing for potential comprehensive federal legislation that could restructure the entire framework."
  },
];

const STATE_SECTIONS = [
  {
    heading: "The State Privacy Law Landscape",
    content: "Since California's Consumer Privacy Act (CCPA) took effect in 2020 — later strengthened by the California Privacy Rights Act (CPRA) — state legislatures across the country have followed suit. Virginia's Consumer Data Protection Act (VCDPA), Colorado's Privacy Act (CPA), Connecticut's Data Privacy Act (CTDPA), and Utah's Consumer Privacy Act (UCPA) represented the initial wave. By 2025, states including Texas, Oregon, Montana, Indiana, Tennessee, Iowa, Delaware, New Hampshire, New Jersey, Nebraska, Maryland, Minnesota, Rhode Island, and Kentucky had enacted their own comprehensive privacy statutes. Each law varies in scope, consumer rights, business obligations, enforcement mechanisms, and effective dates."
  },
  {
    heading: "Key Consumer Rights Across State Laws",
    content: "Most state privacy laws grant consumers a common set of rights: the right to know what personal data is collected, the right to delete personal data, the right to opt out of the sale of personal data, and the right to correct inaccurate data. However, significant differences exist. California's CPRA provides the broadest set of rights, including the right to limit the use of sensitive personal information. Texas's TDPSA includes broad definitions of sensitive data. Several states have introduced rights related to automated decision-making, with California's CPPA finalizing ADMT regulations in March 2026."
  },
  {
    heading: "Enforcement Authority",
    content: "Enforcement authority varies significantly across states. California is unique in having a dedicated privacy enforcement agency — the California Privacy Protection Agency (CPPA). Most other states vest enforcement authority in the state Attorney General. No state privacy law currently provides a private right of action for general privacy violations, though California's CCPA allows limited private action for data breaches involving unencrypted personal information. The Texas Attorney General's office has been particularly active, filing the first enforcement action under the TDPSA in March 2026."
  },
  {
    heading: "Compliance Considerations",
    content: "Organizations subject to multiple state privacy laws face significant compliance complexity. Key considerations include: determining applicability thresholds (which vary by state based on revenue, data volume, or percentage of revenue from data sales), implementing consent mechanisms for sensitive data processing, establishing universal opt-out mechanisms, conducting data protection assessments where required, and maintaining privacy notices that satisfy requirements across all applicable jurisdictions. Many organizations are adopting a 'highest common denominator' approach, implementing controls that satisfy the most stringent state requirements."
  },
  {
    heading: "Pending Legislation and Trends",
    content: "Several states have privacy bills pending as of March 2026, including New York's comprehensive privacy act. Key trends include: expanding definitions of sensitive data to include neural and biometric data, introducing AI-specific provisions and automated decision-making transparency requirements, strengthening children's privacy protections, and increasing enforcement budgets and activity. The absence of federal preemption means this trend toward state-level privacy legislation is expected to continue."
  },
];

const RELATED_LINKS = [
  { label: "U.S. State Privacy Authority Directory", href: "#state-authorities" },
  { label: "U.S. State Law Comparison", href: "/compare/us-states" },
  { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
  { label: "Enforcement Tracker", href: "/enforcement-tracker" },
];

const authorityStatusClass = (s: string | null) => {
  if (!s) return "bg-muted text-muted-foreground";
  if (s === "Enacted") return "bg-green-100 text-green-800";
  if (s === "Pending") return "bg-yellow-100 text-yellow-800";
  return "bg-muted text-muted-foreground";
};

const USPrivacyLaws = () => {
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [federalExpanded, setFederalExpanded] = useState(false);
  const [authSearch, setAuthSearch] = useState("");
  const [authStatusFilter, setAuthStatusFilter] = useState("All");

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

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>U.S. Privacy Laws — Federal & State Privacy Guide 2026 | EndUserPrivacy</title>
        <meta name="description" content="A complete guide to the U.S. privacy regulatory framework — federal statutes, FTC enforcement authority, and state-level comprehensive privacy laws across all 50 states." />
        <meta property="og:title" content="U.S. Privacy Laws | EndUserPrivacy" />
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

          {/* Anchor jump links */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { label: "Federal Framework", anchor: "#federal-framework" },
              { label: "State Laws", anchor: "#state-laws" },
              { label: "Authority Directory", anchor: "#state-authorities" },
              { label: "Recent Developments", anchor: "#recent-developments" },
            ].map((link) => (
              <a
                key={link.anchor}
                href={link.anchor}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector(link.anchor)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3.5 py-1.5 text-[12px] font-semibold rounded-full border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all no-underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-pillar-top" className="py-3" />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* ── Section 1: Federal Framework ── */}
        <div id="federal-framework" className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy-mid))] rounded-2xl p-5 md:p-8 mb-10 scroll-mt-24">
          <h2 className="font-display text-[20px] md:text-[24px] text-white mb-2 flex items-center gap-2">
            🏛️ The Federal Privacy Framework
          </h2>
          <p className="text-[13px] text-slate-light mb-6 leading-relaxed">
            The U.S. has no single comprehensive federal privacy law. Instead, a patchwork of sector-specific statutes and FTC enforcement authority governs data privacy at the federal level.
          </p>

          {/* Always-visible: FTC Authority */}
          <div className="mb-4">
            <h3 className="font-display text-[17px] md:text-[19px] text-white/90 mb-2">{FEDERAL_SECTIONS[0].heading}</h3>
            <p className="text-[13px] text-slate-light leading-relaxed">{FEDERAL_SECTIONS[0].content}</p>
          </div>

          {/* Collapsible: remaining federal sections */}
          {federalExpanded && (
            <div className="space-y-5 mt-5 pt-5 border-t border-white/10">
              {FEDERAL_SECTIONS.slice(1).map((sec, i) => (
                <div key={i}>
                  <h3 className="font-display text-[17px] md:text-[19px] text-white/90 mb-2">{sec.heading}</h3>
                  <p className="text-[13px] text-slate-light leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setFederalExpanded(!federalExpanded)}
            className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-sky hover:text-sky/80 transition-colors bg-transparent border-none cursor-pointer"
          >
            {federalExpanded ? (
              <>Hide <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show full federal framework <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div id="state-laws" className="relative flex items-center my-10 scroll-mt-24">
          <div className="flex-1 border-t border-fog" />
          <span className="px-4 text-[13px] font-semibold text-slate bg-paper">🗺️ State Privacy Laws</span>
          <div className="flex-1 border-t border-fog" />
        </div>

        {/* ── Section 2: State Laws ── */}
        <div className="space-y-8">
          {STATE_SECTIONS.map((sec, i) => (
            <React.Fragment key={i}>
              <div>
                <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
                <p className="text-[14px] text-slate leading-relaxed">{sec.content}</p>
              </div>
              {i === 1 && (
                <>
                  <AdBanner variant="inline" adSlot="eup-pillar-mid" className="py-4" />
                  <div className="rounded-2xl border border-sky/20 overflow-hidden shadow-eup-sm my-2">
                    <div className="bg-gradient-to-br from-navy to-navy-mid px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-1">⭐ Weekly Intelligence</div>
                        <h3 className="font-display text-[14px] text-white">What changed in U.S. privacy law this week</h3>
                      </div>
                      <Lock className="w-4 h-4 text-sky/50 shrink-0" />
                    </div>
                    <div className="relative bg-card px-5 py-4">
                      <div className="space-y-2 blur-[3px] select-none pointer-events-none">
                        <div className="h-2.5 bg-navy/10 rounded w-full" />
                        <div className="h-2.5 bg-navy/10 rounded w-4/5" />
                        <div className="h-2.5 bg-navy/10 rounded w-3/4" />
                        <div className="h-2.5 bg-navy/10 rounded w-full mt-2" />
                        <div className="h-2.5 bg-navy/10 rounded w-2/3" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-navy/40 shrink-0" />
                          <span className="text-[12px] text-navy font-medium">Premium subscribers get weekly updates on every development in this area.</span>
                          <Link to="/subscribe" className="text-[11px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-3 py-1.5 rounded-lg no-underline hover:opacity-90 transition-all whitespace-nowrap">
                            Unlock →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Section: State Authorities Directory ── */}
        <div id="state-authorities" className="mt-12 mb-10 scroll-mt-24">
          <h2 className="font-display text-[20px] md:text-[24px] text-foreground mb-4">U.S. State Privacy Authority Directory</h2>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center mb-6 p-4 bg-card rounded-xl border border-border shadow-sm">
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

          {/* Table */}
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
        </div>

        {/* ── Section 3: Recent Developments ── */}
        {recentArticles.length > 0 && (
          <div id="recent-developments" className="mt-12 mb-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl text-navy">Recent U.S. Privacy Developments</h2>
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

        {/* Related Resources */}
        <div className="mt-12 pt-8 border-t border-fog">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RELATED_LINKS.map((link, i) => (
              <Link key={i} to={link.href} className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
                <span className="text-blue">→</span> {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <a href="#state-authorities" className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline">
              Browse All U.S. State Authorities ↑
            </a>
          </div>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-pillar-bottom" className="py-6" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly intelligence on U.S. Privacy Laws</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Premium subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.</p>
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
