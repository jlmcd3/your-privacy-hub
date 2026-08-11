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
  LegalBasisFinding,
  DpiaDecision,
  LegitimateInterestsTest,
  Likelihood,
  NecessityFinding,
  NecessityVerdict,
  ProportionalityFinding,
  RiskBand,
  RiskRegisterEntry,
} from "../../../../_shared/ltp/dpia-deliverables/types.ts";

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

/**
 * SO-FT FIX (2026-08-11): `secondary_uses` answers are frequently negations
 * ("None. Not used beyond the primary purpose."). Those are scope-limitation
 * statements, not a second processing operation — manufacturing `op_secondary`
 * from them makes proportionality weigh a negation as a benefit. Only the clean
 * negation case is suppressed; anything ambiguous keeps the old behaviour.
 */
const SECONDARY_NEGATION: readonly RegExp[] = [
  /^\s*(none|n\/a|no|nil|not applicable)\b/i,
  /^\s*(there\s+are\s+)?no\s+(other|secondary|further|additional)\s+(use|uses|purpose|purposes)\b/i,
  /^\s*(the\s+)?data\s+is\s+not\s+used\s+(for\s+any\s+purpose\s+)?beyond\b/i,
  /^\s*not\s+used\s+(for\s+any\s+purpose\s+)?beyond\b/i,
  /^\s*(the\s+)?[\w\s]{0,40}?\bis\s+not\s+used\s+for\s+any\s+(other\s+)?purpose\b/i,
];

/** True only when the answer is clearly a negation / scope-limitation. */
export function isSecondaryUseNegation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const head = t.slice(0, 200);
  return SECONDARY_NEGATION.some((re) => re.test(head));
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
  if (secondary && !isSecondaryUseNegation(secondary)) {
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
  const regime = readDpiaRegime(intake);
  const a = anchor("necessity", regime);
  const test = anchor("necessity_test", regime);
  const useful = anchor("useful_not_necessary", regime);

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
      citation: a.citation || cit(regime, "Art. 35(7)(b)"),
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
  const regime = readDpiaRegime(intake);
  const a = anchor("necessity", regime);
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
      citation: a.citation || cit(regime, "Art. 35(7)(b)"),
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
  const regime = readDpiaRegime(intake);
  const a = anchor("risks", regime);
  const m = anchor("measures", regime);
  // WP248-PINNING (2026-08-01) — the severity appraisal is guidance-anchored.
  const g = anchor("risk_severity", regime);
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
      citation: a.citation || cit(regime, "Art. 35(7)(c)"),
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
  const regime = readDpiaRegime(intake);
  const a = anchor("art36", regime);
  const proc = anchor("art36_materials", regime);

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
      `${a.verbatim} On this record ${high.length} risk(s) — ${high.map((r) => r.risk_label).join("; ")} — remain at a high residual band after the measures the record states, so the condition in Art. 36(1) is met and the controller must consult ${regime === "UK" ? "the Commissioner" : "the competent supervisory authority"} before the processing begins.`;
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
    citation: a.citation || cit(regime, "Art. 36(1)"),
    authority_verbatim: a.verbatim,
    procedural_note: determination === "consultation_required"
      ? `${proc.verbatim} the respective responsibilities of the controller, joint controllers and processors; the purposes and means of the intended processing; the measures and safeguards; the contact details of the data protection officer where applicable; and this data protection impact assessment.`
      : "Art. 36(3) applies only where a consultation is required; on this determination no consultation submission arises.",
    procedural_citation: proc.citation || cit(regime, "Art. 36(3)"),
    status,
    ...(information_needed ? { information_needed } : {}),
  };
}


// ---------------------------------------------------------------------
// 5. Art. 6(1) — legal basis (PILOT 2026-08-11, ITEM 310 pattern)
//
// Single writer for report.legal_basis. Reads the closed set of intake
// fields that bear on lawful basis (legal_basis_proposed, purpose,
// secondary_uses, data_subjects, necessity_proportionality,
// data_minimisation_justification, data_categories, existing_safeguards,
// alternatives_considered) and, where Art. 6(1)(f) is selected, runs the
// three-part legitimate-interests test as a decision tree. A part the
// record does not support is reported unmet with a specific
// `information_needed` string — never filled with invention.
// ---------------------------------------------------------------------

const ART6_SUBSECTIONS: readonly { readonly re: RegExp; readonly sub: string; readonly label: string }[] = [
  { re: /consent/i, sub: "Art. 6(1)(a)", label: "Consent (Art. 6(1)(a))" },
  { re: /contract/i, sub: "Art. 6(1)(b)", label: "Contract (Art. 6(1)(b))" },
  { re: /legal obligation/i, sub: "Art. 6(1)(c)", label: "Legal obligation (Art. 6(1)(c))" },
  { re: /vital interest/i, sub: "Art. 6(1)(d)", label: "Vital interests (Art. 6(1)(d))" },
  { re: /public task|public interest|official authority/i, sub: "Art. 6(1)(e)", label: "Public task (Art. 6(1)(e))" },
  { re: /legitimate interest/i, sub: "Art. 6(1)(f)", label: "Legitimate interests (Art. 6(1)(f))" },
];

/** Vulnerable-subject signals that raise the balancing bar (Art. 6(1)(f) final clause). */
const VULNERABLE_SUBJECTS: readonly RegExp[] = [
  /\bchild(ren)?\b/i,
  /\bminors?\b/i,
  /\bemployees?\b/i,
  /\bpatients?\b/i,
  /\bvulnerable\b/i,
];

const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data", "Children's data"];

function readArt6(basisText: string): { sub: string; label: string } | null {
  for (const e of ART6_SUBSECTIONS) if (e.re.test(basisText)) return { sub: e.sub, label: e.label };
  return null;
}

// ── PHASE 0 PROMPT 2 (2026-08-11) — per-basis branching, Art. 6(1)(a)–(e) ──
//
// DEFECT 1 fix: each sub-basis resolves its OWN anchor. Where the verified
// registry carries no row for that sub-basis the verbatim is the empty string;
// Art. 5(1)(a) lawfulness text is never substituted for an Art. 6(1) citation.
// DEFECT 2 fix: each sub-basis carries its own deterministic record test,
// reading only existing intake fields.

/** Anchor key per Art. 6(1) sub-basis. Missing registry rows → empty verbatim. */
const ART6_ANCHOR_KEYS = {
  "Art. 6(1)(a)": "consent",
  "Art. 6(1)(b)": "contract",
  "Art. 6(1)(c)": "legal_obligation",
  "Art. 6(1)(d)": "vital_interests",
  "Art. 6(1)(e)": "public_task",
  "Art. 6(1)(f)": "legitimate_interests",
} as const;

/** Consent capture / withdrawal language (6(1)(a)). */
const CONSENT_LEXICON: readonly RegExp[] = [
  /\bwithdraw(al|n|ing)?\b/i,
  /\bopt[- ]?in\b/i,
  /\bconsent (is )?(collected|captured|obtained|recorded|given)\b/i,
  /\bconsent (banner|form|screen|record|management)\b/i,
  /\bunsubscribe\b/i,
  /\bpreference cent(re|er)\b/i,
];

/** Contracting-party language (6(1)(b)). */
const CONTRACT_PARTY_LEXICON: readonly RegExp[] = [
  /\bcustomers?\b/i,
  /\bclients?\b/i,
  /\bsubscribers?\b/i,
  /\bemployees?\b/i,
  /\bparty\b|\bparties\b/i,
  /\baccount holders?\b/i,
  /\bpolicyholders?\b/i,
  /\bapplicants?\b/i,
];

/** A NAMED legal instrument (6(1)(c) and 6(1)(e)). */
const NAMED_INSTRUMENT_LEXICON: readonly RegExp[] = [
  /\b[A-Z][A-Za-z]+ Act\b/,
  /\bAct \d{4}\b/,
  /\bRegulation \(EU\)/i,
  /\bDirective \d{2,4}\/\d+/i,
  /\bDirective \(EU\)/i,
  /\b§\s?\d/,
  /\bArt(icle)?\.?\s?\d+/,
  /\bsection \d+/i,
  /\bCode\b.*\b(civil|labour|labor|tax|commercial|health)\b/i,
  /\b(statute|statutory instrument)\b/i,
];

/** Life / safety / emergency language (6(1)(d)). */
const VITAL_INTEREST_LEXICON: readonly RegExp[] = [
  /\bvital interest/i,
  /\blife[- ]threatening\b/i,
  /\bemergenc(y|ies)\b/i,
  /\bsafety of\b/i,
  /\bsave (a )?li(fe|ves)\b/i,
  /\bmedical emergency\b/i,
  /\bdisaster\b/i,
];

/** Closing sentence carried by EVERY basis branch, unchanged in substance. */
const BASIS_CLOSER =
  "This assessment records the basis the controller has selected and the purpose it is selected for; " +
  "whether the conditions of that basis are met in operation is a matter for the controller's lawfulness record, " +
  "which this assessment does not substitute.";

interface BasisCheck {
  readonly met: boolean;
  /** What the record does or does not establish, in the fixed register. */
  readonly finding: string;
  readonly information_needed?: string;
  /** (d) only: the record does not describe the scenario at all. */
  readonly undetermined?: boolean;
}

function checkNonLiBasis(
  sub: string,
  fields: {
    readonly subjects: string;
    readonly rightsMechanisms: string;
    readonly description: string;
    readonly natureScopeContext: string;
    readonly narrative: string;
    readonly reasons: string;
    readonly codes: string;
    readonly categories: readonly string[];
  },
): BasisCheck {
  const instrumentScan = [
    fields.narrative,
    fields.natureScopeContext,
    fields.reasons,
    fields.codes,
  ].filter(Boolean).join(" ");

  switch (sub) {
    case "Art. 6(1)(a)": {
      const scan = [fields.rightsMechanisms, fields.description, fields.natureScopeContext]
        .filter(Boolean).join(" ");
      const met = matches(scan, CONSENT_LEXICON);
      return met
        ? {
          met: true,
          finding:
            "The record describes how consent is obtained and how it can be withdrawn, which is what reliance on consent requires it to establish.",
        }
        : {
          met: false,
          finding:
            "The record does not describe how consent is collected or how it can be withdrawn, so reliance on consent is not established on the record.",
          information_needed:
            "How consent is collected for this processing — the moment of capture and what the data subject is told — and how withdrawal is offered and acted on.",
        };
    }
    case "Art. 6(1)(b)": {
      const met = matches(fields.subjects, CONTRACT_PARTY_LEXICON);
      return met
        ? {
          met: true,
          finding:
            `The data subjects the record describes — "${fields.subjects}" — are parties to a relationship of the kind Art. 6(1)(b) contemplates, so the basis attaches to the recorded purpose.`,
        }
        : {
          met: false,
          finding:
            "The record does not establish that the data subjects are party to the contract, or that the processing takes pre-contractual steps at their request.",
          information_needed:
            "The contract relied on, named, and the data subject's status as a party to it (or the pre-contractual step taken at the data subject's request).",
        };
    }
    case "Art. 6(1)(c)": {
      const met = matches(instrumentScan, NAMED_INSTRUMENT_LEXICON);
      return met
        ? {
          met: true,
          finding:
            "The record names the instrument the obligation arises under, so the obligation relied on can be identified rather than assumed.",
        }
        : {
          met: false,
          finding:
            "The record does not name the law that establishes the obligation; it describes the obligation generally, which does not identify the instrument the basis depends on.",
          information_needed:
            "The specific Union or Member State law establishing the legal obligation relied on — named as an instrument, not described generally.",
        };
    }
    case "Art. 6(1)(d)": {
      const health = fields.categories.includes("Health or medical data");
      const scenario = matches([fields.narrative, fields.description, fields.natureScopeContext]
        .filter(Boolean).join(" "), VITAL_INTEREST_LEXICON);
      return (health || scenario)
        ? {
          met: true,
          finding:
            "The record describes a life or safety scenario of the kind Art. 6(1)(d) is confined to, so the basis attaches to the recorded purpose.",
        }
        : {
          met: false,
          undetermined: true,
          finding:
            "The record does not describe the vital-interest scenario — no life, safety or emergency circumstance is stated, and the data set does not include health or medical data — so the basis cannot be tested on this record.",
          information_needed:
            "The life or safety circumstance relied on, and why the processing is necessary to protect the vital interests of the data subject or another natural person.",
        };
    }
    case "Art. 6(1)(e)": {
      const met = matches(instrumentScan, NAMED_INSTRUMENT_LEXICON);
      return met
        ? {
          met: true,
          finding:
            "The record names the instrument the task or official authority is laid down in, so the public-task footing can be identified rather than assumed.",
        }
        : {
          met: false,
          finding:
            "The record does not name the law laying down the task carried out in the public interest or the official authority relied on.",
          information_needed:
            "The specific Union or Member State law laying down the task carried out in the public interest or the official authority vested in the controller — named as an instrument, not described generally.",
        };
    }
    default:
      return { met: false, finding: "" };
  }
}


export function buildLegalBasis(intake: unknown): LegalBasisFinding[] {
  const regime = readDpiaRegime(intake);
  const li = anchor("legitimate_interests", regime);
  const lawfulness = anchor("lawfulness", regime);
  const necessityTest = anchor("necessity_test", regime);

  const basisText = str(get(intake, "legal_basis_proposed"));
  const subjects = str(get(intake, "data_subjects"));
  const narrative = str(get(intake, "necessity_proportionality"));
  const minimisation = str(get(intake, "data_minimisation_justification"));
  const combined = [narrative, minimisation].filter(Boolean).join(" ");
  const categories = arr(get(intake, "data_categories"));
  const safeguards = arr(get(intake, "existing_safeguards")).filter((x) => x !== "None");
  const rightsMechanisms = str(get(intake, "data_subject_rights_mechanisms"));
  const description = str(get(intake, "description"));
  const natureScopeContext = str(get(intake, "nature_scope_context"));
  const reasons = arr(get(intake, "reasons_to_conduct")).join("; ") ||
    str(get(intake, "reasons_to_conduct"));
  const codes = str(get(intake, "codes_of_conduct"));

  /** Per-basis anchor; empty verbatim where the registry has no row. */
  const basisAnchor = (sub: string) => {
    const key = (ART6_ANCHOR_KEYS as Record<string, keyof typeof ANCHOR_KEYS>)[sub];
    return key ? anchor(key, regime) : { citation: "", verbatim: "" };
  };

  return buildOperations(intake).map((op) => {
    const purpose = op.purpose_text;
    const art6 = readArt6(basisText);

    // ── No basis recorded, or no purpose to attach it to ──────────────
    if (!art6) {
      return {
        operation_id: op.operation_id,
        purpose: purpose || NOT_STATED,
        article_6_basis: basisText || NOT_STATED,
        justification:
          `The record does not identify which Art. 6(1) basis is relied on for "${op.operation_label}"` +
          (basisText ? ` — it records "${basisText}", which does not resolve to one of the six bases.` : ".") +
          ` Lawfulness is the first principle the processing must satisfy: ${lawfulness.verbatim}` +
          " No lawful basis can be assessed on this record.",
        verdict: "undetermined_on_the_record" as const,
        citation: lawfulness.citation || cit(regime, "Art. 5(1)(a)"),
        authority_verbatim: lawfulness.verbatim,
        status: "record_insufficient" as const,
        information_needed:
          `The Art. 6(1) basis relied on for "${op.operation_label}" — one of consent, contract, legal obligation, vital interests, public task, or legitimate interests — stated for this purpose specifically.`,
      };
    }

    if (!purpose) {
      return {
        operation_id: op.operation_id,
        purpose: NOT_STATED,
        article_6_basis: art6.label,
        justification:
          `The record proposes ${art6.label} but states no purpose for "${op.operation_label}". ` +
          "Every Art. 6(1) basis is measured against the purpose the processing pursues, so the basis cannot be assessed until the purpose is on the record.",
        verdict: "undetermined_on_the_record" as const,
        citation: cit(regime, art6.sub),
        authority_verbatim: basisAnchor(art6.sub).verbatim,
        status: "record_insufficient" as const,
        information_needed:
          `The specific purpose pursued by "${op.operation_label}", stated as an outcome, so the proposed ${art6.label} can be tested against it.`,
      };
    }

    // ── Non-6(1)(f) bases: per-basis record test against the purpose ───
    if (art6.sub !== "Art. 6(1)(f)") {
      const a = basisAnchor(art6.sub);
      const check = checkNonLiBasis(art6.sub, {
        subjects,
        rightsMechanisms,
        description,
        natureScopeContext,
        narrative: combined,
        reasons,
        codes,
        categories,
      });

      const opening = `The record relies on ${art6.label} for the recorded purpose ("${purpose}").` +
        (a.verbatim ? ` The basis reads: ${a.verbatim}` : "");

      return {
        operation_id: op.operation_id,
        purpose,
        article_6_basis: art6.label,
        justification: [opening, check.finding, BASIS_CLOSER].filter(Boolean).join(" "),
        verdict: check.met
          ? ("basis_supported_on_the_record" as const)
          : ("undetermined_on_the_record" as const),
        citation: cit(regime, art6.sub),
        // DEFECT 1: never Art. 5(1)(a) text under an Art. 6(1) citation.
        authority_verbatim: a.verbatim,
        status: check.met ? ("analysed" as const) : ("record_insufficient" as const),
        ...(check.information_needed ? { information_needed: check.information_needed } : {}),
      };
    }


    // ── Art. 6(1)(f): the three-part test, run as a decision tree ──────
    const alternatives = alternativesFor(intake, op);
    const impactStated = matches(combined, IMPACT_LEXICON);
    const vulnerable =
      VULNERABLE_SUBJECTS.some((re) => re.test(subjects)) ||
      categories.includes("Children's data");
    const special = categories.some((c) => SPECIAL_CATEGORY_CATS.includes(c));

    const purpose_test_met = purpose.length > 0;
    const purpose_test_why = purpose_test_met
      ? `Part one (purpose test): the record states the interest pursued — "${purpose}" — which is an identified interest of the controller capable of being weighed.`
      : "Part one (purpose test): no interest is stated on the record, so there is nothing to weigh.";

    const necessity_test_met = alternatives.length > 0 && alternatives.every((x) => x.rejection_reason !== NOT_STATED);
    const necessity_test_why = necessity_test_met
      ? `Part two (necessity test): the record identifies ${alternatives.length} alternative means (${alternatives.map((x) => x.alternative).join("; ")}) and states why each would not achieve the stated interest, applying the test the guidance sets: ${necessityTest.verbatim}`
      : `Part two (necessity test): the record does not show that the stated interest cannot reasonably be achieved by a less intrusive means${alternatives.length > 0 ? ", because the alternatives it records carry no rejection reason" : ", because no alternative means are recorded as considered"}. On this record necessity for the purposes of Art. 6(1)(f) is not established.`;

    const balancing_test_met = impactStated && (!vulnerable || safeguards.length > 0) && !special;
    const balancing_test_why = !impactStated
      ? `Part three (balancing test): the record does not describe the impact of the processing on ${subjects || "the data subjects"}, so their interests and fundamental rights cannot be set against the controller's interest.`
      : special
      ? `Part three (balancing test): the record describes the impact on ${subjects || "the data subjects"} but the data set includes special-category or children's data (${categories.filter((c) => SPECIAL_CATEGORY_CATS.includes(c)).join("; ")}), which raises the weight on the data subjects' side; the record does not show that the controller's interest survives that weighting.`
      : vulnerable && safeguards.length === 0
      ? `Part three (balancing test): the data subjects described (${subjects}) are in a position of dependency or reduced ability to object, and no safeguards are recorded that would reduce the effect on them, so the balance is not made out on this record.`
      : `Part three (balancing test): the record describes the effect on ${subjects || "the data subjects"} and records the measures that reduce it (${safeguards.join("; ") || "the measures stated"}), so the controller's interest is not shown to be overridden on this record.`;

    const legitimate_interests_test: LegitimateInterestsTest = {
      purpose_test_met,
      purpose_test_why,
      necessity_test_met,
      necessity_test_why,
      balancing_test_met,
      balancing_test_why,
    };

    const unmet: string[] = [];
    if (!purpose_test_met) unmet.push("purpose test");
    if (!necessity_test_met) unmet.push("necessity test");
    if (!balancing_test_met) unmet.push("balancing test");

    const head =
      `The record relies on ${art6.label} for the recorded purpose ("${purpose}"). ` +
      `The basis reads: ${li.verbatim} ` +
      "It is made out only where all three of its parts hold on the record.";
    const justification = [head, purpose_test_why, necessity_test_why, balancing_test_why].join(" ");

    const information_needed = unmet.length === 0
      ? undefined
      : `For "${op.operation_label}", the record does not support the ${unmet.join(" or the ")}. ` +
        (!purpose_test_met ? "State the interest pursued as an outcome. " : "") +
        (!necessity_test_met ? "Record each less intrusive means considered and the specific reason it would not achieve that interest. " : "") +
        (!balancing_test_met ? `Describe the effect of the processing on ${subjects || "the data subjects"} — what they lose, what they would not expect, and what they cannot avoid — and the measures that reduce it${special ? ", and state the Art. 9 condition relied on for the special-category items" : ""}.` : "");

    return {
      operation_id: op.operation_id,
      purpose,
      article_6_basis: art6.label,
      justification,
      verdict: unmet.length === 0
        ? ("basis_supported_on_the_record" as const)
        : ("undetermined_on_the_record" as const),
      citation: li.citation || cit(regime, "Art. 6(1)(f)"),
      authority_verbatim: li.verbatim,
      legitimate_interests_test,
      status: unmet.length === 0 ? ("analysed" as const) : ("record_insufficient" as const),
      ...(information_needed ? { information_needed } : {}),
    };
  });
}


// ---------------------------------------------------------------------
// 6. Deterministic sign-off decision (PROMPT 3, 2026-08-11)
//
// Pure branching over the typed surfaces. Supersedes the u5 model string
// at section_6_conclusion.decision as the skeleton's decision source. This
// is NOT report_data.determination (ITEM 372 METHOD 2a), which is a legacy
// prose block and decides nothing.
// ---------------------------------------------------------------------
function labels(rows: readonly { readonly risk_label: string }[]): string {
  return [...new Set(rows.map((r) => r.risk_label))].join("; ");
}

export function buildDecision(
  intake: unknown,
  deliverables: {
    readonly necessity_findings: readonly NecessityFinding[];
    readonly proportionality: readonly ProportionalityFinding[];
    readonly risk_register: readonly RiskRegisterEntry[];
    readonly art36_consultation: Art36Consultation;
    readonly legal_basis: readonly LegalBasisFinding[];
  },
): DpiaDecision {
  const regime = readDpiaRegime(intake);
  const a = anchor("art36", regime);
  const art36Citation = a.citation || cit(regime, "Art. 36(1)");
  const register = deliverables.risk_register;
  const authority = regime === "UK"
    ? "the Commissioner"
    : "the competent supervisory authority";

  // (a) Prior consultation settles the outcome before anything else.
  if (deliverables.art36_consultation.determination === "consultation_required") {
    const driving = register.filter((r) => r.residual_band === "high");
    const named = labels(driving);
    return {
      determination: "consultation_required",
      conditions: [],
      blockers: [],
      why:
        `This processing may not begin on the company's answers as they stand: ${driving.length === 1 ? "one risk" : `${driving.length} risks`}${named ? ` — ${named} —` : ""} remain at a high residual band after the measures the company has recorded, and the controller must consult ${authority} under Art. 36(1) before the processing begins.`,
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (b) An unresolvable record cannot carry a determination either way.
  const openBands = register.filter((r) => r.residual_band === "undetermined");
  const insufficient: readonly { readonly information_needed?: string }[] = [
    ...openBands,
    ...deliverables.necessity_findings.filter((f) => f.status === "record_insufficient"),
    ...deliverables.proportionality.filter((f) => f.status === "record_insufficient"),
    ...deliverables.legal_basis.filter((f) => f.status === "record_insufficient"),
    ...(deliverables.art36_consultation.status === "record_insufficient"
      ? [deliverables.art36_consultation]
      : []),
  ];
  if (openBands.length > 0 || insufficient.length > 0) {
    const blockers = [
      ...new Set(
        insufficient
          .map((f) => str(f.information_needed))
          .filter((t) => t.length > 0),
      ),
    ];
    return {
      determination: "draft_incomplete",
      conditions: [],
      blockers,
      why: (() => {
        const n = blockers.length || openBands.length;
        const head =
          `This assessment is not yet capable of a sign-off determination: ${n === 1 ? "one point the determination turns on is" : `${n} points the determination turns on are`} unresolved on the company's answers`;
        return blockers.length ? `${head} — ${blockers.join(" ")}` : `${head}.`;
      })(),
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (c) High residual risk without an Art. 36 trigger rides on its measures.
  const high = register.filter((r) => r.residual_band === "high");
  if (high.length > 0) {
    const conditions: string[] = [];
    for (const r of high) {
      if (r.measures.length > 0) conditions.push(...r.measures);
      else conditions.push(`a recorded measure for ${r.risk_label}`);
    }
    const deduped = [...new Set(conditions)];
    return {
      determination: "conditionally_approved",
      conditions: deduped,
      blockers: [],
      why:
        `This processing may proceed on a conditional basis only: ${high.length === 1 ? "one risk" : `${high.length} risks`} — ${labels(high)} — sit at a high residual band, and clearance is conditional on ${deduped.join("; ")}.`,
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (d) Everything settled at or below a moderate residual band.
  return {
    determination: "approved",
    conditions: [],
    blockers: [],
    why:
      `This processing may proceed as assessed: every risk identified on the company's answers sits at a low or moderate residual band after the measures the company has recorded, and no element of the assessment is left open. This determination is bound to those measures as recorded; if a measure is not operated as stated, the assessment must be re-run.`,
    citation: art36Citation,
    rule_id: "dpia_decision_v1",
  };
}

// ---------------------------------------------------------------------
// Envelope + attach
// ---------------------------------------------------------------------
export function buildDpiaDeliverables(intake: unknown): DpiaDeliverables {
  const risk_register = buildRiskRegister(intake);
  const core = {
    necessity_findings: buildNecessityFindings(intake),
    proportionality: buildProportionality(intake),
    risk_register,
    art36_consultation: buildArt36Consultation(intake, risk_register),
    legal_basis: buildLegalBasis(intake),
  };
  return { ...core, decision: buildDecision(intake, core) };
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

    // PILOT 2026-08-11 — single writer for legal basis. The deterministic
    // findings become the surface, and the model-authored
    // section_2_analysis.legal_basis blob is superseded by them so the
    // skeleton reads one composed argument, not two.
    report.legal_basis = built.legal_basis;

    // PROMPT 3 (2026-08-11) — deterministic sign-off decision. Single writer
    // for report.decision; the u5 section_6_conclusion.decision string is now
    // a fallback for documents generated before this change.
    report.decision = built.decision;
    const s2 = report.section_2_analysis;
    if (s2 && typeof s2 === "object") {
      (s2 as Record<string, unknown>).legal_basis = built.legal_basis.map((f) => ({
        purpose: f.purpose,
        article_6_basis: f.article_6_basis,
        justification: f.justification,
        status: f.status,
        ...(f.information_needed ? { information_needed: f.information_needed } : {}),
      }));
    }

    return {
      version: DPIA_DELIVERABLES_VERSION,
      ok: true,
      operations: built.necessity_findings.length,
      necessity_insufficient: built.necessity_findings.filter((n) => n.status === "record_insufficient").length,
      proportionality_insufficient: built.proportionality.filter((p) => p.status === "record_insufficient").length,
      risks: built.risk_register.length,
      risks_high_residual: built.risk_register.filter((r) => r.residual_band === "high").length,
      art36: built.art36_consultation.determination,
      decision: built.decision.determination,
      legal_basis: built.legal_basis.length,
      legal_basis_insufficient: built.legal_basis.filter((b) => b.status === "record_insufficient").length,
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
