import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";
import ProBriefPreview from "@/components/subscribe/ProBriefPreview";

type ComparisonRow =
  | { feature: string; free: boolean; pro: boolean; isSection?: false }
  | { feature: string; free: string;  pro: string;  isSection?: false }
  | { feature: string; isSection: true };

const comparisonRows: ComparisonRow[] = [
  { feature: "Daily privacy news feed",                              free: true,                  pro: true  },
  { feature: "Jurisdiction profiles (150+ countries)",               free: true,                  pro: true  },
  { feature: "Regulator directory (119 authorities)",                free: true,                  pro: true  },
  { feature: "Research guides (GDPR, AI Act, US laws)",              free: true,                  pro: true  },
  { feature: "Enforcement tracker — all actions",                    free: true,                  pro: true  },
  { feature: "Personalized weekly digest (your regions & topics)",   free: true,                  pro: true  },
  { feature: "Cross-jurisdiction pattern observation",               free: true,                  pro: true  },

  { isSection: true, feature: "Intelligence Brief" },
  { feature: "Full 8-section weekly Intelligence Brief",             free: false,                 pro: true  },
  { feature: "Enforcement trends & pattern signals",                 free: false,                 pro: true  },
  { feature: "Why This Matters — full article analysis",             free: false,                 pro: true  },
  { feature: "Brief written for your industry & jurisdictions",      free: false,                 pro: true  },
  { feature: "Jurisdiction & subject-matter depth focus",            free: false,                 pro: true  },
  { feature: "Historical continuity across weekly issues",           free: false,                 pro: true  },
  { feature: "Priority Monday delivery",                             free: false,                 pro: true  },

  { isSection: true, feature: "Assessment Tools" },
  { feature: "Sample preview of all tools",                          free: true,                  pro: true  },
  { feature: "Data Privacy Healthcheck",                             free: "$29 per analysis",    pro: "$15 per analysis"   },
  { feature: "Legitimate Interest Assessment Tool",                         free: "$39 per analysis",    pro: "$19 per analysis"   },
  { feature: "DPIA Builder",                                         free: "$69 per document",    pro: "$39 per document"   },
  { feature: "Custom Data Protection Agreement",                     free: "$69 per document",    pro: "$39 per document"   },
  { feature: "Incident Response Playbook Generator",                 free: "$39 per playbook",    pro: "Included free"      },
  { feature: "Biometric Privacy Compliance Checker",                 free: "1 jurisdiction free", pro: "Included free"      },
];

// Note: Compliance framework tools (LI Analyzer, Healthcheck, DPIA Builder)
// are NOT included with Premium. They are sold as standalone reports.

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const bJurisdiction = searchParams.get("j");
  const bIndustry = searchParams.get("i");
  const bTopics = searchParams.get("t") ? searchParams.get("t")!.split(",").filter(Boolean) : [];
  const fromBuilder = !!bJurisdiction;
  const [error, setError] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const toggleTrack = (label: string) => setSelectedTracks(prev => prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]);

  const startCheckout = async (plan: "pro" | "annual") => {
    if (!user) {
      navigate(`/signup?redirect=/subscribe`);
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const body =
        plan === "annual"
          ? { plan: "annual", interval: "year" as const }
          : { plan: "pro" };
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        { body }
      );
      if (fnError) { setError(fnError.message || "Something went wrong"); setLoading(null); return; }
      if (data?.url) { window.location.href = data.url; }
      else if (data?.error) { setError(data.error); setLoading(null); }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  const handleSubscribe = () => startCheckout("pro");

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Intelligence Brief — $20/month | EndUserPrivacy</title>
        <meta name="description" content="The weekly privacy Intelligence Brief, re-written for your industry and jurisdictions every Monday. $20/month. Browse everything free." />
      </Helmet>
      <Navbar />

      {/* Navy gradient hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[720px] mx-auto text-center">
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-4 leading-tight">
            The library is free.<br />Intelligence is $20/month.
          </h1>
          <p className="text-[15px] md:text-base text-slate-light max-w-[600px] mx-auto leading-relaxed">
            Everything you can browse is always free. Free accounts also include a personalized
            weekly digest — filtered to your regions and topics. Premium adds the Intelligence Brief:
            re-analyzed every Monday specifically for your industry, your jurisdictions, and your
            compliance priorities. $20/month.
          </p>
        </div>
      </div>

      {/* Founding offer banner */}
      <div className="bg-amber-50 border-y border-amber-200 py-4 px-4">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-amber-800 font-semibold text-[14px]">
            🎁 Founding offer: First 25 subscribers get Premium free for one year, then $20/month.
          </p>
        </div>
      </div>

      {fromBuilder && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4
            flex items-start gap-3">
            <span className="text-green-600 text-[18px] flex-shrink-0 mt-0.5">✓</span>
            <div>
              <p className="font-bold text-navy text-[14px] mb-0.5">
                Your Intelligence Report is configured and ready.
              </p>
              <p className="text-[13px] text-slate">
                {[bJurisdiction, bIndustry, ...bTopics.slice(0, 2)]
                  .filter(Boolean).join(" · ")}.
                {" "}Subscribe to receive it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Pro Brief Preview */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Social proof bar */}
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <p className="text-[12px] text-slate mb-4 uppercase tracking-wider font-semibold">
            Trusted by privacy professionals
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-[13px] text-slate">
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">DPOs</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Privacy Counsel</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Compliance Leads</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">CPOs</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Privacy Consultants</span>
            </span>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">
            See what your brief would look like this week
          </h2>
          <p className="text-slate text-[13px]">
            Pick your sector and region. We'll show you what your Monday brief
            would have opened with.
          </p>
        </div>
        <ProBriefPreview />
      </div>

      {/* Report Tracks */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-fog">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">
            What do you want covered?
          </h2>
          <p className="text-slate text-[13px] max-w-lg mx-auto">
            Select the areas most relevant to your work. Your brief covers all selected tracks every Monday.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: "🗺️", label: "US State Privacy Laws", desc: "New state laws, AG enforcement, CPPA actions, and compliance deadlines across all 50 states" },
            { icon: "🇪🇺", label: "GDPR Enforcement & DPA Activity", desc: "DPA fines, EDPB binding decisions, cross-border enforcement, and legal precedent" },
            { icon: "🤖", label: "EU AI Act Compliance", desc: "AI Act implementation phases, GPAI code updates, prohibited AI, and GDPR intersection" },
            { icon: "👶", label: "Children's Privacy & Age Verification", desc: "COPPA enforcement, KOSA developments, UK AADC, and platform-specific obligations" },
            { icon: "🍪", label: "AdTech, Consent & Cookie Compliance", desc: "TCF updates, cookie enforcement actions, Privacy Sandbox changes, FTC surveillance rules" },
            { icon: "🔀", label: "Cross-Border Data Transfers", desc: "DPF status, SCC updates, LGPD transfers, APAC mechanisms, and Schrems litigation" },
            { icon: "🏥", label: "Health & Medical Data Privacy", desc: "HIPAA enforcement, FTC health data actions, state health laws, and health AI obligations" },
            { icon: "🏛️", label: "Privacy Litigation & Class Actions", desc: "BIPA filings, VPPA cases, CIPA wiretap suits, MDL proceedings, settlement watch" },
            { icon: "👁️", label: "Biometric Data Privacy", desc: "BIPA class action tracker, state biometric laws, AI Act biometric provisions" },
            { icon: "🔓", label: "Data Breach & Incident Response", desc: "Breach notification law changes, SEC disclosure rules, enforcement for late reporting" },
          ].map((track) => {
            const sel = selectedTracks.includes(track.label);
            return (
              <button
                key={track.label}
                type="button"
                onClick={() => toggleTrack(track.label)}
                className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-left w-full transition-all cursor-pointer ${
                  sel
                    ? "bg-navy border-navy shadow-eup-sm"
                    : "bg-white border-fog hover:border-navy/40"
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{track.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${sel ? "text-white" : "text-navy"}`}>{track.label}</p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${sel ? "text-blue-200" : "text-slate"}`}>{track.desc}</p>
                </div>
                {sel && <span className="text-xs text-white/70 flex-shrink-0 mt-0.5">✓</span>}
              </button>
            );
          })}
        </div>
        <p className="text-center text-slate text-[12px] mt-4 max-w-lg mx-auto leading-relaxed">
          Each track is included in your $20/month Premium subscription. Select as many as you need — your Intelligence brief synthesizes all selected tracks into one weekly brief.
        </p>
        <div className="text-center mt-6">
          <button
            onClick={handleSubscribe}
            disabled={!!loading}
            className="bg-navy text-white font-bold text-[14px] py-3 px-10 rounded-xl hover:opacity-90 transition-all"
          >
            {loading ? "Redirecting…" : "Get Premium — all 10 tracks included →"}
          </button>
        </div>
      </div>

      {/* Sample Brief Preview */}
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-navy text-2xl mb-2">
            What does the Intelligence Brief look like?
          </h2>
          <p className="text-slate text-sm">
            Premium subscribers receive this 8-section analysis every Monday.
            Here is a representative sample from Week 11, 2026.
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {/* Executive Summary preview */}
          <div className="bg-card border border-fog rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                ⭐ PREMIUM
              </span>
              <span className="text-[10px] text-slate-light uppercase tracking-wider">Executive Summary</span>
            </div>
            <p className="text-[13px] text-slate leading-relaxed line-clamp-3">
              This week's dominant regulatory theme is enforcement convergence: three separate
              authorities — the UK ICO, Texas AG, and EU EDPB — each took significant action
              within the same seven-day window, signaling accelerating enforcement activity
              across all major jurisdictions simultaneously.
            </p>
          </div>

          {/* Enforcement Table preview */}
          <div className="bg-card border border-fog rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                ⭐ PREMIUM
              </span>
              <span className="text-[10px] text-slate-light uppercase tracking-wider">Enforcement Table</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-fog text-[10px] uppercase tracking-wider text-slate">
                    <th className="pb-2 pr-3 text-left font-semibold">Regulator</th>
                    <th className="pb-2 pr-3 text-left font-semibold">Company</th>
                    <th className="pb-2 pr-3 text-left font-semibold">Fine</th>
                    <th className="pb-2 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { reg: "ICO (UK)", co: "TikTok Ltd", fine: "£12.7M", date: "Mar 3" },
                    { reg: "Texas AG", co: "DataConnect Inc", fine: "$14.2M", date: "Mar 9" },
                    { reg: "CNIL (France)", co: "Clearview AI", fine: "€20M", date: "Mar 8" },
                  ].map((r, i) => (
                    <tr key={i} className="border-b border-fog/50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-navy">{r.reg}</td>
                      <td className="py-2 pr-3 text-slate">{r.co}</td>
                      <td className="py-2 pr-3 font-semibold text-navy">{r.fine}</td>
                      <td className="py-2 text-slate">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-light italic">+ 4 more enforcement actions in the full brief</span>
            </div>
          </div>

          {/* Pro preview — full 9-section abbreviated preview */}
          <div className="bg-gradient-to-br from-navy to-steel rounded-xl p-6 border border-amber-400/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5">
                ⭐ Pro Brief Preview
              </span>
              <span className="text-[10px] text-blue-200 uppercase tracking-wider">
                Your Personalized Brief — Healthcare in EU & UK
              </span>
            </div>

            <div className="space-y-4">
              {/* Critical Alert */}
              <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-300 mb-1">⚡ Critical Alert</p>
                <p className="text-[13px] text-white leading-relaxed">
                  Healthcare processors using SCC Module 2 must review Clause 8.2(b) against the EDPB pseudonymization standard before your next DPA audit.
                </p>
              </div>

              {/* Your Week */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">Your Week</p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  For healthcare professionals operating in EU & UK, this week's dominant theme is enforcement convergence across biometric data processing in clinical settings…
                </p>
              </div>

              {/* Industry Intelligence */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">Industry Intelligence</p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  The ICO's TikTok ruling extends beyond social media — the legitimate interests prohibition for algorithmic personalization of minors directly applies to pediatric health app recommendation engines…
                </p>
              </div>

              {/* Your Jurisdictions */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">Your Jurisdictions</p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  CNIL issued updated guidance on health data processing under the ePrivacy Directive, with implications for telehealth cookie consent flows…
                </p>
              </div>

              {/* Topic Focus */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">Topic Focus</p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  EDPB Opinion 05/2026 establishes new standards for pseudonymization in AI training datasets derived from patient records…
                </p>
              </div>

              {/* What to Ignore */}
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-light mb-1">❌ What to Ignore This Week</p>
                <p className="text-[12px] text-blue-200/60 leading-relaxed">
                  The California AG's adtech enforcement action targets cookie consent — not relevant to healthcare HIPAA-covered entities.
                </p>
              </div>

              {/* Action Items */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-2">🎯 Action Items</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-400/20 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">Immediate</span>
                    <p className="text-[12px] text-white">Audit pediatric portal personalization against the ICO standard before Q2 engagement.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">This Quarter</span>
                    <p className="text-[12px] text-white">Review SCC Clause 8.2(b) for EU-US patient data transfer mechanisms.</p>
                  </div>
                </div>
              </div>

              {/* Enforcement Patterns */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">Enforcement Patterns</p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  Healthcare sector fines increased 340% YoY across EU DPAs, with CNIL and Garante leading enforcement…
                </p>
              </div>

              {/* Look Ahead */}
              <div className="bg-amber-400/10 border border-amber-400/15 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">📆 30-90 Day Horizon</p>
                <p className="text-[12px] text-amber-100 leading-relaxed">
                  EDPB will finalize health data AI guidance by May 15. California ADMT rules take effect April 1 — prepare patient portal consent flows.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-blue-200/50 mt-4 text-center italic">
              Each section is 200-300 words in the full brief, personalized for your industry and jurisdiction. Full brief: ~1,500 words delivered every Monday before 8am.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/sample-brief"
            className="text-blue font-semibold text-sm no-underline hover:text-navy transition-colors"
          >
            Read the full sample brief →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">Free vs. Pro</h2>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate">Feature</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-slate w-[120px]">
                      Free
                    </th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-amber-600 w-[140px]">
                      Premium ($20/mo or $180/yr)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => {
                    if ('isSection' in row && row.isSection) {
                      return (
                        <tr key={i} className="bg-navy/5">
                          <td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-navy/60 border-t border-fog">
                            {row.feature}
                          </td>
                        </tr>
                      );
                    }

                    const dataRow = row as Exclude<ComparisonRow, { isSection: true }>;

                    const renderFree = () => {
                      if (dataRow.free === true)  return <Check className="w-4 h-4 text-accent mx-auto" />;
                      if (dataRow.free === false) return <XIcon className="w-4 h-4 text-slate-light mx-auto" />;
                      return <span className="text-[11px] font-medium text-slate">{dataRow.free}</span>;
                    };

                    const renderPro = () => {
                      if (dataRow.pro === true)            return <Check className="w-4 h-4 text-amber-500 mx-auto" />;
                      if (dataRow.pro === false)           return <XIcon className="w-4 h-4 text-slate-light mx-auto" />;
                      if (dataRow.pro === "Included free") return <span className="text-[11px] font-semibold text-green-600">Included free</span>;
                      return <span className="text-[11px] font-semibold text-amber-600">{dataRow.pro}</span>;
                    };

                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                        <td className="px-5 py-3 text-[13px] text-navy border-t border-fog">{row.feature}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderFree()}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderPro()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* What's the difference? */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">What's the difference?</h2>

          {/* Standard vs Pro comparison */}
          <div className="max-w-4xl mx-auto mb-8">
            <h3 className="font-display font-bold text-navy text-[16px] text-center mb-5">
              Same story. Different brief.
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard */}
              <div className="bg-card border border-fog rounded-2xl p-5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate mb-3">
                  ✓ Free digest
                </div>
                <p className="text-[12px] font-semibold text-navy mb-2 leading-snug">
                  ICO fines TikTok £12.7M for children's data violations
                </p>
                <p className="text-[12px] text-slate leading-relaxed">
                  The ICO issued a £12.7M fine against TikTok Ltd for processing
                  the personal data of children under 13 without appropriate consent.
                  The case establishes that algorithmic personalization for minors
                  cannot rely on legitimate interests as a lawful basis.
                </p>
                <p className="text-[11px] text-slate-light mt-3 italic">
                  Action: Review children's data practices against the ICO standard.
                </p>
              </div>

              {/* Pro — Healthcare */}
              <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-3">
                  ⭐ Premium brief — Healthcare sector
                </div>
                <p className="text-[12px] font-semibold text-white mb-2 leading-snug">
                  ICO children's data ruling: direct implications for pediatric health platforms
                </p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  The ICO's TikTok ruling extends beyond social media. The legitimate interests
                  prohibition for algorithmic personalization of minors directly applies to
                  pediatric health app recommendation engines and patient portal personalization
                  for users under 13. If your platform serves or may serve users under 18,
                  your consent mechanisms and personalization logic need immediate review.
                </p>
                <p className="text-[11px] text-amber-300 mt-3">
                  Action: Audit pediatric portal personalization against the ICO standard
                  before your next ICO engagement. COPPA implications are also in play
                  for US-facing services.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-fog border border-silver rounded-2xl p-6">
              <p className="font-display text-[18px] text-navy font-bold mb-1">Free — Always</p>
              <p className="text-[12px] text-slate mb-4">No account required for browsing. Free account for saved features.</p>
              <ul className="space-y-2.5">
                {[
                  "Daily privacy news from 119 regulators",
                  "Personalized weekly digest — your regions and topics",
                  "150+ jurisdiction profiles",
                  "Enforcement tracker",
                  "Research guides (GDPR, AI Act, US laws)",
                  "Global privacy law map",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-navy">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-accent font-semibold mt-4">Always free →</p>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6">
              <p className="font-display text-[18px] text-white font-bold mb-1">⭐ Premium — $20/month</p>
              <p className="text-[12px] text-sky mb-4">Intelligence. Written for your world.</p>
              <ul className="space-y-2.5">
                {[
                  "Everything in Free",
                  "Brief re-analyzed for your industry",
                  "Your jurisdiction focus: EU, US, APAC, or custom",
                  "Subject-matter depth: AI, biometric, litigation…",
                  "Sector-specific GC/CPO action items",
                  "Priority Monday delivery",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                    <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-amber-400 font-semibold mt-4">$20/month →</p>
            </div>
          </div>
        </div>

        {/* How we compare */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-2">How we compare</h2>
          <p className="text-[14px] text-navy text-center font-semibold mb-6">
            DataGuidance (OneTrust) charges enterprise rates for features you access here free.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-card border border-fog rounded-2xl overflow-hidden text-[13px]">
              <thead>
                <tr className="bg-fog">
                  <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate" />
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-blue bg-blue/5">EndUserPrivacy</th>
                   <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">DataGuidance (OneTrust)</th>
                   <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">IAPP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price", "$20/month", "$300–$3,500+/year", "$550+/year"],
                  ["Format", "Weekly AI intelligence brief", "Research database", "Membership + events"],
                  ["Focus", "Privacy & AI regulation only", "Broad legal coverage", "Credentialing & community"],
                  ["Update frequency", "Daily monitoring, Monday brief", "Periodic updates", "Weekly to monthly"],
                  ["Learning curve", "Ready in 5 minutes", "Weeks of onboarding", "Conference-based"],
                ].map(([label, us, dg, iapp], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                    <td className="px-5 py-3 text-navy font-medium border-t border-fog">{label}</td>
                    <td className="px-5 py-3 text-center text-navy font-medium border-t border-fog">
                      <span className="text-accent mr-1">✓</span>{us}
                    </td>
                    <td className="px-5 py-3 text-center text-slate border-t border-fog">{dg}</td>
                    <td className="px-5 py-3 text-center text-slate border-t border-fog">{iapp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Two-plan layout: Monthly + Annual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Monthly */}
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-7 border border-blue/40 relative flex flex-col">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky mb-2">
              ⭐ Premium Monthly
            </div>
            <div className="text-white font-display font-bold text-[40px] leading-none mb-4">
              $20<span className="text-lg font-normal text-blue-200">/month</span>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "Weekly Intelligence Brief — curated for privacy professionals",
                "Full article feed with AI enrichment",
                "Why It Matters analysis on every article",
                "Subscriber pricing on all assessment tools",
                "Cancel any time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout("pro")}
              disabled={loading !== null}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-white text-navy shadow-eup-md hover:opacity-90 disabled:opacity-50"
            >
              {loading === "pro" ? "Redirecting…" : "Start Monthly Plan"}
            </button>
          </div>

          {/* Annual */}
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-7 border-2 border-amber-400/60 relative flex flex-col">
            <div className="absolute -top-3 right-5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Best Value
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2">
              ⭐ Premium Annual
            </div>
            <div className="text-white font-display font-bold text-[40px] leading-none mb-1">
              $180<span className="text-lg font-normal text-blue-200">/year</span>
            </div>
            <p className="text-blue-200 text-[12px] mb-4">
              $15/month — save $60 vs monthly
            </p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "2 months free vs. monthly billing",
                "Weekly Intelligence Brief — curated for privacy professionals",
                "Full article feed with AI enrichment",
                "Why It Matters analysis on every article",
                "Subscriber pricing on all assessment tools",
                "Cancel any time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout("annual")}
              disabled={loading !== null}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-amber-400 text-navy shadow-eup-md hover:opacity-90 disabled:opacity-50"
            >
              {loading === "annual" ? "Redirecting…" : "Start Annual Plan"}
            </button>
          </div>
        </div>

        {/* Founding offer */}
        <div className="max-w-3xl mx-auto mt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-center">
            <p className="text-[13px] text-amber-800">
              🎁 <strong>Founding offer:</strong> First 25 subscribers get Premium free for one year, then your chosen plan price.
            </p>
          </div>
        </div>

        {/* Subscriber Pricing on All Tools */}
        <div className="max-w-3xl mx-auto mt-12">
          <h3 className="font-display text-[20px] text-navy text-center mb-5">
            Subscriber Pricing on All Tools
          </h3>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-fog">
                  <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-slate font-semibold">Tool</th>
                  <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-slate font-semibold">Standalone</th>
                  <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-amber-600 font-semibold">Subscriber</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Data Privacy Healthcheck", "$29", "$15"],
                  ["Legitimate Interest Assessment Tool", "$39", "$19"],
                  ["DPIA Builder", "$69", "$39"],
                ].map(([tool, std, sub]) => (
                  <tr key={tool} className="border-t border-fog">
                    <td className="px-5 py-3 text-navy font-medium">{tool}</td>
                    <td className="px-5 py-3 text-slate">{std} per analysis</td>
                    <td className="px-5 py-3 text-navy font-semibold">{sub} per analysis</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-[12px] text-slate-light mt-3 italic">
            One Healthcheck + one LI Analyzer as a subscriber saves you more than one month's subscription cost.
          </p>
        </div>

        {error && (
          <p className="text-center text-warn text-[13px] mt-6">
            {error}
          </p>
        )}

        {/* Footer note */}
        <p className="text-center text-[12px] text-slate-light mt-8">
          Cancel anytime · Secure checkout via Stripe · Questions? Contact us
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Subscribe;
