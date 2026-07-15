import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { INTELLIGENCE_PRICING, PLATFORM_PRICING, PRICING } from "@/config/pricing";

const I_MO = INTELLIGENCE_PRICING.monthly();
const I_YR = INTELLIGENCE_PRICING.yearly();
const P_MO = PLATFORM_PRICING.standardMonthly();
const P_CLIENT = PLATFORM_PRICING.clientAddon();
// Annual saving derived so it can't drift from PRICING.
const I_ANNUAL_SAVING = `$${PRICING.intelligence.monthly.dollars * 12 - PRICING.intelligence.annual.dollars}`;

const faqs = [
  {
    q: "How often is the platform updated?",
    a: "Daily. Our systems continuously monitor regulatory authorities across the world, including the EDPB, ICO, FTC, CNIL, all 50 US state attorneys general, and dozens of national data protection authorities worldwide. New articles are ingested, filtered for relevance, and summarized within hours of publication.",
  },
  {
    q: "Who writes the analysis?",
    a: "All summaries and the weekly Privacy Intelligence Report are drawn from primary source material: press releases, regulatory announcements, and authoritative news coverage. Every enforcement table entry is traced to a specific source article. We do not rely on secondary reporting or third-party aggregators for core intelligence.",
  },
  {
    q: "What countries and jurisdictions are covered?",
    a: "Jurisdictions across the world including all 27 EU member states, the US (federal + all 50 states), the United Kingdom, Canada, Brazil, Australia, Japan, Singapore, South Korea, UAE, India, and more. Coverage expands continuously as new regulatory authorities are added to our monitoring network.",
  },
  {
    q: "What's included in the free tier?",
    a: "The entire platform is free to browse: all regulator profiles, jurisdiction pages (countries worldwide), the enforcement tracker (most recent 12 actions), all research guides (GDPR, AI Privacy, US Federal and State law, Global Privacy Laws), and the free Monday news digest email with the top 5 developments of the week.",
  },
  {
    q: "What does Intelligence add?",
    a: "Intelligence subscribers receive the full 8-section weekly Privacy Intelligence Report every Monday. It includes: an executive summary with regulatory context, regional deep-dives for US Federal, US States, EU & UK, and Global developments, a full enforcement table with fine amounts and legal basis, a trend signal comparing week-over-week patterns, and a Why This Matters section with specific action items for General Counsel and Chief Privacy Officers.\n\nEvery article also includes a pre-built AI investigation prompt for paid subscribers. The prompt is automatically assembled from the article's regulatory context (jurisdiction, legal theory, compliance impact, and recommended actions), so you can paste it directly into Claude, ChatGPT, or any AI assistant and begin your own investigation immediately, without having to construct the prompt yourself.",
  },
  {
    q: "How is the analysis produced?",
    a: "Professionally curated with a built-in verification pass. For compliance tools, every output includes enforcement citations so you can verify the source. For the weekly Intelligence Report, data is confirmed against sources.",
  },
  {
    q: "What are the enforcement citations in tool outputs?",
    a: "Smart Tools (LIA, DPIA, Governance Assessment, DPA Generator, Biometric Check, CPPA Risk, CPPA Cybersecurity) show enforcement corpus citations alongside their findings: the specific regulatory decisions that supported each conclusion. Citations link directly to the enforcement action record. Primary sources and legal counsel review are still required before relying on any regulatory position.",
  },
  {
    q: "How many generations do I get per Smart Tool report?",
    a: "Every Smart Tool report includes 4 generations: one initial run plus up to 3 revisions. Use the Refine panel to change your answers or add context and regenerate at no extra cost. Once you've used all 4, you can purchase 4 additional generations as a top-up.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime, with no cancellation fees and no notice period required. Cancel directly from your account settings or by emailing hello@enduserprivacy.com. If you cancel, you retain access until the end of your current billing period.",
  },
  {
    q: "Is my payment information secure?",
    a: "Yes. All payments are processed by Stripe, one of the world's most trusted payment processors. We never store your card details on our servers. Your payment information is encrypted and handled entirely within Stripe's secure environment.",
  },
];

const pricingFaqs = [
  {
    q: "How much does End User Privacy cost?",
    a: `Privacy Intelligence is ${I_MO} (or ${I_YR}, save ${I_ANNUAL_SAVING}) and includes the weekly Privacy Intelligence Report, enforcement tracking of privacy developments across the world, and all reference content. Every paid subscription also includes RoPA Builder, US + EU/Global Notice Builders, IR Playbook, Biometric Checker, and DPA Generator at no extra charge. It starts with a 10-day free trial. Professional is ${P_MO} base + ${P_CLIENT} and adds client/matter workspaces. Annual Intelligence plans include 1 free Smart Tool run per year; annual Professional plans include 3 free Smart Tool runs per year (Governance, LIA, or DPIA).`,
  },
  {
    q: "What is included in Professional?",
    a: `Professional (${P_MO} base + ${P_CLIENT}) includes everything in Intelligence for the account holder, plus a dedicated client/matter workspace. RoPA Builder, US + EU/Global Notice Builders, IR Playbook, Biometric Checker, and DPA Generator are bundled in. Smart Tools (Governance, LIA, DPIA, CPPA) are per-use for all tiers; annual Intelligence subscribers receive 1 free Smart Tool run per year and annual Professional subscribers receive 3 (Governance, LIA, or DPIA). The CPPA Scope Checker is always free.`,
  },
  {
    q: "Can I try the tools before subscribing?",
    a: "The CPPA Scope Checker is free and requires no account. The Privacy Intelligence Feed is free to browse. Registering a free account gives you access to the Context layer on all articles. The weekly Privacy Intelligence Report and compliance tools require a paid subscription.",
  },
  {
    q: "Can I get my reports in other languages?",
    a: "Yes. Every generated report and document can be translated into more than 20 languages (including French, German, Spanish, Italian, Dutch, Polish, Portuguese, Japanese, and Chinese) directly from the report page, at no extra charge (up to 4 languages per report). The English original remains the authoritative version. The weekly Privacy Intelligence Report is likewise available in your preferred language.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0, 1]));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>FAQ | End User Privacy: Privacy Intelligence Platform</title>
        <meta name="description" content="Common questions about End User Privacy: coverage across jurisdictions worldwide, methodology, update frequency, pricing, and cancellation." />
        <meta property="og:title" content="FAQ | End User Privacy" />
        <meta property="og:description" content="Answers on coverage, methodology, pricing, and cancellation for the End User Privacy intelligence platform." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [...faqs, ...pricingFaqs].map(f => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="Frequently Asked Questions">

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-navy to-brand-slate-teal py-16 px-4">
        <div className="max-w-[760px] mx-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-accent-light bg-accent-light/10 px-3 py-1.5 rounded-full border border-accent-light/20 mb-4">
          ❓ FREQUENTLY ASKED QUESTIONS
        </span>
        <h1 className="font-display text-white mb-3">
          Everything you need to know
        </h1>
        <p className="text-brand-mist text-[15px]">
          Can't find your answer? Email us at{" "}
          <a href="mailto:hello@enduserprivacy.com" className="text-brand-mist hover:underline">
            hello@enduserprivacy.com
          </a>
        </p>
        </div>
      </section>



      {/* Accordion */}
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card border border-brand-cloud rounded-xl mb-3 overflow-hidden">
            <button
              onClick={() => {
                setOpenIndices(prev => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  return next;
                });
              }}
              className="w-full flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-brand-cloud transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              <span className="font-medium text-brand-navy text-[15px] pr-4">{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-silver transition-transform duration-200 ${openIndices.has(i) ? "rotate-180" : ""}`}
              />
            </button>
            {openIndices.has(i) && (
              <div className="px-6 pb-5 text-[14px] text-slate leading-relaxed whitespace-pre-line">{faq.a}</div>
            )}
          </div>
        ))}

        <h2 className="font-display text-brand-navy mt-10 mb-4">Pricing</h2>
        {pricingFaqs.map((faq, j) => {
          const i = faqs.length + j;
          return (
            <div key={i} className="bg-card border border-brand-cloud rounded-xl mb-3 overflow-hidden">
              <button
                onClick={() => {
                  setOpenIndices(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    return next;
                  });
                }}
                className="w-full flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-brand-cloud transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                <span className="font-medium text-brand-navy text-[15px] pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-silver transition-transform duration-200 ${openIndices.has(i) ? "rotate-180" : ""}`}
                />
              </button>
              {openIndices.has(i) && (
                <div className="px-6 pb-5 text-[14px] text-slate leading-relaxed whitespace-pre-line">{faq.a}</div>
              )}
            </div>
          );
        })}

        {/* Bottom CTA */}
        <div className="bg-brand-navy rounded-2xl p-8 text-center mt-12">
          <h2 className="text-white font-display mb-2">Still have questions?</h2>
          <p className="text-brand-mist text-[14px] mb-4">We're happy to help.</p>
          <a
            href="mailto:hello@enduserprivacy.com"
            className="inline-block px-6 py-3 bg-white text-brand-navy font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
          >
            Email us →
          </a>
        </div>
      </div>

      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
