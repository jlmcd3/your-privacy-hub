/**
 * Courier C — Homepage geography paths. Two equal cards beneath the
 * hero: "California CPPA deadlines" and "EU GDPR compliance". Each
 * card has a primary CTA into its flagship tool and a secondary
 * "View a sample report" link. One trust line beneath.
 *
 * Additive-only: sits between <SearchFirstHero /> and <CPPADeadlineStrip />.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function HomeGeographyPaths() {
  return (
    <section
      aria-label="Choose your compliance path"
      className="bg-brand-cloud border-b border-brand-cloud"
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          {/* California CPPA */}
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 flex flex-col">
            <p className="text-eyebrow text-red-800 mb-2">California · CPPA</p>
            <h2 className="text-brand-navy font-display text-xl leading-snug mb-2">
              California CPPA deadlines
            </h2>
            <p className="text-sm text-slate mb-5 leading-relaxed flex-1">
              Scope, risk, cybersecurity audit, and ADMT — the four assessments the
              California Privacy Protection Agency expects on file. Start with the
              free Scope Checker to see which of them apply to you.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/cppa-scope-checker"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline"
              >
                Check your CPPA scope <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/samples/cppa_risk"
                className="text-sm font-semibold text-brand-teal-text hover:underline no-underline"
              >
                View a sample report →
              </Link>
            </div>
          </div>

          {/* EU GDPR */}
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 flex flex-col">
            <p className="text-eyebrow text-brand-teal-text mb-2">EU / EEA · GDPR</p>
            <h2 className="text-brand-navy font-display text-xl leading-snug mb-2">
              EU GDPR compliance
            </h2>
            <p className="text-sm text-slate mb-5 leading-relaxed flex-1">
              A ten-domain review of your privacy programme against the failure
              patterns EU and UK supervisory authorities have actually penalised —
              with cited enforcement decisions behind every finding.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/governance-assessment"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline"
              >
                Start GDPR Governance Assessment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/samples/governance"
                className="text-sm font-semibold text-brand-teal-text hover:underline no-underline"
              >
                View a sample report →
              </Link>
            </div>
          </div>
        </div>

        <p className="text-meta text-slate text-center mt-4 italic">
          Primary-source cited. Outputs support your legal review — they do not
          replace legal judgment.
        </p>
      </div>
    </section>
  );
}
