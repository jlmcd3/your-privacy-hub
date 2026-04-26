import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

import gdprData from "@/data/timelines/gdpr-enforcement.json";
import usStateData from "@/data/timelines/us-state-privacy-laws.json";
import euAiActData from "@/data/timelines/eu-ai-act.json";

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: string;
  source_url: string;
}

const TIMELINE_META: Record<string, { title: string; icon: string; description: string; data: TimelineEvent[] }> = {
  "gdpr-enforcement": { title: "GDPR Enforcement Timeline", icon: "🇪🇺", description: "Major GDPR enforcement milestones from adoption in 2016 to present.", data: gdprData },
  "us-state-privacy-laws": { title: "U.S. State Privacy Laws Timeline", icon: "🗺️", description: "When each US state enacted its comprehensive privacy law.", data: usStateData },
  "eu-ai-act": { title: "EU AI Act Timeline", icon: "🤖", description: "From initial proposal (April 2021) to full implementation (August 2026).", data: euAiActData },
};

const TYPE_COLORS: Record<string, string> = {
  law: "bg-primary",
  enforcement: "bg-destructive",
  guidance: "bg-yellow-500",
  court: "bg-purple-500",
  milestone: "bg-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  law: "Law",
  enforcement: "Enforcement",
  guidance: "Guidance",
  court: "Court Decision",
  milestone: "Milestone",
};

const TimelineDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const meta = slug ? TIMELINE_META[slug] : null;

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">Timeline Not Found</h1>
          <Link to="/timelines" className="text-primary hover:underline">Back to Timelines →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const sorted = [...meta.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const midIndex = Math.floor(sorted.length / 2);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{meta.title} | Your Privacy Hub</title>
        <meta name="description" content={meta.description} />
      </Helmet>
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link to="/timelines" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors no-underline mb-4 inline-block">
            ← All Timelines
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">{meta.icon} {meta.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{meta.description}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex gap-4 flex-wrap mb-8">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${TYPE_COLORS[key]}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot="eup-timeline-top" className="py-3 max-w-3xl mx-auto" />

      {/* Timeline */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sorted.map((event, i) => {
              const color = TYPE_COLORS[event.type] || TYPE_COLORS.milestone;
              const isFuture = new Date(event.date) > new Date();
              return (
                <div key={i}>
                  <div className={`relative pl-8 ${isFuture ? "opacity-70" : ""}`}>
                    {/* Dot */}
                    <div className={`absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-background ${color}`} />

                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${color} text-white`}>
                        {TYPE_LABELS[event.type] || event.type}
                      </span>
                      {isFuture && <span className="text-[9px] font-bold text-muted-foreground uppercase">Upcoming</span>}
                    </div>

                    <h3 className="text-sm font-semibold text-foreground mb-1">{event.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>

                    {event.source_url && event.source_url.startsWith("http") && (
                      <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline mt-1 inline-block no-underline">
                        Source →
                      </a>
                    )}
                  </div>
                  {i === midIndex && (
                    <AdBanner variant="inline" adSlot="eup-timeline-mid" className="py-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TimelineDetail;
