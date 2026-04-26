interface StatRowProps {
  stats: { value: string; label: string; sublabel?: string }[];
  accentColor?: "navy" | "sky" | "teal" | "orange" | "red";
}

export function StatRow({ stats, accentColor = "navy" }: StatRowProps) {
  const valueColor = {
    navy: "text-navy",
    sky: "text-sky-700",
    teal: "text-teal-700",
    orange: "text-orange-700",
    red: "text-red-700",
  }[accentColor];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
      {stats.map((s, i) => (
        <div key={i} className="bg-slate-50 border border-fog rounded-xl px-4 py-3 text-center">
          <p className={`font-display text-[24px] font-bold leading-none mb-1 ${valueColor}`}>{s.value}</p>
          <p className="text-[11px] text-slate leading-snug font-medium">{s.label}</p>
          {s.sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{s.sublabel}</p>}
        </div>
      ))}
    </div>
  );
}
