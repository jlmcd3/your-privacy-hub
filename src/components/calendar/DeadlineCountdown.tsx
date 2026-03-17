import { useEffect, useState } from "react";

interface Deadline {
  id: string;
  title: string;
  jurisdiction: string;
  flag: string;
  date: Date;
  type: "effective_date" | "consultation_close" | "grace_period" | "reporting";
  description: string;
  priority: "critical" | "high" | "medium";
}

const UPCOMING_DEADLINES: Deadline[] = [
  {
    id: "1", flag: "🇬🇧", jurisdiction: "UK", priority: "critical",
    title: "UK DUAA — DSARs & ICO Powers in Force",
    date: new Date("2026-06-01"),
    type: "effective_date",
    description: "Data (Use & Access) Act 2025 complaints handling and ICO reformation provisions take effect.",
  },
  {
    id: "2", flag: "🇮🇳", jurisdiction: "India", priority: "high",
    title: "India DPDP — Rules Expected",
    date: new Date("2026-04-30"),
    type: "effective_date",
    description: "India's Data Protection Board rules expected to be finalized, triggering enforcement readiness requirements.",
  },
  {
    id: "3", flag: "🇪🇺", jurisdiction: "EU", priority: "high",
    title: "EU AI Act — GPAI Code of Practice Final",
    date: new Date("2026-05-02"),
    type: "consultation_close",
    description: "Final version of Code of Practice for General-Purpose AI models due.",
  },
  {
    id: "4", flag: "🇦🇺", jurisdiction: "Australia", priority: "medium",
    title: "Australia Privacy Reform — Tranche 2 Bill",
    date: new Date("2026-07-01"),
    type: "effective_date",
    description: "Second tranche of Australian Privacy Act reforms expected in Parliament.",
  },
  {
    id: "5", flag: "🇺🇸", jurisdiction: "US", priority: "medium",
    title: "Vermont TDPSA — Effective Date",
    date: new Date("2026-01-01"),
    type: "effective_date",
    description: "Vermont's comprehensive consumer data privacy law takes effect.",
  },
];

function getDaysRemaining(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getPriorityStyle(_priority: string, days: number) {
  if (days < 0)   return { bg: "bg-slate-100", border: "border-slate-200", badge: "bg-slate-200 text-slate-500", text: "Passed" };
  if (days <= 14) return { bg: "bg-red-50",    border: "border-red-200",   badge: "bg-red-500 text-white",      text: `${days}d` };
  if (days <= 60) return { bg: "bg-amber-50",  border: "border-amber-200", badge: "bg-amber-400 text-white",    text: `${days}d` };
  return           { bg: "bg-blue-50",   border: "border-blue-100",  badge: "bg-blue/10 text-blue border border-blue/20", text: `${days}d` };
}

export default function DeadlineCountdown() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...UPCOMING_DEADLINES]
    .map(d => ({ ...d, days: getDaysRemaining(d.date) }))
    .sort((a, b) => a.days - b.days);

  return (
    <div className="bg-white rounded-2xl border border-fog shadow-eup-sm mb-8">
      <div className="flex items-center justify-between px-6 py-4 border-b border-fog">
        <h2 className="font-display font-bold text-navy text-[15px] flex items-center gap-2">
          ⏱ Upcoming Regulatory Deadlines
        </h2>
        <span className="text-xs text-slate-light">Next 12 months</span>
      </div>
      <div className="divide-y divide-fog">
        {sorted.map(d => {
          const style = getPriorityStyle(d.priority, d.days);
          return (
            <div key={d.id} className={`flex items-center gap-4 px-6 py-4 ${style.bg} transition-colors`}>
              <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center font-bold ${style.badge}`}>
                <span className="text-lg leading-none">{style.text}</span>
                <span className="text-[9px] uppercase tracking-wide opacity-80 mt-0.5">
                  {d.days >= 0 ? "left" : "ago"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{d.flag}</span>
                  <span className="text-[10px] font-bold text-slate uppercase tracking-wider">{d.jurisdiction}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-fog rounded-full text-slate-light capitalize">
                    {d.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="font-bold text-navy text-[13px] leading-snug">{d.title}</div>
                <div className="text-slate text-[11px] mt-0.5 leading-snug line-clamp-1">{d.description}</div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="text-[11px] font-bold text-navy">
                  {d.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
