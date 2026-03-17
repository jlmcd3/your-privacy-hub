import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const FINE_BY_REGULATOR = [
  { regulator: "DPC (Ireland)", amount: 1420, color: "#0d2240" },
  { regulator: "CNIL (France)", amount: 310,  color: "#1d4ed8" },
  { regulator: "Garante (Italy)", amount: 290, color: "#2563eb" },
  { regulator: "FTC (USA)",     amount: 275,  color: "#3b82f6" },
  { regulator: "ICO (UK)",      amount: 210,  color: "#60a5fa" },
  { regulator: "AEPD (Spain)",  amount: 185,  color: "#93c5fd" },
  { regulator: "PIPC (Korea)",  amount: 140,  color: "#bfdbfe" },
];

const FINE_BY_LAW = [
  { name: "GDPR (EU)",    value: 52, color: "#0d2240" },
  { name: "UK GDPR",      value: 14, color: "#1d4ed8" },
  { name: "US State Laws",value: 18, color: "#3b82f6" },
  { name: "PIPL (China)", value: 7,  color: "#60a5fa" },
  { name: "Other",        value: 9,  color: "#93c5fd" },
];

const MONTHLY_FINES = [
  { month: "Oct 25", count: 8,  total: 48  },
  { month: "Nov 25", count: 11, total: 124 },
  { month: "Dec 25", count: 7,  total: 62  },
  { month: "Jan 26", count: 14, total: 890 },
  { month: "Feb 26", count: 9,  total: 71  },
  { month: "Mar 26", count: 6,  total: 38  },
];

const TOOLTIP_STYLE = {
  background: "#0d2240", border: "none", borderRadius: 10,
  color: "#fff", fontSize: 12, padding: "10px 14px",
};

export default function EnforcementCharts() {
  return (
    <div className="mt-10 space-y-6">
      <h2 className="font-display font-bold text-navy text-xl">
        📊 Enforcement Analytics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total fines (2026 YTD)", value: "$2.4B+",   sub: "across all jurisdictions", color: "text-red-500" },
          { label: "Actions this month",      value: "23",       sub: "new decisions issued",     color: "text-amber-500" },
          { label: "Average fine size",       value: "€4.2M",    sub: "GDPR enforcement only",    color: "text-blue-500" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-fog p-5">
            <div className={`font-display font-bold text-3xl ${k.color}`}>{k.value}</div>
            <div className="text-navy font-semibold text-sm mt-1">{k.label}</div>
            <div className="text-slate text-xs mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-fog p-6">
          <h3 className="font-bold text-navy text-[14px] mb-4">Top Regulators by Fine Volume (€M, 2023–2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={FINE_BY_REGULATOR} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `€${v}M`} />
              <YAxis type="category" dataKey="regulator" tick={{ fontSize: 11, fill: "#475569" }} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`€${v}M`, "Total fines"]} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {FINE_BY_REGULATOR.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-fog p-6">
          <h3 className="font-bold text-navy text-[14px] mb-4">Enforcement Actions by Law (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={FINE_BY_LAW}
                cx="40%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {FINE_BY_LAW.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                layout="vertical" align="right" verticalAlign="middle"
                formatter={(value) => <span style={{ fontSize: 12, color: "#475569" }}>{value}</span>}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-fog p-6">
        <h3 className="font-bold text-navy text-[14px] mb-4">Monthly Enforcement Actions (Oct 2025 – Mar 2026)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MONTHLY_FINES}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any) => [n === "count" ? v + " actions" : `€${v}M total`, ""]} />
            <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Actions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-slate-light text-xs text-right">
        Data reflects tracked enforcement actions. Amounts in EUR equivalent. Updated weekly.
      </p>
    </div>
  );
}
