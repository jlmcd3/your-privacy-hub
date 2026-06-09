import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Shield, ClipboardCheck, Lock } from "lucide-react";
import { PRICING_REGISTRY } from "@/config/pricing";

/**
 * Sprint 7 — Canonical /cppa hub page.
 * Single entry point linking Scope → Risk → Cyber. Drift Watch and
 * Breach Precedent Map are embedded inside the Cyber result, not
 * separate destinations — they are mentioned in the Cyber card copy.
 * Pricing sourced from `pricing.ts`; canonical handled globally by
 * <CanonicalTag /> so we do NOT inject a duplicate <link rel="canonical">.
 */
const riskStandalone = PRICING_REGISTRY.cppa_risk_standalone.displayPrice;
const cyberStandalone = PRICING_REGISTRY.cppa_cyber_standalone.displayPrice;

const TOOLS = [
  {
    href: "/cppa-scope-checker",
    title: "CPPA Scope Checker",
    description: "Determine if your business is in scope for the new CPPA risk-assessment and cybersecurity-audit regulations.",
    price: "Free",
    icon: ClipboardCheck,
  },
  {
    href: "/cppa-risk-assessment",
    title: "CPPA Risk Assessment",
    description: "Module 1 risk assessment built directly on the final CPPA regulations and FSOR agency commentary.",
    price: `${riskStandalone} standalone · discounted with a subscription`,
    icon: Shield,
  },
  {
    href: "/cppa-cybersecurity",
    title: "CPPA Cybersecurity Readiness",
    description: "Module 2 audit readiness across all 18 required controls, mapped to NIST CSF and ISO 27001. Includes Drift Watch (compare re-runs) and Breach Precedent Map (real enforcement actions for each control gap).",
    price: `${cyberStandalone} standalone · discounted with a subscription`,
    icon: Lock,
  },
];

const FAQ = [
  {
    q: "When do CPPA risk assessments and cybersecurity audits become enforceable?",
    a: "Businesses subject to the regulation must complete their first independent cybersecurity audit and certify compliance to the California Privacy Protection Agency by April 1, 2028. Risk-assessment obligations phase in earlier for higher-risk processing.",
  },
  {
    q: "What does the CPPA Audit Readiness Suite include?",
    a: "Scope determination, Module 1 risk assessment, Module 2 cybersecurity audit readiness across 18 controls, drift watch for re-runs, breach precedent mapping against real enforcement actions, and an auditor handoff package (independence advisor, scope memo, combined PDF).",
  },
  {
    q: "Do I need a subscription?",
    a: "No. Scope Checker is free. Risk and Cyber assessments are sold standalone or at a discounted per-use rate for annual subscribers. The full Suite bundle is also discounted for subscribers.",
  },
  {
    q: "Are citations verified?",
    a: "Yes. Every citation rendered in your report is checked against our current CCPA/CPPA corpus and tagged Verified or Unverified. Unverified citations are flagged so you can confirm against the primary source before relying on them.",
  },
];

export default function CPPAHub() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CPPA Audit Readiness Suite",
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `https://enduserprivacy.com${t.href}`,
      description: t.description,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>CPPA Audit Readiness Suite | End User Privacy</title>
        <meta
          name="description"
          content="Scope, risk-assess, and cybersecurity-audit-ready your business for the California Privacy Protection Agency's 2028 deadline."
        />
        {/* Canonical injected globally by <CanonicalTag /> — do not duplicate here. */}
        <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-teal font-medium">California Privacy Protection Agency</p>
          <h1 className="font-serif text-4xl md:text-5xl">CPPA Audit Readiness Suite</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Purpose-built tools to scope, risk-assess, and prepare your cybersecurity audit ahead of the
            April 1, 2028 CPPA certification deadline. Built directly on the final regulations and FSOR agency commentary.
          </p>
        </header>

        <section aria-label="Tools" className="grid md:grid-cols-2 gap-5">
          {TOOLS.map((t) => (
            <Link
              key={t.title}
              to={t.href}
              className="group block bg-card border rounded-lg p-6 hover:border-brand-teal transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md bg-brand-cloud text-brand-teal shrink-0">
                  <t.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif text-xl mb-1 group-hover:text-brand-teal">{t.title}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-steel">{t.price}</span>
                    <ArrowRight className="w-4 h-4 text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section aria-labelledby="faq-heading" className="bg-card border rounded-lg p-8">
          <h2 id="faq-heading" className="font-serif text-2xl mb-6">Frequently asked</h2>
          <dl className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-medium mb-1">{f.q}</dt>
                <dd className="text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-brand-navy text-white rounded-lg p-8">
          <h2 className="font-serif text-2xl mb-3">Start with the Scope Checker</h2>
          <p className="text-sm text-white/80 mb-5 max-w-2xl">
            Two minutes, free, no signup. Returns a clear in-scope / out-of-scope determination with cite-level reasoning.
          </p>
          <Link
            to="/cppa-scope-checker"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal/90"
          >
            Run Scope Checker <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
