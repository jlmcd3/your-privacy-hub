/**
 * ITEM 310 — builder for the four dpia analytic deliverables.
 *
 * PURITY LAW: pure function of the intake object. No I/O, no clock, no env;
 * never throws — a builder fault degrades the envelope rather than aborting.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.necessity_findings, report.proportionality, report.risk_register
 * and report.art36_consultation. The model narrates; it does not overwrite.
 *
 * SEPARATION LAW: enforcement-exposure sentences are mechanically relocated
 * out of art36_consultation.why into .exposure_note (Item 308 pattern).
 */
import { ANCHOR_KEYS, DPIA_RISK_SPECS, row, type RiskFacts } from "./elements.ts";
import type {
  AlternativeConsidered,
  Art36Consultation,
  DpiaDeliverables,
  Likelihood,
  NecessityFinding,
  NecessityVerdict,
  ProportionalityFinding,
  RiskBand,
  RiskRegisterEntry,
} from "./types.ts";

export const DPIA_DELIVERABLES_VERSION =
  "dpia-analytic-deliverables-2026-08-01-wp248";

const NOT_STATED = "not stated on the record";

/** Language that argues the IMPACT side of the balance. */
const IMPACT_LEXICON: readonly RegExp[] = [
  /\bintrusive\b/i,
  /\bimpact(s|ed)? on\b/i,
  /\bdetriment\b/i,
  /\brisk(s)? to (the )?(data subjects?|individuals?|rights)\b/i,
  /\bintrusion\b/i,
  /\breasonable expectations?\b/i,
  /\baffects? (the )?(data subjects?|individuals?|employees?|patients?|customers?)\b/i,
  /\bloss of control\b/i,
];

/** Language that argues the BENEFIT side of the balance. */
const BENEFIT_LEXICON: readonly RegExp[] = [
  /\bbenefit(s)?\b/i,
  /\benables?\b/i,
  /\bnecessary to\b/i,
  /\bachiev(e|es|ing)\b/i,
  /\bimproves?\b/i,
  /\bdelivers?\b/i,
  /\brequired (to|for)\b/i,
  /\bsupports?\b/i,
];

/** Rejection reasons that only say the alternative was less USEFUL. */
const USEFULNESS_ONLY: readonly RegExp[] = [
  /\bless (useful|convenient|efficient|accurate)\b/i,
  /\bmore (expensive|costly|work|effort)\b/i,
  /\bwould (slow|reduce) (us|the business|throughput|revenue)\b/i,
  /\bnot as good\b/i,
  /\bcommercially (unattractive|inconvenient)\b/i,
];

/** Enforcement-exposure framing that must not sit inside an obligation finding. */
const EXPOSURE_LEXICON: readonly RegExp[] = [
  /\bfine(s|d)?\b/i,
  /\bpenalt(y|ies)\b/i,
  /\benforcement action\b/i,
  /\badministrative fine\b/i,
  /\b4\s*%|\b2\s*%|\bEUR\s?20\s?million|\b£17\.5\s?million/i,
  /\bsanction(s)?\b/i,
  /\bArt(icle)?\.?\s*83\b/i,
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * ITEM 330 — DPIA regime selector (CITATION ONLY).
 *
 * Returns "UK" when the record's `jurisdictions` name the United Kingdom and
 * no EU/EEA GDPR jurisdiction. The UK Art. 35 text is word-identical to the
 * EU text (the Commissioner replaces the supervisory authority), and Art.
 * 35(3)(a) does not cross-reference Art. 22 by number in either regime, so
 * this selector NEVER changes a trigger, threshold, likelihood, band or
 * determination — it only selects which verbatim row is cited.
 */
export type DpiaRegime = "EU" | "UK";

export function readDpiaRegime(intake: unknown): DpiaRegime {
  const js = arr(get(intake, "jurisdictions"));
  const uk = js.some((j) => /united kingdom|uk gdpr/i.test(j));
  const eu = js.some((j) => /^eu \(gdpr\)|european|eea/i.test(j));
  return uk && !eu ? "UK" : "EU";
}

function anchor(
  key: keyof typeof ANCHOR_KEYS,
  regime: DpiaRegime = "EU",
): { citation: string; verbatim: string } {
  const base = ANCHOR_KEYS[key];
  const r = (regime === "UK" ? row(`uk_${base}`) : null) ?? row(base);
  return {
    citation: r?.subsection ?? "",
    verbatim: r?.verbatim_quote ?? "",
  };
}

/** Fallback citation prefix used only when a registry row is missing. */
function cit(regime: DpiaRegime, subsection: string): string {
  return `${regime === "UK" ? "UK GDPR" : "GDPR"} ${subsection}`;
}


function matches(text: string, res: readonly RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

// ---------------------------------------------------------------------
// Operations — the unit each of deliverables 1 and 2 iterates over.
// ---------------------------------------------------------------------
interface Operation {
  readonly operation_id: string;
  readonly operation_label: string;
  readonly purpose_text: string;
}

export function buildOperations(intake: unknown): Operation[] {
  const primaryPurpose = str(get(intake, "purpose"));
  const activity = str(get(intake, "processing_activity_name")) || "the assessed processing";
  const ops: Operation[] = [
    {
      operation_id: "op_primary",
      operation_label: activity,
      purpose_text: primaryPurpose,
    },
  ];
  const secondary = str(get(intake, "secondary_uses"));
  if (secondary) {
    ops.push({
      operation_id: "op_secondary",
      operation_label: `${activity} — secondary use`,
      purpose_text: secondary,
    });
  }
  return ops;
}

/** Alternatives the record says were considered, grouped by operation id. */
function alternativesFor(intake: unknown, op: Operation): AlternativeConsidered[] {
  const raw = get(intake, "alternatives_considered");
  if (!Array.isArray(raw)) return [];
  const out: AlternativeConsidered[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    const target = str(rec.processing_operation);
    const belongs = target
      ? target === op.operation_label ||
        target === op.operation_id ||
        (op.operation_id === "op_primary" && /primary/i.test(target))
      : op.operation_id === "op_primary";
    if (!belongs) continue;
    const alternative = str(rec.alternative);
    const rejection_reason = str(rec.rejection_reason);
    if (!alternative) continue;
    out.push({
      alternative,
      rejection_reason: rejection_reason || NOT_STATED,
      rejected_for_usefulness_only:
        rejection_reason.length > 0 &&
        matches(rejection_reason, USEFULNESS_ONLY) &&
        !/cannot|does not|would not (achieve|deliver|meet)|fails to/i.test(rejection_reason),
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// 1. Art. 35(7)(b) — necessity (least-intrusive means, PERFORMED)
// ---------------------------------------------------------------------
export function buildNecessityFindings(intake: unknown): NecessityFinding[] {
  const a = anchor("necessity");
  const test = anchor("necessity_test");
  const useful = anchor("useful_not_necessary");

  return buildOperations(intake).map((op) => {
    const purpose_stated = op.purpose_text.length > 0;
    const alternatives = alternativesFor(intake, op);

    let verdict: NecessityVerdict;
    let why: string;
    let status: NecessityFinding["status"] = "analysed";
    let information_needed: string | undefined;

    if (!purpose_stated) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why =
        "No purpose is recorded for this operation, and necessity is measured against a purpose; without one there is nothing for the least-intrusive-means test to compare against.";
      information_needed =
        `The specific purpose pursued by "${op.operation_label}", stated as an outcome rather than an activity.`;
    } else if (alternatives.length === 0) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why =
        `The record states the purpose ("${op.purpose_text}") but records no alternative means that were considered and rejected. ` +
        `The test the assessment must run is the one the guidance states: ${test.verbatim} ` +
        "Until the alternatives that were actually weighed are recorded, that comparison cannot be run on this record.";
      information_needed =
        `For "${op.operation_label}": each less-intrusive alternative that was actually considered (for example a narrower data set, aggregated or pseudonymised data, a shorter retention period, or a manual process), and the specific reason each was rejected.`;
    } else {
      const usefulnessOnly = alternatives.filter((x) => x.rejected_for_usefulness_only);
      const unexplained = alternatives.filter((x) => x.rejection_reason === NOT_STATED);
      if (unexplained.length > 0) {
        verdict = "undetermined_on_the_record";
        status = "record_insufficient";
        why =
          `${alternatives.length} alternative(s) are recorded for this operation, but ${unexplained.length} carry no rejection reason, so the comparison between them and the chosen means is incomplete.`;
        information_needed =
          `The reason each of the following alternatives was rejected: ${unexplained.map((x) => x.alternative).join("; ")}.`;
      } else if (usefulnessOnly.length > 0) {
        verdict = "less_intrusive_alternative_available";
        why =
          `${usefulnessOnly.length} of the ${alternatives.length} recorded alternative(s) — ${usefulnessOnly.map((x) => x.alternative).join("; ")} — were rejected on usefulness or cost grounds rather than because they would fail to achieve the purpose. ` +
          `${useful.verbatim} On this record a realistic less intrusive alternative remains available, so the chosen means is not established as necessary for this purpose.`;
      } else {
        verdict = "least_intrusive_means_supported";
        why =
          `The record identifies ${alternatives.length} alternative(s) — ${alternatives.map((x) => x.alternative).join("; ")} — and states for each why it would not achieve the recorded purpose ("${op.purpose_text}"). ` +
          `Applying the stated test — ${test.verbatim} — no realistic less intrusive alternative is left standing on this record, and the chosen means is supported as necessary.`;
      }
    }

    return {
      operation_id: op.operation_id,
      operation_label: op.operation_label,
      purpose_stated,
      purpose_text: op.purpose_text || NOT_STATED,
      alternatives_considered: alternatives,
      verdict,
      why,
      citation: a.citation || "GDPR Art. 35(7)(b)",
      authority_verbatim: a.verbatim,
      status,
      ...(information_needed ? { information_needed } : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 2. Art. 35(7)(b) — proportionality, SPLIT OUT from necessity
// ---------------------------------------------------------------------
export function buildProportionality(intake: unknown): ProportionalityFinding[] {
  const a = anchor("necessity");
  const narrative = str(get(intake, "necessity_proportionality"));
  const minimisation = str(get(intake, "data_minimisation_justification"));
  const subjects = str(get(intake, "data_subjects"));
  const volume = str(get(intake, "volume_frequency"));
  const combined = [narrative, minimisation].filter(Boolean).join(" ");

  return buildOperations(intake).map((op) => {
    const benefitSide = op.purpose_text || (matches(combined, BENEFIT_LEXICON) ? combined : "");
    const impactSide = matches(combined, IMPACT_LEXICON) ? combined : "";
    const argued_both_directions = benefitSide.length > 0 && impactSide.length > 0;

    let verdict: ProportionalityFinding["verdict"];
    let why: string;
    let status: ProportionalityFinding["status"] = "analysed";
    let information_needed: string | undefined;

    if (!argued_both_directions) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why = benefitSide.length === 0
        ? "The record argues neither side of the balance for this operation: no benefit is stated and no impact on the data subjects is described, so there is nothing to weigh."
        : "The record argues only the benefit side of the balance. Proportionality is a two-sided test and cannot be concluded from a statement of benefit alone; the impact on the data subjects is not described on this record.";
      information_needed =
        `For "${op.operation_label}": the impact the processing has on the data subjects (${subjects || "the individuals concerned"}) at the recorded scale (${volume || "the recorded volume"}) — what they lose, what they would not expect, and what they cannot avoid — stated separately from the benefit.`;
    } else {
      // Both sides present. The balance tips against the processing where the
      // impact side names an effect the record does not answer with a measure.
      const measures = arr(get(intake, "existing_safeguards")).filter((s) => s !== "None");
      if (measures.length === 0) {
        verdict = "disproportionate_on_the_record";
        why =
          `The record puts both sides of the balance — benefit: "${benefitSide}"; impact: "${impactSide}" — but records no safeguard applied against that impact, so as the record stands the impact on the data subjects is not answered and the processing is not proportionate on these facts.`;
      } else {
        verdict = "proportionate_on_the_record";
        why =
          `The record puts both sides of the balance — benefit: "${benefitSide}"; impact: "${impactSide}" — and records ${measures.length} safeguard(s) (${measures.join("; ")}) applied against that impact. On these facts the impact is answered and the processing is proportionate to the recorded purpose.`;
      }
    }

    return {
      operation_id: op.operation_id,
      operation_label: op.operation_label,
      benefit_argument: benefitSide || NOT_STATED,
      impact_argument: impactSide || NOT_STATED,
      argued_both_directions,
      verdict,
      why,
      citation: a.citation || "GDPR Art. 35(7)(b)",
      authority_verbatim: a.verbatim,
      status,
      ...(information_needed ? { information_needed } : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 3. Art. 35(7)(c) — risk register
// ---------------------------------------------------------------------
function facts(intake: unknown): RiskFacts {
  const transfers = get(intake, "transfer_flows");
  return {
    dataCategories: arr(get(intake, "data_categories")),
    safeguards: arr(get(intake, "existing_safeguards")).filter((s) => s !== "None"),
    processors: arr(get(intake, "third_party_processors")),
    transferCount: Array.isArray(transfers) ? transfers.length : 0,
    retentionStated: str(get(intake, "retention_period")).length > 0,
    reasons: arr(get(intake, "reasons_to_conduct")),
    secondaryUses: str(get(intake, "secondary_uses")),
    volume: str(get(intake, "volume_frequency")),
  };
}

function bandFromSeverity(sev: string): RiskBand {
  if (sev === "Severe") return "high";
  if (sev === "Significant") return "moderate";
  if (sev === "Moderate") return "low";
  return "undetermined";
}

const BAND_ORDER: RiskBand[] = ["low", "moderate", "high"];

function lower(band: RiskBand, steps: number): RiskBand {
  if (band === "undetermined") return band;
  const i = BAND_ORDER.indexOf(band);
  return BAND_ORDER[Math.max(0, i - steps)];
}

export function buildRiskRegister(intake: unknown): RiskRegisterEntry[] {
  const f = facts(intake);
  const a = anchor("risks");
  const m = anchor("measures");
  // WP248-PINNING (2026-08-01) — the severity appraisal is guidance-anchored.
  const g = anchor("risk_severity");
  const out: RiskRegisterEntry[] = [];

  for (const spec of DPIA_RISK_SPECS) {
    if (!spec.trigger(f)) continue;

    const measures = spec.mitigating_safeguards.filter((s) => f.safeguards.includes(s));
    const coverage = spec.mitigating_safeguards.length === 0
      ? 0
      : measures.length / spec.mitigating_safeguards.length;

    // Likelihood is READ OFF the record's safeguard coverage for this risk —
    // it is never invented and never asserted where the record is silent
    // about safeguards altogether.
    let likelihood: Likelihood;
    if (f.safeguards.length === 0) {
      likelihood = "Likely";
    } else if (coverage >= 0.75) {
      likelihood = "Unlikely";
    } else if (coverage > 0) {
      likelihood = "Possible";
    } else {
      likelihood = "Likely";
    }

    const inherent_band = bandFromSeverity(spec.severity);
    const residual_band: RiskBand = likelihood === "Unlikely"
      ? lower(inherent_band, 1)
      : likelihood === "Possible"
      ? inherent_band
      : inherent_band === "low"
      ? "moderate"
      : inherent_band;

    const insufficient = measures.length === 0;

    out.push({
      risk_id: spec.risk_id,
      risk_label: spec.risk_label,
      source: spec.source_template,
      affected_rights: spec.affected_rights,
      likelihood,
      severity: spec.severity,
      inherent_band,
      measures,
      residual_band,
      citation: a.citation || "GDPR Art. 35(7)(c)",
      authority_verbatim: [a.verbatim, m.verbatim].filter(Boolean).join(" "),
      ...(g.verbatim
        ? { guidance_citation: g.citation, guidance_verbatim: g.verbatim }
        : {}),
      status: insufficient ? "record_insufficient" : "analysed",
      ...(insufficient
        ? {
          information_needed:
            `The measures actually applied against "${spec.risk_label}" — the record names none of: ${spec.mitigating_safeguards.join("; ")}. Record the measure, who operates it, and how its effect is evidenced.`,
        }
        : {}),
    });
  }

  return out;
}

// ---------------------------------------------------------------------
// 4. Art. 36(1) — prior-consultation determination
// ---------------------------------------------------------------------
/** SEPARATION GUARD — relocate exposure sentences out of an obligation finding. */
export function splitExposure(text: string): { kept: string; moved: string; repairs: number } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept: string[] = [];
  const moved: string[] = [];
  for (const s of sentences) {
    if (matches(s, EXPOSURE_LEXICON)) moved.push(s);
    else kept.push(s);
  }
  return { kept: kept.join(" ").trim(), moved: moved.join(" ").trim(), repairs: moved.length };
}

export function buildArt36Consultation(
  intake: unknown,
  register: readonly RiskRegisterEntry[],
): Art36Consultation {
  const a = anchor("art36");
  const proc = anchor("art36_materials");

  const high = register.filter((r) => r.residual_band === "high");
  const undetermined = register.filter((r) => r.residual_band === "undetermined");
  const insufficient = register.filter((r) => r.status === "record_insufficient");

  let determination: Art36Consultation["determination"];
  let rawWhy: string;
  let status: Art36Consultation["status"] = "analysed";
  let information_needed: string | undefined;

  if (register.length === 0) {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    rawWhy =
      "No risk was identified on this record, so there is no residual-risk finding for the Art. 36(1) test to read.";
    information_needed =
      "A completed description of the processing sufficient to identify the risks to the rights and freedoms of the data subjects.";
  } else if (high.length > 0) {
    determination = "consultation_required";
    rawWhy =
      `${a.verbatim} On this record ${high.length} risk(s) — ${high.map((r) => r.risk_label).join("; ")} — remain at a high residual band after the measures the record states, so the condition in Art. 36(1) is met and the controller must consult the competent supervisory authority before the processing begins.`;
  } else if (undetermined.length > 0 || insufficient.length > 0) {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    const names = [...new Set([...undetermined, ...insufficient].map((r) => r.risk_label))];
    rawWhy =
      `Art. 36(1) turns on whether a high residual risk remains after mitigation. On this record the residual position for ${names.length} risk(s) — ${names.join("; ")} — cannot be settled, so the prior-consultation question is open rather than answered either way.`;
    information_needed =
      `The measures applied to: ${names.join("; ")}, and the effect each has on the likelihood or severity of that risk.`;
  } else {
    determination = "consultation_not_required";
    rawWhy =
      `${a.verbatim} On this record every identified risk sits at a low or moderate residual band after the measures the record states, so the Art. 36(1) condition is not met and prior consultation is not triggered by this assessment. This determination is bound to the measures as recorded; if a measure is not implemented as stated, the determination must be re-run.`;
  }

  const { kept, moved, repairs } = splitExposure(rawWhy);

  return {
    determination,
    why: kept,
    exposure_note: moved,
    separation_repairs: repairs,
    driving_risk_ids: high.map((r) => r.risk_id),
    citation: a.citation || "GDPR Art. 36(1)",
    authority_verbatim: a.verbatim,
    procedural_note: determination === "consultation_required"
      ? `${proc.verbatim} the respective responsibilities of the controller, joint controllers and processors; the purposes and means of the intended processing; the measures and safeguards; the contact details of the data protection officer where applicable; and this data protection impact assessment.`
      : "Art. 36(3) applies only where a consultation is required; on this determination no consultation submission arises.",
    procedural_citation: proc.citation || "GDPR Art. 36(3)",
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}

// ---------------------------------------------------------------------
// Envelope + attach
// ---------------------------------------------------------------------
export function buildDpiaDeliverables(intake: unknown): DpiaDeliverables {
  const risk_register = buildRiskRegister(intake);
  return {
    necessity_findings: buildNecessityFindings(intake),
    proportionality: buildProportionality(intake),
    risk_register,
    art36_consultation: buildArt36Consultation(intake, risk_register),
  };
}

export function attachDpiaDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildDpiaDeliverables(intake);
    report.necessity_findings = built.necessity_findings;
    report.proportionality = built.proportionality;
    report.risk_register = built.risk_register;
    report.art36_consultation = built.art36_consultation;
    return {
      version: DPIA_DELIVERABLES_VERSION,
      ok: true,
      operations: built.necessity_findings.length,
      necessity_insufficient: built.necessity_findings.filter((n) => n.status === "record_insufficient").length,
      proportionality_insufficient: built.proportionality.filter((p) => p.status === "record_insufficient").length,
      risks: built.risk_register.length,
      risks_high_residual: built.risk_register.filter((r) => r.residual_band === "high").length,
      art36: built.art36_consultation.determination,
      separation_repairs: built.art36_consultation.separation_repairs,
    };
  } catch (e) {
    return {
      version: DPIA_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}
