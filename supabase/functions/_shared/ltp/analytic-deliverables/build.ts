/**
 * ITEM 305 — DETERMINISTIC BUILDER for the five cppa-risk analytic
 * deliverables (Chapter 1 of the fleet gap analysis).
 *
 * PURITY LAW: pure function of the intake object. No I/O, no clock, no
 * env, never throws (a builder fault degrades the whole envelope to
 * record_insufficient rather than aborting the plan derive).
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * `plan.activity_analytics`. Pass-2R narrates it and may not alter it.
 *
 * NO-INVENTION LAW: every string emitted here is either (a) copied from
 * the intake record, (b) VERBATIM statutory text from ./harm-catalogue.ts,
 * or (c) one of the fixed literals declared in this file. Nothing is
 * inferred about facts the record does not carry.
 */
import {
  HARM_CATALOGUE_CITATION,
  harmEntry,
  isHarmId,
  resolveHarmId,
  type HarmId,
} from "./harm-catalogue.ts";
import {
  BENEFICIARY_CLASSES,
  HARM_LIKELIHOOD_OPTS,
  HARM_SEVERITY_OPTS,
  NECESSITY_STATUS_OPTS,
  SAFEGUARD_STATUS_OPTS,
  type BeneficiaryClass,
  type HarmLikelihood,
  type HarmSeverity,
  type NecessityStatus,
  type SafeguardStatus,
} from "./enums.ts";
import type {
  ActivityAnalytics,
  Consequence,
  HarmCausationEntry,
  NecessityAnalysisEntry,
  ResidualBand,
  SafeguardMapEntry,
  WeighingEntry,
} from "./types.ts";

export const ANALYTIC_DELIVERABLES_VERSION =
  "cppa-risk-analytic-deliverables-2026-07-31-item305";

const NOT_STATED = "not stated on the record" as const;

const CITE_A2 = "11 CCR § 7152(a)(2)";
const CITE_A4 = "11 CCR § 7152(a)(4)";
const CITE_A6 = "11 CCR § 7152(a)(6)";
const CITE_A7 = "11 CCR § 7152(a)(7)";

/** § 7152(a)(4) names generic benefit terms as non-compliant. */
const GENERIC_BENEFIT_PATTERNS: readonly RegExp[] = [
  /\bimprov(e|ing) (our |the )?(service|services|experience|product|products)\b/i,
  /\bbetter (service|services|experience)\b/i,
  /\bbusiness purposes?\b/i,
  /\banalytics\b/i,
  /\bfor security purposes\b/i,
  /\bas described in (our|the) privacy policy\b/i,
  /\boperational efficiency\b/i,
];

const LIKELIHOOD_WEIGHT: Readonly<Record<HarmLikelihood, number>> = {
  "Unlikely": 1,
  "Possible": 2,
  "Likely": 3,
  "Highly likely": 4,
};

const SEVERITY_WEIGHT: Readonly<Record<HarmSeverity, number>> = {
  "Minimal": 1,
  "Moderate": 2,
  "Significant": 3,
  "Severe": 4,
};

/** Safeguard credit subtracted from the inherent score. */
const SAFEGUARD_CREDIT: Readonly<Record<SafeguardStatus, number>> = {
  "Implemented and tested": 6,
  "Implemented, not tested": 3,
  "Planned, not yet implemented": 0,
  "None": 0,
};

function band(score: number | null): ResidualBand {
  if (score === null) return "undetermined";
  if (score >= 9) return "high";
  if (score >= 4) return "moderate";
  return "low";
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Record<string, unknown>[] : [];
}

function oneOf<T extends string>(v: unknown, opts: readonly T[]): T | null {
  const s = str(v);
  return (opts as readonly string[]).includes(s) ? (s as T) : null;
}

// ---------------------------------------------------------------------
// 1. § 7152(a)(2) — necessity analysis
// ---------------------------------------------------------------------
export function buildNecessityAnalysis(rows: unknown): NecessityAnalysisEntry[] {
  const src = arr(rows);
  if (src.length === 0) {
    return [{
      element: NOT_STATED,
      asserted_status: NOT_STATED,
      verdict: "undetermined_on_the_record",
      justification: NOT_STATED,
      citation: CITE_A2,
      status: "record_insufficient",
      information_needed:
        "List each personal-information element this activity collects and state, for each, whether it is necessary to the stated purpose (§ 7152(a)(2) minimum-necessary analysis).",
    }];
  }
  return src.map((r) => {
    const element = str(r.element);
    const status = oneOf<NecessityStatus>(r.necessity, NECESSITY_STATUS_OPTS);
    const justification = str(r.justification);
    if (!element) {
      return {
        element: NOT_STATED,
        asserted_status: status ?? NOT_STATED,
        verdict: "undetermined_on_the_record" as const,
        justification: justification || NOT_STATED,
        citation: CITE_A2,
        status: "record_insufficient" as const,
        information_needed: "Name the personal-information element this necessity entry refers to.",
      };
    }
    if (status === "Necessary to the stated purpose") {
      const supported = justification.length > 0;
      return {
        element,
        asserted_status: status,
        verdict: supported ? "supported_as_necessary" as const : "undetermined_on_the_record" as const,
        justification: justification || NOT_STATED,
        citation: CITE_A2,
        status: supported ? "analysed" as const : "record_insufficient" as const,
        ...(supported ? {} : {
          information_needed: `State why "${element}" is necessary to the stated purpose; a necessity assertion without a reason cannot be assessed under § 7152(a)(2).`,
        }),
      };
    }
    if (status === "Collected but not necessary to the stated purpose") {
      return {
        element,
        asserted_status: status,
        verdict: "minimisation_candidate" as const,
        justification: justification || NOT_STATED,
        citation: CITE_A2,
        status: "analysed" as const,
      };
    }
    return {
      element,
      asserted_status: status ?? NOT_STATED,
      verdict: "undetermined_on_the_record" as const,
      justification: justification || NOT_STATED,
      citation: CITE_A2,
      status: "record_insufficient" as const,
      information_needed: `Confirm whether "${element}" is necessary to the stated purpose of this activity.`,
    };
  });
}

// ---------------------------------------------------------------------
// 2. § 7152(a)(5) — harm causation, catalogued
// ---------------------------------------------------------------------
export function buildHarmCausation(rows: unknown): HarmCausationEntry[] {
  const src = arr(rows);
  const out: HarmCausationEntry[] = [];
  const seen = new Set<HarmId>();
  for (const r of src) {
    const id = resolveHarmId(r.harm ?? r.harm_id);
    // CATALOGUE-MEMBERSHIP LAW — unresolvable harm labels are dropped,
    // never coerced into a neighbouring category.
    if (!id || !isHarmId(id) || seen.has(id)) continue;
    seen.add(id);
    const cat = harmEntry(id);
    const source = str(r.source);
    const cause = str(r.cause);
    const likelihood = oneOf<HarmLikelihood>(r.likelihood, HARM_LIKELIHOOD_OPTS);
    const severity = oneOf<HarmSeverity>(r.severity, HARM_SEVERITY_OPTS);
    const scored = likelihood && severity
      ? LIKELIHOOD_WEIGHT[likelihood] * SEVERITY_WEIGHT[severity]
      : null;
    const complete = source.length > 0 && cause.length > 0 && scored !== null;
    const missing: string[] = [];
    if (!source) missing.push("the source of the impact");
    if (!cause) missing.push("the cause of the impact");
    if (!likelihood) missing.push("its likelihood");
    if (!severity) missing.push("its severity");
    out.push({
      harm_id: id,
      harm_pinpoint: cat.pinpoint,
      harm_label: cat.label,
      harm_verbatim: cat.verbatim,
      source: source || NOT_STATED,
      cause: cause || NOT_STATED,
      likelihood: likelihood ?? NOT_STATED,
      severity: severity ?? NOT_STATED,
      inherent_band: band(scored),
      status: complete ? "analysed" : "record_insufficient",
      ...(complete ? {} : {
        information_needed:
          `For the negative impact at ${cat.pinpoint}, state ${missing.join(", ")}. § 7152(a)(5) requires the sources and causes of each identified impact.`,
      }),
    });
  }
  if (out.length === 0) {
    return [{
      harm_id: "A",
      harm_pinpoint: harmEntry("A").pinpoint,
      harm_label: harmEntry("A").label,
      harm_verbatim: harmEntry("A").verbatim,
      source: NOT_STATED,
      cause: NOT_STATED,
      likelihood: NOT_STATED,
      severity: NOT_STATED,
      inherent_band: "undetermined",
      status: "record_insufficient",
      information_needed:
        "Identify the negative impacts to consumers' privacy for this activity against the § 7152(a)(5)(A)–(H) examples, and state the source and cause of each.",
    }];
  }
  // Deterministic ordering: catalogue order.
  return out.sort((a, b) => a.harm_id.localeCompare(b.harm_id));
}

// ---------------------------------------------------------------------
// 3. § 7152(a)(6) — safeguard map (harm-bound, with residual)
// ---------------------------------------------------------------------
export function buildSafeguardMap(
  rows: unknown,
  harms: readonly HarmCausationEntry[],
): SafeguardMapEntry[] {
  const byHarm = new Map(harms.map((h) => [h.harm_id, h]));
  const src = arr(rows);
  const out: SafeguardMapEntry[] = [];
  const covered = new Set<HarmId>();

  for (const r of src) {
    const id = resolveHarmId(r.harm ?? r.harm_id);
    // FOREIGN-KEY LAW — a safeguard that points at a harm the record does
    // not identify is not admissible; it is dropped, never re-homed.
    if (!id || !byHarm.has(id)) continue;
    const safeguard = str(r.safeguard);
    const sstatus = oneOf<SafeguardStatus>(r.safeguard_status ?? r.status, SAFEGUARD_STATUS_OPTS);
    if (!safeguard && !sstatus) continue;
    covered.add(id);
    const h = byHarm.get(id)!;
    const inherent = h.likelihood !== NOT_STATED && h.severity !== NOT_STATED
      ? LIKELIHOOD_WEIGHT[h.likelihood as HarmLikelihood] * SEVERITY_WEIGHT[h.severity as HarmSeverity]
      : null;
    const residual = inherent === null || !sstatus
      ? null
      : Math.max(1, inherent - SAFEGUARD_CREDIT[sstatus]);
    const complete = safeguard.length > 0 && sstatus !== null && residual !== null;
    out.push({
      harm_id: id,
      safeguard: safeguard || NOT_STATED,
      safeguard_status: sstatus ?? NOT_STATED,
      residual_band: band(residual),
      citation: CITE_A6,
      status: complete ? "analysed" : "record_insufficient",
      ...(complete ? {} : {
        information_needed:
          `Describe the safeguard addressing the impact at ${h.harm_pinpoint} and state its implementation status.`,
      }),
    });
  }

  // COVERAGE LAW — every identified harm gets a row. An uncovered harm is
  // an explicit unsafeguarded finding, not a silent absence.
  for (const h of harms) {
    if (covered.has(h.harm_id)) continue;
    out.push({
      harm_id: h.harm_id,
      safeguard: NOT_STATED,
      safeguard_status: NOT_STATED,
      residual_band: h.inherent_band,
      citation: CITE_A6,
      status: "record_insufficient",
      information_needed:
        `No safeguard is recorded for the negative impact at ${h.harm_pinpoint}. § 7152(a)(6) requires the business to identify the safeguards it plans to implement to address the impacts identified under § 7152(a)(5).`,
    });
  }
  return out.sort((a, b) => a.harm_id.localeCompare(b.harm_id));
}

// ---------------------------------------------------------------------
// 4. § 7152(a)(4) — weighing across the four beneficiary classes
// ---------------------------------------------------------------------
function isGeneric(text: string): boolean {
  return GENERIC_BENEFIT_PATTERNS.some((re) => re.test(text));
}

export function buildWeighing(
  benefits: Record<BeneficiaryClass, string>,
  harms: readonly HarmCausationEntry[],
): WeighingEntry[] {
  const harmIds = harms.filter((h) => h.status === "analysed").map((h) => h.harm_id);
  return BENEFICIARY_CLASSES.map((cls) => {
    const text = str(benefits[cls]);
    if (!text) {
      return {
        beneficiary_class: cls,
        benefit_statement: NOT_STATED,
        generic_benefit_flag: false,
        offsetting_harm_ids: harmIds,
        sufficiency: "benefit_not_stated" as const,
        citation: CITE_A4,
        status: "record_insufficient" as const,
        information_needed:
          `State the benefit of this processing to ${cls}, in specific terms, or record that none applies. § 7152(a)(4) requires benefits to the business, the consumer, other stakeholders, and the public, as applicable.`,
      };
    }
    const generic = isGeneric(text);
    return {
      beneficiary_class: cls,
      benefit_statement: text,
      generic_benefit_flag: generic,
      offsetting_harm_ids: harmIds,
      sufficiency: generic ? "benefit_generic" as const : "benefit_supported" as const,
      citation: CITE_A4,
      status: generic ? "record_insufficient" as const : "analysed" as const,
      ...(generic ? {
        information_needed:
          `The benefit stated for ${cls} is expressed in generic terms. § 7152(a)(4) requires benefits not be identified generically; restate it as the specific outcome the processing produces.`,
      } : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 5. § 7152(a)(7) — CONSEQUENCE (deterministic decision function)
// ---------------------------------------------------------------------
export interface ConsequenceInput {
  readonly necessity: readonly NecessityAnalysisEntry[];
  readonly harms: readonly HarmCausationEntry[];
  readonly safeguards: readonly SafeguardMapEntry[];
  readonly weighing: readonly WeighingEntry[];
  readonly approver_name: string;
  readonly approver_position: string;
  readonly approval_date: string;
}

/**
 * DECISION RULES (evaluated in order; first terminal rule wins).
 *
 *   C0  approval record absent                 → reserved_insufficient_record
 *   C1  any deliverable record_insufficient    → reserved_insufficient_record
 *   C2  any residual band "high"               → do_not_initiate_absent_change
 *   C3  any residual "moderate"                → initiate_with_conditions
 *   C3b any minimisation candidate             → initiate_with_conditions
 *   C3c any safeguard planned-not-implemented  → initiate_with_conditions
 *   C4  otherwise                              → initiate
 *
 * The rule ids are emitted so the prose pass states the plan's decision
 * rather than deriving one.
 */
export function decideConsequence(input: ConsequenceInput): Consequence {
  const rule_ids: string[] = [];
  const reasons: string[] = [];
  const conditions: string[] = [];

  const approvalRecorded = input.approver_name.length > 0 && input.approver_position.length > 0;

  const insufficient = [
    ...input.necessity,
    ...input.harms,
    ...input.safeguards,
    ...input.weighing,
  ].filter((d) => d.status === "record_insufficient");

  const highResidual = input.safeguards.filter((s) => s.residual_band === "high");
  const moderateResidual = input.safeguards.filter((s) => s.residual_band === "moderate");
  const minimisation = input.necessity.filter((n) => n.verdict === "minimisation_candidate");
  const planned = input.safeguards.filter((s) => s.safeguard_status === "Planned, not yet implemented");

  for (const m of minimisation) {
    conditions.push(`Cease or justify collection of ${m.element}, recorded as not necessary to the stated purpose (§ 7152(a)(2)).`);
  }
  for (const p of planned) {
    conditions.push(`Implement the planned safeguard addressing ${harmEntry(p.harm_id).pinpoint} before the processing proceeds (§ 7152(a)(6)).`);
  }
  for (const h of highResidual) {
    conditions.push(`Reduce the residual exposure at ${harmEntry(h.harm_id).pinpoint} before initiating the processing.`);
  }

  let decision: Consequence["decision"];
  if (!approvalRecorded) {
    rule_ids.push("C0");
    reasons.push("The record does not identify the individual who reviewed and approved this assessment, as § 7152(a)(9) requires.");
    decision = "reserved_insufficient_record";
  } else if (insufficient.length > 0) {
    rule_ids.push("C1");
    reasons.push(`${insufficient.length} required analytic element${insufficient.length === 1 ? " is" : "s are"} not supported by the present record; the initiation decision is reserved until they are completed.`);
    decision = "reserved_insufficient_record";
  } else if (highResidual.length > 0) {
    rule_ids.push("C2");
    reasons.push("At least one identified negative impact carries a high residual exposure after the recorded safeguards.");
    decision = "do_not_initiate_absent_change";
  } else if (moderateResidual.length > 0 || minimisation.length > 0 || planned.length > 0) {
    if (moderateResidual.length > 0) { rule_ids.push("C3"); reasons.push("At least one identified negative impact carries a moderate residual exposure after the recorded safeguards."); }
    if (minimisation.length > 0) { rule_ids.push("C3b"); reasons.push("At least one personal-information element is recorded as collected but not necessary to the stated purpose."); }
    if (planned.length > 0) { rule_ids.push("C3c"); reasons.push("At least one safeguard relied upon is planned but not yet implemented."); }
    decision = "initiate_with_conditions";
  } else {
    rule_ids.push("C4");
    reasons.push("Every identified negative impact is addressed by an implemented safeguard and each beneficiary class carries a specific stated benefit.");
    decision = "initiate";
  }

  return {
    decision,
    rule_ids,
    reasons,
    conditions,
    citation: CITE_A7,
    approver_name: input.approver_name || NOT_STATED,
    approver_position: input.approver_position || NOT_STATED,
    approval_date: input.approval_date || NOT_STATED,
    approval_recorded: approvalRecorded,
    status: decision === "reserved_insufficient_record" ? "record_insufficient" : "analysed",
    ...(approvalRecorded ? {} : {
      information_needed:
        "Record the date the assessment was reviewed and approved and the name and position of the approving individual, who must have authority to participate in deciding whether the business initiates the processing (§ 7152(a)(9)).",
    }),
  };
}

// ---------------------------------------------------------------------
// Envelope builder
// ---------------------------------------------------------------------
function slug(s: string, fallback: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || fallback;
}

function benefitsFrom(intake: Record<string, unknown>): Record<BeneficiaryClass, string> {
  return {
    "the business": str(intake.a4_benefit_business),
    "the consumer": str(intake.a4_benefit_consumer),
    "other stakeholders": str(intake.a4_benefit_other_stakeholders),
    "the public": str(intake.a4_benefit_public),
  };
}

/**
 * PRIMARY-ACTIVITY SCOPE: the analytic intake block is authored against
 * the primary activity. Secondary (§ 7156(a) comparable-set) activities
 * receive a fully-degraded envelope naming exactly what is missing —
 * MANDATORY DEGRADATION LAW, never a copy of the primary analysis.
 */
export function buildActivityAnalytics(
  intakeRaw: Record<string, unknown> | undefined | null,
): ActivityAnalytics[] {
  const intake = (intakeRaw ?? {}) as Record<string, unknown>;
  try {
    const out: ActivityAnalytics[] = [];

    const primaryName = str(intake.primary_activity_name) || NOT_STATED;
    const necessity = buildNecessityAnalysis(intake.a2_necessity_set);
    const harms = buildHarmCausation(intake.a5_harm_pathways);
    const safeguards = buildSafeguardMap(intake.a6_safeguards, harms);
    const weighing = buildWeighing(benefitsFrom(intake), harms);
    const consequence = decideConsequence({
      necessity,
      harms,
      safeguards,
      weighing,
      approver_name: str(intake.a9_approver_name),
      approver_position: str(intake.a9_approver_position),
      approval_date: str(intake.a9_approval_date),
    });

    out.push({
      activity_id: `act.${slug(primaryName, "primary")}`,
      activity_name: primaryName,
      activity_purpose: str(intake.primary_activity_purpose) || NOT_STATED,
      is_primary: true,
      necessity_analysis: necessity,
      harm_causation: harms,
      safeguard_map: safeguards,
      weighing,
      consequence,
    });

    const secondaries = arr(intake.secondary_activities);
    secondaries.forEach((s, i) => {
      const name = str(s.name) || `Additional use #${i + 1} (not described)`;
      const emptyHarms = buildHarmCausation(undefined);
      const emptyNecessity = buildNecessityAnalysis(undefined);
      const emptySafeguards = buildSafeguardMap(undefined, emptyHarms);
      const emptyWeighing = buildWeighing(
        { "the business": "", "the consumer": "", "other stakeholders": "", "the public": "" },
        emptyHarms,
      );
      out.push({
        activity_id: `act.${slug(name, `secondary-${i + 1}`)}`,
        activity_name: name,
        activity_purpose: str(s.purpose) || NOT_STATED,
        is_primary: false,
        necessity_analysis: emptyNecessity,
        harm_causation: emptyHarms,
        safeguard_map: emptySafeguards,
        weighing: emptyWeighing,
        consequence: decideConsequence({
          necessity: emptyNecessity,
          harms: emptyHarms,
          safeguards: emptySafeguards,
          weighing: emptyWeighing,
          approver_name: str(intake.a9_approver_name),
          approver_position: str(intake.a9_approver_position),
          approval_date: str(intake.a9_approval_date),
        }),
      });
    });

    return out;
  } catch {
    // BUILDER-FAULT DEGRADATION — never throw into derivePlan.
    const emptyHarms = buildHarmCausation(undefined);
    const emptyNecessity = buildNecessityAnalysis(undefined);
    const emptySafeguards = buildSafeguardMap(undefined, emptyHarms);
    const emptyWeighing = buildWeighing(
      { "the business": "", "the consumer": "", "other stakeholders": "", "the public": "" },
      emptyHarms,
    );
    return [{
      activity_id: "act.unavailable",
      activity_name: NOT_STATED,
      activity_purpose: NOT_STATED,
      is_primary: true,
      necessity_analysis: emptyNecessity,
      harm_causation: emptyHarms,
      safeguard_map: emptySafeguards,
      weighing: emptyWeighing,
      consequence: decideConsequence({
        necessity: emptyNecessity,
        harms: emptyHarms,
        safeguards: emptySafeguards,
        weighing: emptyWeighing,
        approver_name: "",
        approver_position: "",
        approval_date: "",
      }),
    }];
  }
}

export { HARM_CATALOGUE_CITATION };
