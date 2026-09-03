// CPPA ADMT v1.2 — DETERMINISTIC ENGINE (Part II of
// CPPA_ADMT_Audit_Spine_v1.2_Revised.docx, CEO-authored 2026-08-19/20).
//
// Implements Part II sections A (universal rules), B (vocab — see
// admt-v2-vocab.ts), D-J verbatim. NO MODEL CALL. Every D_ variable below is
// a pure function of the existing ADMT intake contract (cppa-admt.ts) — no
// new intake field is read (Part II §M is the closed field boundary this
// file honors).
//
// CITATIONS ARE NEVER AUTHORED HERE. Every `authority` string on a finding
// comes from the existing, already-verified fleet registries:
// `_shared/admt-citation-registry.ts` (CITATION_REGISTRY / resolveCitations)
// and `_local/registry/admt-verified-authorities.ts` (the VA registry, for
// scope-level propositions the element resolver doesn't cover). This module
// adds no new statutory text and no new citation string.
//
// ENGINEERING-JUDGMENT MARKERS: the spine text is exhaustive on WHICH state
// a factor takes given an answer, but a small number of places required a
// mechanical reading to turn prose into a boolean/branch. Every such spot is
// flagged inline `// JUDGMENT:` so it's easy to find and revisit.

import {
  CITATION_REGISTRY,
  resolveCitations,
  type ElementId,
} from "../../../_shared/admt-citation-registry.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../registry/admt-verified-authorities.ts";
import type {
  AdmtV2Finding,
  DecisionEffect,
  EvidenceState,
  PathState,
  RecordGrade,
  ScopeState,
  SubstantiveState,
} from "./admt-v2-vocab.ts";

// ---------------------------------------------------------------------------
// Intake accessors — defensive, never throw, never invent a value.
// ---------------------------------------------------------------------------

type Intake = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
}
function detail(intake: Intake): Record<string, unknown> {
  const d = (intake as any)?.admt_detail;
  return d && typeof d === "object" ? d : {};
}
function noticeText(intake: Intake): Record<string, unknown> {
  const d = (intake as any)?.notice_element_text;
  return d && typeof d === "object" ? d : {};
}
function readiness(intake: Intake): Record<string, unknown> {
  const d = (intake as any)?.access_readiness;
  return d && typeof d === "object" ? d : {};
}

// DOC 158 (2026-09-03, ADMT model-vs-law build) — ONE predicate for the
// automatically-decided-pathway signal (the assembler duplicated this regex).
export const AUTOMATED_PATHWAY_RE = /auto(?:matic(?:ally)?|-)\s*(?:approv|declin|reject|deni)/i;
// DOC 158 — the explicit-negative decision-domain option and the domain the
// § 7001(ddd)(2) housing exclusion attaches to (verbatim contract literals).
export const ADMT_NONE_DOMAIN = "None of these categories — the decision is outside every § 7001(ddd) category";
export const ADMT_HOUSING_DOMAIN = "Housing (rental or purchase eligibility)";
/** VA registry lookup by pinpoint — returns the pinpoint ONLY where a verified
 * row carries it (citations are never authored here). */
function vaCiteSub(subsection: string): string {
  return Object.values(ADMT_VERIFIED_AUTHORITIES as Record<string, { subsection?: string }>)
    .some((r) => r?.subsection === subsection) ? subsection : "";
}

/** Section-string helper — pulls the canonical citation for a CitationId. */
function cite(id: keyof typeof CITATION_REGISTRY): string {
  return CITATION_REGISTRY[id]?.section ?? "";
}
/** Element-level resolver — reuses the existing, tested resolveCitations(). */
function elementCite(elementId: ElementId, intake: Intake): string {
  const r = resolveCitations(elementId, intake);
  return r.sections.join(" + ");
}
/** VA registry lookup, for scope-level propositions the element resolver doesn't carry. */
function vaCite(propositionKey: string): string {
  const row = (ADMT_VERIFIED_AUTHORITIES as any)[propositionKey];
  return row?.subsection ?? "";
}

let findingSeq = 0;
function nextFindingId(): string {
  findingSeq += 1;
  return `f-${findingSeq}`;
}

// ---------------------------------------------------------------------------
// §D — Applicability
// ---------------------------------------------------------------------------

export interface ScopeResult {
  significantDecisionEffect: DecisionEffect;
  significantDecisionLabel: string;
  significantDecisionBasis: string;
  humanInvolvementEffect: DecisionEffect;
  humanInvolvementLabel: string;
  humanInvolvementBasis: string;
  advertisingEffect: DecisionEffect;
  advertisingLabel: string;
  advertisingBasis: string;
  outputRoleEffect: DecisionEffect;
  outputRoleLabel: string;
  outputRoleBasis: string;
  scopeState: ScopeState;
  recordGrade: RecordGrade;
  findings: AdmtV2Finding[];
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
  // P0-1; CEO directive: split the pathway explicitly) — true only for the
  // OUT_OF_SCOPE determination that rests on qualifying human review while
  // the Company's own system description names automated pathways the
  // review does not cover (S1.6's Condition to Proceed). The typed
  // scopeState is UNCHANGED (encoding law, RULING 3.2); this is presentation
  // metadata the assemble layer uses to make the headline pathway-aware
  // instead of contradicting the caveat two paragraphs later.
  pathwayDependent: boolean;
  // DOC 158 — categorical negatives: "None of these categories" alone, or a
  // housing decision inside the § 7001(ddd)(2) exclusion with no other domain.
  categoricalNone: boolean;
  housingExcluded: boolean;
}

export function computeScope(intake: Intake): ScopeResult {
  const rawDomains = arr((intake as any)?.decision_domains);
  // DOC 158 — the explicit negative and the § 7001(ddd)(2) housing exclusion.
  // `domains` below is the EFFECTIVE regulated set (the negative removed, an
  // excluded housing decision removed); every downstream read is unchanged.
  const noneSelected = rawDomains.includes(ADMT_NONE_DOMAIN);
  const regulatedDomains = rawDomains.filter((d) => d !== ADMT_NONE_DOMAIN);
  const housingBasis = str(detail(intake).housing_decision_basis);
  const housingExcluded = regulatedDomains.includes(ADMT_HOUSING_DOMAIN) && housingBasis.startsWith("Yes");
  const domains = regulatedDomains.filter((d) => !(d === ADMT_HOUSING_DOMAIN && housingExcluded));
  const noneConflict = noneSelected && regulatedDomains.length > 0;
  const categoricalNone = !noneConflict &&
    ((noneSelected && regulatedDomains.length === 0) ||
      (housingExcluded && domains.length === 0 && regulatedDomains.length === 1));
  const humanReview = str((intake as any)?.human_review);
  const solelyAdvertising = str(detail(intake).solely_advertising);
  const soleFactor = str(detail(intake).sole_factor);
  const feedsFuture = str(detail(intake).feeds_future_decisions);

  const findings: AdmtV2Finding[] = [];

  // ADMT-1 (2026-08-28, doc 96/100 of the spine-vs-prompt comparison
  // program) — MECHANICAL ADVERTISING-EXCLUSION GATE.
  //
  // decision_domains' enum carries no "advertising" member (see the
  // JUDGMENT note below) — so a business whose System is used solely for
  // advertising, and nothing else, mechanically leaves decision_domains
  // empty. That is a clean, unambiguous case: 11 CCR § 7001(ddd)(6)
  // excludes advertising from "significant decision" categorically, and a
  // record that affirmatively says "solely advertising" and selects no
  // regulated domain has already established the exclusion — nothing
  // further needs resolving, and asking about human review is moot (human
  // review only matters for a decision this System doesn't make). Before
  // this fix, that exact record fell into the `domains.length === 0`
  // branch below with everything else (a business that answered NOTHING),
  // producing UNABLE_TO_ASSESS and a spurious "human review not resolved"
  // finding despite the record deterministically resolving to
  // out-of-scope. Guarded on domains.length === 0 specifically so it never
  // fires when a real regulated domain is also selected — that combination
  // is a genuine self-contradiction in the record, handled separately by
  // advertisingConflict below (INCONSISTENT_RECORD, flagged for the
  // business to reconcile — see the admt-advertising-adversarial golden
  // fixture, which deliberately pairs a domain with solely_advertising=Yes
  // to test exactly that path and must keep resolving to
  // INCONSISTENT_RECORD, not this gate).
  const clearAdvertisingExclusion = domains.length === 0 && solelyAdvertising.startsWith("Yes");

  // -- Significant decision factor --
  // JUDGMENT: every option in the intake's decision_domains enum is itself a
  // regulated § 7001(ddd) category (the enum carries no "advertising" or
  // "other/unregulated" member) — so "one or more regulated domains" reduces
  // to "decision_domains is non-empty."
  const significantDecisionEffect: DecisionEffect = domains.length > 0 ? "SUPPORTS" : categoricalNone ? "WEIGHS_AGAINST" : "NEUTRAL";
  const significantDecisionLabel = domains.length > 0
    ? `Regulated significant-decision ${domains.length === 1 ? "domain" : "domains"} identified: ${domains.join("; ")}${
      housingExcluded ? " (the housing decision is excluded under § 7001(ddd)(2): based solely on availability, vacancy, or receipt of payment)" : ""
    }`
    : categoricalNone && noneSelected
    ? "Company records the decision as outside every § 7001(ddd) significant-decision category"
    : categoricalNone
    ? "Housing decision based solely on availability, vacancy, or receipt of payment — not a significant decision under § 7001(ddd)(2)"
    : "No significant-decision domain identified";
  const significantDecisionBasis = vaCite("sig_decision") || cite("sig_decision");

  // -- Human involvement factor --
  // DEF-2 fix (doc 75, CEO-directed 2026-08-26), with a worse collision
  // found on implementation: the intake option "Not applicable / unsure"
  // STARTS WITH "No", so it fell into the startsWith("No") branch and the
  // report affirmatively stated "No human review reported" — a
  // misattribution of an answer that says unsure — then treated it as
  // scope-SUPPORTING and reached IN_SCOPE. An unresolved answer now
  // behaves exactly like a blank one (the degradation law): NEUTRAL
  // effect, unresolved label, an INSUFFICIENT_RECORD ask, scope
  // UNABLE_TO_ASSESS, and an INCOMPLETE record grade. The unsure check
  // runs BEFORE the "No" prefix check, deliberately.
  const humanReviewUnresolved = !humanReview || /^not applicable/i.test(humanReview);
  let humanInvolvementEffect: DecisionEffect = "NEUTRAL";
  let humanInvolvementLabel = "Human review not resolved";
  if (humanReviewUnresolved) {
    humanInvolvementEffect = "NEUTRAL";
    humanInvolvementLabel = "Human review not resolved";
  } else if (humanReview.startsWith("Yes")) {
    humanInvolvementEffect = "WEIGHS_AGAINST";
    humanInvolvementLabel = "Qualifying human review reported";
  } else if (humanReview.startsWith("Partial")) {
    humanInvolvementEffect = "SUPPORTS";
    humanInvolvementLabel = "Non-qualifying review reported (no override authority)";
  } else if (humanReview.startsWith("No")) {
    humanInvolvementEffect = "SUPPORTS";
    humanInvolvementLabel = "No human review reported";
  } else {
    humanInvolvementEffect = "NEUTRAL";
    humanInvolvementLabel = "Human review not resolved";
  }
  const humanInvolvementBasis = vaCite("human_involvement") || cite("human_involvement");
  // DOC 158 — human review is moot on a categorical non-application too.
  if (humanReviewUnresolved && !clearAdvertisingExclusion && !categoricalNone) {
    findings.push(mkFinding({
      area: "Applicability", criterion: "Human involvement",
      source_fields: ["human_review"], substantive_state: "INSUFFICIENT_RECORD",
      decision_effect: "NEUTRAL",
      factual_basis: humanReview
        ? `The Company's answer on human review — "${humanReview}" — does not resolve whether a qualifying human review occurs.`
        : "The Company has not described human review of the System's output.",
      authority: humanInvolvementBasis, action_text: "Confirm whether a human reviews the System's output before it is applied, and describe that review.",
      // DOC 141 (2026-09-02) — closure_condition strings are rendered
      // VERBATIM into the §8.1 "Closure condition" / §8.2 "What resolves it"
      // table columns (admt-v2-assemble.ts buildActionsSection). The
      // deterministic grader proved raw intake tokens ("opt_out_exception",
      // "access_readiness.b1_purpose_ready", ...) reaching customer PDFs.
      // Every closure string that can route to §8.1 (priority 1) or §8.2
      // (INSUFFICIENT_RECORD, priority != 1) is reworded to plain prose in
      // this batch — checked per-instance, wording only, no routing change.
      priority: 3, closure_condition: "The Company confirms whether a human reviews the System's output before it is applied",
    }));
  }

  // -- Advertising exclusion factor --
  let advertisingEffect: DecisionEffect = "NEUTRAL";
  let advertisingLabel = "No advertising exclusion reported";
  if (solelyAdvertising.startsWith("Yes")) {
    advertisingEffect = "WEIGHS_AGAINST";
    advertisingLabel = "Company reports the System is used solely for advertising";
  } else if (solelyAdvertising === "No") {
    advertisingEffect = "NEUTRAL";
    advertisingLabel = "Company reports the System is not used solely for advertising";
  }
  const advertisingBasis = vaCite("fsor_advertising_exclusion") || vaCite("sig_decision") || cite("sig_decision");

  // -- Output role factor (descriptive only — never establishes/defeats scope) --
  const outputRoleLabel = soleFactor || "Not reported";
  const outputRoleBasis = "";

  // DOC 158 — the § 7001(e)(1) self-test (admt_detail.hi_*) was collected and
  // never read. It cross-checks the categorical human_review answer: a
  // "Yes — qualifying" answer beside a self-test that denies one of (A)–(C),
  // reports no reviewer, or places the review after the decision is a record
  // conflict. The categorical answer is never silently overridden; the
  // conflict is stated and blocks the determination (the advertising-conflict
  // pattern).
  const hd = detail(intake);
  const hiPresent = str(hd.hi_reviewer_present);
  const hiStage = str(hd.hi_stage);
  const hiDenials: string[] = [];
  if (str(hd.hi_trained) === "No") hiDenials.push("the reviewer is not trained to interpret the output (§ 7001(e)(1)(A))");
  if (str(hd.hi_reviews_other_info) === "No") hiDenials.push("the reviewer considers nothing beyond the output (§ 7001(e)(1)(B))");
  if (str(hd.hi_authority_override) === "No") hiDenials.push("the reviewer cannot change the decision (§ 7001(e)(1)(C))");
  if (/^No/.test(hiPresent)) hiDenials.push("no human reviewer is involved");
  if (/^After the decision/.test(hiStage)) hiDenials.push("the review occurs after the decision issues");
  else if (hiStage === "Appeal only") hiDenials.push("the review occurs on appeal only");
  const hiContradiction = humanReview.startsWith("Yes") && hiDenials.length > 0 && domains.length > 0;

  // -- Composite scope state --
  const advertisingConflict = solelyAdvertising.startsWith("Yes") && domains.length > 0;
  let scopeState: ScopeState;
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, ADMT
  // P0-1) — see ScopeResult.pathwayDependent.
  let pathwayDependent = false;
  if (advertisingConflict) {
    scopeState = "INCONSISTENT_RECORD";
    findings.push(mkFinding({
      area: "Applicability", criterion: "Scope conflict",
      source_fields: ["decision_domains", "admt_detail.solely_advertising"],
      substantive_state: "GAP", decision_effect: "CONDITION",
      factual_basis: `The Company has selected a regulated significant-decision domain (${domains.join("; ")}) while also reporting the System is used solely for advertising. These answers conflict.`,
      authority: advertisingBasis, action_text: "Reconcile the decision-domain selection with the solely-advertising answer before the applicability determination can be finalized.",
      // DOC 141 (2026-09-02) — prose closure, no raw field tokens (see note
      // at the human-review finding above).
      priority: 1, closure_condition: "The Company reconciles its decision-domain selection with its solely-advertising answer",
    }));
  } else if (noneConflict) {
    // DOC 158 — "None of these categories" beside a regulated domain.
    scopeState = "INCONSISTENT_RECORD";
    findings.push(mkFinding({
      area: "Applicability", criterion: "Scope conflict",
      source_fields: ["decision_domains"],
      substantive_state: "GAP", decision_effect: "CONDITION",
      factual_basis: `The Company selected "None of these categories" together with a regulated significant-decision domain (${regulatedDomains.join("; ")}). These answers conflict.`,
      authority: significantDecisionBasis,
      action_text: "Reconcile the decision-domain selection: select the regulated domain(s) the decision falls in, or \"None of these categories\" alone.",
      priority: 1, closure_condition: "The Company records either the regulated decision domain(s) or \"None of these categories\", not both",
    }));
  } else if (hiContradiction) {
    // DOC 158 — qualifying-review answer contradicted by the self-test.
    scopeState = "INCONSISTENT_RECORD";
    findings.push(mkFinding({
      area: "Applicability", criterion: "Human-involvement self-test",
      source_fields: ["human_review", "admt_detail.hi_trained", "admt_detail.hi_reviews_other_info", "admt_detail.hi_authority_override", "admt_detail.hi_reviewer_present", "admt_detail.hi_stage"],
      substantive_state: "GAP", decision_effect: "CONDITION",
      factual_basis: `The Company reports qualifying human review, but its § 7001(e)(1) self-test records that ${hiDenials.join("; ")}. Human involvement requires all three elements, before the decision issues.`,
      authority: humanInvolvementBasis,
      action_text: "Reconcile the human-review answer with the self-test; if any element is absent, the System is ADMT for this decision and Article 11 applies.",
      priority: 1, closure_condition: "The Company reconciles its human-review answer with the § 7001(e)(1) self-test",
    }));
  } else if (clearAdvertisingExclusion) {
    scopeState = "OUT_OF_SCOPE";
  } else if (categoricalNone) {
    // DOC 158 — the Company's own categorical negative (outside every
    // § 7001(ddd) category, or the (ddd)(2) housing exclusion) is a determined
    // non-application, never "unable to assess".
    scopeState = "OUT_OF_SCOPE";
  } else if (domains.length === 0) {
    scopeState = "UNABLE_TO_ASSESS";
  } else if (humanReview.startsWith("Yes")) {
    scopeState = "OUT_OF_SCOPE";
    // A-TEAM S4 RULING S1.6 (doc 119, 2026-08-31) — when the Company's OWN
    // system description reports outcomes decided automatically (auto-
    // approve / auto-decline bands), those decisions are not covered by the
    // blanket human-review answer, and the § 7001(e)(1) qualifying-review
    // rationale does not reach them. The narrative caveat (assemble's
    // buildOutOfScopeConditions, same lexical signal) already states this;
    // it now ALSO travels as a ranked priority-1 finding so Priority
    // Matters and the §8 action list carry it instead of an unconditional
    // all-clear (live batch row a7c99a7e, DB-verified). The OUT_OF_SCOPE
    // determination itself is unchanged (RULING 3.2).
    const sysDesc = str((intake as any)?.system_description);
    if (AUTOMATED_PATHWAY_RE.test(sysDesc)) {
      pathwayDependent = true;
      findings.push(mkFinding({
        area: "Applicability", criterion: "Automated decision pathways",
        source_fields: ["system_description", "human_review"],
        substantive_state: "GAP", decision_effect: "CONDITION",
        factual_basis: "The Company's own system description reports outcomes that are decided automatically (auto-approved or auto-declined), which the reported human review does not cover; for those decisions the System is ADMT and the Article 11 duties apply.",
        authority: humanInvolvementBasis,
        // DOC 135 FOLLOW-UP (CEO-ratified 2026-09-01) — the choice-of-remedy
        // sentence doesn't tell the reader what to verify once they pick the
        // "bring the automated pathways under Article 11" branch: the
        // Company's Notice/opt-out/access answers are recorded once for the
        // System as a whole (confirmed against the live intake form — no
        // question anywhere asks for a per-pathway variant), so a report
        // cannot state whether those processes actually cover the automated
        // pathways the same way they cover the human-reviewed one. Rather
        // than build new per-pathway intake fields (a schema project), the
        // CEO ratified stating the limitation and asking the Company to
        // confirm pathway-uniformity — no intake field is quoted, so this
        // never breaks on an empty/unusual answer and doesn't duplicate the
        // Assessment Fact Record appendix.
        //
        // DOC 137 (2026-09-01) — external reviewer (A-Team Batch 5) caught a
        // legitimate internal tension: the first sentence's "...put the
        // Article 11 Pre-use Notice, opt-out, and access processes in place
        // for them" implied those processes don't yet exist and must be
        // built from scratch, directly contradicting the very next sentence
        // ("The Company's Pre-use Notice, opt-out, and access processes ARE
        // recorded for the System as a whole"). The CEO reconfirmed (second
        // time) rejecting the reviewer's heavier ask — a full per-pathway
        // compliance-matrix architecture with independent Notice/Opt-out/
        // Access state per decision pathway — so this is wording-only: "put
        // ... in place for them" becomes "ensure ... cover them", which
        // reads as confirming/extending the existing system-wide processes
        // rather than building new ones, and flows directly into the next
        // sentence's "are recorded ... as a whole" without contradiction.
        // The choice-of-remedy framing (extend human review OR bring the
        // automated pathways under Article 11) and the pathway-uniformity
        // confirmation sentences that follow are unchanged.
        action_text: "Either extend qualifying human review to every significant decision the System touches, or treat the automatically-decided pathways as in-scope ADMT and ensure the Article 11 Pre-use Notice, opt-out, and access processes cover them. The Company's Pre-use Notice, opt-out, and access processes are recorded for the System as a whole, without distinguishing among decision pathways. Before relying on that record for the automatically-decided pathways, the Company should confirm that each of these processes operates identically there as it does where a human reviews the decision. Any pathway where a process differs has not yet been assessed under Article 11 and should be evaluated separately.",
        priority: 1, closure_condition: "qualifying human review confirmed for every decision pathway, or the automated pathways brought under Article 11, with pathway-uniformity of the notice/opt-out/access processes confirmed",
      }));
    }
  } else if (humanReviewUnresolved) {
    // DEF-2: an unresolved answer (blank OR "Not applicable / unsure")
    // cannot carry an affirmative scope determination.
    scopeState = "UNABLE_TO_ASSESS";
  } else {
    scopeState = "IN_SCOPE";
  }

  // Record grade for §2 / §7.
  let recordGrade: RecordGrade;
  const disambiguatorsMissing = !soleFactor && !feedsFuture;
  if (categoricalNone) {
    // DOC 158 — the decision-domain question is answered in the negative.
    recordGrade = "COMPLETE";
  } else if (domains.length > 0 && !humanReviewUnresolved && !advertisingConflict && !noneConflict && !hiContradiction) {
    recordGrade = disambiguatorsMissing ? "QUALIFIED" : "COMPLETE";
  } else if (domains.length === 0 && !humanReview) {
    recordGrade = "MATERIALLY_INCOMPLETE";
  } else {
    recordGrade = "QUALIFIED";
  }

  return {
    significantDecisionEffect, significantDecisionLabel, significantDecisionBasis,
    humanInvolvementEffect, humanInvolvementLabel, humanInvolvementBasis,
    advertisingEffect, advertisingLabel, advertisingBasis,
    outputRoleEffect: "NEUTRAL", outputRoleLabel, outputRoleBasis,
    scopeState, recordGrade, findings, pathwayDependent,
    categoricalNone, housingExcluded,
  };
}

function mkFinding(f: Omit<AdmtV2Finding, "finding_id">): AdmtV2Finding {
  return { finding_id: nextFindingId(), ...f };
}

// ---------------------------------------------------------------------------
// §F.D_OPTOUT_PATH — computed early; §E's alternative-process factor and
// §F's own factors both key off it.
// ---------------------------------------------------------------------------

export function computeOptOutPath(intake: Intake): PathState {
  const raw = str((intake as any)?.opt_out_exception);
  if (raw.startsWith("Human appeal exception")) return "HUMAN_APPEAL_EXCEPTION";
  if (raw.startsWith("Hiring/admission exception")) return "HIRING_ADMISSION_EXCEPTION";
  if (raw.startsWith("Work allocation/compensation exception")) return "WORK_ALLOCATION_COMP_EXCEPTION";
  if (raw.startsWith("No exception")) return "FULL_OPT_OUT";
  // JUDGMENT: opt_out_exception is a ChoiceWithOther text field — a
  // business-authored "Other: …" string (or any value that doesn't match one
  // of the four defined options) is normalized to OTHER_UNRESOLVED per the
  // spine's own instruction never to infer an exception not selected.
  return "OTHER_UNRESOLVED";
}

// ---------------------------------------------------------------------------
// §E — Pre-use Notice
// ---------------------------------------------------------------------------

export interface NoticeFactor {
  status: SubstantiveState;
  evidence?: EvidenceState;
  label: string;
  evidenceLabel?: string;
  effect: DecisionEffect;
  authority: string;
}

export interface NoticeResult {
  delivery: NoticeFactor;
  /** DOC 158 — § 7220(b)(2) timing. */
  timing: NoticeFactor;
  purpose: NoticeFactor;
  optoutDesc: NoticeFactor;
  accessDesc: NoticeFactor;
  antiRet: NoticeFactor;
  howWorks: NoticeFactor;
  altProcess: NoticeFactor;
  recordGrade: RecordGrade;
  posture: SubstantiveState;
  findings: AdmtV2Finding[];
}

function statusEffect(s: SubstantiveState): DecisionEffect {
  if (s === "GAP") return "CONDITION";
  if (s === "PARTIAL") return "WEIGHS_AGAINST";
  if (s === "INSUFFICIENT_RECORD") return "NEUTRAL";
  return "SUPPORTS"; // MEETS_REPORTED, NOT_APPLICABLE
}

export function computeNotice(intake: Intake, optOutPath: PathState): NoticeResult {
  const findings: AdmtV2Finding[] = [];
  const push = (area: string, criterion: string, f: NoticeFactor, fields: string[], why: string, action: string, priority: 1 | 2 | 3, closure: string) => {
    if (f.status === "GAP" || f.status === "PARTIAL" || f.status === "INSUFFICIENT_RECORD") {
      findings.push(mkFinding({
        area, criterion, source_fields: fields, substantive_state: f.status,
        evidence_state: f.evidence, decision_effect: f.effect, factual_basis: why,
        authority: f.authority, action_text: action, priority, closure_condition: closure,
      }));
    }
  };

  const delivery = arr((intake as any)?.notice_delivery);
  const deliveryGap = delivery.includes("We have not yet provided a Pre-use Notice");
  const deliveryFactor: NoticeFactor = {
    status: deliveryGap ? "GAP" : delivery.length > 0 ? "MEETS_REPORTED" : "INSUFFICIENT_RECORD",
    label: deliveryGap ? "No Pre-use Notice reported" : delivery.length > 0 ? delivery.join("; ") : "Not reported",
    effect: deliveryGap ? "CONDITION" : delivery.length > 0 ? "SUPPORTS" : "NEUTRAL",
    authority: elementCite("notice_purpose", intake),
  };
  deliveryFactor.effect = statusEffect(deliveryFactor.status);
  push("Pre-use Notice", "Notice delivery", deliveryFactor, ["notice_delivery"],
    "The Company reports it has not yet provided a Pre-use Notice.", "Publish a Pre-use Notice covering the required § 7220(c) elements before ADMT is used for the significant decision.",
    // DOC 141 (2026-09-02) — closure strings in this function reworded to
    // plain prose; they render verbatim in the §8.1/§8.2 tables (see note in
    // computeScope's human-review finding).
    1, "The Company confirms a Pre-use Notice has been provided");

  // DOC 158 — § 7220(b)(2) timing was never asked: a delivery method alone does
  // not establish that the notice precedes collection, or precedes the first
  // ADMT use of information already collected for another purpose.
  const timingAns = str((intake as any)?.notice_timing);
  let timingStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (/^At or before/.test(timingAns) || /^Before the ADMT/.test(timingAns)) timingStatus = "MEETS_REPORTED";
  else if (/^After/.test(timingAns)) timingStatus = "GAP";
  if (deliveryGap) timingStatus = "NOT_APPLICABLE";
  const timingFactor: NoticeFactor = {
    status: timingStatus, label: timingAns || "Not reported", effect: statusEffect(timingStatus),
    authority: vaCiteSub("11 CCR § 7220(b)(2)"),
  };
  push("Pre-use Notice", "Timing", timingFactor, ["notice_timing"],
    timingStatus === "GAP"
      ? "The Company reports that the Pre-use Notice is presented after the ADMT processing has begun."
      : `The Company reports: "${timingAns || "(not answered)"}".`,
    "Present the Pre-use Notice at or before the point of collecting the personal information the ADMT processes, or before the ADMT first processes information already collected for another purpose.",
    timingStatus === "GAP" ? 1 : 3, "The Company confirms the Pre-use Notice precedes collection or the first ADMT processing");

  const purposeAns = str((intake as any)?.notice_has_specific_purpose);
  const purposeStatus: SubstantiveState = purposeAns === "Yes" ? "MEETS_REPORTED" : purposeAns ? "GAP" : "INSUFFICIENT_RECORD";
  const purposeFactor: NoticeFactor = {
    status: purposeStatus, label: purposeAns || "Not reported", effect: statusEffect(purposeStatus),
    authority: elementCite("notice_purpose", intake),
  };
  push("Pre-use Notice", "Specific purpose", purposeFactor, ["notice_has_specific_purpose"],
    `The Company reports: "${purposeAns || "(not answered)"}".`, "State the specific decision the ADMT informs in plain language in the Pre-use Notice.",
    purposeStatus === "GAP" ? 2 : 3, "The Company confirms the Pre-use Notice states the specific purpose, with supporting notice text");

  const purposeText = str(noticeText(intake).purpose) || str((intake as any)?.notice_purpose_text) || str((intake as any)?.notice_full_text);
  purposeFactor.evidence = purposeText ? "DOCUMENTED" : "NOT_DOCUMENTED";
  purposeFactor.evidenceLabel = purposeText ? "Notice text supplied" : "No notice text supplied";

  const optoutDescAns = str((intake as any)?.notice_has_opt_out_desc);
  let optoutDescStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (optoutDescAns.startsWith("Yes")) optoutDescStatus = "MEETS_REPORTED";
  else if (optoutDescAns.startsWith("Mentions")) optoutDescStatus = "PARTIAL";
  else if (optoutDescAns === "No") optoutDescStatus = "GAP";
  else if (optoutDescAns.startsWith("We rely on an exception")) {
    // DOC 158 — path-aware (§ 7220(c)(2)(A)/(B)). Two exception answers:
    // "describe appeal rights" satisfies the element on the human-appeal
    // pathway ((A)) and is partial on a (b)(2)/(b)(3) pathway ((B) requires
    // the specific exception be identified); "identifies the specific
    // exception" satisfies (B) on a (b)(2)/(b)(3) pathway and is partial on
    // the human-appeal pathway ((A) requires the ability to appeal and how).
    // Either answer beside a FULL opt-out is a conflict: the notice must
    // describe the opt-out right. An unresolved pathway leaves it not
    // applicable.
    const identifiesException = optoutDescAns.startsWith("We rely on an exception and the notice identifies");
    const onEmploymentPath = optOutPath === "HIRING_ADMISSION_EXCEPTION" || optOutPath === "WORK_ALLOCATION_COMP_EXCEPTION";
    optoutDescStatus = optOutPath === "FULL_OPT_OUT"
      ? "GAP"
      : optOutPath === "HUMAN_APPEAL_EXCEPTION"
      ? (identifiesException ? "PARTIAL" : "MEETS_REPORTED")
      : onEmploymentPath
      ? (identifiesException ? "MEETS_REPORTED" : "PARTIAL")
      : "NOT_APPLICABLE";
  }
  const optoutDescExceptionMismatch = optoutDescAns.startsWith("We rely on an exception") &&
    (optoutDescStatus === "GAP" || optoutDescStatus === "PARTIAL");
  const optoutDescIdentifies = optoutDescAns.startsWith("We rely on an exception and the notice identifies");
  const optoutDescFactor: NoticeFactor = {
    status: optoutDescStatus, label: optoutDescAns || "Not reported", effect: statusEffect(optoutDescStatus),
    authority: elementCite("notice_optout", intake),
  };
  push("Pre-use Notice", "Opt-out / exception description", optoutDescFactor, ["notice_has_opt_out_desc", "opt_out_exception"],
    optoutDescExceptionMismatch
      ? (optOutPath === "FULL_OPT_OUT"
        ? `The Company offers a full opt-out right, but its notice ${optoutDescIdentifies ? "identifies an exception" : "describes appeal rights"} in place of the opt-out right; § 7220(c)(2) requires the notice to describe the right to opt out and how to submit a request.`
        : optOutPath === "HUMAN_APPEAL_EXCEPTION"
        ? "The Company relies on the human-appeal exception, but its notice identifies the exception without informing the consumer of the ability to appeal and how to submit an appeal; § 7220(c)(2)(A) requires both."
        : "The Company relies on a § 7221(b)(2) or (b)(3) exception, but its notice describes appeal rights; § 7220(c)(2)(B) requires the notice to identify the specific exception relied upon.")
      : `The Company reports: "${optoutDescAns || "(not answered)"}".`,
    optoutDescExceptionMismatch
      ? (optOutPath === "FULL_OPT_OUT"
        ? "Describe the opt-out right and how to submit a request in the Pre-use Notice."
        : optOutPath === "HUMAN_APPEAL_EXCEPTION"
        ? "Inform the consumer of the ability to appeal the decision and give instructions for submitting an appeal in the Pre-use Notice."
        : "Identify the specific § 7221(b) exception relied upon in the Pre-use Notice.")
      : "Describe the opt-out right (or the exception relied on) in the Pre-use Notice with specific instructions.",
    optoutDescStatus === "GAP" ? (optoutDescExceptionMismatch ? 1 : 2) : optoutDescStatus === "PARTIAL" ? 2 : 3,
    "The Company confirms the Pre-use Notice gives specific opt-out (or exception) instructions");

  const accessDescAns = str((intake as any)?.notice_has_access_desc);
  const accessDescStatus: SubstantiveState = accessDescAns === "Yes" ? "MEETS_REPORTED" : accessDescAns ? "GAP" : "INSUFFICIENT_RECORD";
  const accessDescFactor: NoticeFactor = {
    status: accessDescStatus, label: accessDescAns || "Not reported", effect: statusEffect(accessDescStatus),
    authority: elementCite("notice_access", intake),
  };
  push("Pre-use Notice", "Access right description", accessDescFactor, ["notice_has_access_desc"],
    `The Company reports: "${accessDescAns || "(not answered)"}".`, "Describe the access right and how to submit a request in the Pre-use Notice.",
    accessDescStatus === "GAP" ? 2 : 3, "The Company confirms the Pre-use Notice describes the access right");

  const antiRetAns = str((intake as any)?.notice_has_anti_retaliation);
  const antiRetStatus: SubstantiveState = antiRetAns === "Yes" ? "MEETS_REPORTED" : antiRetAns ? "GAP" : "INSUFFICIENT_RECORD";
  const antiRetFactor: NoticeFactor = {
    status: antiRetStatus, label: antiRetAns || "Not reported", effect: statusEffect(antiRetStatus),
    authority: elementCite("notice_antiretaliation", intake),
  };
  push("Pre-use Notice", "Anti-retaliation", antiRetFactor, ["notice_has_anti_retaliation"],
    `The Company reports: "${antiRetAns || "(not answered)"}".`, "Add the anti-retaliation statement required by § 7220(c)(4) to the Pre-use Notice.",
    antiRetStatus === "GAP" ? 2 : 3, "The Company confirms the Pre-use Notice carries the anti-retaliation statement");

  const howWorksAns = str((intake as any)?.notice_has_how_it_works);
  let howWorksStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (howWorksAns.startsWith("Yes")) howWorksStatus = "MEETS_REPORTED";
  else if (howWorksAns.startsWith("Partial")) howWorksStatus = "PARTIAL";
  else if (howWorksAns === "No" || howWorksAns === "Not yet") howWorksStatus = "GAP";
  const howWorksFactor: NoticeFactor = {
    status: howWorksStatus, label: howWorksAns || "Not reported", effect: statusEffect(howWorksStatus),
    authority: elementCite("notice_howworks", intake),
  };
  push("Pre-use Notice", "How the ADMT works", howWorksFactor, ["notice_has_how_it_works"],
    `The Company reports: "${howWorksAns || "(not answered)"}".`, "Explain how the ADMT works — the inputs it uses and the output it produces — in the Pre-use Notice.",
    howWorksStatus === "GAP" ? 2 : 3, "The Company confirms the Pre-use Notice fully explains how the ADMT works");

  const altProcessAns = str((intake as any)?.notice_has_alternative_process);
  let altProcessStatus: SubstantiveState;
  let altConflict = false;
  if (optOutPath === "FULL_OPT_OUT") {
    if (altProcessAns === "Yes") altProcessStatus = "MEETS_REPORTED";
    else if (altProcessAns === "No") altProcessStatus = "GAP";
    else if (altProcessAns.startsWith("Not applicable")) { altProcessStatus = "GAP"; altConflict = true; } // mismatch: exception NA claimed on a full-opt-out path
    else altProcessStatus = "INSUFFICIENT_RECORD";
  } else {
    // DOC 158 — on an exception pathway the element is not required
    // (§ 7220(c)(5)(C): "unless an exception … applies"); the answer is
    // recorded as given and never graded as met or insufficient.
    altProcessStatus = "NOT_APPLICABLE";
  }
  const altProcessFactor: NoticeFactor = {
    status: altProcessStatus, label: altProcessAns || "Not reported", effect: statusEffect(altProcessStatus),
    authority: elementCite("notice_alternative_process", intake),
  };
  push("Pre-use Notice", "Alternative process", altProcessFactor, ["notice_has_alternative_process", "opt_out_exception"],
    altConflict
      ? `The Company selected the full opt-out pathway but marked the alternative-process notice element "Not applicable — exception," which applies only on an exception pathway.`
      : `The Company reports: "${altProcessAns || "(not answered)"}".`,
    altConflict ? "Reconcile the opt-out pathway selection with the alternative-process notice answer." : "Describe the alternative process available to a consumer who opts out in the Pre-use Notice.",
    altProcessStatus === "GAP" ? (altConflict ? 1 : 2) : 3,
    altConflict ? "The Company reconciles its opt-out pathway selection with its alternative-process notice answer" : "The Company confirms the Pre-use Notice describes the alternative process available after an opt-out");

  // Record grade.
  const hasFullText = !!str((intake as any)?.notice_full_text);
  const hasElementText = Object.values(noticeText(intake)).some((v) => str(v));
  const hasPurposeText = !!purposeText;
  let recordGrade: RecordGrade;
  if (hasFullText) recordGrade = "COMPLETE";
  else if (hasElementText || hasPurposeText) recordGrade = "QUALIFIED";
  else recordGrade = "MATERIALLY_INCOMPLETE";

  // Composite posture.
  const applicable = [deliveryFactor, timingFactor, purposeFactor, optoutDescFactor, accessDescFactor, antiRetFactor, howWorksFactor, altProcessFactor]
    .filter((f) => f.status !== "NOT_APPLICABLE");
  let posture: SubstantiveState;
  if (applicable.some((f) => f.status === "GAP")) posture = "GAP";
  else if (applicable.some((f) => f.status === "PARTIAL")) posture = "PARTIAL";
  else if (applicable.some((f) => f.status === "INSUFFICIENT_RECORD")) posture = "INSUFFICIENT_RECORD";
  else posture = "MEETS_REPORTED";

  return {
    delivery: deliveryFactor, timing: timingFactor, purpose: purposeFactor, optoutDesc: optoutDescFactor,
    accessDesc: accessDescFactor, antiRet: antiRetFactor, howWorks: howWorksFactor,
    altProcess: altProcessFactor, recordGrade, posture, findings,
  };
}

// ---------------------------------------------------------------------------
// §F — Opt-Out and Exception
// ---------------------------------------------------------------------------

export interface OptOutResult {
  path: PathState;
  // 4.1 Full opt-out
  methods: NoticeFactor;
  cookie: NoticeFactor;
  account: NoticeFactor;
  fifteenDay: NoticeFactor;
  confirmation: NoticeFactor;
  // 4.2 Human appeal
  appealProcess: NoticeFactor;
  appealTraining: NoticeFactor;
  appealAuthority: NoticeFactor;
  appealSteps: NoticeFactor;
  // 4.3 Hiring/admission or work-allocation/compensation
  exceptionSoleUse: NoticeFactor;
  exceptionTesting: NoticeFactor;
  exceptionFairnessDoc: NoticeFactor;
  // DOC 158 — exception eligibility (§ 7221(b)(2)/(b)(3) decision-domain limits),
  // § 7221(c)(1) online form and link title, the § 7221(f)/(i)/(j)/(k)/(m)
  // handling duties, and the § 7221(b)(1)(A)/(B) appeal evidence.
  eligibility: NoticeFactor;
  linkTitle: NoticeFactor;
  handling: NoticeFactor;
  appealSubmissions: NoticeFactor;
  appealTimeline: NoticeFactor;
  recordGrade: RecordGrade;
  posture: SubstantiveState;
  findings: AdmtV2Finding[];
}

/** Evidence-only factors (narrative fields) get a THIN status label derived
 * from presence, never an independent GAP — Universal Rule 1. Where the
 * factor sits on a path that requires it and the field is blank, the status
 * is INSUFFICIENT_RECORD (a record-sufficiency gap), never GAP (a
 * substantive compliance gap) — only a closed-answer field can produce GAP.
 */
function evidenceOnlyFactor(text: string, pathEssential: boolean, authority: string): NoticeFactor {
  const evidence: EvidenceState = text ? "DOCUMENTED" : (pathEssential ? "NOT_DOCUMENTED" : "NOT_APPLICABLE");
  const status: SubstantiveState = text ? "MEETS_REPORTED" : (pathEssential ? "INSUFFICIENT_RECORD" : "NOT_APPLICABLE");
  return {
    status, evidence, label: text ? "Documented" : "Not documented",
    evidenceLabel: evidence === "DOCUMENTED" ? "Documented" : evidence === "NOT_DOCUMENTED" ? "Not documented" : "Not applicable",
    effect: statusEffect(status), authority,
  };
}

export function computeOptOut(intake: Intake, path: PathState): OptOutResult {
  const findings: AdmtV2Finding[] = [];
  const push = (area: string, criterion: string, f: NoticeFactor, fields: string[], why: string, action: string, priority: 1 | 2 | 3, closure: string) => {
    if (f.status === "GAP" || f.status === "PARTIAL" || f.status === "INSUFFICIENT_RECORD") {
      findings.push(mkFinding({
        area, criterion, source_fields: fields, substantive_state: f.status,
        evidence_state: f.evidence, decision_effect: f.effect, factual_basis: why,
        authority: f.authority, action_text: action, priority, closure_condition: closure,
      }));
    }
  };

  const onFullOptOut = path === "FULL_OPT_OUT";
  const onHumanAppeal = path === "HUMAN_APPEAL_EXCEPTION";
  const onEmpExc = path === "HIRING_ADMISSION_EXCEPTION" || path === "WORK_ALLOCATION_COMP_EXCEPTION";

  // -- 4.1 Full opt-out pathway --
  const methodsSel = arr((intake as any)?.opt_out_methods);
  const methodsStatus: SubstantiveState = methodsSel.length >= 2 ? "MEETS_REPORTED" : "GAP";
  const methods: NoticeFactor = {
    status: onFullOptOut ? methodsStatus : "NOT_APPLICABLE",
    // NR-34 fix (doc 75): proper pluralization replaces the typewriter-style
    // "method(s)" in rendered cells and findings.
    label: `${methodsSel.length} ${methodsSel.length === 1 ? "method" : "methods"} selected`,
    effect: statusEffect(onFullOptOut ? methodsStatus : "NOT_APPLICABLE"),
    authority: elementCite("optout_designated_methods", intake),
  };
  push("Opt-Out", "Designated methods", methods, ["opt_out_methods"],
    `The Company selected ${methodsSel.length} opt-out ${methodsSel.length === 1 ? "method" : "methods"}: ${methodsSel.join("; ") || "(none)"}.`,
    // DOC 141 (2026-09-02) — this closure is machine-facing only: the finding
    // is always GAP/priority-2, which routes to §8.3 Recommendations, whose
    // table renders no closure column. Checked per-instance; left as-is.
    "Offer at least two designated methods for consumers to submit an opt-out request.", 2, "opt_out_methods lists two or more methods");

  const cookieAns = str((intake as any)?.opt_out_no_cookie_banner);
  let cookieStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (cookieAns.startsWith("Cookie banner")) cookieStatus = "GAP";
  else if (cookieAns.startsWith("Confirmed")) cookieStatus = "MEETS_REPORTED";
  const cookie: NoticeFactor = {
    status: onFullOptOut ? cookieStatus : "NOT_APPLICABLE",
    label: cookieAns || "Not reported", effect: statusEffect(onFullOptOut ? cookieStatus : "NOT_APPLICABLE"),
    authority: elementCite("optout_designated_methods", intake),
  };
  push("Opt-Out", "ADMT-specific route", cookie, ["opt_out_no_cookie_banner"],
    `The Company reports: "${cookieAns || "(not answered)"}".`, "Provide at least one ADMT-specific opt-out route in addition to any cookie banner.", 1, "The Company confirms an ADMT-specific opt-out route in addition to any cookie banner");

  const acctAns = str((intake as any)?.opt_out_no_account_required);
  let acctStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (acctAns.startsWith("Account is")) acctStatus = "GAP";
  else if (acctAns.startsWith("Confirmed")) acctStatus = "MEETS_REPORTED";
  const account: NoticeFactor = {
    status: onFullOptOut ? acctStatus : "NOT_APPLICABLE",
    label: acctAns || "Not reported", effect: statusEffect(onFullOptOut ? acctStatus : "NOT_APPLICABLE"),
    authority: elementCite("optout_account_barrier", intake),
  };
  push("Opt-Out", "No account required", account, ["opt_out_no_account_required"],
    `The Company reports: "${acctAns || "(not answered)"}".`, "Remove the account-creation requirement from the opt-out process.", 1, "The Company confirms no account is required to submit an opt-out request");

  const fifteenDayText = str((intake as any)?.opt_out_15_day_process);
  const fifteenDay = evidenceOnlyFactor(fifteenDayText, onFullOptOut, elementCite("optout_processing", intake));
  push("Opt-Out", "15-business-day process", fifteenDay, ["opt_out_15_day_process"],
    fifteenDayText ? `The Company describes its process as: "${fifteenDayText}".` : "The Company has not described its 15-business-day cessation process.",
    "Document the operational process for ceasing ADMT processing within 15 business days of an opt-out request.", 3, "The Company documents its 15-business-day cessation process");

  const confirmText = str((intake as any)?.opt_out_confirmation_mechanism);
  const confirmation = evidenceOnlyFactor(confirmText, onFullOptOut, elementCite("optout_confirmation", intake));
  push("Opt-Out", "Confirmation mechanism", confirmation, ["opt_out_confirmation_mechanism"],
    confirmText ? `The Company describes its confirmation mechanism as: "${confirmText}".` : "The Company has not described how it confirms an opt-out was processed.",
    "Document the mechanism used to confirm an opt-out request was processed.", 3, "The Company documents how it confirms an opt-out request was processed");

  // -- 4.2 Human-appeal exception --
  const appealProcessText = str((intake as any)?.opt_out_appeal_process);
  const appealProcess = evidenceOnlyFactor(appealProcessText, onHumanAppeal, elementCite("optout_offer", intake));
  push("Opt-Out", "Appeal process", appealProcess, ["opt_out_appeal_process"],
    appealProcessText ? `The Company describes its appeal process as: "${appealProcessText}".` : "The Company has not described the human-appeal process it relies on for this exception.",
    "Describe the human-appeal process, including how a consumer reaches it.", 2, "The Company describes the human-appeal process it relies on, including how a consumer reaches it");

  const appealTrainedAns = str(detail(intake).appeal_trained);
  const appealTrainingStatus: SubstantiveState = appealTrainedAns === "Yes" ? "MEETS_REPORTED" : appealTrainedAns === "No" ? "GAP" : "INSUFFICIENT_RECORD";
  const appealTraining: NoticeFactor = {
    status: onHumanAppeal ? appealTrainingStatus : "NOT_APPLICABLE", label: appealTrainedAns || "Not reported",
    effect: statusEffect(onHumanAppeal ? appealTrainingStatus : "NOT_APPLICABLE"), authority: elementCite("human_involvement" as ElementId, intake) || cite("human_involvement"),
  };
  push("Opt-Out", "Reviewer training", appealTraining, ["admt_detail.appeal_trained"],
    `The Company reports the reviewer is trained: "${appealTrainedAns || "(not answered)"}".`, "Confirm the reviewer knows how to interpret the System's output before relying on the human-appeal exception.", 1, "The Company confirms the reviewer is trained to interpret the System's output");

  const appealAuthorityAns = str(detail(intake).appeal_authority_overturn);
  const appealAuthorityStatus: SubstantiveState = appealAuthorityAns === "Yes" ? "MEETS_REPORTED" : appealAuthorityAns === "No" ? "GAP" : "INSUFFICIENT_RECORD";
  const appealAuthority: NoticeFactor = {
    status: onHumanAppeal ? appealAuthorityStatus : "NOT_APPLICABLE", label: appealAuthorityAns || "Not reported",
    effect: statusEffect(onHumanAppeal ? appealAuthorityStatus : "NOT_APPLICABLE"), authority: elementCite("human_involvement" as ElementId, intake) || cite("human_involvement"),
  };
  push("Opt-Out", "Authority to overturn", appealAuthority, ["admt_detail.appeal_authority_overturn"],
    `The Company reports the reviewer can overturn the decision: "${appealAuthorityAns || "(not answered)"}".`, "Confirm the reviewer has authority to change the decision before relying on the human-appeal exception.", 1, "The Company confirms the reviewer has authority to overturn the decision");

  const appealStepsText = str(detail(intake).appeal_step_count);
  const appealSteps = evidenceOnlyFactor(appealStepsText, onHumanAppeal, "");
  push("Opt-Out", "Steps to reviewer", appealSteps, ["admt_detail.appeal_step_count"],
    appealStepsText ? `The Company reports the appeal process takes: "${appealStepsText}".` : "The Company has not described the number of steps to reach a human reviewer.",
    "Describe the steps a consumer takes to reach the human reviewer.", 3, "The Company describes the steps a consumer takes to reach the human reviewer");

  // -- 4.3 Hiring/admission or work-allocation/compensation exception --
  const soleUseAns = str(detail(intake).sole_use_attestation);
  let soleUseStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (soleUseAns.startsWith("Yes")) soleUseStatus = "MEETS_REPORTED";
  else if (soleUseAns.startsWith("No")) soleUseStatus = "GAP";
  const exceptionSoleUse: NoticeFactor = {
    status: onEmpExc ? soleUseStatus : "NOT_APPLICABLE", label: soleUseAns || "Not reported",
    effect: statusEffect(onEmpExc ? soleUseStatus : "NOT_APPLICABLE"), authority: cite("optout_exc_hire"),
  };
  push("Opt-Out", "Sole-use condition", exceptionSoleUse, ["admt_detail.sole_use_attestation"],
    `The Company reports: "${soleUseAns || "(not answered)"}".`, "Confirm the ADMT is used solely to assess the relevant ability or allocation/compensation factor.", 1, "The Company confirms the ADMT is used solely to assess the relevant ability or allocation/compensation factor");

  const testingAns = str(detail(intake).nondiscrimination_testing);
  let testingStatus: SubstantiveState = "INSUFFICIENT_RECORD";
  if (testingAns.startsWith("Yes")) testingStatus = "MEETS_REPORTED";
  else if (testingAns.startsWith("Testing performed but not documented")) testingStatus = "PARTIAL";
  else if (testingAns.startsWith("No testing")) testingStatus = "GAP";
  const exceptionTesting: NoticeFactor = {
    status: onEmpExc ? testingStatus : "NOT_APPLICABLE", label: testingAns || "Not reported",
    effect: statusEffect(onEmpExc ? testingStatus : "NOT_APPLICABLE"), authority: cite("optout_exc_hire"),
  };
  push("Opt-Out", "Non-discrimination testing", exceptionTesting, ["admt_detail.nondiscrimination_testing"],
    `The Company reports: "${testingAns || "(not answered)"}".`, "Document non-discrimination testing supporting the exception, or complete testing if none has been performed.",
    testingStatus === "GAP" ? 1 : 2, "The Company documents its non-discrimination testing");

  const fairnessDocText = str((intake as any)?.opt_out_fairness_doc);
  const exceptionFairnessDoc = evidenceOnlyFactor(fairnessDocText, onEmpExc, "");
  push("Opt-Out", "Fairness documentation", exceptionFairnessDoc, ["opt_out_fairness_doc"],
    fairnessDocText ? `The Company describes its fairness documentation as: "${fairnessDocText}".` : "The Company has not supplied fairness/non-discrimination documentation supporting the exception.",
    "Supply the underlying fairness or non-discrimination testing documentation.", 3, "The Company supplies the supporting fairness or non-discrimination documentation");

  // DOC 158 — exception eligibility: § 7221(b)(2) is limited to "admission,
  // acceptance, or hiring decisions" ((ddd)(3)(A), (ddd)(4)(A)); (b)(3) to
  // "allocation/assignment of work and compensation" ((ddd)(4)(B)). An
  // exception selected for a decision domain it does not cover is not
  // available, whatever the other conditions show.
  const domainsSel = arr((intake as any)?.decision_domains);
  const HIRE_ELIGIBLE = ["Hiring or admission decisions", "Education enrollment or opportunities (admission, credentials, suspension)"];
  const WORK_ELIGIBLE = ["Work allocation, scheduling, or compensation"];
  const eligibleDomains = path === "HIRING_ADMISSION_EXCEPTION" ? HIRE_ELIGIBLE : path === "WORK_ALLOCATION_COMP_EXCEPTION" ? WORK_ELIGIBLE : [];
  const eligibilityMet = !onEmpExc || domainsSel.some((d) => eligibleDomains.includes(d));
  const eligibilityStatus: SubstantiveState = !onEmpExc ? "NOT_APPLICABLE" : eligibilityMet ? "MEETS_REPORTED" : "GAP";
  const eligibility: NoticeFactor = {
    status: eligibilityStatus,
    label: !onEmpExc
      ? "Not applicable"
      : eligibilityMet
      ? `Decision domain within the exception: ${domainsSel.filter((d) => eligibleDomains.includes(d)).join("; ")}`
      : `No eligible decision domain recorded (${domainsSel.join("; ") || "none"})`,
    effect: statusEffect(eligibilityStatus), authority: cite("optout_exc_hire"),
  };
  push("Opt-Out", "Exception eligibility", eligibility, ["opt_out_exception", "decision_domains"],
    `The Company relies on the ${path === "HIRING_ADMISSION_EXCEPTION" ? "hiring/admission" : "work-allocation/compensation"} exception, but the decision domains it records (${domainsSel.join("; ") || "none"}) are not the decisions that exception covers.`,
    "Select the opt-out pathway that matches the recorded decision domain, or record the decision domain the exception covers.", 1,
    "The Company's selected exception matches a recorded decision domain it covers");

  // DOC 158 — § 7221(c)(1): an online business must offer an interactive
  // opt-out form via a link in the Pre-use Notice, and the link title must
  // state what the consumer is opting out of. opt_out_link_title was collected
  // and never read; online interaction is inferred from the Company's own
  // notice-delivery answers (in-app or onboarding-flow delivery).
  const linkTitle = str((intake as any)?.opt_out_link_title);
  const onlineForm = methodsSel.includes("Interactive online form linked from the Pre-use Notice");
  const onlineSignals = arr((intake as any)?.notice_delivery).some((d) => /^In-app/.test(d) || /^Account-creation/.test(d));
  // "State what the consumer is opting out of" = the title names the
  // automated decisionmaking (the regulation's own example is "Opt-out of
  // Automated Decisionmaking Technology"); a title naming only the
  // alternative ("Request manual review") or a generic label ("Your Privacy
  // Choices") does not.
  const titleStatesOptOut = /(automat|algorithm|ADMT|decision-?making|scoring|profiling)/i.test(linkTitle);
  let linkStatus: SubstantiveState = "NOT_APPLICABLE";
  let linkWhy = "";
  let linkAction = "";
  if (onFullOptOut) {
    if (onlineForm) {
      linkStatus = !linkTitle ? "INSUFFICIENT_RECORD" : titleStatesOptOut ? "MEETS_REPORTED" : "PARTIAL";
      linkWhy = !linkTitle
        ? "The Company has not recorded the title of the opt-out link in its Pre-use Notice."
        : `The Company records the opt-out link title as "${linkTitle}", which does not state what the consumer is opting out of.`;
      linkAction = "Title the opt-out link so it states what the consumer is opting out of — for example \"Opt-out of Automated Decisionmaking Technology\".";
    } else if (onlineSignals) {
      linkStatus = "GAP";
      linkWhy = "The Company's notice-delivery answers show it interacts with consumers online, but its opt-out methods do not include an interactive online form linked from the Pre-use Notice.";
      linkAction = "Provide an interactive online opt-out form accessible via a link in the Pre-use Notice.";
    }
  }
  const linkTitleFactor: NoticeFactor = {
    status: linkStatus,
    label: !onFullOptOut
      ? "Not applicable"
      : onlineForm
      ? (linkTitle || "Not reported")
      : onlineSignals
      ? "No interactive online form"
      : "Not applicable (no online form reported)",
    effect: statusEffect(linkStatus), authority: elementCite("optout_designated_methods", intake),
  };
  push("Opt-Out", "Online form and link title", linkTitleFactor, ["opt_out_link_title", "opt_out_methods", "notice_delivery"],
    linkWhy, linkAction, linkStatus === "GAP" || linkStatus === "PARTIAL" ? 2 : 3,
    "The Company confirms an interactive online opt-out form whose link title states what is being opted out of");

  // DOC 158 — § 7221(f), (i), (j), (k), (m): handling duties never examined
  // before. Unconfirmed is a record gap (follow-up), never a substantive gap:
  // the Company did not deny the duty, it did not confirm it.
  const HANDLING_DUTIES = [
    "No identity verification is required to submit an opt-out request (§ 7221(f))",
    "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
    "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
    "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
    "An opt-out received before processing begins prevents that processing (§ 7221(m))",
  ];
  const handlingSel = arr((intake as any)?.opt_out_handling_confirmations);
  const confirmedDuties = HANDLING_DUTIES.filter((d) => handlingSel.includes(d));
  const unconfirmedDuties = HANDLING_DUTIES.filter((d) => !handlingSel.includes(d));
  const handlingStatus: SubstantiveState = !onFullOptOut ? "NOT_APPLICABLE" : unconfirmedDuties.length === 0 ? "MEETS_REPORTED" : "INSUFFICIENT_RECORD";
  const handling: NoticeFactor = {
    status: handlingStatus,
    label: !onFullOptOut ? "Not applicable" : handlingSel.length === 0 ? "Not reported" : `${confirmedDuties.length} of ${HANDLING_DUTIES.length} duties confirmed`,
    effect: statusEffect(handlingStatus), authority: cite("optout_offer"),
  };
  push("Opt-Out", "Opt-out handling duties", handling, ["opt_out_handling_confirmations"],
    handlingSel.length === 0
      ? "The Company has not confirmed how it handles opt-out requests against the § 7221(f), (i), (j), (k), and (m) duties."
      : `The Company has not confirmed the following: ${unconfirmedDuties.join("; ")}.`,
    "Confirm each opt-out handling duty the Company meets: no verification required, a single opt-out-of-all option, authorized-agent requests, no re-consent request for 12 months, and no initiation after a pre-processing opt-out.",
    3, "The Company confirms each § 7221(f), (i), (j), (k), and (m) handling duty");

  // DOC 158 — § 7221(b)(1)(A)/(B) evidence collected and never read: what the
  // consumer may submit on appeal (the reviewer "must consider the information
  // provided by the consumer in support of their appeal") and the appeal
  // response timeline (§ 7021(b): 45 calendar days, extendable to 90).
  const appealSubmitSel = arr(detail(intake).appeal_consumer_submit);
  const appealSubmitStatus: SubstantiveState = !onHumanAppeal ? "NOT_APPLICABLE" : appealSubmitSel.length ? "MEETS_REPORTED" : "INSUFFICIENT_RECORD";
  const appealSubmissions: NoticeFactor = {
    status: appealSubmitStatus,
    label: !onHumanAppeal ? "Not applicable" : appealSubmitSel.length ? appealSubmitSel.join("; ") : "Not reported",
    effect: statusEffect(appealSubmitStatus), authority: cite("optout_offer"),
  };
  push("Opt-Out", "Consumer submissions on appeal", appealSubmissions, ["admt_detail.appeal_consumer_submit"],
    "The Company has not recorded what a consumer may submit in support of an appeal; the human reviewer must consider the information the consumer provides.",
    "Confirm that consumers can submit information in support of their appeal, and what forms it may take.", 2,
    "The Company confirms consumers can submit information in support of an appeal");
  const appealTimelineText = str(detail(intake).appeal_timeline);
  const timelineDays = (() => {
    const m = /(\d+)\s*(?:business\s+|calendar\s+)?days?/i.exec(appealTimelineText);
    return m ? Number(m[1]) : null;
  })();
  const appealTimelineStatus: SubstantiveState = !onHumanAppeal
    ? "NOT_APPLICABLE"
    : !appealTimelineText
    ? "INSUFFICIENT_RECORD"
    : timelineDays !== null && timelineDays > 45
    ? "GAP"
    : "MEETS_REPORTED";
  const appealTimeline: NoticeFactor = {
    status: appealTimelineStatus, label: !onHumanAppeal ? "Not applicable" : (appealTimelineText || "Not reported"),
    effect: statusEffect(appealTimelineStatus), authority: vaCiteSub("11 CCR § 7021(b)") || cite("optout_offer"),
  };
  push("Opt-Out", "Appeal response timeline", appealTimeline, ["admt_detail.appeal_timeline"],
    appealTimelineStatus === "GAP"
      ? `The Company records an appeal response timeline of "${appealTimelineText}", which exceeds the 45 calendar days § 7021(b) allows for a request to appeal ADMT.`
      : "The Company has not recorded its target response timeline for appeals; § 7021(b) requires a response within 45 calendar days (extendable to 90 with notice).",
    "Set and record an appeal response timeline within 45 calendar days (extendable to 90 with notice to the consumer).",
    appealTimelineStatus === "GAP" ? 2 : 3, "The Company records an appeal response timeline within 45 calendar days");

  // DOC 158 — § 7221(b)(2)(B)/(b)(3)(B) testing evidence collected and never
  // read (bias_*): it labels the testing factor's evidence, and a documented
  // testing record beside a "None" testing cadence is a conflict to reconcile.
  const biasCadence = str(detail(intake).bias_testing_cadence);
  const biasChars = arr(detail(intake).bias_protected_chars);
  const biasLast = str(detail(intake).bias_last_test);
  if (onEmpExc && (biasCadence || biasChars.length || biasLast)) {
    exceptionTesting.evidence = "DOCUMENTED";
    exceptionTesting.evidenceLabel = [
      biasCadence ? `Cadence: ${biasCadence}` : "",
      biasChars.length ? `${biasChars.length} protected ${biasChars.length === 1 ? "characteristic" : "characteristics"} tested` : "",
      biasLast ? `Last test: ${biasLast}` : "",
    ].filter(Boolean).join("; ");
  }
  if (onEmpExc && testingAns.startsWith("Yes") && biasCadence === "None") {
    findings.push(mkFinding({
      area: "Opt-Out", criterion: "Non-discrimination testing",
      source_fields: ["admt_detail.nondiscrimination_testing", "admt_detail.bias_testing_cadence"],
      substantive_state: "PARTIAL", decision_effect: "WEIGHS_AGAINST",
      factual_basis: "The Company reports a documented non-discrimination testing record while recording a fairness-testing cadence of \"None\". These answers conflict.",
      authority: cite("optout_exc_hire"),
      action_text: "Reconcile the testing record with the testing cadence; the exception requires that the ADMT does not unlawfully discriminate.",
      priority: 2, closure_condition: "The Company reconciles its testing record with its fairness-testing cadence",
    }));
  }

  // -- Record grade + composite posture, scoped to the selected path --
  const pathFactors: NoticeFactor[] = onFullOptOut
    ? [methods, cookie, account, fifteenDay, confirmation, linkTitleFactor, handling]
    : onHumanAppeal
    ? [appealProcess, appealTraining, appealAuthority, appealSteps, appealSubmissions, appealTimeline]
    : onEmpExc
    ? [eligibility, exceptionSoleUse, exceptionTesting, exceptionFairnessDoc]
    : [];

  let recordGrade: RecordGrade;
  if (path === "OTHER_UNRESOLVED") {
    recordGrade = "MATERIALLY_INCOMPLETE";
  } else {
    const insufficient = pathFactors.filter((f) => f.status === "INSUFFICIENT_RECORD").length;
    recordGrade = insufficient === 0 ? "COMPLETE" : insufficient <= 1 ? "QUALIFIED" : "MATERIALLY_INCOMPLETE";
  }

  let posture: SubstantiveState;
  if (path === "OTHER_UNRESOLVED") {
    posture = "INSUFFICIENT_RECORD";
    findings.push(mkFinding({
      area: "Opt-Out", criterion: "Selected pathway",
      source_fields: ["opt_out_exception"], substantive_state: "INSUFFICIENT_RECORD",
      decision_effect: "NEUTRAL", factual_basis: "The Company's opt-out / exception selection does not match one of the four pathways this audit evaluates.",
      authority: cite("optout_offer"), action_text: "Confirm which opt-out pathway or § 7221(b) exception the Company relies on.",
      // DOC 141 (2026-09-02) — was the raw-token string "opt_out_exception
      // matches a recognized pathway", which the grader proved rendering
      // verbatim into the §8.1 Closure-condition column.
      priority: 1, closure_condition: "The Company confirms which opt-out pathway or § 7221(b) exception it relies on",
    }));
  } else if (pathFactors.some((f) => f.status === "GAP")) posture = "GAP";
  else if (pathFactors.some((f) => f.status === "PARTIAL")) posture = "PARTIAL";
  else if (pathFactors.some((f) => f.status === "INSUFFICIENT_RECORD")) posture = "INSUFFICIENT_RECORD";
  else posture = "MEETS_REPORTED";

  return {
    path, methods, cookie, account, fifteenDay, confirmation,
    appealProcess, appealTraining, appealAuthority, appealSteps,
    exceptionSoleUse, exceptionTesting, exceptionFairnessDoc,
    eligibility, linkTitle: linkTitleFactor, handling, appealSubmissions, appealTimeline,
    recordGrade, posture, findings,
  };
}

// ---------------------------------------------------------------------------
// §G — Access and Explanation
// ---------------------------------------------------------------------------

const READINESS_ELEMENTS = [
  { id: "b1_purpose_ready", processId: "b1_purpose_process", label: "Specific purpose", elementCiteId: "access_specific_purpose" as ElementId },
  { id: "b2_logic_ready", processId: "b2_logic_process", label: "Logic / parameters", elementCiteId: "access_logic" as ElementId },
  { id: "b3_output_use_ready", processId: "b3_output_use_process", label: "Output and use", elementCiteId: "access_outcome_sole_factor" as ElementId },
  { id: "b3_outcome_ready", processId: "b3_outcome_process", label: "Outcome / future use", elementCiteId: "access_outcome_sole_factor" as ElementId },
  { id: "b3_human_role_ready", processId: "b3_human_role_process", label: "Human role", elementCiteId: "access_outcome_sole_factor" as ElementId },
  // DOC 158 — § 7222(b)(4): the anti-retaliation statement and instructions
  // (with links) for exercising other CCPA rights.
  { id: "b4_rights_ready", processId: "b4_rights_process", label: "Anti-retaliation and other rights", elementCiteId: "access_antiretal_link" as ElementId },
] as const;

export interface AccessResult {
  submissionEvidence: EvidenceState;
  verificationEvidence: EvidenceState;
  timeline: NoticeFactor;
  readiness: Record<string, NoticeFactor>;
  readinessComposite: SubstantiveState;
  withholdingEvidence: EvidenceState;
  /** DOC 158 — § 7222(g) secure transmission (closed answer) and § 7222(f) denial basis (evidence). */
  secureTransmission: NoticeFactor;
  denialEvidence: NoticeFactor;
  recordGrade: RecordGrade;
  posture: SubstantiveState;
  findings: AdmtV2Finding[];
}

export function computeAccess(intake: Intake): AccessResult {
  const findings: AdmtV2Finding[] = [];
  const push = (area: string, criterion: string, f: NoticeFactor, fields: string[], why: string, action: string, priority: 1 | 2 | 3, closure: string) => {
    if (f.status === "GAP" || f.status === "PARTIAL" || f.status === "INSUFFICIENT_RECORD") {
      findings.push(mkFinding({
        area, criterion, source_fields: fields, substantive_state: f.status,
        evidence_state: f.evidence, decision_effect: f.effect, factual_basis: why,
        authority: f.authority, action_text: action, priority, closure_condition: closure,
      }));
    }
  };

  const submissionText = str((intake as any)?.access_submission_methods);
  const submissionEvidence: EvidenceState = submissionText ? "DOCUMENTED" : "NOT_DOCUMENTED";
  if (!submissionText) {
    findings.push(mkFinding({
      area: "Access", criterion: "Submission method", source_fields: ["access_submission_methods"],
      substantive_state: "INSUFFICIENT_RECORD", evidence_state: "NOT_DOCUMENTED", decision_effect: "NEUTRAL",
      factual_basis: "The Company has not described how consumers submit an access request.",
      authority: "", action_text: "Describe the access-request submission method.", priority: 3,
      closure_condition: "The Company describes how consumers submit an access request",
    }));
  }

  const verificationText = str((intake as any)?.access_verification_process);
  const verificationEvidence: EvidenceState = verificationText ? "DOCUMENTED" : "NOT_DOCUMENTED";
  if (!verificationText) {
    findings.push(mkFinding({
      area: "Access", criterion: "Verification", source_fields: ["access_verification_process"],
      substantive_state: "INSUFFICIENT_RECORD", evidence_state: "NOT_DOCUMENTED", decision_effect: "NEUTRAL",
      factual_basis: "The Company has not described how it verifies an access request.",
      authority: "", action_text: "Describe the identity-verification process for access requests.", priority: 3,
      closure_condition: "The Company describes how it verifies an access request",
    }));
  }

  const timelineAns = str((intake as any)?.access_response_timeline);
  const timelineStatus: SubstantiveState = timelineAns.startsWith("Our process is not yet defined")
    ? "GAP" : timelineAns ? "MEETS_REPORTED" : "INSUFFICIENT_RECORD";
  const timeline: NoticeFactor = {
    status: timelineStatus, label: timelineAns || "Not reported", effect: statusEffect(timelineStatus),
    authority: elementCite("access_timeline", intake),
  };
  push("Access", "Response timeline", timeline, ["access_response_timeline"],
    `The Company reports: "${timelineAns || "(not answered)"}".`, "Define the access-response timeline consistent with the 45/90-day framework.", timelineStatus === "GAP" ? 1 : 3,
    "The Company confirms a defined access-response timeline");

  const readinessFactors: Record<string, NoticeFactor> = {};
  const readinessData = readiness(intake);
  for (const el of READINESS_ELEMENTS) {
    const readyAns = str(readinessData[el.id]);
    let status: SubstantiveState = "INSUFFICIENT_RECORD";
    if (readyAns.startsWith("Yes")) status = "MEETS_REPORTED";
    else if (readyAns.startsWith("Partially")) status = "PARTIAL";
    else if (readyAns.startsWith("No")) status = "GAP";
    const processText = str(readinessData[el.processId]);
    const f: NoticeFactor = {
      status, evidence: processText ? "DOCUMENTED" : "NOT_DOCUMENTED",
      label: readyAns || "Not reported",
      evidenceLabel: processText ? "Documented" : "Not documented",
      effect: statusEffect(status), authority: elementCite(el.elementCiteId, intake),
    };
    readinessFactors[el.id] = f;
    push("Access", `Explanation readiness — ${el.label}`, f, [`access_readiness.${el.id}`, `access_readiness.${el.processId}`],
      `The Company reports readiness to explain "${el.label}" as: "${readyAns || "(not answered)"}".`,
      `Establish the ability to produce the "${el.label}" element of the access explanation.`, status === "GAP" ? 1 : status === "PARTIAL" ? 2 : 3,
      // DOC 141 (2026-09-02) — was `access_readiness.${el.id} reports Yes`,
      // which the grader proved rendering verbatim into customer PDFs. The
      // prose form reuses the element's existing human label.
      `The Company confirms it can produce the "${el.label}" element of the access explanation`);
  }

  const readinessStates = READINESS_ELEMENTS.map((el) => readinessFactors[el.id].status);
  let readinessComposite: SubstantiveState;
  if (readinessStates.includes("GAP")) readinessComposite = "GAP";
  else if (readinessStates.includes("PARTIAL")) readinessComposite = "PARTIAL";
  else if (readinessStates.includes("INSUFFICIENT_RECORD")) readinessComposite = "INSUFFICIENT_RECORD";
  else readinessComposite = "MEETS_REPORTED";

  const withholdingText = str((intake as any)?.access_trade_secret_policy);
  const withholdingEvidence: EvidenceState = withholdingText ? "DOCUMENTED" : "NOT_DOCUMENTED";

  // DOC 158 — § 7222(g) secure transmission and § 7222(f) denial explanation:
  // both collected (admt_detail; rail entries existed) and never read.
  const secureTx = str(detail(intake).access_secure_transmission);
  const secureStatus: SubstantiveState = !secureTx ? "INSUFFICIENT_RECORD" : /^Not yet defined/.test(secureTx) ? "GAP" : "MEETS_REPORTED";
  const secureTransmission: NoticeFactor = {
    status: secureStatus, label: secureTx || "Not reported", effect: statusEffect(secureStatus),
    authority: vaCiteSub("11 CCR § 7222(g)"),
  };
  push("Access", "Secure transmission", secureTransmission, ["admt_detail.access_secure_transmission"],
    secureStatus === "GAP"
      ? "The Company reports it has not yet defined how it securely transmits access responses."
      : "The Company has not described how it transmits access responses.",
    "Define reasonable security measures for transmitting the access response to the consumer.", secureStatus === "GAP" ? 2 : 3,
    "The Company confirms a secure method for transmitting access responses");
  const denialText = str(detail(intake).access_denial_basis);
  const denialEvidence = evidenceOnlyFactor(denialText, true, vaCiteSub("11 CCR § 7222(f)"));
  push("Access", "Denial explanation", denialEvidence, ["admt_detail.access_denial_basis"],
    "The Company has not recorded the grounds on which it would deny an access request or the explanation it gives; § 7222(f) requires the requestor to be informed of the basis for any denial.",
    "Record the grounds on which an access request may be denied and the explanation provided to the requestor.", 3,
    "The Company records its denial grounds and the explanation it gives requestors");

  // Record grade.
  const coreDocumented = !!submissionText && !!verificationText;
  const readinessResolved = !readinessStates.includes("INSUFFICIENT_RECORD");
  let recordGrade: RecordGrade;
  if (coreDocumented && readinessResolved) recordGrade = "COMPLETE";
  else if (coreDocumented || readinessStates.filter((s) => s === "INSUFFICIENT_RECORD").length <= 2) recordGrade = "QUALIFIED";
  else recordGrade = "MATERIALLY_INCOMPLETE";

  // Composite posture — timeline + readiness closed answers only (narrative
  // submission/verification affect evidence/record grade, not posture).
  let posture: SubstantiveState;
  if (timelineStatus === "GAP" || readinessComposite === "GAP" || secureStatus === "GAP") posture = "GAP";
  else if (readinessComposite === "PARTIAL") posture = "PARTIAL";
  else if (timelineStatus === "INSUFFICIENT_RECORD" || readinessComposite === "INSUFFICIENT_RECORD" || secureStatus === "INSUFFICIENT_RECORD") posture = "INSUFFICIENT_RECORD";
  else posture = "MEETS_REPORTED";

  return { submissionEvidence, verificationEvidence, timeline, readiness: readinessFactors, readinessComposite, withholdingEvidence, secureTransmission, denialEvidence, recordGrade, posture, findings };
}

// ---------------------------------------------------------------------------
// §H — Vendor, Governance, and Record Variables
// ---------------------------------------------------------------------------

export interface VendorControl {
  label: string;
  /** Is this control relevant to the selected pathway at all? Purely
   * descriptive — never itself a GAP/CONDITION signal. */
  pathwayRelevant: boolean;
  /** Only WEIGHS_AGAINST/CONDITION when VENDOR_MATERIALITY_MATRIX's
   * dependency-without-capability override fires (see below); NEUTRAL
   * otherwise, including every "relevant but reported No, company can act
   * independently" case. */
  relevance: DecisionEffect;
}

export interface VendorResult {
  sectionLead: string;
  identified: boolean;
  docsEvidence: EvidenceState;
  controls: Record<"audit" | "assist" | "optout" | "appeal" | "incident", VendorControl>;
  /** True only when the dependency-without-capability override fired for at
   * least one control — the one case this build treats as a genuine Article
   * 11 gap rather than a vendor-management recommendation. */
  hasCapabilityGap: boolean;
  posture: SubstantiveState;
  recordGrade: RecordGrade;
  findings: AdmtV2Finding[];
}

/**
 * VENDOR MATERIALITY MATRIX — explicit, not a per-control judgment call.
 *
 * GOVERNING PRINCIPLE (CEO ruling, 2026-08-20): "ADMT v2 is an assessment,
 * not a vendor audit." A vendor control's absence does NOT, by itself,
 * create a substantive Article 11 GAP or CONDITION — even when the control
 * is relevant to the selected pathway. The report identifies the
 * dependency, explains why it matters, and directs the Company to obtain
 * the missing vendor information. The ONE exception: where the intake
 * ITSELF establishes the Company cannot perform the duty without the
 * vendor — operationalized here as `hosting === "Hosted by the vendor"`
 * (the only intake signal that speaks to independent capability) — a
 * missing, pathway-relevant control is a genuine gap, because the Company
 * has no other way to discharge that duty.
 *
 * `pathwayRelevant(path, scopeState)` answers ONE question: does an
 * operative §§ 7200–7222 duty depend on this control at all, for the
 * pathway/scope the Company is actually on? It never depends on whether
 * the control was reported Yes/No — relevance is about the pathway, not
 * the answer.
 */
export const VENDOR_MATERIALITY_MATRIX: Record<
  "audit" | "assist" | "optout" | "appeal" | "incident",
  { label: string; pathwayRelevant: (path: PathState, scopeState: ScopeState) => boolean; note: string }
> = {
  optout: {
    label: "Downstream opt-out",
    pathwayRelevant: (path) => path === "FULL_OPT_OUT",
    note: "Relevant only on the full opt-out pathway — an opt-out request must propagate to the vendor for the vendor to stop processing.",
  },
  assist: {
    label: "Access-request assistance",
    pathwayRelevant: (_path, scopeState) => scopeState === "IN_SCOPE",
    note: "Relevant whenever the System is in scope — the access duty applies regardless of which opt-out pathway the Company selected.",
  },
  appeal: {
    label: "Appeal / human-review",
    pathwayRelevant: (path) => path === "HUMAN_APPEAL_EXCEPTION",
    note: "Relevant only on the human-appeal exception pathway — the vendor must support the appeal the exception depends on.",
  },
  audit: {
    label: "Audit / monitoring",
    pathwayRelevant: () => false,
    note: "Not pathway-material under any path this audit evaluates; remains a governance recommendation, per the spine's own default.",
  },
  incident: {
    label: "Incident notification",
    pathwayRelevant: () => false,
    note: "Not pathway-material under any path this audit evaluates; remains a governance recommendation, per the spine's own default.",
  },
};

export function computeVendor(intake: Intake, scopeState: ScopeState, path: PathState): VendorResult {
  const findings: AdmtV2Finding[] = [];
  const thirdParty = str((intake as any)?.third_party_admt);
  // BUG FIX (2026-08-21): this field is free text and commonly carries an
  // explanation after "No" (e.g. "No -- LoanSight is built and maintained
  // internally; Experian and CoreLogic supply data inputs but do not
  // provide an ADMT system."). The prior `/^no$/i` required the ENTIRE
  // field to be exactly "no", so any explained "No" answer fell through as
  // identified=true and produced a vendor-dependency section that directly
  // contradicted the correctly-reproduced intake answer one line above it.
  const identified = !!thirdParty && !/^no\b/i.test(thirdParty) && !/^none\b/i.test(thirdParty);

  // DEF-4 fix (doc 75): strip the free text's own terminal stop at the seam
  // so the template's stop is the only one (double period rendered live).
  const sectionLead = identified
    ? `The Company identifies the third-party ADMT as: ${thirdParty.replace(/\.\s*$/, "")}.`
    : "The Company did not identify a third-party ADMT in the information supplied for this assessment.";

  if (!identified) {
    return {
      sectionLead, identified: false, docsEvidence: "NOT_APPLICABLE",
      controls: {
        audit: { label: "Not applicable", pathwayRelevant: false, relevance: "NEUTRAL" },
        assist: { label: "Not applicable", pathwayRelevant: false, relevance: "NEUTRAL" },
        optout: { label: "Not applicable", pathwayRelevant: false, relevance: "NEUTRAL" },
        appeal: { label: "Not applicable", pathwayRelevant: false, relevance: "NEUTRAL" },
        incident: { label: "Not applicable", pathwayRelevant: false, relevance: "NEUTRAL" },
      },
      hasCapabilityGap: false, posture: "NOT_APPLICABLE", recordGrade: "COMPLETE", findings: [],
    };
  }

  const d = detail(intake);
  const docs = arr(d.vendor_docs);
  const docsEvidence: EvidenceState = docs.length === 0 ? "INSUFFICIENT_RECORD" : docs.includes("None on file") ? "NOT_DOCUMENTED" : "DOCUMENTED";
  const yn = (v: unknown) => str(v);

  // The ONE intake signal this build treats as establishing the Company
  // cannot perform a vendor-dependent duty independently.
  const vendorOnlyHosting = str(d.hosting) === "Hosted by the vendor";

  const control = (
    key: "audit" | "assist" | "optout" | "appeal" | "incident",
    field: unknown, elementId: ElementId | null,
  ): VendorControl => {
    const m = VENDOR_MATERIALITY_MATRIX[key];
    const ans = yn(field);
    const label = ans || "Not reported";
    const pathwayRelevant = m.pathwayRelevant(path, scopeState);
    const capabilityGap = pathwayRelevant && ans === "No" && vendorOnlyHosting;
    const relevance: DecisionEffect = capabilityGap ? "CONDITION" : "NEUTRAL";

    if (capabilityGap) {
      findings.push(mkFinding({
        area: "Vendor Dependency", criterion: m.label, source_fields: [`admt_detail.v_${key}`, "admt_detail.hosting"],
        substantive_state: "GAP", decision_effect: "CONDITION",
        factual_basis: `The Company reports the System is hosted by the vendor and that the vendor contract does not provide for ${m.label.toLowerCase()}. Because the System is vendor-hosted, the Company has no independent way to discharge this duty without the vendor's cooperation.`,
        authority: elementId ? elementCite(elementId, intake) : "",
        action_text: `Obtain a vendor commitment covering ${m.label.toLowerCase()}, since the Company cannot perform this duty independently on a vendor-hosted System.`,
        // DOC 141 (2026-09-02) — prose closure, no raw field tokens.
        priority: 1, closure_condition: `The Company obtains a vendor commitment covering ${m.label.toLowerCase()}, or the System is no longer hosted solely by the vendor`,
      }));
    } else if (pathwayRelevant && !ans) {
      // Relevant to the pathway but simply unanswered — an information gap
      // to close, never a substantive finding. Priority 3: this is the
      // "obtain the missing vendor information" instruction, not a Condition.
      findings.push(mkFinding({
        area: "Vendor Dependency", criterion: m.label, source_fields: [`admt_detail.v_${key}`],
        substantive_state: "INSUFFICIENT_RECORD", decision_effect: "NEUTRAL",
        factual_basis: `The Company has not reported whether the vendor contract addresses ${m.label.toLowerCase()}, which is relevant to the selected pathway.`,
        authority: "", action_text: `Obtain and confirm whether the vendor contract addresses ${m.label.toLowerCase()}.`,
        // DOC 141 (2026-09-02) — prose closure, no raw field tokens.
        priority: 3, closure_condition: `The Company confirms whether the vendor contract addresses ${m.label.toLowerCase()}`,
      }));
    } else if (pathwayRelevant && ans === "No") {
      // Relevant, reported No, but the Company is NOT shown to depend on
      // the vendor for it (hosting is internal/hybrid, or unreported) —
      // per the governing principle this is a recommendation, not a gap.
      findings.push(mkFinding({
        area: "Vendor Dependency", criterion: m.label, source_fields: [`admt_detail.v_${key}`],
        substantive_state: "PARTIAL", decision_effect: "NEUTRAL",
        factual_basis: `The Company reports the vendor contract does not provide for ${m.label.toLowerCase()}. This does not by itself establish an Article 11 gap; it identifies a dependency worth tracking.`,
        authority: "", action_text: `Confirm how the Company covers ${m.label.toLowerCase()} independently of the vendor contract, or amend the contract to address it.`,
        // DOC 141 (2026-09-02) — machine-facing only: this finding is always
        // PARTIAL/priority-3, which routes to §8.3 Recommendations (no
        // closure column rendered). Checked per-instance; left as-is.
        priority: 3, closure_condition: `admt_detail.v_${key} reports Yes, or the Company confirms independent coverage`,
      }));
    }
    return { label, pathwayRelevant, relevance };
  };

  const controls = {
    audit: control("audit", d.v_audit, "sp_contract_terms"),
    assist: control("assist", d.v_assist, "sp_contract_terms"),
    optout: control("optout", d.v_optout, "optout_processing" as ElementId),
    appeal: control("appeal", d.v_appeal, "sp_contract_terms"),
    incident: control("incident", d.v_incident, null),
  };

  const hasCapabilityGap = Object.values(controls).some((c) => c.relevance === "CONDITION");
  // ADMT v2 IS AN ASSESSMENT, NOT A VENDOR AUDIT: absent the capability-gap
  // override, this section never drags the overall posture below what the
  // Company's own answers otherwise support — it stays informational.
  const posture: SubstantiveState = hasCapabilityGap ? "GAP" : "MEETS_REPORTED";

  const populatedControls = [d.v_audit, d.v_assist, d.v_optout, d.v_appeal, d.v_incident].filter((v) => !!yn(v)).length;
  let recordGrade: RecordGrade;
  if (str(d.vendor_status) && docs.length > 0 && populatedControls === 5) recordGrade = "COMPLETE";
  else if (str(d.vendor_status) || docs.length > 0 || populatedControls > 0) recordGrade = "QUALIFIED";
  else recordGrade = "MATERIALLY_INCOMPLETE";

  return { sectionLead, identified: true, docsEvidence, controls, hasCapabilityGap, posture, recordGrade, findings };
}

// ---------------------------------------------------------------------------
// Overall composite (Part II §H tail — D_OVERALL_*)
// ---------------------------------------------------------------------------

const GRADE_RANK: Record<RecordGrade, number> = { COMPLETE: 0, QUALIFIED: 1, MATERIALLY_INCOMPLETE: 2 };

export function overallRecordGrade(grades: RecordGrade[]): RecordGrade {
  if (grades.length === 0) return "COMPLETE";
  return grades.reduce((worst, g) => (GRADE_RANK[g] > GRADE_RANK[worst] ? g : worst), "COMPLETE" as RecordGrade);
}

export function overallPostureLabel(
  scopeState: ScopeState,
  sectionStates: SubstantiveState[],
  hasConflict: boolean,
): string {
  if (scopeState === "OUT_OF_SCOPE") return "Out of scope on reported facts";
  if (scopeState === "INCONSISTENT_RECORD" || hasConflict) return "Record conflict — resolve before a determination can be reached";
  if (scopeState === "UNABLE_TO_ASSESS") return "Unable to assess — scope cannot be determined on the current record";
  const applicable = sectionStates.filter((s) => s !== "NOT_APPLICABLE");
  if (applicable.some((s) => s === "GAP")) return "Gaps identified";
  if (applicable.some((s) => s === "PARTIAL" || s === "INSUFFICIENT_RECORD")) return "Qualified — follow-up needed";
  if (applicable.length > 0 && applicable.every((s) => s === "MEETS_REPORTED")) return "Meets on reported facts";
  return "Qualified — follow-up needed";
}

// ---------------------------------------------------------------------------
// TOP-LEVEL ORCHESTRATOR — resets the finding-id counter, runs every
// section in the dependency order Part II requires (opt-out path before
// notice's alternative-process factor; scope before vendor's path-relevance
// factors), and returns everything downstream composers need.
// ---------------------------------------------------------------------------

export interface AdmtV2Computed {
  scope: ScopeResult;
  optOutPath: PathState;
  notice: NoticeResult;
  optOut: OptOutResult;
  access: AccessResult;
  vendor: VendorResult;
  overallRecordGrade: RecordGrade;
  overallPostureLabel: string;
  allFindings: AdmtV2Finding[];
}

export function computeAdmtV2(intake: Intake): AdmtV2Computed {
  findingSeq = 0; // deterministic, stable ids per run

  const scope = computeScope(intake);
  const optOutPath = computeOptOutPath(intake);
  const notice = computeNotice(intake, optOutPath);
  const optOut = computeOptOut(intake, optOutPath);
  const access = computeAccess(intake);
  const vendor = computeVendor(intake, scope.scopeState, optOutPath);

  // DOC 135 (Batch 4 A-Team review, 2026-09-01) — a pathway-dependent record
  // (scopeState stays literally "OUT_OF_SCOPE" by design — RULING 3.2 — with
  // pathwayDependent:true layered on for presentation) previously excluded
  // notice/optOut/access from BOTH the record-grade rollup and allFindings,
  // even though the automated pathways are in scope for Article 11. Section
  // 8's condition list (buildActionParagraphs, reads allFindings) then had
  // only the one blanket "put the notice/opt-out/access processes in place"
  // finding to work with — telling a Company to build processes its own
  // Appendix B record shows already exist. Widening this gate to also fire
  // on pathwayDependent lets the real, already-computed per-duty findings
  // (GAP-only by construction — no-padding law) flow through, so Section 8
  // can name actual gaps instead of a blanket ask. This does NOT yet change
  // Sections 3-6's own rendering (still stubbed for pathwayDependent) or the
  // Executive Summary's "Not reached" cells — that is a larger content
  // decision (whether/how to render a full audit attributed to "the
  // automatically-decided pathways") deferred pending its own review, same
  // as the original pathwayDependent fix.
  const pathwayInScope = scope.scopeState !== "OUT_OF_SCOPE" || scope.pathwayDependent;
  const sectionGrades: RecordGrade[] = [scope.recordGrade];
  const sectionStates: SubstantiveState[] = [];
  if (pathwayInScope) {
    sectionGrades.push(notice.recordGrade, optOut.recordGrade, access.recordGrade);
    sectionStates.push(notice.posture, optOut.posture, access.posture);
    if (vendor.posture !== "NOT_APPLICABLE") {
      sectionGrades.push(vendor.recordGrade);
      sectionStates.push(vendor.posture);
    }
  }

  const hasConflict = scope.scopeState === "INCONSISTENT_RECORD";
  const grade = overallRecordGrade(sectionGrades);
  const postureLabel = overallPostureLabel(scope.scopeState, sectionStates, hasConflict);

  const allFindings = [
    ...scope.findings,
    ...(pathwayInScope ? notice.findings : []),
    ...(pathwayInScope ? optOut.findings : []),
    ...(pathwayInScope ? access.findings : []),
    ...(pathwayInScope && vendor.posture !== "NOT_APPLICABLE" ? vendor.findings : []),
  ];

  return {
    scope, optOutPath, notice, optOut, access, vendor,
    overallRecordGrade: grade, overallPostureLabel: postureLabel, allFindings,
  };
}
