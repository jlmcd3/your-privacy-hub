// QB-P25 B3 — RISK pointer/enum/rank normalizer.
// Extracted as a sibling so unit tests can exercise it without booting the
// generator. Pure functions; no I/O. Contract:
//
//   • exception_analysis[].strengthen_item_ids: string[] MUST reference an
//     existing strengthen_items[].item_id. Invalid ids are stripped. When
//     the array empties, the key is deleted.
//   • record_sufficiency.strengthen_item_ids: same discipline.
//   • adverse_effects[].likelihood coerces to the four-value enum; unknown
//     values fall back to "Possible" and are counted as droppedLikelihood.
//   • adverse_effects[].severity coerces to the four-value enum; unknown
//     values fall back to "Moderate" and are counted as droppedSeverity.
//   • priority_actions[].rank is mechanically renumbered 1..N. If every
//     entry carries a unique numeric rank, the pre-existing order is
//     preserved (sort by rank); otherwise the input array order is kept.
//
// information_needed is NEVER touched here — the open-items contract is
// frozen (see run-cppa-risk-assessment/index.ts routing rules).

export const LIKELIHOOD_ENUM = ["Unlikely", "Possible", "Likely", "Highly likely"] as const;
export const SEVERITY_ENUM = ["Minimal", "Moderate", "Significant", "Severe"] as const;
export type Likelihood = typeof LIKELIHOOD_ENUM[number];
export type Severity = typeof SEVERITY_ENUM[number];

export function coerceLikelihood(v: unknown): Likelihood | undefined {
  if (typeof v !== "string") return undefined;
  const x = v.trim().toLowerCase();
  if (!x) return undefined;
  if (x === "unlikely" || x === "low" || x === "rare" || x === "improbable") return "Unlikely";
  if (x === "possible" || x === "medium" || x === "moderate" || x === "plausible") return "Possible";
  if (x === "likely" || x === "high" || x === "probable") return "Likely";
  if (x === "highly likely" || x === "very likely" || x === "very high" || x === "certain" || x === "almost certain") return "Highly likely";
  return undefined;
}

export function coerceSeverity(v: unknown): Severity | undefined {
  if (typeof v !== "string") return undefined;
  const x = v.trim().toLowerCase();
  if (!x) return undefined;
  if (x === "minimal" || x === "minor" || x === "low" || x === "negligible") return "Minimal";
  if (x === "moderate" || x === "medium" || x === "modest") return "Moderate";
  if (x === "significant" || x === "high" || x === "major" || x === "serious") return "Significant";
  if (x === "severe" || x === "critical" || x === "very high" || x === "catastrophic") return "Severe";
  return undefined;
}

export function validStrengthenItemIds(report: any): Set<string> {
  const s = new Set<string>();
  const items = report?.strengthen_items;
  if (!Array.isArray(items)) return s;
  for (const it of items) {
    if (it && typeof it === "object" && typeof it.item_id === "string" && it.item_id.trim()) {
      s.add(it.item_id.trim());
    }
  }
  return s;
}

export function scrubStrengthenItemIds(input: unknown, valid: Set<string>): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t && valid.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

export interface NormalizeSummary {
  droppedLikelihood: number;
  droppedSeverity: number;
  ranksRenumbered: number;
  strippedIds: number;
}

export function normalizeRiskV2(report: any): NormalizeSummary {
  const summary: NormalizeSummary = {
    droppedLikelihood: 0,
    droppedSeverity: 0,
    ranksRenumbered: 0,
    strippedIds: 0,
  };
  if (!report || typeof report !== "object") return summary;

  const valid = validStrengthenItemIds(report);

  // exception_analysis pointers
  if (Array.isArray(report.exception_analysis)) {
    for (const ex of report.exception_analysis) {
      if (!ex || typeof ex !== "object") continue;
      if ("strengthen_item_ids" in ex) {
        const before = Array.isArray(ex.strengthen_item_ids) ? ex.strengthen_item_ids.length : 0;
        const kept = scrubStrengthenItemIds(ex.strengthen_item_ids, valid);
        summary.strippedIds += Math.max(0, before - kept.length);
        if (kept.length === 0) delete ex.strengthen_item_ids;
        else ex.strengthen_item_ids = kept;
      }
    }
  }

  // record_sufficiency pointers
  const rs = report.record_sufficiency;
  if (rs && typeof rs === "object" && "strengthen_item_ids" in rs) {
    const before = Array.isArray(rs.strengthen_item_ids) ? rs.strengthen_item_ids.length : 0;
    const kept = scrubStrengthenItemIds(rs.strengthen_item_ids, valid);
    summary.strippedIds += Math.max(0, before - kept.length);
    if (kept.length === 0) delete rs.strengthen_item_ids;
    else rs.strengthen_item_ids = kept;
  }

  // adverse_effects enum coercion
  if (Array.isArray(report.risk_assessment_by_activity)) {
    for (const act of report.risk_assessment_by_activity) {
      if (!act || typeof act !== "object") continue;
      if (!Array.isArray(act.adverse_effects)) continue;
      for (const ae of act.adverse_effects) {
        if (!ae || typeof ae !== "object") continue;
        const l = coerceLikelihood(ae.likelihood);
        if (l) {
          ae.likelihood = l;
        } else {
          summary.droppedLikelihood++;
          ae.likelihood = "Possible";
        }
        const s = coerceSeverity(ae.severity);
        if (s) {
          ae.severity = s;
        } else {
          summary.droppedSeverity++;
          ae.severity = "Moderate";
        }
      }
    }
  }

  // priority_actions rank uniqueness — mechanical renumber 1..N.
  if (Array.isArray(report.priority_actions) && report.priority_actions.length > 0) {
    const items = report.priority_actions.filter((a: any) => a && typeof a === "object");
    const ranks = items.map((a: any) =>
      typeof a.rank === "number" && Number.isFinite(a.rank) ? a.rank : null
    );
    const allNumeric = ranks.every((r: any) => r !== null);
    const allUnique = allNumeric && new Set(ranks).size === ranks.length;
    let ordered = items.slice();
    if (allUnique) {
      ordered.sort((a: any, b: any) => (a.rank as number) - (b.rank as number));
    }
    for (let i = 0; i < ordered.length; i++) {
      const desired = i + 1;
      if (ordered[i].rank !== desired) summary.ranksRenumbered++;
      ordered[i].rank = desired;
    }
    report.priority_actions = ordered;
  }

  return summary;
}

// Renderer helper — resolves item_id strings to the strengthen_items entry.
export function resolveStrengthenPointers(report: any): Record<string, any> {
  const map: Record<string, any> = {};
  if (!Array.isArray(report?.strengthen_items)) return map;
  for (const it of report.strengthen_items) {
    if (it && typeof it === "object" && typeof it.item_id === "string") {
      map[it.item_id] = it;
    }
  }
  return map;
}
