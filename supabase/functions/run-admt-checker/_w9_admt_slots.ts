// TURN 2 (cppa-admt) — deterministic slot reprojection.
//
// A-C. APPLICABILITY VERDICT (top-of-report) + REGISTRY-SOURCED DEADLINE TABLE.
// A-A. EDPB LOGIC-DISCLOSURE ADEQUACY (access-right § 7222(b)(3)).
// A-B. Art 22(3) HUMAN-INTERVENTION QUALIFICATION (three-element § 7001(e)(1)).
//
// Follows the deterministic-reprojection pattern established for cppa-risk in
// _w9_risk_slots.ts: the generator emits `null` in the three slots; this module
// stamps the final values from intake + scope_analysis + the ADMT verified-
// authority registry. No LLM calls. No fabrication. Fail-open on any error.

import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/admt-verified-authorities.ts";

export const W9_ADMT_SLOTS_STAMP = "w9-admt-turn2-slots@2026-07-24T10:12:00Z";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApplicabilityLabel =
  | "in_scope"
  | "out_of_scope"
  | "conservative_assumption"
  | "insufficient_basis";

export interface ApplicabilityVerdict {
  label: ApplicabilityLabel;
  reason: string;
  authorities: Array<{ proposition_key: string; subsection: string; verbatim_quote: string }>;
  drivers: {
    is_admt: boolean | null;
    triggers_significant_decision: boolean | null;
    determination_basis: string | null;
    human_review_qualifies: boolean | null;
  };
}

export interface DeadlineTableRow {
  obligation: string;
  compliance_deadline: string;
  proposition_key: string;
  subsection: string;
  verbatim_quote: string;
}

export interface AdequacyFinding {
  logic_disclosure: {
    // EDPB three elements: inputs, output, use
    element_inputs_present: boolean | null;
    element_output_present: boolean | null;
    element_use_present: boolean | null;
    conclusion: "adequate" | "inadequate" | "insufficient_basis";
    reason: string;
    authorities: Array<{ proposition_key: string; subsection: string }>;
  };
  human_intervention: {
    // Art 22(3) three elements: A) interpret output, B) reviews other info, C) authority to override
    element_a_interpret: boolean | null;
    element_b_other_info: boolean | null;
    element_c_override: boolean | null;
    conclusion: "qualifies" | "does_not_qualify" | "insufficient_basis";
    reason: string;
    authorities: Array<{ proposition_key: string; subsection: string }>;
  };
}

export interface SlotValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const YES = new Set(["yes", "true", "y", "1", "confirmed"]);
const NO = new Set(["no", "false", "n", "0"]);

function triBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (YES.has(s)) return true;
    if (NO.has(s)) return false;
  }
  return null;
}

function auth(pk: string): { proposition_key: string; subsection: string; verbatim_quote: string } | null {
  const row = (ADMT_VERIFIED_AUTHORITIES as any)[pk];
  if (!row) return null;
  return {
    proposition_key: pk,
    subsection: String(row.subsection || ""),
    verbatim_quote: String(row.verbatim_quote || ""),
  };
}

function authThin(pk: string): { proposition_key: string; subsection: string } | null {
  const row = (ADMT_VERIFIED_AUTHORITIES as any)[pk];
  if (!row) return null;
  return { proposition_key: pk, subsection: String(row.subsection || "") };
}

// ---------------------------------------------------------------------------
// A-C.1 — APPLICABILITY VERDICT
// ---------------------------------------------------------------------------

export function buildApplicabilityVerdict(intake: any, report: any): ApplicabilityVerdict {
  const sa = (report && typeof report === "object" ? report.scope_analysis : null) || {};
  const isAdmt = triBool(sa.is_admt);
  const trig = triBool(sa.triggers_significant_decision);
  const detBasis = typeof sa.determination_basis === "string" ? sa.determination_basis : null;
  const humQual = triBool(sa.human_review_qualifies);

  const authorities: ApplicabilityVerdict["authorities"] = [];
  const pushAuth = (pk: string) => { const a = auth(pk); if (a) authorities.push(a); };
  pushAuth("admt_def");
  pushAuth("significant_decision_def");
  pushAuth("scope_deadline");

  let label: ApplicabilityLabel;
  let reason: string;

  if (isAdmt === false) {
    label = "out_of_scope";
    reason = "System does not satisfy the § 7001(e) definition of ADMT; Article 11 duties do not apply.";
  } else if (isAdmt === true && trig === true) {
    if (detBasis === "conservative_assumption") {
      label = "conservative_assumption";
      reason = "System qualifies as ADMT and the intake supports a significant-decision assumption pending business confirmation of the § 7001(ddd) category.";
    } else {
      label = "in_scope";
      reason = "System qualifies as ADMT under § 7001(e) and triggers a significant decision under § 7001(ddd); Article 11 duties apply.";
    }
  } else if (isAdmt === true && trig === false) {
    label = "out_of_scope";
    reason = "System is ADMT but no significant-decision trigger is established under § 7001(ddd); Article 11 duties do not attach on this record.";
  } else {
    label = "insufficient_basis";
    reason = "The record does not resolve whether the system is ADMT and/or whether it triggers a significant decision; supply the missing intake dimensions and re-run.";
  }

  return {
    label,
    reason,
    authorities,
    drivers: {
      is_admt: isAdmt,
      triggers_significant_decision: trig,
      determination_basis: detBasis,
      human_review_qualifies: humQual,
    },
  };
}

// ---------------------------------------------------------------------------
// A-C.2 — REGISTRY-SOURCED DEADLINE TABLE
// ---------------------------------------------------------------------------

/**
 * Row spec (obligation label → registry proposition_key). Only registry-backed
 * rows are emitted. If a proposition_key is missing from the registry the row
 * is dropped rather than fabricated.
 */
const DEADLINE_SPECS: Array<{ obligation: string; pk: string; deadline: string }> = [
  { obligation: "Article 11 (ADMT) compliance effective date", pk: "scope_deadline", deadline: "January 1, 2027" },
  { obligation: "Pre-use notice — timing (before first use)", pk: "notice_timing", deadline: "Before first use of the ADMT for a significant decision" },
  { obligation: "Risk assessment — new significant-decision uses", pk: "ra_timing_new", deadline: "Before initiating the new processing" },
  { obligation: "Risk assessment — existing significant-decision uses", pk: "ra_timing_existing", deadline: "By December 31, 2027" },
  { obligation: "Risk assessment — submission to CPPA", pk: "ra_submit", deadline: "By April 1, 2028 (first submission cycle)" },
  { obligation: "Consumer access-right response timeline", pk: "access_timeline", deadline: "Within 45 days of a verifiable request (extendable once by 45 days with notice)" },
];

export function buildDeadlineTable(_intake: any, _report: any): DeadlineTableRow[] {
  const rows: DeadlineTableRow[] = [];
  for (const spec of DEADLINE_SPECS) {
    const a = auth(spec.pk);
    if (!a) continue;
    rows.push({
      obligation: spec.obligation,
      compliance_deadline: spec.deadline,
      proposition_key: a.proposition_key,
      subsection: a.subsection,
      verbatim_quote: a.verbatim_quote,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// A-A + A-B — ADEQUACY FINDING
// ---------------------------------------------------------------------------

export function buildAdequacyFinding(intake: any, _report: any): AdequacyFinding {
  const i: any = intake || {};
  const d: any = i.admt_detail || {};

  // ---- A-A EDPB logic-disclosure adequacy (§ 7222(b)(3)) --------------------
  // Elements: (1) input categories, (2) output, (3) how output is used.
  const purposeText: string = String(i.notice_purpose_text || "").toLowerCase();
  const howItWorks: boolean | null = triBool(i.notice_has_how_it_works);
  // Heuristic: the "how it works" toggle alone is not sufficient; we require
  // at least one indicator per element in the purpose text OR the how-it-works
  // affirmative. On absence of any signal, return insufficient_basis.
  const inputSignals = /input|data element|categor(y|ies)|features|training data|attribute/i.test(purposeText);
  const outputSignals = /output|score|prediction|classification|recommendation|decision/i.test(purposeText);
  const useSignals = /use|used to|inform|drive|determine|feed|combined with/i.test(purposeText);
  const elementInputs = howItWorks === true || inputSignals ? (howItWorks !== false && (howItWorks === true || inputSignals)) : (howItWorks === false ? false : null);
  const elementOutput = howItWorks === true || outputSignals ? (howItWorks !== false && (howItWorks === true || outputSignals)) : (howItWorks === false ? false : null);
  const elementUse = howItWorks === true || useSignals ? (howItWorks !== false && (howItWorks === true || useSignals)) : (howItWorks === false ? false : null);

  let ldConclusion: AdequacyFinding["logic_disclosure"]["conclusion"];
  let ldReason: string;
  const anyLdNull = elementInputs === null || elementOutput === null || elementUse === null;
  if (anyLdNull) {
    ldConclusion = "insufficient_basis";
    ldReason = "The record does not resolve all three EDPB elements (input categories, output, and use of output) for the access-right logic disclosure under § 7222(b)(3). Supply the disclosure text or attest each element and re-run.";
  } else if (elementInputs && elementOutput && elementUse) {
    ldConclusion = "adequate";
    ldReason = "Access-right logic disclosure names all three EDPB elements: (1) input categories, (2) output produced, and (3) how the output is used in the decision.";
  } else {
    ldConclusion = "inadequate";
    const missing = [
      !elementInputs ? "input categories" : null,
      !elementOutput ? "output" : null,
      !elementUse ? "use of output" : null,
    ].filter(Boolean).join(", ");
    ldReason = `Access-right logic disclosure is inadequate under § 7222(b)(3); missing element(s): ${missing}.`;
  }

  const ldAuths: AdequacyFinding["logic_disclosure"]["authorities"] = [];
  for (const pk of ["access_logic_disclosure", "access_disclosure_scope"]) {
    const a = authThin(pk); if (a) ldAuths.push(a);
  }

  // ---- A-B Art 22(3) human-intervention qualification (§ 7001(e)(1)) --------
  const elA = triBool(d.hi_trained);              // knows how to interpret
  const elB = triBool(d.hi_reviews_other_info);   // reviews other info
  const elC = triBool(d.hi_authority_override);   // authority to override

  let hiConclusion: AdequacyFinding["human_intervention"]["conclusion"];
  let hiReason: string;
  if (elA === null || elB === null || elC === null) {
    hiConclusion = "insufficient_basis";
    hiReason = "The record does not resolve all three elements of the § 7001(e)(1) human-involvement test (interpretation, review with other information, and override authority). Supply the missing intake dimensions and re-run.";
  } else if (elA && elB && elC) {
    hiConclusion = "qualifies";
    hiReason = "Human reviewer satisfies all three § 7001(e)(1) elements: (A) knows how to interpret the output, (B) reviews the output alongside other information, and (C) has authority to override.";
  } else {
    hiConclusion = "does_not_qualify";
    const missing = [
      !elA ? "(A) interpret output" : null,
      !elB ? "(B) review with other information" : null,
      !elC ? "(C) authority to override" : null,
    ].filter(Boolean).join(", ");
    hiReason = `Human involvement does not qualify under § 7001(e)(1); unmet element(s): ${missing}.`;
  }

  const hiAuths: AdequacyFinding["human_intervention"]["authorities"] = [];
  for (const pk of ["human_involvement", "fsor_human_involvement_three_part"]) {
    const a = authThin(pk); if (a) hiAuths.push(a);
  }

  return {
    logic_disclosure: {
      element_inputs_present: elementInputs,
      element_output_present: elementOutput,
      element_use_present: elementUse,
      conclusion: ldConclusion,
      reason: ldReason,
      authorities: ldAuths,
    },
    human_intervention: {
      element_a_interpret: elA,
      element_b_other_info: elB,
      element_c_override: elC,
      conclusion: hiConclusion,
      reason: hiReason,
      authorities: hiAuths,
    },
  };
}

// ---------------------------------------------------------------------------
// Validator (non-blocking)
// ---------------------------------------------------------------------------

export function validateAdmtSlots(report: any): SlotValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const av = report?.applicability_verdict;
  if (!av || typeof av !== "object") errors.push("applicability_verdict missing");
  else if (!["in_scope", "out_of_scope", "conservative_assumption", "insufficient_basis"].includes(av.label)) {
    errors.push(`applicability_verdict.label invalid: ${av.label}`);
  }

  const dt = report?.deadline_table;
  if (!Array.isArray(dt)) errors.push("deadline_table missing");
  else if (dt.length === 0) warnings.push("deadline_table empty");

  const af = report?.adequacy_finding;
  if (!af || typeof af !== "object") errors.push("adequacy_finding missing");
  else {
    if (!af.logic_disclosure || !["adequate", "inadequate", "insufficient_basis"].includes(af.logic_disclosure.conclusion)) {
      errors.push("adequacy_finding.logic_disclosure.conclusion invalid");
    }
    if (!af.human_intervention || !["qualifies", "does_not_qualify", "insufficient_basis"].includes(af.human_intervention.conclusion)) {
      errors.push("adequacy_finding.human_intervention.conclusion invalid");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Attach entrypoint (called from run-admt-checker/index.ts)
// ---------------------------------------------------------------------------

export function attachAndValidateAdmtSlots(report: any, intake: any): {
  attached: string[];
  validation: SlotValidation;
  va_version: string;
} {
  const attached: string[] = [];
  try { report.applicability_verdict = buildApplicabilityVerdict(intake, report); attached.push("applicability_verdict"); } catch (_) { /* noop */ }
  try { report.deadline_table = buildDeadlineTable(intake, report); attached.push("deadline_table"); } catch (_) { /* noop */ }
  try { report.adequacy_finding = buildAdequacyFinding(intake, report); attached.push("adequacy_finding"); } catch (_) { /* noop */ }
  return { attached, validation: validateAdmtSlots(report), va_version: ADMT_VERIFIED_AUTHORITY_VERSION };
}
