import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import calendarData from "@/data/regulatory_calendar.json";
import { supabase } from "@/integrations/supabase/client";

interface Deadline {
  date: string;
  title: string;
  jurisdiction: string;
  source: "static" | "db";
  category?: string;
  attention_level?: string;
}

export default function UpcomingDeadlines() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    const now = new Date().toISOString().split("T")[0];

    // Static deadlines
    const staticDeadlines: Deadline[] = (calendarData as { date: string; title: string; jurisdiction: string }[])
      .filter((d) => d.date > now)
      .map((d) => ({ ...d, source: "static" as const }));

    // DB key_date deadlines
    supabase
      .from("updates")
      .select("title, key_date, category, attention_level, direct_jurisdictions")
      .not("key_date", "is", null)
      .gte("key_date", now)
      .order("key_date", { ascending: true })
      .limit(10)
      .then(({ data }) => {
        const dbDeadlines: Deadline[] = (data || []).map((u) => ({
          date: u.key_date!,
          title: u.title,
          jurisdiction: (u.direct_jurisdictions as string[] | null)?.[0] || u.category || "Global",
          source: "db" as const,
          category: u.category || undefined,
          attention_level: u.attention_level || undefined,
        }));

        const merged = [...staticDeadlines, ...dbDeadlines]
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5);

        setDeadlines(merged);
      });
  }, []);

  if (deadlines.length === 0) return null;

  const now = new Date();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
        📅 Upcoming Deadlines
      </p>
      <div className="space-y-3">
        {deadlines.map((d, i) => {
          const diff = Math.ceil(
            (new Date(d.date).getTime() - now.getTime()) / 86400000
          );
          const urgencyClass =
            diff <= 14
              ? "text-red-700 bg-red-100 border-red-200"
              : diff <= 60
              ? "text-amber-700 bg-amber-100 border-amber-200"
              : "text-blue-700 bg-blue-100 border-blue-200";

          return (
            <div key={`${d.title}-${i}`} className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 text-[11px] font-bold border rounded-full px-2 py-0.5 mt-0.5 whitespace-nowrap ${urgencyClass}`}
              >
                {diff}d LEFT
              </span>
              <div className="min-w-0">
                <p className="text-foreground text-[12px] font-medium leading-snug line-clamp-2">
                  {d.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-muted-foreground text-[10px]">{d.jurisdiction}</p>
                  {d.source === "db" && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      From feed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Link
        to="/calendar"
        className="block text-primary text-[12px] font-semibold mt-3 no-underline hover:underline"
      >
        See all deadlines →
      </Link>
    </div>
  );
}
