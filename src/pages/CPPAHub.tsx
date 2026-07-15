import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Shield, ClipboardCheck, Lock } from "lucide-react";
import { PRICING_REGISTRY } from "@/config/pricing";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";

// PP-1: map /cppa hub card hrefs to their tool_slug for tool_start_click.
const CPPA_CARD_SLUG: Record<string, string> = {
  "/cppa-scope-checker": "cppa_scope",
  "/cppa-risk-assessment": "cppa_risk",
  "/cppa-cybersecurity": "cppa_cyber",
  "/cppa-admt-checker": "cppa_admt",
};

const riskStandalone = PRICING_REGISTRY.cppa_risk_standalone.displayPrice;
const cyberStandalone = PRICING_REGISTRY.cppa_cyber_standalone.displayPrice;

const TOOLS = [
  {
    href: "/cppa-scope-checker",
    title: "CPPA Scope Checker",
    article: null,
    description: "Determine if your business is in scope for the new CPPA risk-assessment and cybersecurity-audit regulations.",
    price: "Free",
    icon: ClipboardCheck,
  },
  {
    href: "/cppa-risk-assessment",
    title: "CPPA Risk Assessment",
    article: "Module 1 · Article 10 (§§ 7150–7159)",
    description: "Module 1 risk assessment built directly on the final CPPA regulations and FSOR agency commentary.",
    price: `${riskStandalone} standalone · discounted with a subscription`,
    icon: Shield,
  },
  {
    href: "/cppa-cybersecurity",
    title: "CPPA Cybersecurity Readiness",
    article: "Module 2 · Article 9 (§§ 7120–7124)",
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
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";
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
          <p className="text-xs uppercase tracking-[0.18em] text-brand-teal-text font-medium">California Privacy Protection Agency</p>
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
              <span className="text-body-tiny uppercase tracking-wider text-brand-teal-text font-semibold">
                Step {i + 1}
              </span>
              <span className="font-serif text-lg text-brand-navy">{node.date}</span>
              <span className="text-sm text-muted-foreground">{node.label}</span>
            </div>
          ))}
        </section>

        <section className="bg-brand-navy text-white rounded-lg p-10 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-cloud font-semibold mb-3">
            Start here: free, 2 minutes, no signup
          </p>
          <h2 className="font-serif text-3xl md:text-4xl mb-3 text-white">Run the CPPA Scope Checker</h2>
          <p className="text-sm md:text-base text-white/80 mb-6 max-w-2xl mx-auto">
            Answers eight scoped questions and returns a cite-level obligation map: which modules apply to you (Risk, Cybersecurity, ADMT), by when, and at what registry price.
          </p>
          <Link
            to="/cppa-scope-checker"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded bg-brand-teal-deep text-white text-base font-semibold hover:bg-brand-teal/90 no-underline"
          >
            Run Scope Checker <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        <section aria-label="Tools" className="space-y-4">
          <h2 className="font-serif text-2xl">The three modules</h2>
          <p className="text-sm text-muted-foreground">
            The Scope Checker routes you to the modules that apply. You can also open them directly:
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {TOOLS.filter((t) => t.href !== "/cppa-scope-checker").map((t) => (
              <Link
                key={t.title}
                to={t.href}
                className="group block bg-card border rounded-lg p-6 hover:border-brand-teal transition-colors no-underline"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-md bg-brand-cloud text-brand-teal-text shrink-0">
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl mb-1 group-hover:text-brand-teal-text text-brand-navy">{t.title}</h3>
                    {t.article && (
                      <p className="text-body-tiny uppercase tracking-wider text-brand-teal-text font-semibold mb-2">{t.article}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-steel">{t.price}</span>
                      <ArrowRight className="w-4 h-4 text-brand-teal-text group-hover:translate-x-0.5 transition-transform" />
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

        <section className="bg-card border rounded-lg p-6">
          <p className="text-body-tiny uppercase tracking-wider text-brand-teal-text font-semibold mb-1">Module 3 · Article 11 (§§ 7200–7222)</p>
          <h3 className="font-serif text-xl mb-2">ADMT Compliance Assessment (Module 3)</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
            Sold standalone. If you also need Risk (Module 1) and Cybersecurity (Module 2), the Scope Checker will surface the Full Suite bundle.
          </p>
          <Link
            to="/cppa-admt-checker"
            className="text-sm font-medium text-brand-teal-text hover:underline no-underline"
          >
            Open the ADMT Compliance Assessment →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
