import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";
import ProBriefPreview from "@/components/subscribe/ProBriefPreview";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";
import FreeDigestSignup from "@/components/subscribe/FreeDigestSignup";
import UIDebugOverlay from "@/components/UIDebugOverlay";
import SubscribeCheckoutModal from "@/components/SubscribeCheckoutModal";

type CellValue = boolean | string;
type ComparisonRow =
  | { feature: string; free: CellValue; intel: CellValue; platform: CellValue; isSection?: false }
  | { feature: string; isSection: true };

const comparisonRows: ComparisonRow[] = [
  { isSection: true, feature: "The monitoring layer" },
  { feature: "Regulatory developments, monitored daily", free: true, intel: true, platform: true },
  { feature: "Jurisdiction profiles (150+ countries)", free: true, intel: true, platform: true },
  { feature: "Regulator directory (119 authorities)", free: true, intel: true, platform: true },
  { feature: "Research guides (GDPR, AI Act, US laws)", free: true, intel: true, platform: true },
  { feature: "Enforcement tracker — all actions", free: true, intel: true, platform: true },
  { feature: "Personalized weekly digest", free: true, intel: true, platform: true },

  { isSection: true, feature: "The intelligence layer" },
  { feature: "Cross-jurisdiction signals and pattern analysis", free: true, intel: true, platform: true },
  { feature: "Full Intelligence Brief — customized for your industry & jurisdictions", free: false, intel: true, platform: true },
  { feature: "Enforcement trends & pattern signals", free: false, intel: true, platform: true },
  { feature: "Per-article intelligence: regulatory theory, action items, sectors", free: false, intel: true, platform: true },
  { feature: "Priority Monday delivery", free: false, intel: true, platform: true },

  { isSection: true, feature: "The action layer — compliance tools" },
  { feature: "Sample preview of all tools", free: true, intel: true, platform: true },
  { feature: "Governance Assessment", free: false, intel: "$49 per analysis", platform: "Included" },
  { feature: "Legitimate Interest Assessment", free: false, intel: "$79 per analysis", platform: "Included" },
  { feature: "DPIA / Impact Assessment", free: false, intel: "$99 per document", platform: "Included" },
  { feature: "DPA Generator", free: false, intel: "$99 per document", platform: "Included" },
  { feature: "IR Playbook", free: false, intel: "$59 per playbook", platform: "Included" },
  { feature: "Biometric Privacy Checker", free: false, intel: "$49 per assessment", platform: "Included" },
  { feature: "Records of Processing (RoFA)", free: false, intel: "$99 per record set", platform: "Included" },
  { feature: "US Privacy Notice", free: false, intel: "$25 per state / $59 all states", platform: "Included" },
  { feature: "EU & Global Privacy Notice", free: false, intel: "$45 per framework / $149 EU suite", platform: "Included" },
  { feature: "Registration Manager (DPO, ROPA, AI Act filings)", free: false, intel: "Standalone rates", platform: "Included" },

  { isSection: true, feature: "CPPA tools — paid even on Platform" },
  { feature: "CPPA Risk Assessment", free: false, intel: "$159 standalone", platform: "$79 subscriber rate" },
  { feature: "CPPA Cybersecurity Audit", free: false, intel: "$199 standalone", platform: "$99 subscriber rate" },
];

const Subscribe = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const bJurisdiction = searchParams.get("j");
  const bIndustry = searchParams.get("i");
  const bTopics = searchParams.get("t") ? searchParams.get("t")!.split(",").filter(Boolean) : [];
  const fromBuilder = !!bJurisdiction;
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutInterval, setCheckoutInterval] = useState<"month" | "year">("month");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [foundingStatus, setFoundingStatus] = useState<{
    remainingSlots: number;
    isAvailable: boolean;
    usedSlots: number;
  } | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke("get-founding-status")
      .then(({ data }) => {
        if (data && typeof data.remainingSlots === "number") setFoundingStatus(data);
      })
      .catch(() => setFoundingStatus({ remainingSlots: 500, isAvailable: true, usedSlots: 0 }));
  }, []);

  const toggleTrack = (label: string) =>
    setSelectedTracks((prev) => (prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]));

  const startCheckout = async (interval: "month" | "year") => {
    if (!user) {
      navigate(`/signup?redirect=/subscribe`);
      return;
    }
    setLoading(interval);
    setError(null);
    try {
      setCheckoutInterval(interval);
      setCheckoutOpen(true);
      setLoading(null);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  const handleCheckoutComplete = () => {
    setCheckoutOpen(false);
    navigate("/account?subscribed=1");
  };

  const platformHeadlinePrice = foundingStatus?.isAvailable
    ? PLATFORM_PRICING.foundingMonthly()
    : PLATFORM_PRICING.standardMonthly();
  const platformAnnualPrice = foundingStatus?.isAvailable
    ? PLATFORM_PRICING.founding()
    : PLATFORM_PRICING.standard();

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>{`Two products. One mission. — ${INTELLIGENCE_PRICING.monthly()} or ${PLATFORM_PRICING.standard()}/yr | End User Privacy`}</title>
        <meta
          name="description"
          content={`Intelligence Feed at ${INTELLIGENCE_PRICING.monthly()} or the Compliance Platform at ${PLATFORM_PRICING.founding()} (founding) / ${PLATFORM_PRICING.standard()}/yr. All compliance tools included on Platform.`}
        />
      </Helmet>
      <Navbar />

      {/* Two-product hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[800px] mx-auto text-center">
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-4 leading-tight">
            Two products. One mission.
          </h1>
          <p className="text-[15px] text-slate-light max-w-[600px] mx-auto leading-relaxed mb-10">
            Stay informed with Intelligence for {INTELLIGENCE_PRICING.monthly()}.
            Run your compliance program with Platform for {PLATFORM_PRICING.founding()} (founding)
            or {PLATFORM_PRICING.standard()}/yr.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[760px] mx-auto text-left">
            {/* Intelligence Feed card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky mb-2">
                Intelligence Feed
              </p>
              <div className="text-white font-display font-bold text-[36px] leading-none mb-1">
                {INTELLIGENCE_PRICING.monthlyShort()}
              </div>
              <p className="text-blue-200 text-[12px] mb-4">Cancel any time</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Weekly Intelligence Brief",
                  "Enforcement tracking — all 119 authorities",
                  "Jurisdiction monitoring",
                  "All reference content",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                    <span className="text-sky font-bold">✓</span> {item}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-[13px] text-blue-300">
                  <span className="text-blue-400 font-bold">—</span> Compliance tools not included
                </li>
              </ul>
              <button
                onClick={() => startCheckout("month")}
                disabled={!!loading}
                className="w-full py-3 rounded-xl text-[13px] font-bold bg-white text-navy hover:opacity-90 disabled:opacity-50"
              >
                Start for {INTELLIGENCE_PRICING.monthlyShort()} →
              </button>
            </div>

            {/* Compliance Platform card */}
            <div className="bg-amber-400/10 border-2 border-amber-400/60 rounded-2xl p-6 relative">
              {foundingStatus?.isAvailable && (
                <div className="absolute -top-3 right-5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Founding Rate
                </div>
              )}
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2">
                Compliance Platform
              </p>
              <div className="text-white font-display font-bold text-[36px] leading-none mb-1">
                {platformHeadlinePrice}
                <span className="text-lg font-normal text-blue-200">/mo</span>
              </div>
              <p className="text-blue-200 text-[12px] mb-1">
                Billed {platformAnnualPrice} annually
              </p>
              {foundingStatus?.isAvailable && (
                <p className="text-amber-300 text-[11px] font-semibold mb-4">
                  ⚡ {foundingStatus.remainingSlots} founding slots remaining of 500
                </p>
              )}
              <ul className="space-y-2 mb-6">
                {[
                  "Everything in Intelligence Feed",
                  "ALL compliance tools — included",
                  "Governance, LIA, DPIA, DPA, Notices, RoFA",
                  "IR Playbook & Biometric Checker",
                  "Your documents saved permanently",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                    <span className="text-amber-400 font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => startCheckout("year")}
                disabled={!!loading}
                className="w-full py-3 rounded-xl text-[13px] font-bold bg-amber-400 text-navy hover:opacity-90 disabled:opacity-50"
              >
                Start Platform — {platformAnnualPrice} →
              </button>
            </div>
          </div>
          {error && <p className="text-red-300 text-[12px] mt-4">{error}</p>}
          {isPremium && (
            <p className="text-blue-200 text-[12px] mt-4">
              You're already subscribed. <Link to="/account" className="underline">Manage your subscription →</Link>
            </p>
          )}
        </div>
      </div>

      {/* Registration Manager mention */}
      <div className="bg-white border-b border-fog py-4 px-4">
        <div className="max-w-[720px] mx-auto text-center text-[13px] text-slate">
          Need DPO appointments, ROPAs, or AI Act registrations filed?{" "}
          <Link
            to="/registration-manager"
            className="text-navy font-semibold underline underline-offset-2 hover:text-navy-mid"
          >
            Try Your Registration Filings →
          </Link>{" "}
          <span className="text-slate-light">— included on Platform; standalone rates on Intelligence.</span>
        </div>
      </div>

      {fromBuilder && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-green-600 text-[18px] flex-shrink-0 mt-0.5">✓</span>
            <div>
              <p className="font-bold text-navy text-[14px] mb-0.5">
                Your Intelligence Report is configured and ready.
              </p>
              <p className="text-[13px] text-slate">
                {[bJurisdiction, bIndustry, ...bTopics.slice(0, 2)].filter(Boolean).join(" · ")}. Subscribe to receive it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Intelligence Brief Preview */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <p className="text-[12px] text-slate mb-4 uppercase tracking-wider font-semibold">
            Trusted by privacy professionals
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-[13px] text-slate">
            <span className="text-navy font-bold">DPOs</span>
            <span className="text-fog">·</span>
            <span className="text-navy font-bold">Privacy Counsel</span>
            <span className="text-fog">·</span>
            <span className="text-navy font-bold">Compliance Leads</span>
            <span className="text-fog">·</span>
            <span className="text-navy font-bold">CPOs</span>
            <span className="text-fog">·</span>
            <span className="text-navy font-bold">Privacy Consultants</span>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">
            See what your brief would look like this week
          </h2>
          <p className="text-slate text-[13px]">
            Pick your sector and region. We'll show you what your Monday brief would have opened with.
          </p>
        </div>
        <ProBriefPreview />
      </div>

      {/* Report Tracks */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-fog">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">What do you want covered?</h2>
          <p className="text-slate text-[13px] max-w-lg mx-auto">
            Select the areas most relevant to your work. Your brief covers all selected tracks every Monday.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
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
                  sel ? "bg-navy border-navy shadow-eup-sm" : "bg-white border-fog hover:border-navy/40"
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{track.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${sel ? "text-white" : "text-navy"}`}>
                    {track.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${sel ? "text-blue-200" : "text-slate"}`}>
                    {track.desc}
                  </p>
                </div>
                {sel && <span className="text-xs text-white/70 flex-shrink-0 mt-0.5">✓</span>}
              </button>
            );
          })}
        </div>
        <p className="text-center text-slate text-[12px] mt-4 max-w-lg mx-auto leading-relaxed">
          Each track is included with both Intelligence Feed and Compliance Platform. Your brief synthesizes all selected tracks into one weekly issue.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Three-column comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">Free vs. Intelligence vs. Platform</h2>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate">
                      Feature
                    </th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-slate w-[110px]">
                      Free
                    </th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-sky w-[170px]">
                      Intelligence ({INTELLIGENCE_PRICING.monthlyShort()})
                    </th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-amber-600 w-[200px]">
                      Platform ({PLATFORM_PRICING.founding()}–{PLATFORM_PRICING.standard()}/yr)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => {
                    if ("isSection" in row && row.isSection) {
                      return (
                        <tr key={i} className="bg-navy/5">
                          <td
                            colSpan={4}
                            className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-navy/60 border-t border-fog"
                          >
                            {row.feature}
                          </td>
                        </tr>
                      );
                    }
                    const renderCell = (val: CellValue, color: "free" | "intel" | "platform") => {
                      if (val === true) {
                        const cls =
                          color === "platform"
                            ? "text-amber-500"
                            : color === "intel"
                              ? "text-sky"
                              : "text-accent";
                        return <Check className={`w-4 h-4 ${cls} mx-auto`} />;
                      }
                      if (val === false) return <XIcon className="w-4 h-4 text-slate-light mx-auto" />;
                      if (val === "Included") {
                        return <span className="text-[11px] font-semibold text-green-600">Included</span>;
                      }
                      const cls = color === "platform" ? "text-amber-700" : "text-slate";
                      return <span className={`text-[11px] font-medium ${cls}`}>{val}</span>;
                    };
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                        <td className="px-5 py-3 text-[13px] text-navy border-t border-fog">{row.feature}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(row.free, "free")}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(row.intel, "intel")}</td>
                        <td className="px-5 py-3 text-center border-t border-fog">{renderCell(row.platform, "platform")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-blue bg-blue/5">
                    End User Privacy
                  </th>
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">
                    DataGuidance (OneTrust)
                  </th>
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">IAPP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price", `${INTELLIGENCE_PRICING.monthly()} or ${PLATFORM_PRICING.standard()}/yr`, "$300–$3,500+/year", "$550+/year"],
                  ["Format", "Weekly intelligence brief + tools", "Research database", "Membership + events"],
                  ["Focus", "Privacy & AI regulation only", "Broad legal coverage", "Credentialing & community"],
                  ["Update frequency", "Daily monitoring, Monday brief", "Periodic updates", "Weekly to monthly"],
                  ["Learning curve", "Ready in 5 minutes", "Weeks of onboarding", "Conference-based"],
                ].map(([label, us, dg, iapp], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                    <td className="px-5 py-3 text-navy font-medium border-t border-fog">{label}</td>
                    <td className="px-5 py-3 text-center text-navy font-medium border-t border-fog">
                      <span className="text-accent mr-1">✓</span>
                      {us}
                    </td>
                    <td className="px-5 py-3 text-center text-slate border-t border-fog">{dg}</td>
                    <td className="px-5 py-3 text-center text-slate border-t border-fog">{iapp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-center text-warn text-[13px] mt-6">{error}</p>}

        {/* Free digest signup */}
        <FreeDigestSignup source="website" className="mt-10" />

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground py-3 border-t border-border mt-8">
          <span>✓ Cancel anytime</span>
          <span>✓ Secure payment via Stripe</span>
          <span>✓ No ads for subscribers</span>
        </div>
      </div>
      <Footer />
      <UIDebugOverlay label="Subscribe UI debug" />
      <SubscribeCheckoutModal
        open={checkoutOpen}
        interval={checkoutInterval}
        onClose={() => setCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
    </div>
  );
};

export default Subscribe;
