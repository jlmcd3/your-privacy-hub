import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "How often is the platform updated?",
    a: "Daily. Our systems monitor 250+ regulatory authorities continuously — including the EDPB, ICO, FTC, CNIL, all 50 US state attorneys general, and dozens of national data protection authorities worldwide. New articles are ingested, filtered for relevance, and AI-summarized within hours of publication.",
  },
  {
    q: "Who writes the analysis?",
    a: "All summaries and the weekly Intelligence Brief are AI-generated from primary source material — press releases, regulatory announcements, and authoritative news coverage. Every enforcement table entry is traced to a specific source article. We do not rely on secondary reporting or third-party aggregators for core intelligence.",
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
    q: "What does Premium add?",
    a: "Premium subscribers receive the full 8-section Weekly Intelligence Brief every Monday. It includes: an executive summary with regulatory context, regional deep-dives for US Federal, US States, EU & UK, and Global developments, a full enforcement table with fine amounts and legal basis, a trend signal comparing week-over-week patterns, and a Why This Matters section with specific action items for General Counsel and Chief Privacy Officers.",
  },
  {
    q: "Is the content AI-only or human-reviewed?",
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

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Topbar />
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-navy to-navy-light py-16 px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-accent-light bg-accent-light/10 px-3 py-1.5 rounded-full border border-accent-light/20 mb-4">
          ❓ FREQUENTLY ASKED QUESTIONS
        </span>
        <h1 className="font-display text-[32px] md:text-[40px] text-white font-bold mb-3">
          Everything you need to know
        </h1>
        <p className="text-slate-light text-[15px]">
          Can't find your answer? Email us at{" "}
          <a href="mailto:hello@enduserprivacy.com" className="text-sky hover:underline">
            hello@enduserprivacy.com
          </a>
        </p>
      </section>

      {/* Accordion */}
      <div className="max-w-[760px] mx-auto px-4 py-12 flex-1">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card border border-fog rounded-xl mb-3 overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-fog transition-colors text-left"
            >
              <span className="font-medium text-navy text-[15px] pr-4">{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-silver transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
              />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-5 text-[14px] text-slate leading-relaxed">{faq.a}</div>
            )}
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="bg-navy rounded-2xl p-8 text-center mt-12">
          <h2 className="text-white font-display text-[20px] mb-2">Still have questions?</h2>
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
