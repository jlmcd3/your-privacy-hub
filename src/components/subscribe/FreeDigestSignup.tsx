import { Link } from "react-router-dom";

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
          Not ready for the full Intelligence Brief?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Create a free account to get the personalized weekly digest — filtered to your regions and topics, every Monday — plus minimal enrichment views on articles.
        </p>

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
