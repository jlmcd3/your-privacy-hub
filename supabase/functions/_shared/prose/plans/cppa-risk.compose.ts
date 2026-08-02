// ITEM 347 (DOCUMENT-PLAN REWORK) — cppa-risk COMPOSER,
// REWORKED UNDER ITEM 363 (PROSE REVISION + NEW DOCUMENT PLAN).
//
// Joins the halves of the program on one record:
//   * the FRAME SET supplies the sentences (record-verbatim slots, pinned
//     registry-legal prose, pinned engine-conclusion clauses);
//   * the PLAN supplies the CEO-specified document shape;
//   * the REASONING GRAPH supplies the only connectives that may be spoken.
//
// ITEM 363 CONTENT-OWNERSHIP RULE: each analytical point has ONE home. The
// Determination section states the holding; General conclusions synthesises.
// No sentence appears in both (enforced by the duplication lint).
//
// This file computes NOTHING about the law and NOTHING about the record.

import type { ActivityAnalytics } from "../../ltp/analytic-deliverables/types.ts";
import type { EuAuthoritySection } from "../../ltp/eu-authority/types.ts";
import type { FrameSet } from "../frames.ts";
import { renderSectionFromFrames } from "../frame-render.ts";
import { buildCppaRiskFrameValues } from "../frames/cppa-risk.values.ts";
import type { SectionInput, SupportingStatement } from "../plan-render.ts";
import { edge, LEAD_NODE, type ReasoningEdge, ReasoningGraph } from "../reasoning-graph.ts";
import {
  buildCorpusAnalogies,
  type CorpusAnalogiesResult,
  type FactorClass,
} from "../analogies.ts";
import { deriveRecordSummary, type RecordSummary } from "../record-summary.ts";

export const CPPA_RISK_COMPOSE_VERSION = "prose-compose-2026-08-01-item363";

/** Section ids of the Item 363 plan, in the CEO-specified order. */
export const CPPA_RISK_SECTION_ORDER: readonly string[] = [
  "executive_lead",
  "record_card",
  "determination",
  "why_required",
  "risk_analysis",
  "corpus_analogies",
  "general_conclusions",
  "record_completeness_summary",
  "what_to_do_next",
];

/** Minimum paragraphs per section the segmentation lint enforces. */
export const CPPA_RISK_MIN_PARAGRAPHS: Readonly<Record<string, number>> = {
  risk_analysis: 5,
};

export interface ComposeResult {
  readonly inputs: Record<string, SectionInput>;
  readonly graph: ReasoningGraph;
  readonly entity: string;
  readonly determinations: { necessity: string; weighing: string; consequence: string };
  /** Frame sections that produced no text (FILL-OR-OMIT), for the report. */
  readonly omitted_frames: readonly string[];
  readonly analogies: CorpusAnalogiesResult;
  readonly record_summary: RecordSummary;
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

/** Which named factors of this report an analogy may attach to. */
function liveFactors(analytics: ActivityAnalytics): FactorClass[] {
  const out: FactorClass[] = ["minimisation", "initiation"];
  if (analytics.harm_causation.length) out.push("impacts");
  if (analytics.safeguard_map.length) out.push("safeguards");
  if (analytics.weighing.length) out.push("weighing");
  if (analytics.harm_causation.some((h) => /\(a\)\(5\)\(C\)/.test(String(h.harm_pinpoint)))) {
    out.push("impairment");
  }
  return out;
}

export function composeCppaRisk(input: {
  intake: Record<string, unknown>;
  analytics: ActivityAnalytics;
  frames: FrameSet;
  inconsistencyFlags?: readonly string[];
  informationNeeded?: readonly string[];
  /** Item 341 persuasive-authority section; the analogies read from it. */
  euAuthority?: EuAuthoritySection | null;
  /** Item 358 classification counts. Default: every open need is missing data. */
  missingDataCount?: number;
  reservedCount?: number;
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

  const entity = String(values["engine.entity_name"] ?? values.entity_name ?? "The company");
  const edges: ReasoningEdge[] = [];
  const inputs: Record<string, SectionInput> = {};

  const openNeeds = (values.gap_lines as string[]) ?? [];
  const conditions = analytics.consequence.conditions ?? [];

  // ── 0. EXECUTIVE LEAD ────────────────────────────────────────────────
  const execLead = frameText("executive_lead");
  inputs["executive_lead"] = {
    section_id: "executive_lead",
    determination: execLead ?? undefined,
    determination_status: execLead ? "stated" : "record_insufficient",
    statements: [],
  };

  // ── 1. RECORD CARD ───────────────────────────────────────────────────
  const cardLead = frameText("record_card_lead");
  const recordFields: Array<[string, string, string]> = [
    ["parties", "q2_consumers", String(values.q2_consumers ?? "")],
    ["data", "q4_pi_categories", ((values.data_categories as string[]) ?? []).join("; ")],
    ["data", "i4b_sources", String(values.sources ?? "")],
    ["recipients", "i6_vendors", ((values.i6_vendors as string[]) ?? []).join("; ")],
    ["retention", "i2_retention_period", String(values.retention_period ?? "")],
    [
      "safeguards",
      "safeguards",
      ((values["impact_intake.safeguards"] as string[]) ?? []).join("; "),
    ],
  ];
  inputs["record_card"] = {
    section_id: "record_card",
    determination_status: "not_owed",
    statements: [
      ...(cardLead
        ? [{
          id: "card_lead",
          theme: "lead_in",
          topic: "lead_in",
          sentence: cardLead,
          relation: "none" as const,
        }]
        : []),
      ...recordFields
        .filter(([, , v]) => v.trim())
        .map(([theme, key, v]) => card(`rec_${key}`, theme, label(key), v)),
    ],
  };

  // ── 2. DETERMINATION (owns the holding, and nothing else) ────────────
  const holding = frameText("determination");
  inputs["determination"] = {
    section_id: "determination",
    determination: holding ?? undefined,
    determination_status: holding ? "stated" : "record_insufficient",
    statements: [],
    information_needed: openNeeds,
  };

  // ── 3. WHY THIS ASSESSMENT IS REQUIRED (statute first) ───────────────
  const why = frameText("why_required");
  inputs["why_required"] = {
    section_id: "why_required",
    determination: why ?? undefined,
    determination_status: why ? "stated" : "record_insufficient",
    statements: [],
  };

  // ── 4. RISK ANALYSIS — one paragraph per subsection ──────────────────
  const minimisation = frameText("risk_minimisation");
  const impacts = frameText("risk_impacts");
  const safeguards = frameText("risk_safeguards");
  const weighing = frameText("risk_weighing");
  const initiation = frameText("risk_initiation");

  const riskStatements: SupportingStatement[] = [];
  const para = (
    id: string,
    theme: string,
    sentence: string | null,
    relation: SupportingStatement["relation"],
  ) => {
    if (sentence) {
      riskStatements.push({ id, theme, topic: theme, sentence, relation, paragraph: true });
    }
  };
  para("risk_impacts", "negative_impacts", impacts, "none");
  para("risk_safeguards", "safeguards_residual", safeguards, "consequence");
  para("risk_weighing", "weighing", weighing, "factor_outcome");
  para("risk_initiation", "initiation", initiation, "none");

  // Edges the ENGINE computed. They are recorded for the audit even though a
  // paragraph break never speaks a connective.
  if (analytics.safeguard_map.some((g) => g.harm_id)) {
    edges.push(
      edge("risk_impacts", "risk_safeguards", "consequence", "safeguard_map[].harm_id"),
    );
  }
  const wIdx = analytics.weighing.findIndex((w) => w.offsetting_harm_ids.length > 0);
  if (wIdx >= 0) {
    edges.push(
      edge(
        "risk_safeguards",
        "risk_weighing",
        "factor_outcome",
        `weighing[${wIdx}].offsetting_harm_ids`,
      ),
    );
  }

  inputs["risk_analysis"] = {
    section_id: "risk_analysis",
    determination: minimisation ?? undefined,
    determination_status: minimisation ? "stated" : "record_insufficient",
    statements: riskStatements,
  };

  // ── 5. CORPUS ANALOGIES ──────────────────────────────────────────────
  const analogies = buildCorpusAnalogies({
    section: input.euAuthority ?? null,
    live_factors: liveFactors(analytics),
  });
  const [analogyLead, ...analogyRest] = analogies.paragraphs;
  inputs["corpus_analogies"] = {
    section_id: "corpus_analogies",
    determination: analogyLead,
    determination_status: "stated",
    statements: analogyRest.map((p, i) => ({
      id: `analogy_${i}`,
      theme: i === 0 && analogies.framing.length > 1 ? "framing" : "analogy",
      topic: `analogy_${i}`,
      sentence: p,
      relation: "none" as const,
      paragraph: true,
    })),
  };

  // ── 6. GENERAL CONCLUSIONS ───────────────────────────────────────────
  const conclusions = frameText("general_conclusions");
  inputs["general_conclusions"] = {
    section_id: "general_conclusions",
    determination: conclusions ?? undefined,
    determination_status: conclusions ? "stated" : "record_insufficient",
    statements: [],
  };

  // ── 7. RECORD COMPLETENESS AND RESIDUAL-RISK SUMMARY ─────────────────
  const record_summary = deriveRecordSummary({
    missing_data_count: input.missingDataCount ?? openNeeds.length,
    reserved_count: input.reservedCount ?? 0,
    conditions_count: conditions.length,
    residual_bands: analytics.safeguard_map.map((g) => String(g.residual_band)),
  });
  inputs["record_completeness_summary"] = {
    section_id: "record_completeness_summary",
    determination_status: "not_owed",
    statements: [
      {
        id: "summary_band",
        theme: "completeness",
        topic: "band",
        sentence: record_summary.sentence,
        relation: "none",
      },
      {
        id: "summary_scope",
        theme: "completeness",
        topic: "scope_note",
        sentence: record_summary.scope_note,
        relation: "none",
      },
    ],
  };

  // ── 8. WHAT TO DO NEXT ───────────────────────────────────────────────
  const next = frameText("what_to_do_next");
  inputs["what_to_do_next"] = {
    section_id: "what_to_do_next",
    determination: next ?? undefined,
    determination_status: next ? "stated" : "record_insufficient",
    statements: conditions.map((c, i) =>
      card(`cond_${i}`, "conditions", "Condition on the decision", c)
    ),
    information_needed: openNeeds,
  };

  return {
    inputs,
    graph: new ReasoningGraph(edges),
    entity,
    determinations,
    omitted_frames: omitted,
    analogies,
    record_summary,
  };
}
