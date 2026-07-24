import { useState, useEffect, useRef } from "react";
import { Check, X, Lock, Baby, Bot, Cookie, Eye, Hospital, Landmark, Map, Shuffle, Target, Unlock } from 'lucide-react';
import { sampleBriefs, type SampleTrackSection } from "@/data/sampleBriefs";
import { CitedText } from "@/components/brief/CitedText";

// ─────────────────────────────────────────────────────────────────────────
// BriefBuilder.tsx  (v2 — jurisdiction × role × track)
// Replaces ProBriefPreview.tsx and absorbs "What do you want covered?".
// ─────────────────────────────────────────────────────────────────────────

const JURISDICTIONS = [
  { value: "eu-all",     label: "EU (All Member States)" },
  { value: "uk",         label: "United Kingdom" },
  { value: "us-federal", label: "U.S. Federal" },
  { value: "us-ca",      label: "U.S. — California (CPRA)" },
  { value: "us-states",  label: "U.S. States (all)" },
  { value: "apac",       label: "Asia-Pacific" },
  { value: "latam",      label: "Latin America" },
  { value: "mea",        label: "Middle East & Africa" },
  { value: "canada",     label: "Canada" },
  { value: "australia",  label: "Australia & NZ" },
  { value: "india",      label: "India (DPDP Act)" },
  { value: "global",     label: "Global / Multinational" },
];

const ROLES = [
  { value: "dpo",              label: "Data Protection Officer (DPO)" },
  { value: "cpo",              label: "Chief Privacy Officer (CPO)" },
  { value: "privacy_counsel",  label: "Privacy Counsel / Lawyer" },
  { value: "compliance_lead",  label: "Compliance Lead / Manager" },
  { value: "security_lead",    label: "Security Lead / CISO" },
  { value: "privacy_pro",      label: "Privacy Professional" },
];

const TRK_CLS = "w-4 h-4";
const TRACKS = [
  { value: "us_state",       icon: <Map aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "US State Privacy Laws",
    desc: "New state laws, AG enforcement, CPPA actions, and compliance deadlines" },
  { value: "gdpr",           icon: "🇪🇺", label: "GDPR Enforcement & DPA Activity",
    desc: "DPA fines, EDPB decisions, cross-border enforcement, and legal precedent" },
  { value: "ai_act",         icon: <Bot aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "EU AI Act Compliance",
    desc: "AI Act phases, GPAI obligations, prohibited practices, and GDPR overlap" },
  { value: "childrens",      icon: <Baby aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Children's Privacy & Age Verification",
    desc: "COPPA amendments, state kids' codes, age verification, and teen protections" },
  { value: "adtech_cookies", icon: <Cookie aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "AdTech, Consent & Cookie Compliance",
    desc: "TCF rulings, cookie enforcement, GPC requirements, and dark pattern decisions" },
  { value: "cross_border",   icon: <Shuffle aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Cross-Border Data Transfers",
    desc: "EU-US DPF, DOJ bulk data rule, SCCs, LGPD transfers, and adequacy updates" },
  { value: "health_hipaa",   icon: <Hospital aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Health & Medical Data Privacy",
    desc: "HIPAA enforcement, FTC health breach actions, state health laws, and AI in healthcare" },
  { value: "litigation",     icon: <Landmark aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Privacy Litigation & Class Actions",
    desc: "BIPA filings, VPPA suits, CIPA wiretap cases, MDL proceedings, and settlements" },
  { value: "biometric",      icon: <Eye aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Biometric Data Privacy",
    desc: "BIPA class action tracker, state biometric laws, and AI Act biometric provisions" },
  { value: "breach",         icon: <Unlock aria-hidden="true" strokeWidth={1.75} className={TRK_CLS} />, label: "Data Breach & Incident Response",
    desc: "Breach notification law changes, enforcement for late reporting, and SEC rules" },
];

const INDUSTRIES = [
  "Online & Web Services", "Mobile Applications", "AdTech & Digital Media",
  "AI & Machine Learning", "Healthcare & Life Sciences", "Financial Services & Fintech",
  "HR & Employment Data", "Children & EdTech", "Retail & E-Commerce",
  "Data Brokers", "Law Firm / Legal Services", "Insurance",
  "Telecommunications", "Gaming & Entertainment", "Automotive & Connected Vehicles",
  "Smart Home & IoT", "Non-Profit & NGO", "Media & Publishing",
  "Government & Public Sector", "Cybersecurity", "Real Estate & PropTech",
  "Education (Higher Ed)", "Consulting & Advisory", "Pharma & Clinical Research",
  "Social Media & Platforms", "Travel & Hospitality", "Biotech & Genomics",
  "Energy & Utilities", "Identity Verification & KYC",
  "Manufacturing & Industrial IoT", "Consumer Goods & Loyalty Programs",
];

const FORMATS = [
  { label: "Full 9-section report",  desc: "Executive summary, all topic tracks, enforcement table, trend signals, and action items." },
  { label: "Executive summary only", desc: "2-paragraph synthesis of the week's most important developments for board or leadership review." },
  { label: "Action items only",      desc: "A prioritised checklist of Immediate, This Quarter, and Monitor actions — no narrative." },
];

type BriefItem = SampleTrackSection & {
  track: string;
  trackLabel: string;
  trackIcon: React.ReactNode;
};

const JURISDICTION_FALLBACK_NOTE: Record<string, string> = {
  canada: "Canada",
  latam: "Latin America",
  mea: "Middle East & Africa",
};

function resolveStaticRegion(jurisdiction: string): string {
  const map: Record<string, string> = {
    "eu-all":     "eu",
    "uk":         "eu",
    "us-federal": "us",
    "us-ca":      "us",
    "us-states":  "us",
    "apac":       "apac",
    "australia":  "apac",
    "india":      "apac",
    "global":     "global",
    "canada":     "global",
    "latam":      "global",
    "mea":        "global",
  };
  return map[jurisdiction] ?? "global";
}

function getBriefItems(
  jurisdiction: string,
  role: string,
  selectedTracks: string[]
): BriefItem[] {
  const regionKey = resolveStaticRegion(jurisdiction);
  const brief = sampleBriefs[regionKey]?.[role];
  if (!brief) return [];
  return selectedTracks
    .map((t) => {
      const section = brief.tracks?.[t];
      const trackDef = TRACKS.find((tk) => tk.value === t);
      if (!section || !trackDef) return null;
      return {
        ...section,
        track: t,
        trackLabel: trackDef.label,
        trackIcon: trackDef.icon,
      } as BriefItem;
    })
    .filter(Boolean) as BriefItem[];
}

export default function BriefBuilder() {
  const [jurisdiction, setJurisdiction] = useState("");
  const [role,         setRole]         = useState("");
  const [tracks,       setTracks]       = useState<string[]>([]);
  const [briefShown,   setBriefShown]   = useState(false);


  const [showCollapsePill, setShowCollapsePill] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Pre-seed jurisdiction & topic from URL params (supports both ?p=v
  // and hash-style /#brief?p=v that ArticleCard's BriefBuilderCTA emits).
  useEffect(() => {
    const readParams = (): URLSearchParams => {
      if (typeof window === "undefined") return new URLSearchParams();
      const search = window.location.search || "";
      const hash = window.location.hash || "";
      const hashQ = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
      return new URLSearchParams((search || hashQ).replace(/^\?/, ""));
    };
    const params = readParams();
    const preJ = (params.get("pre_jurisdiction") || "").toLowerCase().trim();
    const preT = (params.get("pre_topic") || "").toLowerCase().trim();

    if (preJ) {
      let mapped = "";
      if (JURISDICTIONS.some(j => j.value === preJ)) mapped = preJ;
      else if (/eu|uk|gdpr|europe/.test(preJ)) mapped = "eu";
      else if (/us|united states|federal|state/.test(preJ)) mapped = "us";
      else if (/global|multi/.test(preJ)) mapped = "global";
      else if (/apac|asia|pacific/.test(preJ)) mapped = "apac";
      if (mapped) setJurisdiction(mapped);
    }

    if (preT) {
      const topicMap: Record<string, string> = {
        "enforcement": "gdpr",
        "ai-privacy": "ai_act",
        "adtech": "adtech_cookies",
        "us-federal": "us_state",
        "us-states": "us_state",
        "eu-uk": "gdpr",
        "children-privacy": "childrens",
        "data-breaches": "breach",
        "cross-border": "cross_border",
        "biometric-data": "biometric",
        "health-hipaa": "health_hipaa",
        "cookie-consent": "adtech_cookies",
        "employee-privacy": "us_state",
      };
      const mapped = topicMap[preT] || (TRACKS.some(t => t.value === preT) ? preT : "");
      if (mapped) setTracks([mapped]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const toggleTrack = (t: string) =>
    setTracks((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const collapseBrief = () => {
    setBriefShown(false);
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Esc key collapses the brief
  useEffect(() => {
    if (!briefShown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapseBrief();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [briefShown]);

  // Show floating pill once user scrolls past the top of the brief container
  useEffect(() => {
    if (!briefShown) {
      setShowCollapsePill(false);
      return;
    }
    const onScroll = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setShowCollapsePill(top < 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [briefShown]);

  const briefItems = briefShown
    ? getBriefItems(jurisdiction, role, tracks)
    : [];

  const canGenerate = !!jurisdiction && !!role && tracks.length > 0;

  return (
    <div ref={rootRef} className="bg-card border border-brand-cloud rounded-2xl p-6 md:p-8 relative">
      {showCollapsePill && (
        <button
          type="button"
          onClick={collapseBrief}
          aria-label="Collapse brief (Esc)"
          title="Collapse brief (Esc)"
          className="fixed bottom-20 right-6 z-40 inline-flex items-center gap-2 px-4 h-11 rounded-full bg-brand-navy text-white shadow-eup-md hover:bg-brand-navy/90 transition-all border border-brand-slate-teal text-sm font-semibold"
        >
          <X className="w-4 h-4" />
          Collapse brief
        </button>
      )}
      <div className="mb-6">
        <h3 className="text-brand-navy mb-1">
          Build your sample Privacy Intelligence Report
        </h3>
        <p className="text-sm text-slate mb-5">
          Select your jurisdiction and role, then pick your topic tracks.
          We'll assemble a representative brief showing exactly the depth
          and format you'll receive every Monday — written for your role.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-brand-navy mb-1.5">
              Your jurisdiction
            </label>
            <select
              aria-label="Your jurisdiction"
              value={jurisdiction}
              onChange={(e) => { setJurisdiction(e.target.value); setBriefShown(false); }}
              className="w-full px-3.5 py-2.5 text-sm bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
            >
              <option value="">Select your jurisdiction…</option>
              {JURISDICTIONS.map((j) => (
                <option key={j.value} value={j.value}>{j.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-brand-navy mb-1.5">
              Your role
            </label>
            <select
              aria-label="Your role"
              value={role}
              onChange={(e) => { setRole(e.target.value); setBriefShown(false); }}
              className="w-full px-3.5 py-2.5 text-sm bg-brand-cloud border border-silver rounded-lg text-brand-navy outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
            >
              <option value="">Select your role…</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brand-navy mb-3">
          Select your topic tracks
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {TRACKS.map((track) => {
            const sel = tracks.includes(track.value);
            return (
              <button
                key={track.value}
                type="button"
                onClick={() => { toggleTrack(track.value); setBriefShown(false); }}
                className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-left w-full transition-all cursor-pointer ${
                  sel
                    ? "bg-brand-navy border-brand-navy shadow-eup-sm"
                    : "bg-white border-brand-cloud hover:border-brand-navy/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${sel ? "text-white" : "text-brand-navy"}`}>
                    {track.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${sel ? "text-blue-200" : "text-slate"}`}>
                    {track.desc}
                  </p>
                </div>
                {sel && <Check className="w-4 h-4 text-white/70 flex-shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-slate mt-3 text-center">
          {tracks.length === 0
            ? "Select one or more tracks above"
            : `${tracks.length} track${tracks.length > 1 ? "s" : ""} selected`}
        </p>
      </div>


      {/* ── INDUSTRY — locked preview ─────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-navy">
            Your industry
            <span className="ml-2 normal-case tracking-normal font-medium text-slate">
              — available in the weekly brief, not included in this sample
            </span>
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-teal-text bg-brand-teal/10 border border-brand-teal/20 px-2 py-0.5 rounded-full">
            ⭐ Subscription
          </span>
        </div>
        <p className="text-[12px] text-slate mb-3">
          Subscribers pick from 31 industries to filter enforcement actions and
          regulatory news to their sector every week.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry}
              aria-disabled="true"
              className="flex items-center gap-1.5 text-left px-3 py-2 rounded-lg border border-brand-cloud bg-white text-[11px] text-slate opacity-60 select-none"
            >
              <Lock className="w-3 h-3 flex-shrink-0 text-slate/70" />
              <span className="truncate">{industry}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-right">
          <a
            href="/subscribe"
            className="text-[11px] font-semibold text-brand-teal-text hover:underline no-underline"
          >
            Unlock industry tailoring with a subscription →
          </a>
        </div>
      </div>

      {/* ── FORMAT — locked preview ────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-navy">
            Report format
            <span className="ml-2 normal-case tracking-normal font-medium text-slate">
              — available in the weekly brief, not included in this sample
            </span>
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-teal-text bg-brand-teal/10 border border-brand-teal/20 px-2 py-0.5 rounded-full">
            ⭐ Subscription
          </span>
        </div>
        <p className="text-[12px] text-slate mb-3">
          Subscribers choose how their brief arrives each Monday — and can
          change it any time.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FORMATS.map((fmt) => (
            <div
              key={fmt.label}
              aria-disabled="true"
              className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-brand-cloud bg-white text-left opacity-60 select-none"
            >
              <p className="text-sm font-semibold text-brand-navy flex items-center gap-1.5">
                <Lock className="w-3 h-3 flex-shrink-0 text-slate/70" />
                {fmt.label}
              </p>
              <p className="text-[11px] text-slate leading-snug">{fmt.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 text-right">
          <a
            href="/subscribe"
            className="text-[11px] font-semibold text-brand-teal-text hover:underline no-underline"
          >
            Unlock format options with a subscription →
          </a>
        </div>
      </div>


      {!briefShown && (
        <div className="text-center mb-2">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => setBriefShown(true)}
            className="px-8 py-3 rounded-xl text-[14px] font-bold bg-brand-navy text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Generate Brief →
          </button>
          {!canGenerate && (
            <p className="text-[12px] text-slate mt-2">
              Select jurisdiction, role, and at least one track to generate
            </p>
          )}
        </div>
      )}

      {briefShown && briefItems.length > 0 && (
        <div className="mt-2">
          <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                ⭐ Your Privacy Intelligence Report
              </span>
              <span className="text-blue-300/60 text-[11px]">
                {briefItems.length} article{briefItems.length > 1 ? "s" : ""} matched to your tracks
              </span>
            </div>
            <p className="text-blue-200/70 text-[12px] leading-relaxed">
              A representative sample showing the format and depth of your Weekly Intelligence Brief — one article
              per selected track, written for{" "}
              {ROLES.find((r) => r.value === role)?.label ?? "your role"} in{" "}
              {JURISDICTIONS.find((j) => j.value === jurisdiction)?.label ?? "your jurisdiction"}.
              {JURISDICTION_FALLBACK_NOTE[jurisdiction] && (
                <span className="block mt-1 text-blue-300/60 text-[11px]">
                  Showing our Global sample — your subscription brief covers{" "}
                  {JURISDICTION_FALLBACK_NOTE[jurisdiction]} specifically.
                </span>
              )}
            </p>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-blue-200/70 text-[11px] leading-relaxed mb-2">
                Translations of your brief are available in these languages as part of your subscription.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "English","French","German","Spanish","Italian","Dutch","Polish","Portuguese",
                  "Swedish","Japanese","Korean","Chinese (Simplified)","Arabic","Turkish","Danish",
                  "Norwegian","Finnish","Czech","Romanian","Greek","Thai","Indonesian","Hindi","Hebrew",
                ].map((lang) => (
                  <span
                    key={lang}
                    aria-disabled="true"
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-blue-100/40 cursor-not-allowed select-none"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {briefItems.map((item) => (
              <div
                key={item.track}
                className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-xl p-5 text-white"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300/80">
                    {item.trackLabel}
                  </span>
                </div>
                <h4 className="font-bold text-white text-[15px] leading-snug mb-3">
                  {item.headline}
                </h4>

                {item.keyTakeaways?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300/80 mb-1.5">
                      Key takeaways
                    </p>
                    <ul className="space-y-1 list-disc list-outside pl-4 text-blue-100/85 text-xs leading-relaxed">
                      {item.keyTakeaways.map((kt, i) => (
                        <li key={i}>
                          <CitedText text={kt} sourceMap={item.sourceMap} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.fullAnalysis && (
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300/80 mb-1.5">
                      Full analysis
                    </p>
                    <p className="text-blue-100/80 text-sm leading-relaxed">
                      <CitedText text={item.fullAnalysis} sourceMap={item.sourceMap} />
                    </p>
                  </div>
                )}

                {item.complianceImpact && (
                  <div className="mb-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300/80 mb-1">
                      Compliance impact
                    </p>
                    <p className="text-white/85 text-xs leading-relaxed">
                      <CitedText text={item.complianceImpact} sourceMap={item.sourceMap} />
                    </p>
                  </div>
                )}

                {item.actionItem && (
                  <div className="bg-white/10 border border-white/15 rounded-lg px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                      <Target aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Your action item
                    </p>
                    <p className="text-white/90 text-sm leading-relaxed">
                      <CitedText text={item.actionItem} sourceMap={item.sourceMap} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 p-5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-center">
            <p className="text-[14px] font-semibold text-brand-navy mb-1">
              This is your brief. Every Monday. Automatically.
            </p>
            <p className="text-sm text-slate mb-4">
              Every article in the real brief reflects that week's actual enforcement actions and regulatory developments — written for your role and jurisdiction.
            </p>
            <a
              href="/get-intelligence"
              className="inline-block text-sm font-bold text-brand-navy bg-amber-400 hover:opacity-90 transition-all px-6 py-2.5 rounded-xl no-underline"
              onClick={(e) => {
                const target = document.getElementById("pro-plan-card");
                if (target) {
                  e.preventDefault();
                  target.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Get your Privacy Intelligence Report →
            </a>
          </div>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setBriefShown(false)}
              className="text-[12px] text-slate hover:text-brand-navy underline underline-offset-2"
            >
              ← Change my selections
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
