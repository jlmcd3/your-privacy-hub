import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Filters {
  q: string;
  jurisdiction: string;
  sector: string;
  dataCat: string;
  violation: string;
  significance: string;
}

interface Stats {
  total: number;
  totalFinesEur: number;
  largestFine: number;
  topJurisdictionsThisYear: { name: string; count: number; fines: number }[];
  topViolations: { name: string; count: number }[];
  yearlyTotal: number;
}

function fmtEur(n: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Math.round(n)}`;
}

function Bar({ value, max, label, right }: { value: number; max: number; label: string; right: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs gap-2">
        <span className="capitalize truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums shrink-0">{right}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function EnforcementStats({ filters }: { filters: Filters }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      // Build same filters as main query but pull only fields needed for aggregation
      // Stats reflect current 60-day public window (matches what the user sees)
      let query = supabase
        .from("enforcement_actions")
        .select("jurisdiction,decision_date,fine_eur_equivalent,fine_eur,violation_types");

      if (filters.jurisdiction !== "all") query = query.eq("jurisdiction", filters.jurisdiction);
      if (filters.sector !== "all") query = query.eq("industry_sector", filters.sector);
      if (filters.dataCat !== "all") query = query.contains("data_categories", [filters.dataCat]);
      if (filters.violation !== "all") query = query.contains("violation_types", [filters.violation]);
      if (filters.significance !== "any") query = query.gte("precedent_significance", parseInt(filters.significance));
      if (filters.q.trim()) {
        const like = `%${filters.q.trim()}%`;
        query = query.or(`subject.ilike.${like},violation.ilike.${like},key_compliance_failure.ilike.${like}`);
      }

      // Pull up to 4000 rows for aggregation (covers full filtered set)
      const { data, error } = await query.limit(4000);
      if (cancelled) return;
      if (error) {
        console.error(error);
        setStats(null);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      const currentYear = new Date().getFullYear();
      let totalFines = 0;
      let largest = 0;
      let yearlyTotal = 0;
      const byJurisdictionYear = new Map<string, { count: number; fines: number }>();
      const byViolation = new Map<string, number>();

      for (const r of rows as any[]) {
        const fine = Number(r.fine_eur_equivalent ?? r.fine_eur ?? 0);
        if (fine > 0) {
          totalFines += fine;
          if (fine > largest) largest = fine;
        }
        const dt = r.decision_date ? new Date(r.decision_date) : null;
        const isThisYear = dt && dt.getFullYear() === currentYear;
        if (isThisYear) {
          yearlyTotal += 1;
          const key = String(r.jurisdiction ?? "Unknown").trim();
          if (key) {
            const cur = byJurisdictionYear.get(key) ?? { count: 0, fines: 0 };
            cur.count += 1;
            cur.fines += fine > 0 ? fine : 0;
            byJurisdictionYear.set(key, cur);
          }
        }
        for (const v of (r.violation_types ?? []) as string[]) {
          const k = String(v).trim();
          if (k) byViolation.set(k, (byViolation.get(k) ?? 0) + 1);
        }
      }

      const topJurisdictionsThisYear = [...byJurisdictionYear.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, v]) => ({ name, count: v.count, fines: v.fines }));

      const topViolations = [...byViolation.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        total: rows.length,
        totalFinesEur: totalFines,
        largestFine: largest,
        topJurisdictionsThisYear,
        topViolations,
        yearlyTotal,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [filters.q, filters.jurisdiction, filters.sector, filters.dataCat, filters.violation, filters.significance]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
      </div>
    );
  }

  if (!stats || stats.total === 0) return null;

  const currentYear = new Date().getFullYear();
  const maxJ = stats.topJurisdictionsThisYear[0]?.count ?? 0;
  const maxV = stats.topViolations[0]?.count ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Headline numbers */}
      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Last 60 days</div>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-serif">{stats.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Enforcement actions</div>
            </div>
            <div>
              <div className="text-2xl font-serif tabular-nums">{fmtEur(stats.totalFinesEur)}</div>
              <div className="text-xs text-muted-foreground">Total fines</div>
            </div>
            <div>
              <div className="text-base font-medium tabular-nums">{fmtEur(stats.largestFine)}</div>
              <div className="text-xs text-muted-foreground">Largest single fine</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top jurisdictions this year */}
      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Top jurisdictions {currentYear}</div>
          <div className="text-[11px] text-muted-foreground mb-3">
            {stats.yearlyTotal.toLocaleString()} action{stats.yearlyTotal === 1 ? "" : "s"} this year
          </div>
          {stats.topJurisdictionsThisYear.length === 0 ? (
            <p className="text-xs text-muted-foreground">No actions this year match filters.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topJurisdictionsThisYear.map((j) => (
                <Bar
                  key={j.name}
                  value={j.count}
                  max={maxJ}
                  label={j.name}
                  right={`${j.count} · ${fmtEur(j.fines)}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top violation types */}
      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Top violation types</div>
          {stats.topViolations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No violation types tagged in this view.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topViolations.map((v) => (
                <Bar
                  key={v.name}
                  value={v.count}
                  max={maxV}
                  label={v.name}
                  right={`${v.count}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
