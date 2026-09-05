// LIA CONVERSION L1-B — THE TYPED THREE-PART TEST (2026-08-26).
//
// The deterministic replacement for Stages 1–3 of the model pipeline.
// Pure functions over the intake row and the typed deliverables that are
// ALREADY code-computed and attached to the report (ITEM-311, UPGRADE-4,
// the ePrivacy gate, the precedent-class posture). Zero model calls, zero
// I/O. The three verdicts are derived from the same typed surfaces the
// ratified determination engine (build.ts buildDetermination) reads, so
// the test and the determination cannot disagree; the analysis prose is
// composed from the findings' own analysed sentences (verbatim reuse —
// single-writer respecting) plus the weighing templates below.
//
// THE VERDICT TABLE (the L1-B ratification artifact; CEO-delegated
// 2026-08-26 "complete LIA Conversion … I defer to your recommendations"):
//   purpose_test.verdict   <- interest_legitimacy.verdict:
//       legitimate_interest_established      -> "passes"
//       legitimate_interest_not_established  -> "fails"
//       undetermined_on_the_record           -> "uncertain"
//   necessity_test.verdict <- the recorded less-intrusive-means comparison:
//       every listed alternative carries a
//         recorded inadequacy reason         -> "passes"
//       absent, or any alternative left
//         without a recorded reason          -> "uncertain"
//       (never "fails" on silence — the degradation law; no intake fact
//       can affirmatively establish that a viable less-intrusive means
//       was declined, so an adverse necessity verdict is never composed.
//       DOC 142 (2026-09-02): the verdict reads the SAME typed comparison
//       the necessity analysis renders — buildAlternativesConsidered's
//       per-alternative rows — not the raw intake fields, so the headline
//       and the analysis cannot disagree about whether the comparison was
//       performed.)
//   balancing_test.verdict <- the typed balancing findings:
//       expectations not_reasonably_expected            -> "likely_fails"
//       children in scope AND material harm weight      -> "likely_fails"
//       material harm weight AND no recorded safeguards -> "likely_fails"
//       any of expectations / harms / child undetermined-> "uncertain"
//       otherwise                                       -> "likely_passes"
//   These are Stage 2's own registered enum strings, so the skeleton's
//   readTypedVerdicts consumes them unchanged.
//
// HARD GATES (evaluated before / independent of balancing, per the B5
// ruling and PN-L1's 9M rule):
//   • Public-authority exclusion — already inside buildDetermination.
//   • The ePrivacy short-circuit — where the gate finds the consent
//     requirement engaged, the OUTCOME is overridden to
//     legitimate_interests_not_available regardless of the balance, and
//     the ratified rule sentence (PN-L6(c)) carries the why. The
//     balancing verdict itself is NOT altered — the gate is a gate, never
//     a weight.
//
// ADVANCE-RATIFICATION LEDGER: every sentence template in this file is an
// implementation-authored customer byte under the CEO's delegation;
// they are written as visible literals so the redline surface is complete.

import type {
  AutomatedDecisionFinding,
  ChildFactorFinding,
  LiaDetermination,
  LiaUpgrade4Deliverables,
  PrecedentClassFinding,
  PublicAuthorityFinding,
  ReasonableExpectationsFinding,
} from "./types.ts";
import { classifyLiaUseCase } from "../../../../_shared/lia/lia-use-case-classifier.ts";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

export const LIA_TYPED_TEST_STAMP = "lia-three-part-test-typed@l1b-2026-08-26";

/** The model path's plain-language strength notes (index.ts normalize
 * block) — existing shipped bytes, reused verbatim for parity. */
const STRENGTH_NOTES: Record<string, string> = {
  strong: "Strong: as the record stands the facts present a strong argument for legitimate interest — the balancing record still requires the recommended documentation.",
  moderate: "Moderate: the record supports a colorable legitimate-interest argument on named recorded facts; the items in Information Needed would strengthen it before deployment.",
  weak: "Weak: the record as documented establishes some elements of the three-part test; the items in Information Needed would need to be recorded before a defensible legitimate-interest argument can be made.",
  insufficient: "The record as it stands does not yet establish a defensible legitimate-interest claim; the items listed under Information Needed would complete the record.",
  uncertain: "Uncertain: blocking issues have been identified that must be resolved before a defensible LI claim can be established — this does NOT mean legitimate interest is categorically unavailable.",
};

/** The ratified ePrivacy rule sentence (PN-L6(c), ratified by delegation
 * 2026-08-26). Byte-pinned; the outcome override quotes it verbatim. */
export const LIA_EPRIVACY_RULE_SENTENCE =
  "Where Article 5(3) of the ePrivacy Directive requires consent for the processing — for example cookies or other access to terminal equipment, or unsolicited electronic messages — legitimate interests under Article 6(1)(f) GDPR cannot substitute for that consent, however the balancing test would otherwise resolve.";

/** DOC 161 — the UK-only twin (eprivacy-gate.ts RULE_SENTENCE_UK, byte-identical). */
export const LIA_EPRIVACY_RULE_SENTENCE_UK =
  "Where regulation 6 of the Privacy and Electronic Communications (EC Directive) Regulations 2003, which gives effect to Article 5(3) of the ePrivacy Directive, requires consent for the processing — for example cookies or other access to terminal equipment — or regulation 22 requires consent for unsolicited electronic marketing messages, legitimate interests under Article 6(1)(f) UK GDPR cannot substitute for that consent, however the balancing test would otherwise resolve.";

// ── Stage 1 replacement — typed classification ──────────────────────────────

const SPECIAL_CATEGORY_TEXT = /health|medical|biometric|genetic|racial|ethnic|political|religio|sex life|sexual orientation|trade[- ]union/i;

export interface LiaTypedClassification {
  readonly use_case_category: string;
  readonly primary_data_categories: readonly string[];
  readonly special_category_data: boolean;
  readonly relationship_exists: boolean;
  readonly jurisdictions_scope: readonly string[];
}

export function buildClassificationTyped(intake: Bag): LiaTypedClassification {
  const balancing = bag(intake.balancing_details);
  const dataCats = arr(intake.data_categories);
  const scdRaw = balancing.special_category_data;
  const special = typeof scdRaw === "boolean"
    ? scdRaw
    : dataCats.some((c) => SPECIAL_CATEGORY_TEXT.test(c));
  return {
    use_case_category: classifyLiaUseCase(s(intake.processing_description)),
    primary_data_categories: dataCats,
    special_category_data: special,
    relationship_exists: !!s(intake.relationship_type) && !/^none$/i.test(s(intake.relationship_type)),
    jurisdictions_scope: arr(intake.jurisdictions),
  };
}

// ── Verdicts ────────────────────────────────────────────────────────────────

type TestVerdict = "passes" | "fails" | "uncertain";
type BalancingVerdict = "likely_passes" | "likely_fails" | "uncertain";

export function purposeVerdict(u4: LiaUpgrade4Deliverables): TestVerdict {
  switch (u4.interest_legitimacy.verdict) {
    case "legitimate_interest_established":
      return "passes";
    case "legitimate_interest_not_established":
      return "fails";
    default:
      return "uncertain";
  }
}

// DOC 142 (2026-09-02) — external review, both live PDFs: the headline said
// "Necessity test: Met" while the necessity analysis on the same page
// reported an alternative with no recorded reason for inadequacy still open.
// Root cause: this verdict read the raw intake fields (mere presence of any
// alternatives text) while the analysis reads the typed per-alternative
// comparison. State-normalization only: "passes" now requires the comparison
// the limb asks for to be performed for the whole field — at least one
// alternative, every one carrying a recorded inadequacy reason. Anything
// less degrades to "uncertain", never "fails" (an unexplained alternative is
// a gap in the record, not proof a viable less intrusive means was declined).
export function necessityVerdict(u4: LiaUpgrade4Deliverables): TestVerdict {
  const finding = u4.alternatives_considered as unknown as Bag;
  const alternatives = Array.isArray(finding.alternatives) ? finding.alternatives as Bag[] : [];
  if (!alternatives.length) return "uncertain";
  return alternatives.every((a) => a.rationale_recorded === true) ? "passes" : "uncertain";
}

export function balancingVerdict(
  expectations: ReasonableExpectationsFinding,
  child: ChildFactorFinding,
  u4: LiaUpgrade4Deliverables,
  intake: Bag,
): BalancingVerdict {
  const harms = u4.potential_harms;
  const safeguards = arr(bag(intake.balancing_details).safeguards);
  const materialHarm = harms.material_weight_against_controller === true;
  if (expectations.verdict === "not_reasonably_expected") return "likely_fails";
  if (child.determination === "children_in_scope" && materialHarm) return "likely_fails";
  if (materialHarm && safeguards.length === 0) return "likely_fails";
  if (
    expectations.verdict === "undetermined_on_the_record" ||
    harms.status === "record_insufficient" ||
    child.determination === "undetermined_on_the_record"
  ) return "uncertain";
  return "likely_passes";
}

// ── The weighing narrative (balancing analysis + synthesis) ─────────────────

function expectationClause(expectations: ReasonableExpectationsFinding): string {
  switch (expectations.verdict) {
    case "reasonably_expected":
      return "the people affected would reasonably expect this processing";
    case "partly_expected":
      return "the people affected would only partly expect this processing";
    case "not_reasonably_expected":
      return "the people affected would not reasonably expect this processing";
    default:
      return "what the people affected would expect is not established";
  }
}

function harmClause(u4: LiaUpgrade4Deliverables): string {
  const h = u4.potential_harms;
  // FD703575-L2 — "is not stated" may only be claimed when nothing was
  // recorded; a recorded label outside the severity bands is named instead
  // (the old clause flatly contradicted the record_fact quoting the label).
  if (h.status === "record_insufficient") {
    return h.severity_label_recorded
      ? `the worst-case impact is characterised only as "${h.severity_label_recorded}", outside the recorded severity bands`
      : "the worst-case impact is not stated";
  }
  if (h.material_weight_against_controller) {
    return `the worst-case impact recorded is ${h.worst_case_severity} and weighs materially against the interest`;
  }
  return `the worst-case impact recorded is ${h.worst_case_severity}`;
}

function controllerSideClause(intake: Bag, u4: LiaUpgrade4Deliverables): string {
  const parts: string[] = [];
  const benefit = s(u4.benefit_and_beneficiary.benefit);
  parts.push(benefit ? `the specific benefit stated — ${benefit.replace(/\.$/, "")}` : "the interest as stated");
  const safeguards = arr(bag(intake.balancing_details).safeguards);
  // FD703575-L5 — count, not a verbatim dump: the old form pasted the entire
  // safeguard list lowercased (mangling product names) into the executive
  // summary and the weighing paragraph, where the full list is already set
  // out in the balancing analysis.
  if (safeguards.length) {
    parts.push(`the ${safeguards.length} recorded safeguard${safeguards.length === 1 ? "" : "s"} set out in the balancing analysis`);
  }
  if (u4.opt_out_feasibility.counts_as_mitigation) parts.push("an opt-out that goes beyond what the GDPR already requires");
  return parts.join("; ");
}

export function composeBalancingAnalysis(
  verdict: BalancingVerdict,
  expectations: ReasonableExpectationsFinding,
  child: ChildFactorFinding,
  u4: LiaUpgrade4Deliverables,
  intake: Bag,
): { analysis: string; synthesis: string } {
  // DOC 141 (2026-09-02) — polarity bucketing. The expectation and harm
  // clauses used to land in "Against it" UNCONDITIONALLY, so a record whose
  // people would reasonably expect the processing printed that pro-controller
  // fact as weighing AGAINST the interest — contradicting factorEntries
  // below, which routes the same verdicts to their correct direction
  // (controller / neutral / data_subject). The clauses now follow the same
  // routing: reasonably_expected joins the FOR side; an undetermined
  // expectation and a non-material or unrecorded harm sit in a neutral
  // sentence (mirroring factorEntries' "neutral" direction); only an adverse
  // or partial expectation, a materially-weighted harm, the child factor and
  // a power imbalance print against the interest. Nothing is re-judged here
  // — every clause still renders the verdict the typed finding carries.
  const forParts: string[] = [controllerSideClause(intake, u4)];
  const againstParts: string[] = [];
  const neutralParts: string[] = [];
  const expClause = expectationClause(expectations);
  if (expectations.verdict === "reasonably_expected") {
    forParts.push(expClause);
  } else if (expectations.verdict === "partly_expected" || expectations.verdict === "not_reasonably_expected") {
    againstParts.push(expClause);
  } else {
    neutralParts.push(expClause);
  }
  const hClause = harmClause(u4);
  if (u4.potential_harms.status !== "record_insufficient" && u4.potential_harms.material_weight_against_controller) {
    againstParts.push(hClause);
  } else {
    neutralParts.push(hClause);
  }
  if (child.determination === "children_in_scope") {
    againstParts.push("children are among the people affected, and their interests carry particular weight");
  }
  if (u4.relationship_with_individual.power_imbalance) {
    againstParts.push("the relationship carries a recognised power imbalance");
  }
  // 3E9AD759-L4 — a favourable closing carries the WHY, rendered from the
  // verdict's own decision path (batch 3e9ad759 flagged the bare "Weighed
  // together, the balance favours the interest pursued" as conclusory).
  // Each clause is the negation of a guard balancingVerdict actually tested
  // — nothing is re-judged here.
  const passesWhy = (() => {
    if (verdict !== "likely_passes") return "";
    const bits: string[] = [];
    bits.push(
      expectations.verdict === "reasonably_expected"
        ? "the people affected would reasonably expect the processing"
        : "the processing sits partly within the expectations of the people affected, and the expectation shortfall does not of itself override the interest",
    );
    const h = u4.potential_harms;
    const safeguards = arr(bag(intake.balancing_details).safeguards);
    bits.push(
      h.material_weight_against_controller
        ? `the material weight the recorded harms carry is answered by the ${safeguards.length} recorded safeguard${safeguards.length === 1 ? "" : "s"}`
        : `the worst-case severity recorded (${h.worst_case_severity}) does not of itself override the interest`,
    );
    if (u4.opt_out_feasibility.feasibility === "no_opt_out_available") {
      bits.push("the absence of an opt-out raises the weight the safeguards must carry, and on the typed findings above they carry it");
    }
    return `: ${bits.join("; ")}`;
  })();
  const closing = verdict === "likely_passes"
    ? `Weighed together, the balance favours the interest pursued as the record stands${passesWhy}.`
    : verdict === "likely_fails"
    ? "Weighed together, the balance favours the people affected as the record stands."
    : "Weighed together, the balance cannot be struck on the information provided.";
  // DOC 141 (2026-09-02) — the three buckets render as separate sentences,
  // and an empty against-bucket is stated honestly rather than padded.
  const sentences: string[] = [`In favour of the interest: ${forParts.join("; ")}.`];
  sentences.push(
    againstParts.length
      ? `Against it: ${againstParts.join("; ")}.`
      : "Against it, the typed findings above carry no factor of material weight.",
  );
  if (neutralParts.length) {
    sentences.push(`Neither for nor against it: ${neutralParts.join("; ")}.`);
  }
  const analysis = `${sentences.join(" ")} ${closing}`;
  return { analysis, synthesis: closing };
}

// ── W3-T2 factor entries (evidence-pointer discipline) ──────────────────────

interface BalancingFactorEntry {
  readonly factor: string;
  readonly intake_evidence: string;
  readonly evidence_absence: string;
  readonly direction: "controller" | "data_subject" | "neutral";
  readonly reasoning: string;
}

function factorEntries(
  expectations: ReasonableExpectationsFinding,
  u4: LiaUpgrade4Deliverables,
): BalancingFactorEntry[] {
  const h = u4.potential_harms;
  const o = u4.opt_out_feasibility;
  const r = u4.relationship_with_individual;
  return [
    {
      factor: "Reasonable expectations",
      intake_evidence: expectations.status === "analysed" ? "balancing_details.reasonable_expectation" : "",
      evidence_absence: expectations.status === "analysed" ? "" : "the expectation answer is not recorded",
      direction: expectations.verdict === "reasonably_expected"
        ? "controller"
        : expectations.verdict === "undetermined_on_the_record"
        ? "neutral"
        : "data_subject",
      reasoning: stop(s(expectations.application)) || "The expectation position is taken from the record.",
    },
    {
      factor: "Potential harms and severity",
      intake_evidence: h.status === "analysed" ? "balancing_details.potential_harm" : "",
      evidence_absence: h.status === "analysed" ? "" : "the worst-case impact is not recorded",
      direction: h.material_weight_against_controller ? "data_subject" : h.status === "analysed" ? "neutral" : "neutral",
      reasoning: stop(s(h.application)) || "The harm position is taken from the record.",
    },
    {
      factor: "Relationship and power imbalance",
      intake_evidence: r.status === "analysed" ? "relationship_type" : "",
      evidence_absence: r.status === "analysed" ? "" : "the relationship is not recorded",
      direction: r.power_imbalance ? "data_subject" : "neutral",
      reasoning: stop(s(r.application)) || "The relationship position is taken from the record.",
    },
    {
      factor: "Opt-out and mitigations",
      intake_evidence: o.status === "analysed" ? "balancing_details.opt_out_mechanism" : "",
      evidence_absence: o.status === "analysed" ? "" : "the opt-out position is not recorded",
      direction: o.counts_as_mitigation ? "controller" : "neutral",
      reasoning: stop(s(o.application)) || "The opt-out position is taken from the record.",
    },
  ];
}

// ── Stage 3 replacement — typed documentation recommendations ──────────────

export interface LiaTypedDocRec {
  readonly document: string;
  readonly purpose: string;
  readonly key_elements: readonly string[];
  readonly basis: string;
}

export function buildDocumentationTyped(report: Bag, disclaimer: string): Bag {
  const determination = bag(report.lia_determination) as unknown as LiaDetermination;
  const u4 = {
    opt_out_feasibility: bag(report.opt_out_feasibility),
    attestation_block: bag(report.attestation_block),
  } as unknown as LiaUpgrade4Deliverables;
  const recs: LiaTypedDocRec[] = [
    {
      document: "Legitimate Interests Balancing Record",
      purpose: "Preserves the three-part analysis this assessment records, so the position can be demonstrated if questioned.",
      key_elements: [
        "the interest pursued and who holds it",
        "the less intrusive alternatives considered and why each was rejected",
        "the balancing factors weighed and where the balance fell",
        "the review triggers adopted",
      ],
      basis: "EDPB Guidelines 1/2024 — the controller must be able to demonstrate that the balancing test was conducted appropriately.",
    },
    {
      document: "Legitimate Interests Notice (transparency statement)",
      purpose: "States the interest pursued and the right to object, in the notice the people affected actually see.",
      key_elements: [
        "the legitimate interest, stated specifically rather than generically",
        "the right to object under Article 21(1) and how to exercise it",
      ],
      basis: "GDPR Arts. 13(1)(d) and 21(1); EDPB Guidelines 1/2024 on specificity of the stated interest.",
    },
  ];
  if (u4.opt_out_feasibility.status === "analysed" && u4.opt_out_feasibility.feasibility !== "no_opt_out_available") {
    recs.push({
      document: "Opt-out and objection handling procedure",
      purpose: "Records how the stated opt-out operates and how downstream suppression is enforced.",
      key_elements: [
        "where the person encounters the opt-out",
        "who operates it and how suppression is verified",
      ],
      basis: "The record's own opt-out position; EDPB Guidelines 1/2024, Section II.C.4 on measures that count.",
    });
  }
  if (determination.outcome === "available_only_with_mitigations" && determination.mitigations.length) {
    recs.push({
      document: "Mitigation implementation plan",
      purpose: "Tracks each mitigation this assessment conditions the basis on, and the re-run of the balance once adopted.",
      key_elements: [
        "each mitigation, its owner, and its evidence",
        "the re-performed balancing test after adoption",
      ],
      basis: "EDPB Guidelines 1/2024, Section II.C.4 — after mitigations are adopted the balancing test is performed anew.",
    });
  }
  const reviewTriggers = u4.attestation_block.review_triggers.length
    ? u4.attestation_block.review_triggers
    : [
      "a material change to the processing, its purposes, or the data categories involved",
      "a relevant regulatory decision or guidance change on legitimate interests",
      "evidence that the balance struck here no longer reflects how the processing operates",
    ];
  return {
    recommended_documentation: recs,
    balancing_record_elements: [
      "the interest pursued, stated precisely enough to be weighed",
      "the necessity comparison against less intrusive means",
      "each balancing factor and its direction",
      "the mitigations adopted and their evidence",
    ],
    opt_out_mechanism: {
      required: false,
      basis: u4.opt_out_feasibility.status === "analysed"
        ? "Recorded position; an opt-out beyond Article 21 is a mitigating measure, not a free-standing requirement."
        : "Not established on the information provided.",
      recommended_approach: u4.opt_out_feasibility.status === "analysed" && s(u4.opt_out_feasibility.mechanism)
        ? s(u4.opt_out_feasibility.mechanism)
        : "Offer a standing means of declining the specific use at the point the person first encounters it.",
    },
    review_triggers: reviewTriggers,
    disclaimer,
  };
}

// ── The assembled typed Stage 2 ─────────────────────────────────────────────

export interface LiaTypedStage2Result {
  readonly three_part_test: Bag;
  readonly information_needed: readonly Bag[];
  readonly determination_override: LiaDetermination | null;
  readonly eprivacy_foreclosed: boolean;
}

export function buildThreePartTestTyped(report: Bag, intake: Bag): LiaTypedStage2Result {
  const u4 = {
    interest_legitimacy: bag(report.interest_legitimacy),
    benefit_and_beneficiary: bag(report.benefit_and_beneficiary),
    alternatives_considered: bag(report.alternatives_considered),
    relationship_with_individual: bag(report.relationship_with_individual),
    scale_frequency_duration: bag(report.scale_frequency_duration),
    potential_harms: bag(report.potential_harms),
    opt_out_feasibility: bag(report.opt_out_feasibility),
    attestation_block: bag(report.attestation_block),
  } as unknown as LiaUpgrade4Deliverables;
  const expectations = bag(report.reasonable_expectations) as unknown as ReasonableExpectationsFinding;
  const child = bag(report.child_factor) as unknown as ChildFactorFinding;
  const publicAuthority = bag(report.public_authority_exclusion) as unknown as PublicAuthorityFinding;
  const determination = bag(report.lia_determination) as unknown as LiaDetermination;
  const adm = bag(report.automated_decision_analysis) as unknown as AutomatedDecisionFinding;
  const gate = bag(report.eprivacy_short_circuit);
  const precedent = bag(report.precedent_class_posture) as unknown as PrecedentClassFinding;

  const pv = purposeVerdict(u4);
  const nv = necessityVerdict(u4);
  const bv = balancingVerdict(expectations, child, u4, intake);
  const weighing = composeBalancingAnalysis(bv, expectations, child, u4, intake);

  // ── The ePrivacy hard gate (outcome override, never a weight). ──────────
  const foreclosed = gate.li_foreclosed_for_covered_processing === true;
  // The gate's `application` sentence already carries the ratified rule
  // sentence verbatim (eprivacy-gate.ts RULE_SENTENCE — byte-identical to
  // LIA_EPRIVACY_RULE_SENTENCE above, pinned by the battery), so the
  // override quotes the application once and appends the original why.
  const determination_override: LiaDetermination | null = foreclosed
    ? {
      ...determination,
      outcome: "legitimate_interests_not_available",
      why: `${stop(s(gate.application))} ${stop(s(determination.why))}`.trim(),
      rebalance_required: false,
      status: "analysed",
    }
    : null;
  const outcome = foreclosed ? "legitimate_interests_not_available" : s(determination.outcome);
  // Batch 4ed05f22 (2026-09-05): the shared "weak" note points the reader to
  // Information Needed, but a foreclosed record may carry none (Velorix: all
  // three limbs met, no open items, and a note telling the reader to record
  // items that do not exist). Under foreclosure the note states the reason.
  const STRENGTH_NOTE_FORECLOSED =
    "Weak: the three-part test is assessed on the record as documented, but the ePrivacy consent requirement identified in the ePrivacy section forecloses legitimate interests for the covered processing, whatever the balance; the consent those rules require is the route to lawfulness for that processing.";

  // ── overall_assessment (UI surface; registered honest strings). ────────
  const allPass = pv === "passes" && nv === "passes" && bv === "likely_passes";
  const argument_strength = foreclosed
    ? "weak"
    : outcome === "legitimate_interests_available"
    ? (allPass ? "strong" : "moderate")
    : outcome === "available_only_with_mitigations"
    ? "weak"
    : outcome === "legitimate_interests_not_available"
    ? "weak"
    : "insufficient";
  const posture = s(precedent.posture);
  const precedentNames = Array.isArray(precedent.authorities)
    ? (precedent.authorities as unknown as { subject?: string }[]).map((a) => s(a.subject)).filter(Boolean)
    : [];
  const NONE = "None identified in current database";
  const closest_accepted_precedent = posture === "accepted" && precedentNames.length ? precedentNames.join("; ") : NONE;
  const closest_rejected_precedent = posture === "rejected" && precedentNames.length ? precedentNames.join("; ") : NONE;
  const strength_basis = foreclosed
    ? "The ePrivacy consent requirement forecloses the basis for the covered processing, whatever the balance."
    : posture && posture !== "not_assessed" && precedentNames.length
    ? `The rating reflects the record's own three-part result, read alongside the tracked ${posture} posture for this class of processing (${precedentNames.join("; ")}).`
    : "The rating reflects the record's own three-part result; no tracked precedent class bears on it.";
  const blocking_issues = outcome === "legitimate_interests_not_available" || outcome === "undetermined_on_the_record"
    ? (Array.isArray(determination.driving_factors) ? determination.driving_factors.map((f) => String(f)) : [])
    : [];

  // ── Test analyses: verbatim reuse of the typed applications. ───────────
  const three_part_test: Bag = {
    purpose_test: {
      verdict: pv,
      analysis: stop(s((u4.interest_legitimacy as unknown as Bag).application)),
      risk_factors: pv === "fails" ? ["the interest as stated does not qualify as legitimate"] : [],
      supporting_factors: pv === "passes" ? ["the interest is lawful, clearly articulated, and real and present on the record"] : [],
      open_questions: pv === "uncertain" && s((u4.interest_legitimacy as unknown as Bag).information_needed as string)
        ? [s((u4.interest_legitimacy as unknown as Bag).information_needed as string)]
        : [],
    },
    necessity_test: {
      verdict: nv,
      analysis: stop(s((u4.alternatives_considered as unknown as Bag).application)),
      risk_factors: [],
      supporting_factors: nv === "passes" ? ["less intrusive alternatives are recorded with the reasons they were not adopted"] : [],
      // DOC 142 — the open question states the concrete fact needed: the
      // finding's own information_needed names the specific unexplained
      // alternatives when the comparison is partial; the generic ask covers
      // the no-alternatives case.
      open_questions: nv === "uncertain"
        ? [
          s((u4.alternatives_considered as unknown as Bag).information_needed as string) ||
          "the less intrusive alternatives considered, and why each was rejected",
        ]
        : [],
    },
    balancing_test: {
      verdict: bv,
      analysis: weighing.analysis,
      factors: factorEntries(expectations, u4),
      synthesis: weighing.synthesis,
      risk_factors: factorEntries(expectations, u4).filter((f) => f.direction === "data_subject").map((f) => f.factor),
      supporting_factors: factorEntries(expectations, u4).filter((f) => f.direction === "controller").map((f) => f.factor),
      open_questions: [],
      special_category_flag: bag(intake.balancing_details).special_category_data === true,
      vulnerable_subject_flag: arr(bag(intake.balancing_details).vulnerable_subjects).filter((v) => v !== "None").length > 0,
    },
    overall_assessment: {
      argument_strength,
      strength_basis,
      closest_accepted_precedent,
      closest_rejected_precedent,
      key_distinguishing_factors: [],
      blocking_issues,
      // Parity with the model path's normalize block: the plain-language
      // note attaches on every run (existing shipped bytes, reused verbatim).
      argument_strength_note: foreclosed
        ? STRENGTH_NOTE_FORECLOSED
        : (STRENGTH_NOTES[argument_strength] ?? STRENGTH_NOTES.uncertain),
    },
    annotations: [],
  };

  // ── information_needed (roster-shaped; the guard validates fields). ────
  const information_needed: Bag[] = [];
  if (pv === "uncertain") {
    information_needed.push({
      field: "stated_purpose",
      dimensions: "the interest pursued, stated precisely enough to be weighed",
      provision: "GDPR Art. 6(1)(f)",
      enables: "the purpose test",
    });
  }
  if (nv === "uncertain") {
    information_needed.push({
      field: "alternatives_considered",
      dimensions: "the less intrusive alternatives considered and why each was rejected",
      provision: "EDPB Guidelines 1/2024, Section II.B",
      enables: "the necessity test",
    });
  }
  if (bv === "uncertain") {
    information_needed.push({
      field: "processing_description",
      dimensions: "the balancing facts still open — the expectation position, the worst-case impact, or the child question",
      provision: "GDPR Art. 6(1)(f)",
      enables: "the balancing test",
    });
  }
  // ADM regime note rides through the existing finding; no extra ask here.
  void adm;

  return { three_part_test, information_needed, determination_override, eprivacy_foreclosed: foreclosed };
}
