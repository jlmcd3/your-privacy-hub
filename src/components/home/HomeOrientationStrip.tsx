/**
 * Shared homepage orientation strip — sits directly below the regional hero
 * and above the geography cards. Renders as a full-width card with a scannable
 * Track / Understand / Act breakdown of the platform.
 */
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { BookOpen, ClipboardCheck, Satellite } from "lucide-react";

const inlineLink =
  "font-bold text-brand-globe-light no-underline hover:underline decoration-brand-globe-light/40 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 rounded-sm";

type PathwayProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
};

function Pathway({ icon, title, children, className = "" }: PathwayProps) {
  return (
    <div className={`px-1 md:px-6 lg:px-8 py-6 md:py-2 ${className}`}>
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-full bg-brand-cloud flex items-center justify-center text-brand-teal-text">
          {icon}
        </div>
      </div>
      <h3 className="font-semibold text-lg text-brand-navy text-center mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function HomeOrientationStrip() {
  return (
    <section className="bg-brand-cloud border-b border-brand-cloud" aria-labelledby="what-we-do-heading">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="bg-card border border-brand-cloud border-l-4 border-l-brand-teal rounded-2xl shadow-eup-md p-6 md:p-8 lg:p-10">
          <p className="text-eyebrow text-brand-steel text-center mb-3">What we do</p>
          <h2
            id="what-we-do-heading"
            className="text-section-h2 text-brand-navy text-center mb-4"
          >
            Privacy intelligence and compliance tools, in one place.
          </h2>
          <p className="max-w-3xl mx-auto text-base md:text-lg text-brand-navy/80 text-center leading-relaxed mb-7 md:mb-9">
            Track privacy developments worldwide, automatically. Understand what they mean for your
            organization. Then turn that intelligence into action with tools that create the
            assessments, reports, and documents privacy professionals need.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3">
            <Pathway
              title="Track"
              icon={<Satellite className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />}
              className="border-b md:border-b-0 md:border-r border-brand-cloud"
            >
              <p className="text-sm text-slate text-center leading-relaxed">
                Worldwide privacy news and authorities monitored daily — enforcement actions, regulatory
                guidance, and legislative developments, enriched with analysis for insights applicable to
                your organization.
              </p>
              <div className="text-center mt-4">
                <a href="#updates" className={inlineLink}>
                  Learn more →
                </a>
              </div>
            </Pathway>

            <Pathway
              title="Understand"
              icon={<BookOpen className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />}
              className="border-b md:border-b-0 md:border-r border-brand-cloud"
            >
              <p className="text-sm text-slate text-center leading-relaxed">
                Research privacy laws and authorities, compare jurisdictions, and get your personalized
                Weekly Intelligence Brief to follow developments relevant to your role, industry or
                interests.
              </p>
              <div
                className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm"
                aria-label="Understand End User Privacy"
              >
                <Link to="/research" className={inlineLink}>
                  Privacy laws
                </Link>
                <span className="text-brand-mist" aria-hidden="true">·</span>
                <Link to="/global-privacy-authorities" className={inlineLink}>
                  Authorities
                </Link>
                <span className="text-brand-mist" aria-hidden="true">·</span>
                <Link to="/get-intelligence" className={inlineLink}>
                  Weekly Brief
                </Link>
              </div>
            </Pathway>

            <Pathway
              title="Act"
              icon={<ClipboardCheck className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />}
            >
              <p className="text-sm text-slate text-center leading-relaxed">
                Generate CPPA Risk Assessments, plus DPIAs, DPAs, LIAs, governance reviews, and
                other compliance tools calibrated to enforcement.
              </p>
              <div className="text-center mt-4">
                <Link to="/tools" className={inlineLink}>
                  Learn more →
                </Link>
              </div>
            </Pathway>
          </div>
        </div>
      </div>
    </section>
  );
}
