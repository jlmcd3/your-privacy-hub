import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon, ArrowRight, ShieldCheck } from "lucide-react";
import BriefBuilder from "@/components/subscribe/BriefBuilder";
import {
  PRICING,
  INTELLIGENCE_ANNUAL_FREE_RUN_VALUE_DISPLAY,
  PROFESSIONAL_ANNUAL_FREE_RUN_VALUE_DISPLAY,
  SMART_TOOL_LIA_DPIA_DISCOUNT_DISPLAY,
  SMART_TOOL_GOVERNANCE_DISCOUNT_DISPLAY,
  CPPA_SUBSCRIBER_DISCOUNT_RANGE_DISPLAY,
} from "@/config/pricing";
import FreeDigestSignup from "@/components/subscribe/FreeDigestSignup";
import UIDebugOverlay from "@/components/UIDebugOverlay";
// Lazy — only pulls @stripe/stripe-js when the user opens checkout.
const SubscribeCheckoutModal = lazy(() => import("@/components/SubscribeCheckoutModal"));

type CellValue = boolean | string;
type ComparisonRow =
  | { feature: string; free: CellValue; intel: CellValue; platform: CellValue; isSection?: false }
  | { feature: string; isSection: true };

const T = PRICING.tools;
const comparisonRows: ComparisonRow[] = [
  { isSection: true, feature: "The monitoring layer" },
  { feature: "Regulatory developments, monitored daily", free: true, intel: true, platform: true },
  { feature: "Jurisdiction profiles (worldwide)", free: true, intel: true, platform: true },
  { feature: "Regulator directory", free: true, intel: true, platform: true },
  { feature: "Research guides (GDPR, AI Act, US laws)", free: true, intel: true, platform: true },
  { feature: "Enforcement tracker: all actions", free: true, intel: true, platform: true },
  { feature: "Personalized weekly digest", free: true, intel: true, platform: true },

  { isSection: true, feature: "The intelligence layer" },
  { feature: "Cross-jurisdiction signals and pattern analysis", free: true, intel: true, platform: true },
  { feature: "Full Privacy Intelligence Report, customized for your industry & jurisdictions", free: false, intel: true, platform: true },
  { feature: "Enforcement trends & pattern signals", free: false, intel: true, platform: true },
  { feature: "Per-article intelligence: regulatory theory, action items, sectors", free: false, intel: true, platform: true },
  { feature: "AI investigation prompt (pre-loaded with regulatory context, ready to paste into any AI assistant)", free: false, intel: true, platform: true },
  { feature: "Priority Monday delivery", free: false, intel: true, platform: true },

  { isSection: true, feature: "The action layer: compliance tools with cited enforcement evidence" },
  { feature: "Sample preview of all tools", free: true, intel: true, platform: true },
  { feature: "Includes 4 generations per report: your initial report plus up to 3 revisions at no extra cost", free: true, intel: true, platform: true },
  { feature: "Governance Assessment (Smart Tool)", free: false, intel: T.governance.display, platform: T.governance.display },
  { feature: "Legitimate Interest Assessment (Smart Tool)", free: false, intel: T.lia.display, platform: T.lia.display },
  { feature: "DPIA / Impact Assessment (Smart Tool)", free: false, intel: T.dpia.display, platform: T.dpia.display },
  { feature: "DPA Generator (Smart Tool)", free: false, intel: T.dpa.display, platform: T.dpa.display },
  { feature: "IR Playbook (Convenience)", free: false, intel: T.ir_playbook.display, platform: T.ir_playbook.display },
  { feature: "Biometric Privacy Checker (Smart Tool)", free: false, intel: T.biometric.display, platform: T.biometric.display },
  { feature: "Records of Processing (RoPA), subscriber-only", free: "—", intel: "Included", platform: "Included" },
  { feature: "US Privacy Notice Builder, subscriber-only", free: "—", intel: "Included", platform: "Included" },
  { feature: "EU & Global Privacy Notice Builder, subscriber-only", free: "—", intel: "Included", platform: "Included" },
  { feature: "Registration Manager (Convenience)", free: false, intel: T.registration.display, platform: T.registration.display },
  { feature: "Free Smart Tool runs per year (Governance, LIA, or DPIA)", free: false, intel: "1 / year (annual only)", platform: "3 / year (annual only)" },

  { isSection: true, feature: "CPPA tools" },
  { feature: "CPPA Risk Assessment (Smart Tool)", free: false, intel: T.cppa_risk.display, platform: T.cppa_risk.display },
  { feature: "CPPA Cybersecurity Audit (Smart Tool)", free: false, intel: T.cppa_cyber.display, platform: T.cppa_cyber.display },
  { feature: "ADMT Compliance Assessment (Smart Tool)", free: false, intel: T.cppa_admt.display, platform: T.cppa_admt.display },
];

const Subscribe = () => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const fireConversion = useConversionEvent();
  const [searchParams] = useSearchParams();
  const bJurisdiction = searchParams.get("j");
  const bIndustry = searchParams.get("i");
  const bTopics = searchParams.get("t") ? searchParams.get("t")!.split(",").filter(Boolean) : [];
  const fromBuilder = !!bJurisdiction;
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutInterval, setCheckoutInterval] = useState<"month" | "year">("month");
  const [checkoutTier, setCheckoutTier] = useState<"intelligence" | "professional">("intelligence");
  const startCheckout = async (interval: "month" | "year", tier: "intelligence" | "professional" = "intelligence") => {
    if (!user) {
      // PP-1 D3: fire signup_initiated on the redirect leg from Subscribe → /signup.
      fireConversion("signup_initiated", {
        referrer_path: "/subscribe",
        utm_source: "",
        utm_campaign: "",
        variant: "page-load",
      });
      navigate(`/signup?redirect=/subscribe`);
      return;
    }
    setLoading(`${tier}_${interval}`);
    setError(null);
    try {
      setCheckoutInterval(interval);
      setCheckoutTier(tier);
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



  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Pricing & Plans | End User Privacy</title>
        <meta
          name="description"
          content={`Privacy Intelligence at ${PRICING.intelligence.monthly.display}/month with a 10-day free trial. Professional from ${PRICING.professional.monthly.display}/month, with client/matter workspaces. Any subscription includes RoPA, Notice Builders, IR Playbook, Biometric Checker, and DPA Generator; annual plans add free Smart Tool runs (1 with Intelligence annual, 3 with Professional annual).`}
        />
      </Helmet>
      <Navbar />
      {searchParams.get("msg") && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-900">
          {searchParams.get("msg")}
        </div>
      )}




      {/* Two-product hero */}
      <div className="bg-gradient-to-br from-brand-navy to-brand-ocean py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[800px] mx-auto">
          <h1 className="font-display text-white mb-4 leading-tight">
            Two plans. One mission.
          </h1>
          <p className="text-base text-brand-mist max-w-[600px] leading-relaxed mb-10">
            Stay informed with Intelligence for {PRICING.intelligence.monthly.display}/month.
            Run a client-facing practice with Professional from {PRICING.professional.monthly.display}/month.
          </p>

          <div id="pro-plan-card" className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[840px] mx-auto text-left items-stretch">
            {/* Intelligence card */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-6 flex flex-col h-full">
              <p className="text-eyebrow text-brand-mist mb-2">
                Privacy Intelligence
              </p>
              <div className="text-white font-display font-bold text-[36px] leading-none mb-1">
                {PRICING.intelligence.monthly.display}<span className="text-lg font-normal text-brand-cloud">/month</span>
              </div>
              <p className="text-brand-cloud text-meta mb-1">

                or {PRICING.intelligence.annual.display}/year ({PRICING.intelligence.annual.savingDisplay})
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Daily privacy intelligence feed",
                  "Weekly Privacy Intelligence Report: personalised by role, jurisdiction & topics",
                  "Reports & documents translatable into 20+ languages",
                  "AI investigation prompt on every article",
                  "Access to some compliance tools at standalone prices",
                  "Enforcement corpus citations in every Smart Tool output",

                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white">
                    <span className="text-brand-mist font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>

              {/* Annual perk callout */}
              <div className="mt-0 pt-4 border-t border-white/20">
                <p className="text-eyebrow text-brand-mist mb-2">
                  Go annual, pay less per tool
                </p>
                <ul className="space-y-1.5 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-mist font-bold">✓</span>
                    <span><strong className="text-white">1 free Smart Tool run/year</strong> (Governance, LIA, or DPIA; up to {INTELLIGENCE_ANNUAL_FREE_RUN_VALUE_DISPLAY} value)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-mist font-bold">✓</span>
                    <span>Subscriber pricing on Smart Tools: <strong className="text-white">LIA & DPIA drop from {SMART_TOOL_LIA_DPIA_DISCOUNT_DISPLAY}</strong>, Governance {SMART_TOOL_GOVERNANCE_DISCOUNT_DISPLAY}, CPPA tools {CPPA_SUBSCRIBER_DISCOUNT_RANGE_DISPLAY}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-mist font-bold">✓</span>
                    <span>Two months free vs. paying monthly</span>
                  </li>
                </ul>
                <p className="text-brand-cloud/80 text-meta mt-3 italic">
                  One annual Smart Tool run pays back most of your subscription.
                </p>
              </div>

              <div className="mt-auto pt-5">
                <button
                  onClick={() => startCheckout("year", "intelligence")}
                  disabled={!!loading}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-white text-brand-navy hover:opacity-90 disabled:opacity-50"
                >
                  Start annual ({PRICING.intelligence.annual.display}/yr) <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
                <button
                  onClick={() => startCheckout("month", "intelligence")}
                  disabled={!!loading}
                  className="w-full mt-2 text-center text-meta text-brand-cloud/90 underline underline-offset-2 hover:text-white disabled:opacity-50"
                >
                  or pay monthly at {PRICING.intelligence.monthly.display}/mo
                </button>
              </div>
              <p className="text-center text-brand-cloud/80 text-meta mt-2">
                10-day free trial · Card required · No tools in trial
              </p>
              <Link
                to="/get-intelligence"
                onClick={() => fireConversion("subscribe_cta_click", { cta_label: "See a sample Intelligence brief", cta_position: "hero-secondary" })}
                className="mt-2 block text-center text-meta text-white/80 hover:text-white underline underline-offset-2 no-underline"
              >
                See a sample Intelligence brief →
              </Link>
            </div>

            {/* Professional card */}
            <div className="bg-amber-400/10 border-2 border-amber-400/60 rounded-2xl p-6 relative flex flex-col h-full">
              <p className="text-eyebrow text-amber-300 mb-2">
                Professional
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-display font-bold text-[36px] leading-none">
                  {PRICING.professional.monthly.display}
                </span>
                <span className="text-brand-cloud text-lg font-normal">/month</span>
              </div>
              <p className="text-amber-100 text-meta mb-1">
                or {PRICING.professional.annual.display}/year ({PRICING.professional.annual.savingDisplay})
              </p>
              <p className="text-brand-cloud/80 text-meta mb-1">
                {PRICING.professional.annual.note}
              </p>
              <p className="text-amber-100 text-meta mb-4">
                + {PRICING.professional.perClient.display} per client/year
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Everything in Intelligence (for account holder)",
                  "Client/matter workspace & compliance record",
                  `3 free Smart Tool runs per year (annual plan only; up to ${PROFESSIONAL_ANNUAL_FREE_RUN_VALUE_DISPLAY} value)`,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white">
                    <span className="text-amber-400 font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>

              {/* Annual perk callout */}
              <div className="mt-0 pt-4 border-t border-amber-400/30">
                <p className="text-eyebrow text-amber-200 mb-2">
                  Go annual, pay less per tool
                </p>
                <ul className="space-y-1.5 text-sm text-white/90">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✓</span>
                    <span><strong className="text-white">3 free Smart Tool runs/year</strong> (Governance, LIA, or DPIA; up to {PROFESSIONAL_ANNUAL_FREE_RUN_VALUE_DISPLAY} value)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✓</span>
                    <span>Lowest per-tool pricing: <strong className="text-white">LIA & DPIA drop from {SMART_TOOL_LIA_DPIA_DISCOUNT_DISPLAY}</strong>, Governance {SMART_TOOL_GOVERNANCE_DISCOUNT_DISPLAY}, CPPA tools {CPPA_SUBSCRIBER_DISCOUNT_RANGE_DISPLAY}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✓</span>
                    <span>Two months free vs. paying monthly + client workspace unlocked</span>
                  </li>
                </ul>
                <p className="text-amber-100/80 text-meta mt-3 italic">
                  Three free annual runs alone cover more than half your subscription.
                </p>
              </div>

              <div className="mt-auto pt-5">
                <button
                  onClick={() => startCheckout("year", "professional")}
                  disabled={!!loading}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-amber-400 text-brand-navy hover:opacity-90 disabled:opacity-50"
                >
                  Start annual ({PRICING.professional.annual.display}/yr) <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
                <button
                  onClick={() => startCheckout("month", "professional")}
                  disabled={!!loading}
                  className="w-full mt-2 text-center text-meta text-amber-100/90 underline underline-offset-2 hover:text-white disabled:opacity-50"
                >
                  or pay monthly at {PRICING.professional.monthly.display}/mo
                </button>
              </div>
              <p className="text-center text-amber-100/80 text-meta mt-2">
                Add clients at {PRICING.professional.perClient.display}/client/year. No minimum.
              </p>
              <Link
                to="/samples/governance"
                className="mt-2 block text-center text-meta text-amber-100/90 hover:text-white underline underline-offset-2 no-underline"
              >
                See a sample Governance Assessment →
              </Link>
            </div>
          </div>
          {error && <p className="text-red-300 text-meta mt-4">{error}</p>}
          {isPremium && (
            <p className="text-brand-cloud text-meta mt-4">
              You're already subscribed. <Link to="/account" className="underline">Manage your subscription →</Link>
            </p>
          )}
        </div>
      </div>


      {/* Registration Manager mention */}
      <div className="bg-white border-b border-brand-cloud py-4 px-4 mt-6">
        <div className="max-w-[720px] mx-auto text-center text-sm text-slate">
          Need DPO appointments, ROPAs, or AI Act registrations filed?{" "}
          <Link
            to="/registration-manager"
            className="text-brand-navy font-semibold underline underline-offset-2 hover:text-brand-ocean"
          >
            Try Registration Filings →
          </Link>{" "}
          <span className="text-brand-navy/70">({T.registration.display} per filing).</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 mb-10">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-cloud py-3 px-5">
          <ShieldCheck className="w-5 h-5 text-brand-teal-text flex-shrink-0" />
          <p className="text-center text-base font-semibold text-brand-navy">
            Tool output calibrated against enforcement decisions and regulatory guidance, not just statutory text.
          </p>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="max-w-3xl mx-auto px-4 mt-12 mb-8">
        <h2 className="text-center font-display text-brand-navy mb-6">
          What's included at each level
        </h2>
        <div className="bg-card border border-brand-cloud rounded-2xl overflow-hidden shadow-eup-sm">
          <div className="cmp-table overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-brand-cloud bg-brand-mist">
                  <th className="text-left py-3 pr-4 pl-5 font-semibold text-brand-navy w-1/2 !bg-brand-mist">Feature</th>
                  <th className="text-center py-3 px-2 font-semibold text-brand-navy text-xs uppercase tracking-wider">Anonymous</th>
                  <th className="text-center py-3 px-2 font-semibold text-brand-navy text-xs uppercase tracking-wider">Intelligence<br/><span className="font-normal normal-case tracking-normal">{PRICING.intelligence.monthly.display}/mo</span></th>
                  <th className="text-center py-3 px-2 font-semibold text-brand-navy text-xs uppercase tracking-wider">Professional<br/><span className="font-normal normal-case tracking-normal">{PRICING.professional.base.display}/mo + {PRICING.professional.perClient.display}/client/yr</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cloud/60">
                {([
                  { type: 'section', feature: "The monitoring layer" },
                  { type: 'row', feature: "Regulatory developments, monitored daily", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Jurisdiction profiles (worldwide)", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Regulator directory", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Research guides (GDPR, biometric, health, etc.)", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Enforcement tracker: all actions", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Personalized weekly digest", free: "✓", intel: "✓", platform: "✓" },

                  { type: 'section', feature: "The intelligence layer" },
                  { type: 'row', feature: "Cross-jurisdiction signals and pattern analysis", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Full Privacy Intelligence Report, customized for your industry & jurisdictions", free: "—", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Enforcement trends & pattern signals", free: "—", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Per-article intelligence: regulatory theory, action items, sectors", free: "—", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "AI investigation prompt (pre-loaded with regulatory context, ready to paste into any AI assistant)", free: "—", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Priority Monday delivery", free: "—", intel: "✓", platform: "✓" },

                  { type: 'section', feature: "The action layer: compliance tools with cited enforcement evidence" },
                  { type: 'row', feature: "Sample preview of all tools", free: "✓", intel: "✓", platform: "✓" },
                  { type: 'row', feature: "Governance Assessment (Smart)", free: "—", intel: T.governance.display, platform: T.governance.display },
                  { type: 'row', feature: "Legitimate Interest Assessment (Smart)", free: "—", intel: T.lia.display, platform: T.lia.display },
                  { type: 'row', feature: "DPIA / Impact Assessment (Smart)", free: "—", intel: T.dpia.display, platform: T.dpia.display },
                  { type: 'row', feature: "DPA Generator (Smart)", free: "—", intel: T.dpa.display, platform: T.dpa.display },
                  { type: 'row', feature: "Biometric Privacy Checker (Smart)", free: "—", intel: T.biometric.display, platform: T.biometric.display },
                  { type: 'row', feature: "IR Playbook (Convenience)", free: "—", intel: T.ir_playbook.display, platform: T.ir_playbook.display },
                  { type: 'row', feature: "RoPA Builder (Convenience)", free: "—", intel: "Included", platform: "Included" },
                  { type: 'row', feature: "US Privacy Notice Builder", free: "—", intel: "Included", platform: "Included" },
                  { type: 'row', feature: "EU & Global Privacy Notice Builder", free: "—", intel: "Included", platform: "Included" },
                  { type: 'row', feature: "Registration Filings (Convenience)", free: "—", intel: T.registration.display, platform: T.registration.display },
                  { type: 'row', feature: "Free Smart Tool runs per year (Governance, LIA, or DPIA)", free: "—", intel: "1 / year (annual only)", platform: "3 / year (annual only)" },

                  { type: 'section', feature: "CPPA tools" },
                  { type: 'row', feature: "CPPA Risk Assessment (Smart)", free: "—", intel: T.cppa_risk.display, platform: T.cppa_risk.display },
                  { type: 'row', feature: "CPPA Cybersecurity Audit (Smart)", free: "—", intel: T.cppa_cyber.display, platform: T.cppa_cyber.display },
                  { type: 'row', feature: "ADMT Compliance Assessment (Smart)", free: "—", intel: T.cppa_admt.display, platform: T.cppa_admt.display },
                  { type: 'row', feature: "CPPA Scope Checker", free: "Free", intel: "Free", platform: "Free" },

                  { type: 'section', feature: "Platform features" },
                  { type: 'row', feature: "Client/matter workspace", free: "—", intel: "—", platform: "✓" },
                  { type: 'row', feature: "Saved reports in My Reports", free: "—", intel: "✓", platform: "✓" },
                ] as Array<
                  | { type: 'section'; feature: string }
                  | { type: 'row'; feature: string; free: string; intel: string; platform: string }
                >).map((row, i) => {
                  if (row.type === 'section') {
                    return (
                      <tr key={i} className="bg-brand-navy/5">
                        <td colSpan={4} className="px-5 py-2 text-eyebrow text-brand-steel border-t border-brand-cloud">
                          {row.feature}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-brand-cloud/50'}>
                      <td className="py-2.5 pr-4 pl-5 text-brand-navy">{row.feature}</td>
                      <td className="py-2.5 px-2 text-center text-brand-steel">{row.free}</td>
                      <td className="py-2.5 px-2 text-center font-medium text-brand-steel">{row.intel}</td>
                      <td className="py-2.5 px-2 text-center font-medium text-brand-teal-text">{row.platform}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-center text-xs text-brand-steel mt-4">
          Individual tools also available as standalone purchases.
          CPPA Scope Checker is free. No account required.
        </p>
      </div>

      {fromBuilder && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <span className="text-green-700 text-lg flex-shrink-0 mt-0.5">✓</span>
            <div>
              <p className="font-bold text-brand-navy text-sm mb-0.5">
                Your Intelligence Report is configured and ready.
              </p>
              <p className="text-sm text-slate">
                {[bJurisdiction, bIndustry, ...bTopics.slice(0, 2)].filter(Boolean).join(" · ")}. Subscribe to receive it.
              </p>
            </div>
          </div>
        </div>
      )}

      <div id="brief-builder-section" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display text-brand-navy mb-2">
            See what your report would look like
          </h2>
          <p className="text-slate text-sm">
            Pick your jurisdiction, role, and topics. We'll build a sample report showing the depth and format you receive every Monday.
          </p>
        </div>
        <BriefBuilder />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Three-column comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-brand-navy text-center mb-8">Free vs. Intelligence vs. Professional</h2>
          <div className="bg-card border border-brand-cloud rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="cmp-table overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-cloud">
                    <th className="px-5 py-3.5 text-left text-meta font-semibold tracking-wider uppercase text-slate">
                      Feature
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-slate w-[110px]">
                      Free
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-brand-navy/70 w-[170px]">
                      Intelligence ({PRICING.intelligence.monthly.display}/mo)
                    </th>
                    <th className="px-5 py-3.5 text-center text-meta font-semibold tracking-wider uppercase text-amber-800 w-[230px]">
                      Professional ({PRICING.professional.base.display}/mo + {PRICING.professional.perClient.display}/client/yr)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => {
                    if ("isSection" in row && row.isSection) {
                      return (
                        <tr key={i} className="bg-brand-navy/5">
                          <td
                            colSpan={4}
                            className="px-5 py-2 text-eyebrow text-brand-steel border-t border-brand-cloud"
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
                              ? "text-brand-navy/70"
                              : "text-accent";
                        return <Check className={`w-4 h-4 ${cls} mx-auto`} />;
                      }
                      if (val === false) return <XIcon className="w-4 h-4 text-brand-navy/70 mx-auto" />;
                      if (val === "Included") {
                        return <span className="text-meta font-semibold text-green-700">Included</span>;
                      }
                      const cls = color === "platform" ? "text-amber-700" : "text-slate";
                      return <span className={`text-meta font-medium ${cls}`}>{val}</span>;
                    };
                    const dataRow = row as Exclude<ComparisonRow, { isSection: true }>;
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-brand-cloud/50"}>
                        <td className="px-5 py-3 text-sm text-brand-navy border-t border-brand-cloud">{dataRow.feature}</td>
                        <td className="px-5 py-3 text-center border-t border-brand-cloud">{renderCell(dataRow.free, "free")}</td>
                        <td className="px-5 py-3 text-center border-t border-brand-cloud">{renderCell(dataRow.intel, "intel")}</td>
                        <td className="px-5 py-3 text-center border-t border-brand-cloud">{renderCell(dataRow.platform, "platform")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* The missing piece of the privacy toolkit */}
        <div className="mb-14">
          {/* Section heading */}
          <div className="text-center mb-8">
            <p className="text-meta font-bold uppercase tracking-[0.09em] text-slate mb-3">
              Where we fit
            </p>
            <h2 className="font-display text-brand-navy mb-3 leading-tight">
              The missing piece of the privacy toolkit
            </h2>
            <p className="text-sm text-slate max-w-[480px] mx-auto leading-relaxed">
              Privacy professionals rely on four well-established categories of tools.
              End User Privacy was purpose-built for the one that had no dedicated home.
            </p>
          </div>

          {/* Donut chart + legend card */}
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 md:p-8 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* SVG donut chart */}
              <div className="flex items-center justify-center">
                <svg
                  viewBox="0 0 240 240"
                  className="w-full max-w-[220px]"
                  role="img"
                  aria-label="Donut chart of the privacy professional's toolkit. End User Privacy occupies the largest segment at 40 percent."
                >
                  <title>The privacy professional's toolkit: End User Privacy fills the missing piece</title>
                  {/* EUP segment: 40% */}
                  <path d="M120,24 A96,96 0 0,1 176.4,197.7 L151.7,163.7 A54,54 0 0,0 120,66 Z" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                  {/* Legal research: 15% */}
                  <path d="M176.4,197.7 A96,96 0 0,1 90.3,211.3 L103.3,171.4 A54,54 0 0,0 151.7,163.7 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Compliance management: 15% */}
                  <path d="M90.3,211.3 A96,96 0 0,1 28.7,149.7 L68.6,136.7 A54,54 0 0,0 103.3,171.4 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Privacy technology: 15% */}
                  <path d="M28.7,149.7 A96,96 0 0,1 42.3,63.6 L76.3,88.3 A54,54 0 0,0 68.6,136.7 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Professional development: 15% */}
                  <path d="M42.3,63.6 A96,96 0 0,1 120,24 L120,66 A54,54 0 0,0 76.3,88.3 Z" fill="#C7D5E8" stroke="#B0C0D8" strokeWidth="0.5" />
                  {/* Center hole */}
                  <circle cx="120" cy="120" r="50" fill="white" />
                  {/* Center label */}
                  <text x="120" y="114" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">Privacy</text>
                  <text x="120" y="126" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">professional's</text>
                  <text x="120" y="138" textAnchor="middle" fontSize="10" fontWeight="500" fill="#6B7A99" fontFamily="DM Sans, sans-serif">toolkit</text>
                  {/* EUP label */}
                  <text x="191" y="90" textAnchor="middle" fontSize="11" fontWeight="500" fill="#7C2D12" fontFamily="DM Sans, sans-serif">EUP</text>
                  <text x="191" y="103" textAnchor="middle" fontSize="10" fill="#92400E" fontFamily="DM Sans, sans-serif">40%</text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    color: "bg-amber-500",
                    name: "Regulatory intelligence and action",
                    desc: "What changed, what it means for your work, and what to do (automatically, every week).",
                    nameClass: "text-amber-800",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Legal research",
                    desc: "Statutes, case law, and regulatory guidance for teams that need primary source access.",
                    nameClass: "text-brand-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Compliance management",
                    desc: "Programme workflows, DSAR handling, consent management, and data mapping.",
                    nameClass: "text-brand-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Privacy technology",
                    desc: "Consent banners, cookie management, preference centres, and data discovery.",
                    nameClass: "text-brand-navy",
                  },
                  {
                    color: "bg-[#C7D5E8]",
                    name: "Professional development",
                    desc: "Credentials, community, events, and continuing education.",
                    nameClass: "text-brand-navy",
                  },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-2.5">
                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 mt-1 ${item.color}`} />
                    <div>
                      <p className={`text-sm font-semibold leading-snug mb-0.5 ${item.nameClass}`}>
                        {item.name}
                      </p>
                      <p className="text-meta text-slate leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EUP highlight card */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 mb-5">
            <p className="text-meta font-bold uppercase tracking-[0.07em] text-amber-800 mb-1">
              End User Privacy
            </p>
            <h3 className="text-brand-navy mb-2 leading-snug">
              The monitoring and action layer: purpose-built
            </h3>
            <p className="text-sm text-slate leading-relaxed">
              Our tools monitor privacy regulatory authorities worldwide, synthesise every development,
              and tell you what it means for your specific work, automatically, every week.
              Plus the compliance documents to act on it.
            </p>
          </div>

          {/* Body copy card */}
          <div className="bg-card border border-brand-cloud rounded-2xl px-6 py-5 mb-5">
            <p className="text-sm text-slate leading-relaxed mb-4">
              The privacy professional's toolkit has four well-established categories, each
              with excellent tools. Legal research databases give you access to the primary
              source when you need to read the statute. Compliance management platforms handle
              programme workflows and consent. Professional associations provide credentials and
              community. Privacy technology keeps your websites and data practices running
              correctly.
            </p>
            <div className="h-px bg-brand-cloud my-4" />
            <p className="text-sm text-slate leading-relaxed">
              Our tools monitor what is happening across the regulatory landscape
              automatically, synthesise it, and tell you what it means for your specific work.
            </p>
          </div>

          {/* Closing quote */}
          <div className="border-l-[3px] border-amber-500 bg-card border border-brand-cloud rounded-r-xl px-5 py-4">
            <p className="text-sm text-slate leading-relaxed italic">
              "End User Privacy is the monitoring and intelligence layer you add once, and
              then stop having to think about. It works alongside the professional tools you
              already rely on."
            </p>
          </div>
        </div>

        {error && <p className="text-center text-severity-warning text-sm mt-6">{error}</p>}

        {/* ROI block — registry-computed */}
        <div className="max-w-3xl mx-auto mt-12 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-brand-cloud bg-card p-5">
            <p className="text-eyebrow text-brand-teal-text mb-2">Intelligence annual: return on cost</p>
            <p className="text-sm text-slate leading-relaxed">
              At <strong className="text-brand-navy">{PRICING.intelligence.annual.display}/year</strong>,
              one included Smart Tool run (up to <strong className="text-brand-navy">{INTELLIGENCE_ANNUAL_FREE_RUN_VALUE_DISPLAY}</strong> value)
              covers most of the subscription. Subscriber pricing on additional runs applies for the rest of the year.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-eyebrow text-amber-800 mb-2">Professional annual: return on cost</p>
            <p className="text-sm text-slate leading-relaxed">
              At <strong className="text-brand-navy">{PRICING.professional.annual.display}/year</strong>,
              three included Smart Tool runs (up to <strong className="text-brand-navy">{PROFESSIONAL_ANNUAL_FREE_RUN_VALUE_DISPLAY}</strong> value)
              cover more than half the subscription, before the client workspace pays for itself.
            </p>
          </div>
        </div>

        {/* Four-item objection FAQ */}
        <div className="max-w-3xl mx-auto mt-8 mb-4">
          <h2 className="font-display text-brand-navy text-center mb-5">Common questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "Can I try it before I pay?",
                a: "Intelligence includes a 10-day free trial (card required, no tools during trial). Every Smart Tool has a full sample report you can read end-to-end at /samples.",
              },
              {
                q: "What happens if I cancel?",
                a: "Cancel anytime from your account. You keep access through the end of the paid period. Reports and documents you've already generated remain in your account.",
              },
              {
                q: "Is the output legal advice?",
                a: "No. Outputs are calibrated against enforcement decisions and regulatory guidance to support your legal review. They must be reviewed by qualified counsel before operational use.",
              },
              {
                q: "Do free Smart Tool runs roll over?",
                a: "No. Free runs are per annual term (1 for Intelligence annual, 3 for Professional annual; Governance, LIA, or DPIA). Subscriber pricing applies to every additional run.",
              },
            ].map((item) => (
              <details key={item.q} className="group rounded-xl border border-brand-cloud bg-card p-4 open:shadow-eup-sm">
                <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-brand-navy">
                  {item.q}
                  <span className="text-brand-teal-text ml-3 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-sm text-slate leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

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
      {checkoutOpen && (
        <Suspense fallback={null}>
          <SubscribeCheckoutModal
            open={checkoutOpen}
            interval={checkoutInterval}
            tier={checkoutTier}
            onClose={() => setCheckoutOpen(false)}
            onComplete={handleCheckoutComplete}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Subscribe;
