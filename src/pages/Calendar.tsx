import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import calendarData from "@/data/regulatory_calendar.json";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeadlineCountdown from "@/components/calendar/DeadlineCountdown";
import AdBanner from "@/components/AdBanner";
import { supabase } from "@/integrations/supabase/client";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 US Federal" },
  { key: "us-states", label: "🗺️ US States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
  { key: "ai", label: "🤖 AI & Tech" },
  { key: "from-feed", label: "📰 From Feed" },
];

const TYPE_BADGE: Record<string, { label: string; classes: string }> = {
  effective_date: { label: "Effective Date", classes: "bg-primary/10 text-primary" },
  enforcement_start: { label: "Enforcement Start", classes: "bg-destructive/10 text-destructive" },
  comment_deadline: { label: "Comment Deadline", classes: "bg-yellow-100 text-yellow-700" },
  review_date: { label: "Review Date", classes: "bg-muted text-muted-foreground" },
  deadline: { label: "Deadline", classes: "bg-orange-100 text-orange-700" },
  key_date: { label: "Key Date", classes: "bg-violet-100 text-violet-700" },
};

interface CalendarEvent {
  date: string;
  title: string;
  description: string;
  jurisdiction: string;
  law: string;
  type: string;
  url: string;
  source: "static" | "db";
  attention_level?: string;
}

function matchFilter(event: CalendarEvent, key: string): boolean {
  if (key === "all") return true;
  if (key === "from-feed") return event.source === "db";
  const j = event.jurisdiction.toLowerCase();
  const l = event.law.toLowerCase();
  if (key === "us-federal") return j.includes("u.s.") && !j.includes("—");
  if (key === "us-states") return j.includes("u.s. —") || j.includes("u.s. —");
  if (key === "eu-uk") return j.includes("european") || j.includes("uk") || j.includes("eu");
  if (key === "global") return j.includes("brazil") || j.includes("japan") || j.includes("singapore") || j.includes("australia") || j.includes("korea");
  if (key === "ai") return l.includes("ai") || l.includes("algorithmic") || l.includes("automated");
  return true;
}

const Calendar = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("title, key_date, category, summary, url, attention_level, direct_jurisdictions")
      .not("key_date", "is", null)
      .order("key_date", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        setDbEvents(
          data.map((u) => ({
            date: u.key_date!,
            title: u.title,
            description: u.summary || "",
            jurisdiction: (u.direct_jurisdictions as string[] | null)?.[0] || u.category || "Global",
            law: u.category || "",
            type: "key_date",
            url: u.url,
            source: "db" as const,
            attention_level: u.attention_level || undefined,
          }))
        );
      });
  }, []);

  const staticEvents: CalendarEvent[] = useMemo(
    () =>
      (calendarData as any[]).map((e) => ({
        ...e,
        source: "static" as const,
      })),
    []
  );

  const allEvents = useMemo(() => {
    // Deduplicate by title similarity
    const staticTitles = new Set(staticEvents.map((e) => e.title.toLowerCase().slice(0, 40)));
    const unique = dbEvents.filter(
      (d) => !staticTitles.has(d.title.toLowerCase().slice(0, 40))
    );
    return [...staticEvents, ...unique].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [staticEvents, dbEvents]);

  const filtered = allEvents.filter((e) => matchFilter(e, activeFilter));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Law Compliance Deadlines Calendar 2026 | Your Privacy Hub</title>
        <meta name="description" content="Key dates for GDPR, EU AI Act, CCPA/CPRA, and US state privacy law compliance deadlines. Countdown timers for every major regulatory effective date in 2026." />
      </Helmet>
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">📅 Reference</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Regulatory Key Dates Calendar</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Every significant regulatory effective date, enforcement start date, and compliance deadline for 2026–2027. Now enhanced with key dates extracted from our news feed.
          </p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <DeadlineCountdown />

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[13px] text-amber-900 leading-snug">
            <span className="font-semibold">⭐ This tool is free.</span>
            {" "}Get this analysis delivered every Monday, re-written for your industry and jurisdictions.
          </p>
          <Link
            to="/subscribe"
            className="flex-shrink-0 text-[12px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline transition-colors whitespace-nowrap"
          >
            Get Intelligence →
          </Link>
        </div>

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
              {f.key === "from-feed" && dbEvents.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/20 px-1.5 rounded-full">{dbEvents.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  {["Date", "Event", "Jurisdiction", "Law / Source", "Type"].map((h) => (
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
                        <div className="flex items-center gap-2">
                          <Link to={event.url} className="text-sm font-medium text-foreground hover:text-primary transition-colors no-underline">
                            {event.title}
                          </Link>
                          {event.source === "db" && (
                            <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">Feed</span>
                          )}
                          {event.attention_level === "High" && (
                            <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">🔴 High</span>
                          )}
                        </div>
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
