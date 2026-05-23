import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "How often is the platform updated?",
    a: "Daily. Our systems monitor 119 regulatory authorities continuously — including the EDPB, ICO, FTC, CNIL, all 50 US state attorneys general, and dozens of national data protection authorities worldwide. New articles are ingested, filtered for relevance, and summarized within hours of publication.",
  },
  {
    q: "Who writes the analysis?",
    a: "All summaries and the weekly Privacy Intelligence Report are drawn from primary source material — press releases, regulatory announcements, and authoritative news coverage. Every enforcement table entry is traced to a specific source article. We do not rely on secondary reporting or third-party aggregators for core intelligence.",
  },
  {
    q: "What countries and jurisdictions are covered?",
    a: "150+ jurisdictions including all 27 EU member states, the US (federal + all 50 states), the United Kingdom, Canada, Brazil, Australia, Japan, Singapore, South Korea, UAE, India, and more. Coverage expands continuously as new regulatory authorities are added to our monitoring network.",
  },
  {
    q: "What's included in the free tier?",
    a: "The entire platform is free to browse: all regulator profiles, jurisdiction pages (150+ countries), the enforcement tracker (most recent 12 actions), all research guides (GDPR, AI Privacy, US Federal and State law, Global Privacy Laws), and the free Monday news digest email with the top 5 developments of the week.",
  },
  {
    q: "What does Intelligence add?",
    a: "Intelligence subscribers receive the full 8-section weekly Privacy Intelligence Report every Monday. It includes: an executive summary with regulatory context, regional deep-dives for US Federal, US States, EU & UK, and Global developments, a full enforcement table with fine amounts and legal basis, a trend signal comparing week-over-week patterns, and a Why This Matters section with specific action items for General Counsel and Chief Privacy Officers.\n\nEvery article also includes a pre-built AI investigation prompt for paid subscribers. The prompt is automatically assembled from the article's regulatory context — jurisdiction, legal theory, compliance impact, and recommended actions — so you can paste it directly into Claude, ChatGPT, or any AI assistant and begin your own investigation immediately, without having to construct the prompt yourself.",
  },
  {
    q: "How is the analysis produced?",
    a: "AI-generated with a built-in verification pass. After the brief is generated, a second AI call checks every enforcement table entry against the source articles to verify that fine amounts, regulator names, and other specific facts are directly traceable to the original sources. Sections with thin source coverage are flagged in the brief itself.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can cancel anytime — no cancellation fees, no notice period required. Cancel directly from your account settings or by emailing hello@enduserprivacy.com. If you cancel, you retain access until the end of your current billing period.",
  },
  {
    q: "Is my payment information secure?",
    a: "Yes. All payments are processed by Stripe, one of the world's most trusted payment processors. We never store your card details on our servers. Your payment information is encrypted and handled entirely within Stripe's secure environment.",
  },
];

const pricingFaqs = [
  {
    q: "How much does End User Privacy cost?",
    a: "Privacy Intelligence is $20/month (or $200/year — save $40) and includes the weekly Privacy Intelligence Report, enforcement tracking across 119 authorities, and all reference content. It starts with a 10-day free trial. Professional is $30/month base + $150/client/year and adds client/matter workspaces, branded document outputs, up to 3 team logins, and 1 free Convenience Tool run per client per month (annual plan). Individual compliance tools are available standalone for all users.",
  },
  {
    q: "What is included in Professional?",
    a: "Professional ($35/month base + $150/client/year) includes everything in Intelligence for the account holder, plus a dedicated client/matter workspace, branded document outputs, up to 3 team logins, per-client tool allowances, and a 25% discount on every compliance tool. Tools are per-use (not bundled). The CPPA Scope Checker is always free; CPPA Risk Assessment and CPPA Cybersecurity Audit are paid for all tiers but discounted for subscribers.",
  },
  {
    q: "Can I try the tools before subscribing?",
    a: "The CPPA Scope Checker is free and requires no account. The Privacy Intelligence Feed is free to browse. Registering a free account gives you access to the Context layer on all articles. The weekly Privacy Intelligence Report and compliance tools require a paid subscription.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0, 1]));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>FAQ | End User Privacy — Privacy Intelligence Platform</title>
        <meta name="description" content="Common questions about End User Privacy — coverage across 150+ jurisdictions, AI analysis methodology, update frequency, pricing, and cancellation." />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-navy to-navy-light py-16 px-4">
        <div className="max-w-[760px] mx-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-accent-light bg-accent-light/10 px-3 py-1.5 rounded-full border border-accent-light/20 mb-4">
          ❓ FREQUENTLY ASKED QUESTIONS
        </span>
        <h1 className="font-display text-white mb-3">
          Everything you need to know
        </h1>
        <p className="text-slate-light text-[15px]">
          Can't find your answer? Email us at{" "}
          <a href="mailto:hello@enduserprivacy.com" className="text-sky hover:underline">
            hello@enduserprivacy.com
          </a>
        </p>
        </div>
      </section>



      {/* Accordion */}
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card border border-fog rounded-xl mb-3 overflow-hidden">
            <button
              onClick={() => {
                setOpenIndices(prev => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  return next;
                });
              }}
              className="w-full flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-fog transition-colors text-left"
            >
              <span className="font-medium text-navy text-[15px] pr-4">{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-silver transition-transform duration-200 ${openIndices.has(i) ? "rotate-180" : ""}`}
              />
            </button>
            {openIndices.has(i) && (
              <div className="px-6 pb-5 text-[14px] text-slate leading-relaxed whitespace-pre-line">{faq.a}</div>
            )}
          </div>
        ))}

        <h2 className="font-display text-navy mt-10 mb-4">Pricing</h2>
        {pricingFaqs.map((faq, j) => {
          const i = faqs.length + j;
          return (
            <div key={i} className="bg-card border border-fog rounded-xl mb-3 overflow-hidden">
              <button
                onClick={() => {
                  setOpenIndices(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    return next;
                  });
                }}
                className="w-full flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-fog transition-colors text-left"
              >
                <span className="font-medium text-navy text-[15px] pr-4">{faq.q}</span>
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
        <div className="bg-navy rounded-2xl p-8 text-center mt-12">
          <h2 className="text-white font-display mb-2">Still have questions?</h2>
          <p className="text-slate-light text-[14px] mb-4">We're happy to help.</p>
          <a
            href="mailto:hello@enduserprivacy.com"
            className="inline-block px-6 py-3 bg-white text-navy font-semibold rounded-lg hover:opacity-90 transition-all no-underline text-[14px]"
          >
            Email us →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
