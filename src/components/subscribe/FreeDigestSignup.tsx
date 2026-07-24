import { Link } from "react-router-dom";
import MondayReportWhatYouGet from "./MondayReportWhatYouGet";
import MondayVsWeeklyBrief from "./MondayVsWeeklyBrief";

interface FreeDigestSignupProps {
  /** Tag forwarded to the signup redirect (defaults to "website") */
  source?: string;
  className?: string;
}

/**
 * Free signup CTA — routes to /signup so the user creates a real account
 * (with required Terms of Service & Privacy Policy agreement). The free tier
 * entitles them to minimal article enrichment views and the weekly summary email.
 */
const FreeDigestSignup = ({ source = "website", className = "" }: FreeDigestSignupProps) => {
  const redirect = `/onboarding-profile?source=${encodeURIComponent(source)}`;
  return (
    <section
      className={`bg-card border border-border rounded-2xl p-6 md:p-8 ${className}`}
      aria-labelledby="free-digest-signup-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[11px] font-bold tracking-widest uppercase text-accent mb-2">
          Free — no card required
        </p>
        <h2
          id="free-digest-signup-heading"
          className="font-display text-foreground mb-2"
        >
          Not ready for the full Weekly Brief?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Create a free account to receive the Monday Privacy Intelligence
          Report — a short, filtered headline digest of the past week's
          regulatory activity, sent every Monday. It is a different, shorter
          product than the subscriber Weekly Brief.
        </p>

        <div className="text-left mb-6 space-y-4">
          <MondayReportWhatYouGet variant="compact" />
          <MondayVsWeeklyBrief />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link
            to={`/signup?redirect=${encodeURIComponent(redirect)}`}
            className="inline-block px-6 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity no-underline"
          >
            Create free account
          </Link>
          <p className="text-[11px] text-muted-foreground">
            You'll agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FreeDigestSignup;
