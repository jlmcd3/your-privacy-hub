import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import calendarData from "@/data/regulatory_calendar.json";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeadlineCountdown from "@/components/calendar/DeadlineCountdown";
import AdBanner from "@/components/AdBanner";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 US Federal" },
  { key: "us-states", label: "🗺️ US States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
  { key: "ai", label: "🤖 AI & Tech" },
];

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  effective_date: { label: "Effective Date", classes: "bg-primary/10 text-primary" },
  enforcement_start: { label: "Enforcement Start", classes: "bg-destructive/10 text-destructive" },
  comment_deadline: { label: "Comment Deadline", classes: "bg-yellow-100 text-yellow-700" },
  review_date: { label: "Review Date", classes: "bg-muted text-muted-foreground" },
  deadline: { label: "Deadline", classes: "bg-orange-100 text-orange-700" },
};

function matchFilter(jurisdiction: string, law: string, key: string): boolean {
  if (key === "all") return true;
  const j = jurisdiction.toLowerCase();
  const l = law.toLowerCase();
  if (key === "us-federal") return j.includes("u.s.") && !j.includes("—");
  if (key === "us-states") return j.includes("u.s. —") || j.includes("u.s. —");
  if (key === "eu-uk") return j.includes("european") || j.includes("uk") || j.includes("eu");
  if (key === "global") return j.includes("brazil") || j.includes("japan") || j.includes("singapore") || j.includes("australia") || j.includes("korea");
  if (key === "ai") return l.includes("ai") || l.includes("algorithmic") || l.includes("automated");
  return true;
}

const Calendar = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const sorted = [...calendarData]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const filtered = sorted.filter((e) => matchFilter(e.jurisdiction, e.law, activeFilter));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Law Compliance Deadlines Calendar 2026 | EndUserPrivacy</title>
        <meta name="description" content="Key dates for GDPR, EU AI Act, CCPA/CPRA, and US state privacy law compliance deadlines. Countdown timers for every major regulatory effective date in 2026." />
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">📅 Reference</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Regulatory Key Dates Calendar</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Every significant regulatory effective date, enforcement start date, and compliance deadline for 2026–2027. The most-bookmarked tool for compliance teams.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        <DeadlineCountdown />

        <AdBanner variant="leaderboard" adSlot="eup-calendar-top" className="py-3" />

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer bg-transparent ${
                activeFilter === f.key
                  ? "bg-primary/10 text-primary border-primary/25 font-semibold"
                  : "text-muted-foreground border-border hover:border-primary/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  {["Date", "Event", "Jurisdiction", "Law", "Type"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground text-left border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((event, i) => {
                  const badge = TYPE_BADGE[event.type] || TYPE_BADGE.deadline;
                  const isPast = new Date(event.date) < new Date();
                  return (
                    <tr key={i} className={`hover:bg-muted/50 transition-colors ${isPast ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border whitespace-nowrap font-mono">
                        {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 border-b border-border">
                        <Link to={event.url} className="text-sm font-medium text-foreground hover:text-primary transition-colors no-underline">
                          {event.title}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border whitespace-nowrap">{event.jurisdiction}</td>
                      <td className="px-4 py-3 text-sm text-foreground border-b border-border">{event.law}</td>
                      <td className="px-4 py-3 border-b border-border">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No events found for this filter.</p>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Calendar;
