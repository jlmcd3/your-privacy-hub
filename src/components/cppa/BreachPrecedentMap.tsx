// Sprint 3 — Breach Precedent Map (UI)
// For each Gap / Critical Gap / Partial Gap control in the cyber report, queries
// `enforcement_actions` for matching enforcement actions and shows the top 3.
// Pure client-side: uses keyword patterns from cppa-control-precedent-keywords.ts.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CPPA_CONTROL_PRECEDENT_KEYWORDS } from "@/data/cppa-control-precedent-keywords";
import { controlStatusColor } from "@/pages/CPPACybersecurityResult";

type Action = {
  id: string;
  regulator: string | null;
  jurisdiction: string | null;
  subject: string | null;
  decision_date: string | null;
  fine_amount: string | null;
  key_compliance_failure: string | null;
  violation: string | null;
  source_url: string | null;
};

type ControlMatch = {
  control_key: string;
  control_label: string;
  status: string;
  actions: Action[];
};

function controlKeyFromLabel(label: string): string | null {
  const norm = (s: string) => s.toLowerCase().trim();
  const hit = CPPA_CONTROL_PRECEDENT_KEYWORDS.find((c) => norm(c.control_label) === norm(label));
  return hit?.control_key ?? null;
}

async function fetchActionsForPatterns(patterns: string[]): Promise<Action[]> {
  if (patterns.length === 0) return [];
  // OR across patterns, on either key_compliance_failure OR violation, prioritising
  // California / CCPA-relevant actions but not restricting to them — most consumer-data
  // enforcement is informative regardless of jurisdiction.
  const orClauses = patterns
    .flatMap((p) => [
      `key_compliance_failure.ilike.%${p}%`,
      `violation.ilike.%${p}%`,
    ])
    .join(",");
  const { data, error } = await supabase
    .from("enforcement_actions")
    .select("id,regulator,jurisdiction,subject,decision_date,fine_amount,key_compliance_failure,violation,source_url")
    .or(orClauses)
    .not("key_compliance_failure", "is", null)
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(3);
  if (error) {
    console.warn("breach precedent fetch failed", error);
    return [];
  }
  return (data ?? []) as Action[];
}

export default function BreachPrecedentMap({ report }: { report: any }) {
  const [matches, setMatches] = useState<ControlMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const isGap = (s?: string) => {
      const x = (s || "").toLowerCase();
      return x === "critical gap" || x === "gap" || x === "partial gap";
    };
    const controls = Array.isArray(report?.controls) ? report.controls : [];
    const gaps = controls.filter((c: any) => isGap(c.status));
    if (gaps.length === 0) { setLoading(false); return; }
    (async () => {
      const results: ControlMatch[] = [];
      for (const c of gaps) {
        const key = controlKeyFromLabel(c.control || "");
        if (!key) continue;
        const patterns = CPPA_CONTROL_PRECEDENT_KEYWORDS.find((p) => p.control_key === key)?.patterns ?? [];
        const actions = await fetchActionsForPatterns(patterns);
        if (actions.length > 0) {
          results.push({ control_key: key, control_label: c.control, status: c.status, actions });
        }
      }
      if (!cancelled) { setMatches(results); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [report]);

  if (loading) return null;
  if (matches.length === 0) return null;

  return (
    <section className="bg-card border rounded-lg p-6">
      <h2 className="mb-1">Breach Precedent Map</h2>
      <p className="text-xs text-muted-foreground mb-4">
        For each flagged gap control, the most recent enforcement actions in our database where the same control
        failure was a stated cause. These are illustrative precedents the auditor and counsel can use to assess
        likely regulator response — they are <strong>not</strong> a substitute for primary-source review.
      </p>
      <div className="space-y-5">
        {matches.map((m) => (
          <div key={m.control_key} className="border-t pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(m.status)}`}>{m.status}</span>
              <p className="text-sm font-medium">{m.control_label}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {m.actions.map((a) => (
                <a
                  key={a.id}
                  href={a.source_url || `/enforcement/${a.id}`}
                  target={a.source_url ? "_blank" : undefined}
                  rel={a.source_url ? "noreferrer" : undefined}
                  className="block bg-background border rounded p-3 text-xs hover:border-brand-teal transition-colors"
                >
                  <p className="font-medium line-clamp-2">{a.subject || "Untitled action"}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {a.regulator || "—"}{a.jurisdiction ? ` · ${a.jurisdiction}` : ""}{a.decision_date ? ` · ${a.decision_date}` : ""}
                  </p>
                  {a.fine_amount && (
                    <p className="text-[11px] mt-1">Penalty: <span className="font-mono">{a.fine_amount}</span></p>
                  )}
                  {a.key_compliance_failure && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3">{a.key_compliance_failure}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
