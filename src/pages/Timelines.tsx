import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const TIMELINES = [
  { slug: "gdpr-enforcement", title: "GDPR Enforcement Timeline", icon: "🇪🇺", description: "Major GDPR enforcement milestones from adoption in 2016 to the record fines of 2023–2026." },
  { slug: "us-state-privacy-laws", title: "U.S. State Privacy Laws Timeline", icon: "🗺️", description: "When each US state enacted its comprehensive privacy law, from California's CCPA to 2026 newcomers." },
  { slug: "eu-ai-act", title: "EU AI Act Timeline", icon: "🤖", description: "The EU AI Act from initial proposal in April 2021 through full implementation in August 2026." },
];

const Timelines = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Law Regulatory Timelines — GDPR, AI Act, US State Laws | EndUserPrivacy</title>
        <meta name="description" content="Visual timelines of major privacy law milestones. GDPR enforcement history, EU AI Act implementation phases, US state privacy law enactment timeline." />
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">📜 Reference</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Regulatory Timelines</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Visual timelines of major regulatory milestones. Understand how privacy regulation evolved and what's coming next.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Premium upsell — slim contextual banner */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-amber-900 leading-snug">
            <span className="font-semibold">⭐ This tool is free.</span>
            {" "}Get this analysis delivered every Monday, re-written for your industry and jurisdictions.
          </p>
          <Link
            to="/subscribe"
            className="flex-shrink-0 text-[12px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline transition-colors whitespace-nowrap"
          >
            Get your analyst →
          </Link>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-timelines-top" className="py-3" />

        <div className="grid gap-4">
          {TIMELINES.map((t) => (
            <Link
              key={t.slug}
              to={`/timelines/${t.slug}`}
              className="flex items-start gap-4 p-6 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all no-underline"
            >
              <span className="text-3xl">{t.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">{t.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Timelines;
