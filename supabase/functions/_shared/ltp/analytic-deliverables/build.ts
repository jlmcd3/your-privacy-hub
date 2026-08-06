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
  Attestation,
  BenefitEntry,
  Consequence,
  ConsequenceModification,
  OutweighDetermination,
  HarmCausationEntry,
  NecessityAnalysisEntry,
  ResidualBand,
  SafeguardMapEntry,
  WeighingEntry,
} from "./types.ts";

export const ANALYTIC_DELIVERABLES_VERSION =
  "cppa-risk-analytic-deliverables-2026-08-03-upgrade2";

// ITEM 384 (G-4) — ATTESTATION REGISTER. "not stated on the record" is
// courtroom register and read as an accusation on a complete record. The
// absence value is plain and neutral; the semantics are unchanged.
const NOT_STATED = "Not recorded" as const;

const CITE_A2 = "11 CCR § 7152(a)(2)";
const CITE_A5 = "11 CCR § 7152(a)(5)";
const CITE_A8 = "11 CCR § 7152(a)(8)";
const CITE_A9 = "11 CCR § 7152(a)(9)";
const CITE_CHAPEAU = "11 CCR § 7152(a)";
const CITE_7154A = "11 CCR § 7154(a)";

/** § 7152(a)(9) — stated on the face of every report. */
const APPROVAL_AUTHORITY_REQUIREMENT =
  "The individual who reviewed and approved this assessment must have the authority to participate in deciding whether the business initiates the processing (11 CCR § 7152(a)(9)).";
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
export function buildNecessityAnalysis(
  rows: unknown,
  defaultPurpose = "",
): NecessityAnalysisEntry[] {
  const src = arr(rows);
  const purposeOf = (r: Record<string, unknown>) =>
    str(r.purpose_served) || str(defaultPurpose) || NOT_STATED;
  if (src.length === 0) {
    return [{
      element: NOT_STATED,
      purpose_served: str(defaultPurpose) || NOT_STATED,
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
        purpose_served: purposeOf(r),
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
        purpose_served: purposeOf(r),
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
        purpose_served: purposeOf(r),
        asserted_status: status,
        verdict: "minimisation_candidate" as const,
        justification: justification || NOT_STATED,
        citation: CITE_A2,
        status: "analysed" as const,
      };
    }
    return {
      element,
      purpose_served: purposeOf(r),
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
    const dataInvolved = str(r.data_involved);
    const actor = str(r.actor);
    // ITEM 380 §4 — THE PATHWAY IS ON THE RECORD WHENEVER THE RECORD SUPPLIES
    // IT. The intake contract collects `source` and `cause` for every § 7152
    // (a)(5) row; there is NO `pathway` field on the form. Reading `r.pathway`
    // alone therefore emitted "not stated on the record" on records that state
    // the route in full — a false absence the refinement critic then repaired
    // post-hoc. The emitter now derives the pathway from the record: an
    // explicit pathway when the row carries one, otherwise the recorded cause
    // (the mechanism by which the source produces the impact). The absence
    // text is emitted ONLY when the row genuinely lacks all three.
    const pathwayStated = str((r as Record<string, unknown>).pathway) ||
      str((r as Record<string, unknown>).harm_pathway) ||
      str((r as Record<string, unknown>).mechanism);
    const pathway = pathwayStated || cause;
    const likelihood = oneOf<HarmLikelihood>(r.likelihood, HARM_LIKELIHOOD_OPTS);
    const severity = oneOf<HarmSeverity>(r.severity, HARM_SEVERITY_OPTS);
    const scored = likelihood && severity
      ? LIKELIHOOD_WEIGHT[likelihood] * SEVERITY_WEIGHT[severity]
      : null;
    const complete = source.length > 0 && cause.length > 0 && scored !== null
      && dataInvolved.length > 0 && actor.length > 0 && pathway.length > 0;
    const missing: string[] = [];
    if (!dataInvolved) missing.push("the personal information involved");
    if (!actor) missing.push("the actor who would bring the impact about");
    if (!pathway) missing.push("the pathway by which it would occur");
    if (!source) missing.push("the source of the impact");
    if (!cause) missing.push("the cause of the impact");
    if (!likelihood) missing.push("its likelihood");
    if (!severity) missing.push("its severity");
    out.push({
      harm_id: id,
      harm_pinpoint: cat.pinpoint,
      harm_label: cat.label,
      harm_verbatim: cat.verbatim,
      data_involved: dataInvolved || NOT_STATED,
      actor: actor || NOT_STATED,
      pathway: pathway || NOT_STATED,

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
      data_involved: NOT_STATED,
      actor: NOT_STATED,
      pathway: NOT_STATED,
      source: NOT_STATED,
      cause: NOT_STATED,
      likelihood: NOT_STATED,
      severity: NOT_STATED,
      inherent_band: "undetermined",
      status: "record_insufficient",
      information_needed:
        "Identify the negative impacts to consumers' privacy for this activity against the § 7152(a)(5)(A)–(H) examples, and for each state the personal information involved, the actor, the pathway, and the source and cause of the impact.",
    }];
  }
  // Deterministic ordering: catalogue order.
  return out.sort((a, b) => a.harm_id.localeCompare(b.harm_id));
}

// ---------------------------------------------------------------------
// 3. § 7152(a)(6) — safeguard map (harm-bound, with residual)
// ---------------------------------------------------------------------
function residualSentence(
  band_: ResidualBand,
  pinpoint: string,
  stated: string,
): string {
  if (stated) return stated;
  if (band_ === "undetermined") {
    return `The residual exposure at ${pinpoint} cannot be stated because the record does not carry the inputs the calculation requires.`;
  }
  return `After the recorded safeguard, the residual exposure at ${pinpoint} is ${band_}.`;
}

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
    // UPGRADE-2 (d) — a safeguard may address more than one catalogued harm.
    const extraIds: HarmId[] = [];
    for (const h2 of (Array.isArray(r.harms) ? r.harms : [])) {
      const hid = resolveHarmId(h2);
      if (hid && byHarm.has(hid) && hid !== id && !extraIds.includes(hid)) {
        extraIds.push(hid);
        covered.add(hid);
      }
    }
    const h = byHarm.get(id)!;
    const inherent = h.likelihood !== NOT_STATED && h.severity !== NOT_STATED
      ? LIKELIHOOD_WEIGHT[h.likelihood as HarmLikelihood] * SEVERITY_WEIGHT[h.severity as HarmSeverity]
      : null;
    const residual = inherent === null || !sstatus
      ? null
      : Math.max(1, inherent - SAFEGUARD_CREDIT[sstatus]);
    const complete = safeguard.length > 0 && sstatus !== null && residual !== null;
    const rband = band(residual);
    out.push({
      harm_id: id,
      harm_ids: [id, ...extraIds],
      safeguard: safeguard || NOT_STATED,
      safeguard_status: sstatus ?? NOT_STATED,
      residual_band: rband,
      residual_statement: residualSentence(rband, h.harm_pinpoint, str(r.residual)),
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
      harm_ids: [h.harm_id],
      safeguard: NOT_STATED,
      safeguard_status: NOT_STATED,
      residual_band: h.inherent_band,
      residual_statement:
        `No safeguard is recorded for the impact at ${h.harm_pinpoint}; the residual exposure is therefore the inherent exposure (${h.inherent_band}).`,
      citation: CITE_A6,
      status: "record_insufficient",
      information_needed:
        `No safeguard is recorded for the negative impact at ${h.harm_pinpoint}. § 7152(a)(6) requires the business to identify the safeguards it plans to implement to address the impacts identified under § 7152(a)(5).`,
    });
  }
  return out.sort((a, b) => a.harm_id.localeCompare(b.harm_id));
}

// ---------------------------------------------------------------------
// 4a. § 7152(a)(4) — BENEFITS, one record per beneficiary class (max 4)
// ---------------------------------------------------------------------
function isGeneric(text: string): boolean {
  return GENERIC_BENEFIT_PATTERNS.some((re) => re.test(text));
}

export interface BenefitInput {
  readonly benefit: string;
  readonly supporting_record_fact: string;
}

export function buildBenefits(
  input: Record<BeneficiaryClass, BenefitInput>,
): BenefitEntry[] {
  // EXACTLY-FOUR LAW — § 7152(a)(4) enumerates four classes; the deliverable
  // carries one record per class, never more, never fewer.
  return BENEFICIARY_CLASSES.map((cls) => {
    const benefit = str(input[cls]?.benefit);
    const fact = str(input[cls]?.supporting_record_fact);
    if (!benefit) {
      return {
        beneficiary_class: cls,
        benefit: NOT_STATED,
        supporting_record_fact: fact || NOT_STATED,
        generic_benefit_flag: false,
        sufficiency: "benefit_not_stated" as const,
        citation: CITE_A4,
        status: "record_insufficient" as const,
        information_needed:
          `State the benefit of this processing to ${cls}, in specific terms, or record that none applies. § 7152(a)(4) requires the benefits to the business, the consumer, other stakeholders, and the public, as applicable.`,
      };
    }
    const generic = isGeneric(benefit);
    if (generic) {
      return {
        beneficiary_class: cls,
        benefit,
        supporting_record_fact: fact || NOT_STATED,
        generic_benefit_flag: true,
        sufficiency: "benefit_generic" as const,
        citation: CITE_A4,
        status: "record_insufficient" as const,
        information_needed:
          `The benefit stated for ${cls} is expressed in generic terms. § 7152(a)(4) requires that benefits not be identified generically; restate it as the specific outcome the processing produces.`,
      };
    }
    if (!fact) {
      return {
        beneficiary_class: cls,
        benefit,
        supporting_record_fact: NOT_STATED,
        generic_benefit_flag: false,
        sufficiency: "benefit_unsupported" as const,
        citation: CITE_A4,
        status: "record_insufficient" as const,
        information_needed:
          `State the record fact that supports the benefit claimed for ${cls}. A benefit asserted without a supporting fact cannot be weighed under § 7152(a).`,
      };
    }
    return {
      beneficiary_class: cls,
      benefit,
      supporting_record_fact: fact,
      generic_benefit_flag: false,
      sufficiency: "benefit_supported" as const,
      citation: CITE_A4,
      status: "analysed" as const,
    };
  });
}

// ---------------------------------------------------------------------
// 4b. § 7152(a) chapeau + § 7154(a) — WEIGHING, per beneficiary class
//     The analytical centre: the case FOR, the case AGAINST, and an
//     outweigh determination with reasoning. Derived — never asked.
// ---------------------------------------------------------------------
const BAND_RANK: Readonly<Record<ResidualBand, number>> = {
  low: 1,
  moderate: 2,
  high: 3,
  undetermined: 0,
};

function worstResidual(safeguards: readonly SafeguardMapEntry[]): ResidualBand {
  let worst: ResidualBand = "undetermined";
  for (const sg of safeguards) {
    if (BAND_RANK[sg.residual_band] > BAND_RANK[worst]) worst = sg.residual_band;
  }
  return worst;
}

function caseAgainstText(
  harms: readonly HarmCausationEntry[],
  safeguards: readonly SafeguardMapEntry[],
): string {
  const analysed = harms.filter((h) => h.status === "analysed");
  if (analysed.length === 0) return NOT_STATED;
  const byHarm = new Map(safeguards.map((s) => [s.harm_id, s]));
  return analysed
    .map((h) => {
      const sg = byHarm.get(h.harm_id);
      const residual = sg ? sg.residual_statement : `No safeguard is recorded for the impact at ${h.harm_pinpoint}.`;
      return `${h.harm_pinpoint} (${h.harm_label}): ${h.actor} could bring this about through ${h.pathway}, involving ${h.data_involved}. Recorded likelihood ${h.likelihood}; recorded severity ${h.severity}. ${residual}`;
    })
    .join(" ");
}

export function buildWeighing(
  benefits: readonly BenefitEntry[],
  harms: readonly HarmCausationEntry[],
  safeguards: readonly SafeguardMapEntry[],
): WeighingEntry[] {
  const harmIds = harms.filter((h) => h.status === "analysed").map((h) => h.harm_id);
  const against = caseAgainstText(harms, safeguards);
  const worst = worstResidual(safeguards.filter((s) => harmIds.includes(s.harm_id)));
  const byClass = new Map(benefits.map((b) => [b.beneficiary_class, b]));

  return BENEFICIARY_CLASSES.map((cls) => {
    const b = byClass.get(cls);
    const supported = b?.sufficiency === "benefit_supported";
    const caseFor = supported
      ? `${b!.benefit} The record fact supporting this is: ${b!.supporting_record_fact}`
      : NOT_STATED;

    let determination: OutweighDetermination;
    let reasoning: string;

    if (!supported || harmIds.length === 0 || worst === "undetermined") {
      determination = "undetermined_on_the_record";
      const why = !supported
        ? `the benefit to ${cls} is not stated on the record in the specific, fact-supported terms § 7152(a)(4) requires`
        : harmIds.length === 0
        ? "no negative impact has been analysed to completion, so there is nothing to weigh the benefit against"
        : "the residual exposure of the identified impacts cannot be determined from the present record";
      reasoning =
        `The weighing for ${cls} is reserved because ${why}. § 7152(a) requires the business to determine whether the benefits of the processing outweigh the negative impacts; that determination cannot be made on an incomplete record, and it is not made here.`;
    } else if (worst === "high") {
      determination = "impacts_outweigh";
      reasoning =
        `Weighed against the benefit to ${cls}, at least one identified negative impact carries a high residual exposure after the recorded safeguards. On this record the negative impacts to consumers' privacy are not outweighed by the benefit to ${cls} (§ 7152(a); § 7154(a)).`;
    } else if (worst === "moderate") {
      determination = "close_balance";
      reasoning =
        `The benefit to ${cls} is specific and supported, but at least one identified negative impact retains a moderate residual exposure after the recorded safeguards. The balance is close: reasonable assessments could differ, and the determination turns on whether the residual exposure is reduced further (§ 7152(a); § 7154(a)).`;
    } else {
      determination = "benefits_outweigh";
      reasoning =
        `Every identified negative impact is addressed by a recorded safeguard leaving a low residual exposure, and the benefit to ${cls} is specific and supported by a record fact. On this record the benefit to ${cls} outweighs the negative impacts to consumers' privacy (§ 7152(a); § 7154(a)).`;
    }

    return {
      beneficiary_class: cls,
      case_for: caseFor,
      case_against: against,
      outweigh_determination: determination,
      reasoning,
      benefit_statement: b?.benefit ?? NOT_STATED,
      generic_benefit_flag: b?.generic_benefit_flag ?? false,
      offsetting_harm_ids: harmIds,
      sufficiency: supported
        ? "benefit_supported" as const
        : b?.sufficiency === "benefit_generic"
        ? "benefit_generic" as const
        : "benefit_not_stated" as const,
      citation: CITE_CHAPEAU,
      status: determination === "undetermined_on_the_record"
        ? "record_insufficient" as const
        : "analysed" as const,
      ...(determination === "undetermined_on_the_record"
        ? { information_needed: b?.information_needed ??
            `Complete the record for the ${cls} weighing: § 7152(a) requires a stated benefit and a completed impact analysis before the balance can be struck.` }
        : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 5. § 7152(a)(7) — CONSEQUENCE, COMPUTED FROM weighing[]
// ---------------------------------------------------------------------
export interface ConsequenceInput {
  readonly necessity: readonly NecessityAnalysisEntry[];
  readonly benefits: readonly BenefitEntry[];
  readonly harms: readonly HarmCausationEntry[];
  readonly safeguards: readonly SafeguardMapEntry[];
  readonly weighing: readonly WeighingEntry[];
  readonly attestation: Attestation;
}

/**
 * DECISION RULES (evaluated in order; first terminal rule wins).
 *
 *   C0  attestation record absent               → reserved_insufficient_record
 *   C1  any weighing undetermined, or any other
 *       deliverable record_insufficient         → reserved_insufficient_record
 *   C2  EVERY class weighs impacts_outweigh     → prohibit
 *   C3  SOME class weighs impacts_outweigh      → restrict
 *   C4  any close_balance, minimisation
 *       candidate, or planned-not-implemented
 *       safeguard                               → initiate_with_modifications
 *   C5  otherwise                               → initiate
 *
 * Each modification is bound to the specific risk it addresses.
 */
export function decideConsequence(input: ConsequenceInput): Consequence {
  const rule_ids: string[] = [];
  const reasons: string[] = [];
  const modifications: ConsequenceModification[] = [];

  const approvalRecorded = input.attestation.status === "analysed";

  const insufficient = [
    ...input.necessity,
    ...input.benefits,
    ...input.harms,
    ...input.safeguards,
    ...input.weighing,
  ].filter((d) => d.status === "record_insufficient");

  const impactsOutweigh = input.weighing.filter((w) => w.outweigh_determination === "impacts_outweigh");
  const closeBalance = input.weighing.filter((w) => w.outweigh_determination === "close_balance");
  const undetermined = input.weighing.filter((w) => w.outweigh_determination === "undetermined_on_the_record");
  const highResidual = input.safeguards.filter((s) => s.residual_band === "high");
  const moderateResidual = input.safeguards.filter((s) => s.residual_band === "moderate");
  const minimisation = input.necessity.filter((n) => n.verdict === "minimisation_candidate");
  const planned = input.safeguards.filter((s) => s.safeguard_status === "Planned, not yet implemented");

  for (const m of minimisation) {
    modifications.push({
      modification: `Cease collecting "${m.element}", or record why it is necessary to the purpose it is said to serve (${m.purpose_served}).`,
      addresses_risk: `"${m.element}" is recorded as collected but not necessary to the stated purpose, so the processing exceeds what § 7152(a)(2) permits to be treated as minimum-necessary.`,
      citation: CITE_A2,
    });
  }
  for (const p of planned) {
    modifications.push({
      modification: `Implement the safeguard "${p.safeguard}" before the processing proceeds.`,
      addresses_risk: `${p.residual_statement} The safeguard relied on at ${harmEntry(p.harm_id).pinpoint} is planned but not yet in place.`,
      citation: CITE_A6,
    });
  }
  for (const h of highResidual) {
    modifications.push({
      modification: `Reduce the residual exposure at ${harmEntry(h.harm_id).pinpoint} before initiating the processing.`,
      addresses_risk: h.residual_statement,
      citation: CITE_A6,
    });
  }
  for (const m of moderateResidual) {
    if (highResidual.some((h) => h.harm_id === m.harm_id)) continue;
    modifications.push({
      modification: `Strengthen or test the safeguard "${m.safeguard}" so the residual exposure at ${harmEntry(m.harm_id).pinpoint} is reduced.`,
      addresses_risk: m.residual_statement,
      citation: CITE_A6,
    });
  }

  let decision: Consequence["decision"];
  if (!approvalRecorded) {
    rule_ids.push("C0");
    reasons.push("The record does not carry the review-and-approval information § 7152(a)(8)-(9) requires, so the initiation decision is reserved.");
    decision = "reserved_insufficient_record";
  } else if (undetermined.length > 0 || insufficient.length > 0) {
    rule_ids.push("C1");
    reasons.push(`${insufficient.length} required analytic element${insufficient.length === 1 ? " is" : "s are"} not supported by the present record; the initiation decision is reserved until they are completed.`);
    decision = "reserved_insufficient_record";
  } else if (impactsOutweigh.length === input.weighing.length && input.weighing.length > 0) {
    rule_ids.push("C2");
    reasons.push("For every beneficiary class § 7152(a)(4) enumerates, the negative impacts to consumers' privacy are not outweighed by the stated benefit.");
    decision = "prohibit";
  } else if (impactsOutweigh.length > 0) {
    rule_ids.push("C3");
    reasons.push(`For ${impactsOutweigh.map((w) => w.beneficiary_class).join(", ")}, the negative impacts are not outweighed by the stated benefit; the processing may proceed only as restricted to the uses that do weigh out.`);
    decision = "restrict";
  } else if (closeBalance.length > 0 || minimisation.length > 0 || planned.length > 0) {
    rule_ids.push("C4");
    if (closeBalance.length > 0) reasons.push("At least one beneficiary-class weighing is a close balance after the recorded safeguards.");
    if (minimisation.length > 0) reasons.push("At least one personal-information element is recorded as collected but not necessary to the stated purpose.");
    if (planned.length > 0) reasons.push("At least one safeguard relied upon is planned but not yet implemented.");
    decision = "initiate_with_modifications";
  } else {
    rule_ids.push("C5");
    reasons.push("For every beneficiary class the stated benefit is specific, supported by a record fact, and outweighs the identified negative impacts, each of which is addressed by an implemented safeguard.");
    decision = "initiate";
  }

  return {
    decision,
    rule_ids,
    reasons,
    conditions: modifications.map((m) => m.modification),
    modifications,
    citation: CITE_A7,
    approver_name: input.attestation.approvers[0]?.name ?? NOT_STATED,
    approver_position: input.attestation.approvers[0]?.position ?? NOT_STATED,
    approval_date: input.attestation.approval_date,
    approval_recorded: approvalRecorded,
    status: decision === "reserved_insufficient_record" ? "record_insufficient" : "analysed",
    ...(approvalRecorded ? {} : {
      information_needed: input.attestation.information_needed ??
        "Record the date the assessment was reviewed and approved and the name and position of the approving individual (§ 7152(a)(9)).",
    }),
  };
}

// ---------------------------------------------------------------------
// 6. § 7152(a)(8)-(9) — ATTESTATION BLOCK
// ---------------------------------------------------------------------
/** § 7152(a)(8) excludes legal counsel from the providers that must be named. */
const LEGAL_COUNSEL_PATTERNS: readonly RegExp[] = [
  /\blegal counsel\b/i,
  /\boutside counsel\b/i,
  /\bin-house counsel\b/i,
  /\battorney\b/i,
  /\bgeneral counsel\b/i,
  /\blaw firm\b/i,
];

export function buildAttestation(intakeRaw: Record<string, unknown> | undefined | null): Attestation {
  const intake = (intakeRaw ?? {}) as Record<string, unknown>;
  const rawProviders: string[] = Array.isArray(intake.a8_information_providers)
    ? (intake.a8_information_providers as unknown[]).map((v) => str(v)).filter(Boolean)
    : str(intake.a8_information_providers)
      ? str(intake.a8_information_providers).split(/[;\n]+/).map((x) => x.trim()).filter(Boolean)
      : [];
  // EXCLUSION LAW — § 7152(a)(8) requires the providers OTHER THAN legal
  // counsel; counsel entries are removed, never listed.
  const providers = rawProviders.filter((p) => !LEGAL_COUNSEL_PATTERNS.some((re) => re.test(p)));

  const approvers: { name: string; position: string }[] = [];
  for (const a of arr(intake.a9_approvers)) {
    const name = str(a.name);
    const position = str(a.position);
    if (name || position) approvers.push({ name: name || NOT_STATED, position: position || NOT_STATED });
  }
  const legacyName = str(intake.a9_approver_name);
  const legacyPosition = str(intake.a9_approver_position);
  if (approvers.length === 0 && (legacyName || legacyPosition)) {
    approvers.push({ name: legacyName || NOT_STATED, position: legacyPosition || NOT_STATED });
  }

  const reviewDate = str(intake.a9_review_date);
  const approvalDate = str(intake.a9_approval_date);
  const approverComplete = approvers.length > 0
    && approvers.every((a) => a.name !== NOT_STATED && a.position !== NOT_STATED);

  const missing: string[] = [];
  if (providers.length === 0) missing.push("the names or positions of the individuals who provided the information in this assessment, other than legal counsel (§ 7152(a)(8))");
  if (!approverComplete) missing.push("the name and position of each individual who reviewed and approved the assessment (§ 7152(a)(9))");
  if (!reviewDate) missing.push("the date the assessment was reviewed (§ 7152(a)(9))");
  if (!approvalDate) missing.push("the date the assessment was approved (§ 7152(a)(9))");

  return {
    information_providers: providers,
    legal_counsel_excluded: rawProviders.length !== providers.length,
    review_date: reviewDate || NOT_STATED,
    approval_date: approvalDate || NOT_STATED,
    approvers,
    approval_authority_requirement: APPROVAL_AUTHORITY_REQUIREMENT,
    citation: `${CITE_A8}, ${CITE_A9}`,
    status: missing.length === 0 ? "analysed" : "record_insufficient",
    ...(missing.length === 0 ? {} : {
      information_needed: `Record ${missing.join("; ")}.`,
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

function benefitInputsFrom(intake: Record<string, unknown>): Record<BeneficiaryClass, BenefitInput> {
  return {
    "the business": {
      benefit: str(intake.a4_benefit_business),
      supporting_record_fact: str(intake.a4_benefit_business_fact),
    },
    "the consumer": {
      benefit: str(intake.a4_benefit_consumer),
      supporting_record_fact: str(intake.a4_benefit_consumer_fact),
    },
    "other stakeholders": {
      benefit: str(intake.a4_benefit_other_stakeholders),
      supporting_record_fact: str(intake.a4_benefit_other_stakeholders_fact),
    },
    "the public": {
      benefit: str(intake.a4_benefit_public),
      supporting_record_fact: str(intake.a4_benefit_public_fact),
    },
  };
}

const EMPTY_BENEFIT_INPUT: Record<BeneficiaryClass, BenefitInput> = {
  "the business": { benefit: "", supporting_record_fact: "" },
  "the consumer": { benefit: "", supporting_record_fact: "" },
  "other stakeholders": { benefit: "", supporting_record_fact: "" },
  "the public": { benefit: "", supporting_record_fact: "" },
};

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
  const attestation = buildAttestation(intake);
  const degraded = (activity_id: string, activity_name: string, activity_purpose: string, is_primary: boolean): ActivityAnalytics => {
    const harms = buildHarmCausation(undefined);
    const necessity = buildNecessityAnalysis(undefined, activity_purpose === NOT_STATED ? "" : activity_purpose);
    const safeguards = buildSafeguardMap(undefined, harms);
    const benefits = buildBenefits(EMPTY_BENEFIT_INPUT);
    const weighing = buildWeighing(benefits, harms, safeguards);
    return {
      activity_id,
      activity_name,
      activity_purpose,
      is_primary,
      necessity_analysis: necessity,
      benefits,
      harm_causation: harms,
      safeguard_map: safeguards,
      weighing,
      consequence: decideConsequence({ necessity, benefits, harms, safeguards, weighing, attestation }),
    };
  };

  try {
    const out: ActivityAnalytics[] = [];

    const primaryName = str(intake.primary_activity_name) || NOT_STATED;
    const primaryPurpose = str(intake.primary_activity_purpose) || NOT_STATED;
    const necessity = buildNecessityAnalysis(
      intake.a2_necessity_set,
      primaryPurpose === NOT_STATED ? "" : primaryPurpose,
    );
    const benefits = buildBenefits(benefitInputsFrom(intake));
    const harms = buildHarmCausation(intake.a5_harm_pathways);
    const safeguards = buildSafeguardMap(intake.a6_safeguards, harms);
    const weighing = buildWeighing(benefits, harms, safeguards);
    const consequence = decideConsequence({ necessity, benefits, harms, safeguards, weighing, attestation });

    out.push({
      activity_id: `act.${slug(primaryName, "primary")}`,
      activity_name: primaryName,
      activity_purpose: primaryPurpose,
      is_primary: true,
      necessity_analysis: necessity,
      benefits,
      harm_causation: harms,
      safeguard_map: safeguards,
      weighing,
      consequence,
    });

    const secondaries = arr(intake.secondary_activities);
    secondaries.forEach((sec, i) => {
      const name = str(sec.name) || `Additional use #${i + 1} (not described)`;
      out.push(degraded(
        `act.${slug(name, `secondary-${i + 1}`)}`,
        name,
        str(sec.purpose) || NOT_STATED,
        false,
      ));
    });

    return out;
  } catch {
    // BUILDER-FAULT DEGRADATION — never throw into derivePlan.
    return [degraded("act.unavailable", NOT_STATED, NOT_STATED, true)];
  }
}

export { HARM_CATALOGUE_CITATION };
