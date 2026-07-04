import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Shield, ClipboardCheck, Lock } from "lucide-react";
import { PRICING_REGISTRY } from "@/config/pricing";

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

const TIMELINE = [
  {
    date: "Jan 1, 2027",
    label: "ADMT pre-use notices and disclosures",
  },
  {
    date: "Dec 31, 2027",
    label: "Risk assessments must cover existing processing",
  },
  {
    date: "Apr 1, 2028",
    label: "First cybersecurity audit certifications due to the CPPA",
  },
];

const FAQ = [
  {
    q: "What are the CPPA deadlines?",
    a: "ADMT pre-use notices apply from January 1, 2027. Risk assessments must cover processing conducted from regulation effectiveness, with existing activities covered by December 31, 2027. The first cybersecurity audit certifications are due to the CPPA by April 1, 2028 for the largest businesses, phasing in afterward.",
  },
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
    a: "No. Scope Checker is free. Risk and Cyber assessments are sold standalone or at a discounted per-use rate for subscribers. The full Suite bundle is also discounted for subscribers.",
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
          content="Scope, risk-assess, and cybersecurity-audit-ready your business ahead of California's 2027–2028 CPPA deadlines."
        />
        <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-teal font-medium">California Privacy Protection Agency</p>
          <h1 className="text-page-h1">CPPA Audit Readiness Suite</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            California's audit regime is live, with three deadlines on the clock. These tools scope your obligations, build your risk-assessment record, and prepare your cybersecurity audit — built directly on the final regulations and the CPPA's Final Statement of Reasons, paragraph-cited.
          </p>
        </header>

        <section aria-label="Deadline timeline" className="grid sm:grid-cols-3 gap-3">
          {TIMELINE.map((node, i) => (
            <div
              key={node.date}
              className="relative bg-card border rounded-lg p-4 flex flex-col gap-1"
            >
              <span className="text-[11px] uppercase tracking-wider text-brand-teal font-semibold">
                Step {i + 1}
              </span>
              <span className="font-serif text-lg text-brand-navy">{node.date}</span>
              <span className="text-sm text-muted-foreground">{node.label}</span>
            </div>
          ))}
        </section>

        <section className="bg-brand-navy text-white rounded-lg p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-teal font-semibold mb-2">
            Step 1 — find out what applies to you (free)
          </p>
          <h2 className="font-serif text-2xl mb-3">Start with the Scope Checker</h2>
          <p className="text-sm text-white/80 mb-5 max-w-2xl">
            Two minutes, free, no signup. Returns a clear in-scope / out-of-scope determination with cite-level reasoning.
          </p>
          <Link
            to="/cppa-scope-checker"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-brand-teal text-white text-sm font-medium hover:bg-brand-teal/90 no-underline"
          >
            Run Scope Checker <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <section aria-label="Tools" className="space-y-4">
          <h2 className="font-serif text-2xl">Step 2 — build your readiness record</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {TOOLS.map((t) => (
              <Link
                key={t.title}
                to={t.href}
                className="group block bg-card border rounded-lg p-6 hover:border-brand-teal transition-colors no-underline"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-md bg-brand-cloud text-brand-teal shrink-0">
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl mb-1 group-hover:text-brand-teal text-brand-navy">{t.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-steel">{t.price}</span>
                      <ArrowRight className="w-4 h-4 text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground italic">
            Subscribers: every assessment's review date is tracked for you automatically — your § 7155(a) triennial review goes straight into your Obligations Register.
          </p>
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

        <section className="bg-card border rounded-lg p-8">
          <h2 className="font-serif text-2xl mb-2">ADMT Compliance Assessment — Module 3</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
            Automated decision-making technology disclosures are required from January 1, 2027.
            The ADMT Compliance Assessment produces a gap analysis covering pre-use notice (§ 7220),
            opt-out (§ 7221), and access right (§ 7222) obligations — cited to the regulation.
          </p>
          <Link
            to="/cppa-admt-checker"
            className="inline-block text-sm font-semibold text-white bg-brand-teal px-5 py-2.5 rounded-lg hover:opacity-90 transition no-underline"
          >
            Open the ADMT Compliance Assessment →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
