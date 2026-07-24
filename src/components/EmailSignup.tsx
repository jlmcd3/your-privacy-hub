import { Link } from "react-router-dom";
import { Mail } from 'lucide-react';

interface EmailSignupProps {
  variant?: "strip" | "card";
  className?: string;
  /** Optional tag forwarded to the signup redirect for attribution. */
  source?: string;
}

/**
 * Free signup CTA. Replaces the previous inline email-capture form so that every
 * free subscriber goes through proper account creation with required Terms of
 * Service and Privacy Policy agreement. Free entitlements: minimal article
 * enrichment views and the weekly summary email.
 */
const EmailSignup = ({ variant = "card", className = "", source }: EmailSignupProps) => {
  const redirect = source
    ? `/onboarding-profile?source=${encodeURIComponent(source)}`
    : "/onboarding-profile";
  const signupHref = `/signup?redirect=${encodeURIComponent(redirect)}`;

  if (variant === "strip") {
    return (
      <div className={`bg-gradient-to-r from-brand-navy to-brand-ocean py-8 px-4 md:px-8 ${className}`}>
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-white mb-1">
              Free: the Monday Privacy Intelligence Report
            </h3>
            <p className="text-sm text-brand-mist">
              Create a free account to receive the Monday Report — a filtered headline digest of the past week's regulatory activity for the regions and topics you choose. Sent every Monday. Always free. (Different, shorter product than the subscriber Weekly Brief.)
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1.5 w-full md:w-auto">
            <Link
              to={signupHref}
              className="px-5 py-2.5 text-sm font-semibold text-brand-navy bg-white rounded-lg hover:bg-white/90 transition-colors no-underline"
            >
              Create free account
            </Link>
            <p className="text-[11px] text-white/60">
              By signing up you agree to our{" "}
              <Link to="/terms" className="underline hover:text-white">Terms</Link>{" "}
              &{" "}
              <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-white/50 text-center mt-3">
          We show contextual, non-behavioural ads on this site to keep core
          intelligence free. We never share your browsing data with advertisers.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <h4 className="text-base text-foreground mb-1">
        <Mail aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Monday Privacy Intelligence Report — Free
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        Create a free account to receive a filtered headline digest of the past week's regulatory activity — regions and topics you choose — every Monday. A different, shorter product than the subscriber Weekly Brief.
      </p>
      <Link
        to={signupHref}
        className="inline-block px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-colors no-underline"
      >
        Create free account
      </Link>
      <p className="text-[11px] text-muted-foreground mt-2">
        You'll agree to our{" "}
        <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
        and{" "}
        <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
};

export default EmailSignup;
