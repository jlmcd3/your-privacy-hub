import { Link } from "react-router-dom";
import calendarData from "@/data/regulatory_calendar.json";

interface Deadline {
  date: string;
  title: string;
  jurisdiction: string;
}

export default function UpcomingDeadlines() {
  const now = new Date();
  const upcoming = (calendarData as Deadline[])
    .filter((d) => new Date(d.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-card border border-fog rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gold mb-3">
        📅 Upcoming Deadlines
      </p>
      <div className="space-y-3">
        {upcoming.map((d) => {
          const diff = Math.ceil(
            (new Date(d.date).getTime() - now.getTime()) / 86400000
          );
          return (
            <div key={d.title} className="flex items-start gap-3">
              <span className="flex-shrink-0 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 mt-0.5 whitespace-nowrap">
                {diff}d LEFT
              </span>
              <div className="min-w-0">
                <p className="text-navy text-[12px] font-medium leading-snug line-clamp-2">
                  {d.title}
                </p>
                <p className="text-slate text-[10px] mt-0.5">{d.jurisdiction}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Link
        to="/calendar"
        className="block text-blue text-[12px] font-semibold mt-3 no-underline hover:underline"
      >
        See all deadlines →
      </Link>
    </div>
  );
}
