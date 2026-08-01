// ITEM 346 — cppa-risk FRAME VALUE ADAPTER.
//
// Builds the RECORD-VERBATIM slot values for the revised frame set from the
// intake record plus the engine's own computed `ActivityAnalytics`, and names
// the determination keys the ENGINE reached so the conclusion slots can be
// resolved against the pinned book.
//
// WHAT THIS FILE MAY DO: read the record, read the engine's output, and join
// them for a list slot.
// WHAT THIS FILE MAY NOT DO: author legal prose, author a consequence clause,
// or decide a determination. Legal prose lives in `../legal-phrasings.ts`;
// consequence prose lives in `../engine-conclusions.ts`; determinations are the
// engine's. This adapter only carries values across.

import type { ActivityAnalytics } from "../../ltp/analytic-deliverables/types.ts";
import { resolveEngineConclusion } from "../engine-conclusions.ts";

const NOT_STATED = "not stated on the record";

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v);
}

function splitList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(s).filter(Boolean);
  const t = s(v);
  return t ? t.split(/;\s*|,\s(?=[A-Z])/).map((x) => x.trim()).filter(Boolean) : [];
}

function clause(key: string): string {
  return resolveEngineConclusion("cppa-risk", key) ?? "";
}

/** Rank of the necessity verdicts, worst first — the frame reports the worst. */
const NECESSITY_RANK = [
  "minimisation_candidate",
  "undetermined_on_the_record",
  "supported_as_necessary",
] as const;

const WEIGHING_RANK = ["benefit_not_stated", "benefit_generic", "benefit_supported"] as const;

export interface FrameValueBundle {
  readonly values: Record<string, unknown>;
  readonly determinations: {
    readonly necessity: string;
    readonly weighing: string;
    readonly consequence: string;
  };
}

export function buildCppaRiskFrameValues(input: {
  intake: Record<string, unknown>;
  analytics: ActivityAnalytics;
  inconsistencyFlags?: readonly string[];
  informationNeeded?: readonly string[];
}): FrameValueBundle {
  const { intake, analytics } = input;

  const worstNecessity =
    NECESSITY_RANK.find((v) => analytics.necessity_analysis.some((n) => n.verdict === v)) ??
    "undetermined_on_the_record";
  const worstWeighing =
    WEIGHING_RANK.find((v) => analytics.weighing.some((w) => w.sufficiency === v)) ??
    "benefit_not_stated";

  const necessityKey = `necessity.${worstNecessity}`;
  const weighingKey = `weighing.${worstWeighing}`;
  const consequenceKey = `consequence.${analytics.consequence.decision}`;

  const minimisation = analytics.necessity_analysis.filter(
    (n) => n.verdict === "minimisation_candidate",
  );

  // Every determination the composer produced is carried across as a line, so
  // the coverage check finds it in the framed render (NO FLATTENING).
  const necessityLines = analytics.necessity_analysis.map((n) =>
    `${n.element} — the record states this is ${n.asserted_status}, and on that basis this assessment ${
      clause(`necessity.${n.verdict}`)
    }${n.information_needed ? `; to go further the record needs ${n.information_needed}` : ""}`
  );

  const harmLines = analytics.harm_causation.map((h) =>
    `${h.harm_label} (${h.harm_pinpoint}) — the record gives the source as “${h.source}” and the causal path as “${h.cause}”, assessed as ${h.likelihood} likelihood and ${h.severity} severity, inherently ${h.inherent_band}${
      h.information_needed ? `; the record still needs ${h.information_needed}` : ""
    }`
  );

  const safeguardLines = analytics.safeguard_map.map((g) => {
    const harm = analytics.harm_causation.find((h) => h.harm_id === g.harm_id);
    return `for ${harm?.harm_label ?? g.harm_id}, the record describes “${g.safeguard}” (${g.safeguard_status}), leaving a ${g.residual_band} residual${
      g.information_needed ? `; the record still needs ${g.information_needed}` : ""
    }`;
  });

  const benefitLines = analytics.weighing.map((w) =>
    `for ${w.beneficiary_class}, the record states “${w.benefit_statement}”, and this assessment ${
      clause(`weighing.${w.sufficiency}`)
    }${w.generic_benefit_flag ? " (the statement is generic in the terms the provision screens for)" : ""}${
      w.information_needed ? `; to go further the record needs ${w.information_needed}` : ""
    }`
  );

  const flagLines = (input.inconsistencyFlags ?? []).map(
    (f) => `The record is internally inconsistent on one point and it is reported rather than resolved: ${f}`,
  );

  const gapLines = [
    ...(input.informationNeeded ?? []),
    ...analytics.consequence.conditions,
  ].map((g) => `Item carried forward for the company's review: ${g}`);

  const values: Record<string, unknown> = {
    entity_name: s(intake.entity_name) || NOT_STATED,
    activity_name: analytics.activity_name,
    activity_purpose: analytics.activity_purpose,
    trigger_fact_verbatim: s(intake.i1_processing_purpose) || analytics.activity_purpose,
    data_categories: splitList(intake.q4_pi_categories),
    sources: s(intake.i4b_sources) || NOT_STATED,
    retention_period: s(intake.i2_retention_period) || NOT_STATED,
    vendors: splitList(intake.i6_vendors),
    // record_echo is the CEO-approved frame and keeps its original source
    // paths byte-identical, so its two values are supplied under those names.
    i6_vendors: splitList(intake.i6_vendors),
    "impact_intake.safeguards": analytics.safeguard_map.map((g) => g.safeguard),
    q2_consumers: s(intake.q2_consumers) || NOT_STATED,
    secondary_use_status: s(intake.has_secondary_uses) || NOT_STATED,

    minimisation_count: minimisation.length,
    minimisation_elements: minimisation.map((n) => n.element),

    necessity_lines: necessityLines,
    harm_lines: harmLines,
    safeguard_lines: safeguardLines,
    benefit_lines: benefitLines,
    flag_lines: flagLines,
    gap_lines: gapLines,

    // Conclusion slots address the book through the key the ENGINE reached.
    necessity_determination: necessityKey,
    necessity_determination_blocked: `${necessityKey}#blocked`,
    weighing_determination: weighingKey,
    consequence_determination: consequenceKey,
    consequence_determination_blocked: `${consequenceKey}#blocked`,
  };

  return {
    values,
    determinations: { necessity: necessityKey, weighing: weighingKey, consequence: consequenceKey },
  };
}
