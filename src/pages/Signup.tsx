import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useConversionEvent } from "@/hooks/useConversionEvent";

const Signup = () => {
  const fireConversion = useConversionEvent();
  const engagementFired = useRef(false);

  useEffect(() => {
    const referrer_path =
      typeof document !== "undefined" ? new URL(document.referrer || "about:blank").pathname : "";
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    fireConversion("signup_initiated", {
      referrer_path,
      utm_source: params.get("utm_source") || "",
      utm_campaign: params.get("utm_campaign") || "",
      variant: "page-load",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEmailEngagement = () => {
    if (engagementFired.current) return;
    engagementFired.current = true;
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const referrer_path =
      typeof document !== "undefined" ? new URL(document.referrer || "about:blank").pathname : "";
    fireConversion("signup_initiated", {
      referrer_path,
      utm_source: params.get("utm_source") || "",
      utm_campaign: params.get("utm_campaign") || "",
      variant: "form-engagement",
    });
  };
  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet>
        <title>Account Creation Paused | End User Privacy</title>
        <meta name="description" content="New account creation is temporarily paused while End User Privacy is in private beta." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="w-full max-w-md bg-card border border-brand-cloud rounded-2xl shadow-eup-sm p-8 text-center opacity-95">
          <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-brand-cloud flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate" aria-hidden="true" />
          </div>
          <h1 className="font-display text-brand-navy mb-2">Account creation paused</h1>
          <p className="text-sm text-slate mb-3 leading-relaxed">
            Create a free account to save reports, alerts, and weekly intelligence.
          </p>
          <p className="text-sm text-slate mb-6 leading-relaxed">
            End User Privacy is currently in <span className="font-semibold text-brand-navy">private beta</span>.
            New public sign-ups are temporarily disabled while we onboard our initial group of testers.
          </p>

          {/* Greyed-out form preview */}
          <div className="space-y-3 mb-6 opacity-40" aria-hidden="true" onFocusCapture={onEmailEngagement} onPointerDownCapture={onEmailEngagement}>
            <div className="text-left">
              <label htmlFor="signup-email" className="block text-sm font-medium text-brand-navy mb-1.5">Email</label>
              <input
                id="signup-email"
                type="email"
                disabled
                placeholder="you@company.com"
                onFocus={onEmailEngagement}
                className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud/50 border border-silver rounded-lg text-slate cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              />
            </div>
            <div className="text-left">
              <label htmlFor="signup-password" className="block text-sm font-medium text-brand-navy mb-1.5">Password</label>
              <input
                id="signup-password"
                type="password"
                disabled
                placeholder="Min. 6 characters"
                className="w-full px-3.5 py-2.5 text-[14px] bg-brand-cloud/50 border border-silver rounded-lg text-slate cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              />
            </div>
            <button
              type="button"
              disabled
              className="w-full py-3 text-[14px] font-semibold text-white bg-brand-mist rounded-lg cursor-not-allowed border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              Create Account
            </button>

          </div>

          <p className="text-sm text-slate mb-2">
            Already have a beta account?{" "}
            <Link to="/login" className="text-brand-teal-text font-medium hover:underline no-underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-brand-mist">
            Interested in beta access?{" "}
            <Link to="/contact" className="text-brand-teal-text hover:underline no-underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Signup;
