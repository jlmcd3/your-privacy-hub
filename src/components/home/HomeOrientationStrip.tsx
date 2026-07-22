/**
 * Shared homepage orientation strip — sits directly below the regional hero
 * and above the geography cards. Renders as a full-width card with inline
 * links to the platform’s core sections.
 */
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

const InlineLink = ({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) => (
  <Link
    to={to}
    className="text-brand-globe-light font-bold no-underline hover:underline decoration-brand-globe-light/40 underline-offset-2"
  >
    {children}
  </Link>
);

export default function HomeOrientationStrip() {
  return (
    <section className="bg-brand-cloud border-b border-brand-cloud">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="bg-card border border-brand-cloud border-l-4 border-l-brand-teal rounded-2xl shadow-eup-md p-6 md:p-8 lg:p-10">
          <p className="text-sm md:text-base font-semibold uppercase tracking-wider text-brand-teal-text mb-3">
            What we do
          </p>
          <p className="text-lg md:text-xl text-brand-navy leading-relaxed">
            EndUserPrivacy.com is a privacy-
            <InlineLink to="/compare/us-states">Intelligence</InlineLink>{" "}
            platform: a news{" "}
            <InlineLink to="/updates">Feed</InlineLink> of regulatory
            developments worldwide, updated daily with analysis;{" "}
            <InlineLink to="/global-privacy-laws">Research</InlineLink> pages
            on privacy authorities and laws across every major jurisdiction; and
            self-serve compliance{" "}
            <InlineLink to="/tools">Tools</InlineLink> that generate the
            assessments and documents privacy laws require — CPPA, GDPR, and
            beyond.{" "}
            <InlineLink to="/pricing">Subscribe</InlineLink> for the{" "}
            <InlineLink to="/get-intelligence">Weekly Intelligence Brief</InlineLink>,
            {" "}the AI prompts for further research of Feed articles, and
            subscriber pricing for Tools.
          </p>
        </div>
      </div>
    </section>
  );
}
