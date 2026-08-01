// ITEM 347 (DOCUMENT-PLAN REWORK) — cppa-risk COMPOSER.
//
// Joins the two halves of the program on one record:
//   * the ITEM 346 FRAME SET supplies the sentences (record-verbatim slots,
//     pinned registry-legal prose, pinned engine-conclusion clauses);
//   * the ITEM 339 PLAN, reworked here, supplies the document shape
//     (conclusion first, thematic grouping, referring expressions — all KEPT);
//   * the ITEM 347 REASONING GRAPH supplies the only connectives that may be
//     spoken, each traced to the engine structure that computed it.
//
// This file computes NOTHING about the law and NOTHING about the record. Every
// relation below is read off an engine structure that already exists
// (`consequence.rule_ids`, `safeguard_map[].harm_id`,
// `weighing[].offsetting_harm_ids`, `consequence.conditions`) and carries that
// path as its `basis`. Where the engine computed no relation, no edge is
// created and the statements are juxtaposed plainly.

import type { ActivityAnalytics } from "../../ltp/analytic-deliverables/types.ts";
import type { FrameSet } from "../frames.ts";
import { renderSectionFromFrames } from "../frame-render.ts";
import { buildCppaRiskFrameValues } from "../frames/cppa-risk.values.ts";
import type { SectionInput, SupportingStatement } from "../plan-render.ts";
import { edge, LEAD_NODE, type ReasoningEdge, ReasoningGraph } from "../reasoning-graph.ts";

export const CPPA_RISK_COMPOSE_VERSION = "prose-compose-2026-08-01-item347";

export interface ComposeResult {
  readonly inputs: Record<string, SectionInput>;
  readonly graph: ReasoningGraph;
  readonly entity: string;
  readonly determinations: { necessity: string; weighing: string; consequence: string };
  /** Frame sections that produced no text (FILL-OR-OMIT), for the report. */
  readonly omitted_frames: readonly string[];
}

const label = (k: string) =>
  k.replace(/^[qi]\d+[a-z]?_/i, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Record-card lines are labeled data, never pseudo-sentences (Item 347 rule 2). */
function card(id: string, theme: string, labelText: string, value: string): SupportingStatement {
  return {
    id,
    theme,
    kind: "record_card",
    label: labelText,
    value,
    sentence: "",
    relation: "none",
  };
}

export function composeCppaRisk(input: {
  intake: Record<string, unknown>;
  analytics: ActivityAnalytics;
  frames: FrameSet;
  inconsistencyFlags?: readonly string[];
  informationNeeded?: readonly string[];
}): ComposeResult {
  const { intake, analytics, frames } = input;
  const { values, determinations } = buildCppaRiskFrameValues({
    intake,
    analytics,
    inconsistencyFlags: input.inconsistencyFlags,
    informationNeeded: input.informationNeeded,
  });

  const omitted: string[] = [];
  const frameText = (section: string): string | null => {
    const r = renderSectionFromFrames(frames, section, { values, contract: "cppa-risk" });
    if (!r.rendered) {
      omitted.push(`${section} (missing: ${r.missing_required.join(", ") || "none"})`);
      return null;
    }
    return r.rendered.trim();
  };

  const entity = String(values.entity_name ?? "The company");
  const edges: ReasoningEdge[] = [];

  // ── DETERMINATION (headline) ─────────────────────────────────────────
  const opening = frameText("opening_analysis");
  const necessity = frameText("necessity_analysis");
  const harms = frameText("harm_analysis");
  const benefits = frameText("benefits_rationale");
  const narrative = frameText("processing_narrative");
  const scope = frameText("scope_notes");

  const summaryStatements: SupportingStatement[] = [];

  // The consequence clause the ENGINE reached, as the first supporting move.
  if (narrative) {
    summaryStatements.push({
      id: "consequence",
      theme: "outcome",
      sentence: narrative,
      relation: "consequence",
    });
    // EDGE: the engine's own decision is the consequence of the opening
    // analysis. Computed at `consequence.decision`.
    edges.push(edge(LEAD_NODE, "consequence", "consequence", "consequence.decision"));
  }

  if (necessity) {
    summaryStatements.push({
      id: "necessity",
      theme: "drivers",
      sentence: necessity,
      relation: "support",
    });
    // EDGE ONLY IF COMPUTED: the decision rules actually cite the necessity
    // operation. No such rule id → no edge → no connective.
    if (analytics.consequence.rule_ids.some((r) => /necess|minimis|minimiz/i.test(r))) {
      edges.push(edge("consequence", "necessity", "support", "consequence.rule_ids"));
    }
  }

  if (harms) {
    // No engine edge from the necessity operation to the harm operation: they
    // are independent § 7152 operations. Juxtaposition, no connective.
    summaryStatements.push({
      id: "harms",
      theme: "drivers",
      sentence: harms,
      relation: "none",
    });
  }

  if (benefits) {
    summaryStatements.push({
      id: "benefits",
      theme: "drivers",
      sentence: benefits,
      relation: "factor_outcome",
    });
    // EDGE ONLY IF COMPUTED: the weighing operation names the harms it offsets.
    const idx = analytics.weighing.findIndex((w) => w.offsetting_harm_ids.length > 0);
    if (idx >= 0 && harms) {
      edges.push(
        edge("harms", "benefits", "factor_outcome", `weighing[${idx}].offsetting_harm_ids`),
      );
    }
  }

  const conditions = analytics.consequence.conditions;
  const gapsNeeded = [
    ...(input.informationNeeded ?? []),
    ...analytics.necessity_analysis.map((n) => n.information_needed).filter(Boolean) as string[],
    ...analytics.harm_causation.map((h) => h.information_needed).filter(Boolean) as string[],
    ...analytics.weighing.map((w) => w.information_needed).filter(Boolean) as string[],
  ];

  const inputs: Record<string, SectionInput> = {};

  inputs["assessment_summary"] = {
    section_id: "assessment_summary",
    determination: opening ?? undefined,
    determination_status: opening ? "stated" : "record_insufficient",
    statements: summaryStatements,
    information_needed: gapsNeeded,
  };

  // ── WHY THIS ASSESSMENT IS REQUIRED (scope) ──────────────────────────
  if (scope) {
    inputs["scope_and_triggers"] = {
      section_id: "scope_and_triggers",
      determination: scope,
      determination_status: "stated",
      statements: [],
    };
  }

  // ── THE RECORD AS THE COMPANY STATED IT (record card, no pseudo-sentences)
  const recordFields: Array<[string, string, string]> = [
    ["parties", "entity_name", String(values.entity_name ?? "")],
    ["parties", "q2_consumers", String(values.q2_consumers ?? "")],
    ["data", "q4_pi_categories", (values.data_categories as string[] ?? []).join("; ")],
    ["data", "i4b_sources", String(values.sources ?? "")],
    ["recipients", "i6_vendors", (values.vendors as string[] ?? []).join("; ")],
    ["retention", "i2_retention_period", String(values.retention_period ?? "")],
    [
      "safeguards",
      "safeguards",
      ((values["impact_intake.safeguards"] as string[]) ?? []).join("; "),
    ],
  ];
  inputs["record_echo"] = {
    section_id: "record_echo",
    determination_status: "not_owed",
    statements: recordFields
      .filter(([, , v]) => v.trim())
      .map(([theme, key, v]) => card(`rec_${key}`, theme, label(key), v)),
  };

  // ── RISK ANALYSIS BY ACTIVITY ────────────────────────────────────────
  const riskStatements: SupportingStatement[] = [];
  if (harms) {
    riskStatements.push({
      id: "risk_harms",
      theme: "negative_impacts",
      sentence: harms,
      relation: "none",
    });
  }
  if (benefits) {
    riskStatements.push({
      id: "risk_benefits",
      theme: "benefits",
      sentence: benefits,
      relation: "factor_outcome",
    });
    const idx = analytics.weighing.findIndex((w) => w.offsetting_harm_ids.length > 0);
    if (idx >= 0 && harms) {
      edges.push(
        edge("risk_harms", "risk_benefits", "factor_outcome", `weighing[${idx}].offsetting_harm_ids`),
      );
    }
  }
  if (narrative) {
    riskStatements.push({
      id: "risk_weighing",
      theme: "weighing",
      sentence: narrative,
      relation: "consequence",
    });
    if (benefits) {
      edges.push(edge("risk_benefits", "risk_weighing", "consequence", "consequence.decision"));
    }
  }
  if (riskStatements.length) {
    inputs["risk_assessment_by_activity"] = {
      section_id: "risk_assessment_by_activity",
      determination: necessity ?? undefined,
      determination_status: necessity ? "stated" : "record_insufficient",
      statements: riskStatements,
    };
  }

  // ── WHAT THE RECORD DOES NOT YET STATE (ask; owes no determination) ──
  inputs["information_needed"] = {
    section_id: "information_needed",
    determination_status: "not_owed",
    statements: [
      ...gapsNeeded.map((g, i) => card(`gap_${i}`, "silent_fields", "Still needed", g)),
      ...(input.inconsistencyFlags ?? []).map((f, i) =>
        card(`flag_${i}`, "inconsistencies", "Reported, not resolved", f)
      ),
    ],
    information_needed: gapsNeeded,
  };

  // ── WHAT TO DO NEXT (remedy) ─────────────────────────────────────────
  if (narrative) {
    inputs["priority_actions"] = {
      section_id: "priority_actions",
      determination: narrative,
      determination_status: "stated",
      statements: conditions.map((c, i) =>
        card(`cond_${i}`, "before_submission", "Condition on the decision", c)
      ),
    };
  }

  return {
    inputs,
    graph: new ReasoningGraph(edges),
    entity,
    determinations,
    omitted_frames: omitted,
  };
}
