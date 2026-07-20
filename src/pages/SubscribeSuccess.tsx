import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";
import { PRICING } from "@/config/pricing";
import { firePurchaseVerified } from "@/lib/analyticsEvents";
import { getStripeEnvironment } from "@/lib/env";

// D1: auth-gated, server-verified.
// D2: static "check back shortly" copy — no client-side polling loop.
// D3: purchase_verified fires ONLY from the verify-purchase success branch.
type VerifyState =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "verified"; plan: string | null }
  | { kind: "failed"; reason: string }
  | { kind: "no_session" };

export default function SubscribeSuccess() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const { hasToolAccess, isIntelligenceOnly } = useSubscriptionTier();
  const [verify, setVerify] = useState<VerifyState>({ kind: "idle" });

  const sessionId = searchParams.get("session_id");
  const planParam = searchParams.get("plan");

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!sessionId) { setVerify({ kind: "no_session" }); return; }
    if (verify.kind !== "idle") return;
    setVerify({ kind: "verifying" });
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-purchase", {
          body: { session_id: sessionId, environment: getStripeEnvironment() },
        });
        if (error || !data?.verified) {
          setVerify({ kind: "failed", reason: data?.reason ?? error?.message ?? "unknown" });
          return;
        }
        const plan = (data.plan ?? planParam) as string | null;
        setVerify({ kind: "verified", plan });
        firePurchaseVerified({ plan, surface: "subscribe_success" });
      } catch (e) {
        setVerify({ kind: "failed", reason: String(e) });
      }
    })();
  }, [authLoading, user, sessionId, planParam, verify.kind]);

  // Signed-out gate (D1)
  if (!authLoading && !user) {
    const next = `/subscribe/success${window.location.search}`;
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Helmet><title>Sign in to confirm your subscription | End User Privacy</title></Helmet>
        <Navbar />
        <div className="max-w-[560px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-brand-navy mb-3">Sign in to confirm your subscription</h1>
          <p className="text-slate text-[15px] leading-relaxed mb-6">
            Payment received. To activate your workspace we need to verify the purchase against your account.
            Sign in with the email you used at checkout.
          </p>
          <Link
            to={`/auth?next=${encodeURIComponent(next)}`}
            className="inline-block bg-gradient-to-br from-brand-navy to-brand-teal text-white font-bold text-[14px] py-3.5 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Sign in to continue →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const headline = hasToolAccess
    ? "Your Professional subscription is ready."
    : "Your Intelligence Feed is active.";

  const subheadline = hasToolAccess
    ? "Your client workspace is live. RoPA, Notice Builders, IR Playbook, Biometric Checker, and DPA Generator are now included — annual Professional plans also get 3 free Smart Tool runs this year (Intelligence annual gets 1)."
    : "Your weekly report is configured. You'll receive your first issue this coming Monday morning.";

  const NEXT_STEPS = hasToolAccess
    ? [
        { icon: "🛠️", title: "Use your included tools", body: "RoPA Builder, US + EU/Global Notice Builders, IR Playbook, Biometric Checker, and DPA Generator are included with your subscription. Smart Tools (Governance, LIA, DPIA, CPPA) are per-run; annual Intelligence subscribers get 1 free Smart Tool run per year and annual Professional subscribers get 3." },
        { icon: "🎯", title: "Configure your Privacy Intelligence Report", body: "Tell us your industry, primary jurisdictions, and subject-matter priorities. Your report is only as tailored as the context you provide." },
        { icon: "📧", title: "Report arrives Monday", body: "Your first Privacy Intelligence Report will land in your inbox this coming Monday morning — customized and analyzed for your priorities and responsibilities." },
        { icon: "📁", title: "Documents saved permanently", body: "Every document you generate stays in your workspace — refresh, revise, or download anytime." },
      ]
    : [
        { icon: "🎯", title: "Configure your Privacy Intelligence Report", body: "Tell us your industry, primary jurisdictions, and subject-matter priorities. Your report is only as tailored as the context you provide." },
        { icon: "📧", title: "Report arrives Monday", body: "Your first Privacy Intelligence Report will land in your inbox this coming Monday morning — customized and analyzed for your priorities and responsibilities." },
        { icon: "⚖️", title: "Full Enforcement Tracker unlocked", body: "You now have access to every enforcement action in the database — all regulators, all jurisdictions, with fine amounts and legal basis." },
        { icon: "🌍", title: "Explore jurisdiction profiles worldwide", body: "Every country profile now shows its full news feed, regulator contacts, and enforcement history." },
      ];

  // D2: static status line, no polling.
  const statusLine = (() => {
    if (verify.kind === "verifying") return "Confirming your purchase…";
    if (verify.kind === "failed") return "We couldn't confirm this purchase yet. Activation can take a minute — check back shortly, or refresh this page. If the problem persists, contact support.";
    if (verify.kind === "no_session") return "No checkout session was provided. If you just completed payment, activation can take a minute — check back shortly or refresh this page.";
    return null;
  })();

  return (
    <main id="main-content" aria-label="Subscription confirmation" className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{hasToolAccess ? "Welcome to Professional" : "Welcome to Intelligence"} | End User Privacy</title>
      </Helmet>
      <Navbar />

      <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-accent" strokeWidth={2.5} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-accent mb-2">
            ⭐ Payment Confirmed
          </div>
          <h1 className="font-display text-brand-navy mb-3 leading-tight">{headline}</h1>
          <p className="text-slate text-[15px] leading-relaxed max-w-md mx-auto">{subheadline}</p>
          {statusLine && (
            <p className="text-brand-mist text-[12px] mt-3">{statusLine}</p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="font-display text-brand-navy mb-4">What happens next</h2>
          <div className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <div key={step.title} className="flex gap-4 p-4 bg-card border border-brand-cloud rounded-xl">
                <div className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</div>
                <div>
                  <div className="font-semibold text-brand-navy text-[14px] mb-0.5">{step.title}</div>
                  <p className="text-slate text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isIntelligenceOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-amber-800 text-sm font-medium">
              Want client workspaces? Upgrade to Professional (annual) from your account settings — {PRICING.professional.annual.display}/yr, then add clients at {PRICING.professional.perClient.display}/client/yr.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/brief-preferences?from=subscribe"
            className="flex-1 text-center bg-amber-400 text-brand-navy font-bold text-[14px] py-3.5 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Personalize your Privacy Intelligence Report →
          </Link>
          <Link
            to={hasToolAccess ? "/tools" : "/dashboard"}
            className="flex-1 text-center bg-gradient-to-br from-brand-navy to-brand-teal text-white font-bold text-[14px] py-3.5 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            {hasToolAccess ? "Browse compliance tools →" : "Open My Intelligence Brief →"}
          </Link>
        </div>

        <p className="text-center text-brand-mist text-[12px] mt-6">
          Questions? <Link to="/contact" className="text-brand-teal-text hover:text-brand-navy no-underline">Contact us</Link>
          {" "}· <Link to="/faq" className="text-brand-teal-text hover:text-brand-navy no-underline">FAQ</Link>
          {" "}· Cancel anytime from <Link to="/account" className="text-brand-teal-text hover:text-brand-navy no-underline">My Account</Link>
        </p>
      </div>

      <Footer />
    </main>
  );
}
