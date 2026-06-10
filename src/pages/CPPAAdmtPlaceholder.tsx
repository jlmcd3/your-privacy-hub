import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolDisclaimer from "@/components/ToolDisclaimer";

export default function CPPAAdmtPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>ADMT Risk Checker — Coming Q3 2026 | End User Privacy</title>
      </Helmet>
      <Navbar />

      <main className="flex-1">
        {/* Navy hero band */}
        <section className="bg-brand-navy text-white px-6 py-12 sm:px-8 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3"
              style={{ color: "hsl(var(--gold))" }}
            >
              CPPA Audit Suite · Coming Q3 2026
            </p>
            <h1 className="font-display text-3xl sm:text-4xl leading-tight">
              ADMT Risk Evaluation Checker
            </h1>
          </div>
        </section>

        {/* Body */}
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 space-y-8">
          <p className="text-[14px] leading-relaxed text-foreground">
            The CPPA&apos;s automated decisionmaking technology regulations take
            effect January 1, 2027. Businesses using ADMT for significant
            decisions must provide pre-use notices, opt-out mechanisms, and
            access rights. The ADMT Checker will map your automated decision
            systems against the disclosure and opt-out obligations before the
            deadline.
          </p>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              What it will cover
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[14px] leading-relaxed text-foreground">
              <li>Pre-use notice requirements</li>
              <li>Opt-out and human-appeal mechanics</li>
              <li>Risk-assessment triggers for ADMT under 11 CCR § 7150</li>
            </ul>
          </div>

          {/* CTA box */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <p className="font-display text-lg text-brand-navy mb-2">
              Be first to know
            </p>
            <p className="text-[14px] text-muted-foreground mb-4">
              Get notified when the ADMT Checker launches and receive early
              access to the compliance framework.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center px-4 py-2 text-[12px] font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 rounded-md no-underline transition-colors"
            >
              Contact us
            </Link>
          </div>

          {/* Secondary links */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/cppa-risk-assessment"
              className="text-[12px] font-semibold text-brand-navy hover:underline no-underline"
            >
              CPPA Risk Assessment →
            </Link>
            <Link
              to="/cppa-cybersecurity"
              className="text-[12px] font-semibold text-brand-navy hover:underline no-underline"
            >
              CPPA Cybersecurity Readiness →
            </Link>
          </div>

          <ToolDisclaimer />
        </div>
      </main>

      <Footer />
    </div>
  );
}
