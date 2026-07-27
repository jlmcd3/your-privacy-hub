// W9-RISK-SLOTS — TURN 1b of CPPA-STANDARD-SETTER TURN 1.
//
// Adds to TURN 1a:
//   (a) CNIL-style pre_safeguard_likelihood / pre_safeguard_severity /
//       pre_safeguard_residual_risk_level on every risk_register entry so
//       the register documents the delta safeguards buy — the ISO/CNIL
//       structured-scoring pattern.
//   (b) computeIntakeSelectedSubsections(intake): deterministic mapping
//       from raw intake fields → the § 7150(b)(N) subsection anchors
//       triggered by those answers. Used by callers that want a
//       subsection list BEFORE the model runs (pre-emit selection).
//   (c) TURN 1b intake fields — sensitive_location_basis (§ 7150(b)(5))
//       and public_privacy_policy_url — are surfaced in the attestation
//       block and submission_summary as record anchors.
//
// Stamp reflects actual authoring time — no projection.

export const W9_RISK_SLOTS_STAMP = "w9-risk-slots-p1@2026-07-24T09:58:12Z";

export interface AttestationBlock {
  certifying_executive_name: string;
  certifying_executive_title: string;
  certifying_contact_email: string;
  certification_statement: string;
  statutory_basis: string;
  submission_status: "pending" | "submitted" | "not_required";
  submission_deadline: string;
  public_privacy_policy_url?: string;
}

export interface SubmissionSummary {
  assessment_date: string;
  business_name: string;
  statutory_framework: string;
  triggered_subsections: string[];
  compliance_deadline: string;
  submission_deadline: string;
  submission_basis: string;
  sensitive_location_basis?: string;
  public_privacy_policy_url?: string;
}

export interface RiskRegisterEntry {
  id: string;
  activity: string;
  harm_type: string;
  // Post-safeguard (as-implemented) values.
  likelihood: string;
  severity: string;
  // Pre-safeguard values (CNIL/ISO structured scoring). When the record
  // does not distinguish pre vs post, pre == post.
  pre_safeguard_likelihood: string;
  pre_safeguard_severity: string;
  pre_safeguard_residual_risk_level: RiskLevel;
  current_safeguards: string;
  gap_status: "open" | "mitigated" | "accepted" | "unassessed";
  residual_risk_level: RiskLevel;
  statutory_basis: string;
}

type RiskLevel = "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis";

export interface RiskRegister {
  entries: RiskRegisterEntry[];
}

type Report = Record<string, any>;
type Intake = Record<string, any>;

const clampStr = (v: unknown): string => (typeof v === "string" ? v : "");

const CERTIFICATION_STATEMENT =
  "I certify, under penalty of perjury under the laws of the State of California, that I have reviewed this risk assessment and that its content satisfies the § 7152 required content elements and § 7154 balancing requirement, and that the safeguards described are those the business has implemented or has committed to implement.";

const STATUTORY_FRAMEWORK = "Cal. Code Regs. tit. 11, §§ 7150–7157";
const COMPLIANCE_DEADLINE = "December 31, 2027";
const SUBMISSION_DEADLINE_DEFAULT = "April 1, 2028";

const NOT_APPLICABLE_SENSITIVE_LOCATION = "Not applicable — no sensitive-location processing";

function extractContentDetail(intake: Intake): Record<string, any> {
  const cd = intake?.content_detail;
  return cd && typeof cd === "object" ? cd : {};
}

function extractTriggeredSubsections(report: Report): string[] {
  const details = Array.isArray(report?.scope_and_triggers?.triggered_activities_detail)
    ? report.scope_and_triggers.triggered_activities_detail
    : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of details) {
    const raw = clampStr(d?.statutory_basis).trim();
    if (!raw) continue;
    const m = raw.match(/§\s*7150\(b\)\(\d+\)(?:\([A-Za-z0-9]+\))?/g);
    const items = m && m.length ? m : [raw];
    for (const it of items) {
      if (!seen.has(it)) { seen.add(it); out.push(it); }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// TURN 1b — deterministic intake → § 7150(b)(N) resolver.
// Pure function; every branch keyed to a documented intake field literal.
// Returned list is de-duplicated in declaration order.
// ---------------------------------------------------------------------------
export function computeIntakeSelectedSubsections(intake: Intake): string[] {
  const out: string[] = [];
  const push = (s: string) => { if (!out.includes(s)) out.push(s); };
  const raw = (intake && typeof intake === "object") ? intake : {};
  // Support both the top-level flat intake and the shimmed content_detail form.
  const cd = raw.content_detail && typeof raw.content_detail === "object" ? raw.content_detail : {};
  const merged: Record<string, any> = { ...cd, ...raw };

  const q5 = clampStr(merged.q5_sell_share);
  if (q5 && q5 !== "No" && q5 !== "Unsure") push("§ 7150(b)(1)");

  const q5b = clampStr(merged.q5b_profiling_observation);
  if (q5b && q5b !== "No") push("§ 7150(b)(4)");

  // (b)(3) — ADMT for significant decisions.
  const q18 = clampStr(merged.q18_admt_use);
  if (q18 === "Yes") push("§ 7150(b)(3)");

  // (b)(2) — sensitive PI processing.
  const q15 = clampStr(merged.q15_sensitive_pi);
  if (q15 === "Yes") push("§ 7150(b)(2)");

  // (b)(5) — TURN 1b: sensitive-location predicate. Any value other than
  // the explicit "Not applicable" enum member engages the trigger.
  const slb = clampStr(merged.sensitive_location_basis);
  if (slb && slb !== NOT_APPLICABLE_SENSITIVE_LOCATION) push("§ 7150(b)(5)");

  // (b)(6) — training ADMT / facial / emotion / biometric recognition.
  const q18b = clampStr(merged.q18b_admt_training);
  if (q18b && q18b !== "No") push("§ 7150(b)(6)");

  return out;
}

export function buildAttestationBlock(intake: Intake, report: Report): AttestationBlock {
  const cd = extractContentDetail(intake);
  const flat = intake && typeof intake === "object" ? intake : {};
  const summary = report?.assessment_summary ?? {};
  const requiresSubmission =
    Boolean(summary?.cybersecurity_audit_required) ||
    Boolean(summary?.admt_disclosure_required) ||
    (Array.isArray(summary?.triggered_activities) && summary.triggered_activities.length > 0);
  const url = clampStr((flat as any).public_privacy_policy_url || cd.public_privacy_policy_url);
  return {
    certifying_executive_name: clampStr(cd.certifying_exec_name || (flat as any).i8_certifying_exec_name),
    certifying_executive_title: clampStr(cd.certifying_exec_title || (flat as any).i8_certifying_exec_title),
    certifying_contact_email: clampStr(cd.certifying_contact_email || (flat as any).i8_contact_email),
    certification_statement: CERTIFICATION_STATEMENT,
    // WAVEB2-CLOSURE (2026-07-27, item 157): re-anchored to § 7157(b)(5) — the
    // verbatim perjury/attestation clause — and § 7157(c) — the executive-
    // authority clause. § 7156(a) removed as unverified in provision_texts.
    statutory_basis: "§ 7157(b)(5), § 7157(c)",
    submission_status: "pending",
    submission_deadline: requiresSubmission ? SUBMISSION_DEADLINE_DEFAULT : "not required",
    ...(url ? { public_privacy_policy_url: url } : {}),
  };
}

export function buildSubmissionSummary(intake: Intake, report: Report): SubmissionSummary {
  const summary = report?.assessment_summary ?? {};
  const cd = extractContentDetail(intake);
  const flat = intake && typeof intake === "object" ? intake : {};
  // Prefer report-derived subsections; fall back to intake-derived when the
  // model output is silent (defensive — the deterministic resolver never
  // fabricates a trigger absent an intake signal).
  const reportSubs = extractTriggeredSubsections(report);
  const triggered = reportSubs.length ? reportSubs : computeIntakeSelectedSubsections(intake);
  const basisBits: string[] = [];
  if (summary?.cybersecurity_audit_required) basisBits.push("§ 7121(a) cybersecurity-audit linkage");
  if (summary?.admt_disclosure_required) basisBits.push("§ 7220 ADMT pre-use notice linkage");
  if (triggered.length) basisBits.push(`triggered subsections: ${triggered.join(", ")}`);
  const slb = clampStr((flat as any).sensitive_location_basis);
  const url = clampStr((flat as any).public_privacy_policy_url || cd.public_privacy_policy_url);
  return {
    assessment_date: clampStr(summary?.assessment_date) || new Date().toISOString().slice(0, 10),
    business_name: clampStr(summary?.company_name) || clampStr(cd.business_name) || clampStr((flat as any).entity_name),
    statutory_framework: STATUTORY_FRAMEWORK,
    triggered_subsections: triggered,
    compliance_deadline: COMPLIANCE_DEADLINE,
    submission_deadline: SUBMISSION_DEADLINE_DEFAULT,
    submission_basis: basisBits.length ? basisBits.join("; ") : "§ 7156 attestation cycle (no triggered activity captured)",
    ...(slb && slb !== NOT_APPLICABLE_SENSITIVE_LOCATION ? { sensitive_location_basis: slb } : {}),
    ...(url ? { public_privacy_policy_url: url } : {}),
  };
}

// CNIL/ISO risk scoring — bumps one level for pre-safeguard when meaningful
// safeguards are on record, otherwise pre == post.
const LIKELIHOOD_ORDER = ["Unlikely", "Possible", "Likely", "Highly likely"];
const SEVERITY_ORDER = ["Minimal", "Moderate", "Significant", "Severe"];

function bumpUp(scale: readonly string[], value: string): string {
  const idx = scale.findIndex((s) => s.toLowerCase() === String(value || "").toLowerCase());
  if (idx < 0) return value;
  return scale[Math.min(scale.length - 1, idx + 1)];
}

function residualRisk(likelihood: string, severity: string): RiskLevel {
  const l = String(likelihood || "").toLowerCase();
  const s = String(severity || "").toLowerCase();
  if (!l || !s) return "Insufficient basis";
  if (s === "severe" || (s === "significant" && (l === "likely" || l === "highly likely"))) return "Critical";
  if (s === "significant" || (s === "moderate" && (l === "likely" || l === "highly likely"))) return "High";
  if (s === "moderate" || l === "likely" || l === "highly likely") return "Moderate";
  return "Low";
}

export function buildRiskRegister(report: Report): RiskRegister {
  const activities: any[] = Array.isArray(report?.risk_assessment_by_activity)
    ? report.risk_assessment_by_activity
    : [];
  const entries: RiskRegisterEntry[] = [];
  let idx = 1;
  for (const act of activities) {
    const adverse: any[] = Array.isArray(act?.adverse_effects) ? act.adverse_effects : [];
    const safeguards = clampStr(act?.current_safeguards);
    const gaps = clampStr(act?.safeguard_gaps);
    const hasMeaningfulSafeguards = safeguards.trim().length > 0 && gaps.trim().length === 0;
    for (const eff of adverse) {
      const post_l = clampStr(eff?.likelihood);
      const post_s = clampStr(eff?.severity);
      // Prefer explicit pre_safeguard_* fields if the model supplied them;
      // otherwise derive using the CNIL bump-up rule.
      const pre_l_raw = clampStr(eff?.pre_safeguard_likelihood);
      const pre_s_raw = clampStr(eff?.pre_safeguard_severity);
      const pre_l = pre_l_raw || (hasMeaningfulSafeguards ? bumpUp(LIKELIHOOD_ORDER, post_l) : post_l);
      const pre_s = pre_s_raw || (hasMeaningfulSafeguards ? bumpUp(SEVERITY_ORDER, post_s) : post_s);
      entries.push({
        id: `RR-${String(idx).padStart(3, "0")}`,
        activity: clampStr(act?.activity),
        harm_type: clampStr(eff?.harm_type),
        likelihood: post_l,
        severity: post_s,
        pre_safeguard_likelihood: pre_l,
        pre_safeguard_severity: pre_s,
        pre_safeguard_residual_risk_level: residualRisk(pre_l, pre_s),
        current_safeguards: safeguards,
        gap_status: gaps.trim().length > 0 ? "open" : (safeguards ? "mitigated" : "unassessed"),
        residual_risk_level: residualRisk(post_l, post_s),
        statutory_basis: clampStr(act?.statutory_basis) || "§ 7152(a)(5)",
      });
      idx += 1;
    }
  }
  return { entries };
}

export interface SlotValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSlots(report: Report): SlotValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ab = report?.attestation_block;
  const ss = report?.submission_summary;
  const rr = report?.risk_register;

  if (!ab || typeof ab !== "object") errors.push("attestation_block missing or non-object");
  else {
    for (const k of ["certifying_executive_name", "certifying_executive_title", "certifying_contact_email", "certification_statement", "statutory_basis", "submission_status", "submission_deadline"]) {
      if (!(k in ab)) errors.push(`attestation_block.${k} missing`);
    }
    if (typeof ab.statutory_basis === "string" && !/715[67]/.test(ab.statutory_basis)) {
      errors.push("attestation_block.statutory_basis does not cite § 7156 or § 7157");
    }
    if (typeof ab.certification_statement === "string" && ab.certification_statement.length < 40) {
      warnings.push("attestation_block.certification_statement is unusually short");
    }
    if (typeof ab.submission_status === "string" && !["pending", "submitted", "not_required"].includes(ab.submission_status)) {
      errors.push("attestation_block.submission_status invalid enum");
    }
  }

  if (!ss || typeof ss !== "object") errors.push("submission_summary missing or non-object");
  else {
    for (const k of ["assessment_date", "business_name", "statutory_framework", "triggered_subsections", "compliance_deadline", "submission_deadline", "submission_basis"]) {
      if (!(k in ss)) errors.push(`submission_summary.${k} missing`);
    }
    if (!Array.isArray(ss.triggered_subsections)) errors.push("submission_summary.triggered_subsections not an array");
    if (typeof ss.statutory_framework === "string" && !/7150.*7157/.test(ss.statutory_framework)) {
      errors.push("submission_summary.statutory_framework missing §§ 7150–7157 anchor");
    }
  }

  if (!rr || typeof rr !== "object") errors.push("risk_register missing or non-object");
  else if (!Array.isArray(rr.entries)) errors.push("risk_register.entries not an array");
  else {
    rr.entries.forEach((e: any, i: number) => {
      for (const k of ["id", "activity", "harm_type", "likelihood", "severity", "pre_safeguard_likelihood", "pre_safeguard_severity", "pre_safeguard_residual_risk_level", "current_safeguards", "gap_status", "residual_risk_level", "statutory_basis"]) {
        if (!(k in e)) errors.push(`risk_register.entries[${i}].${k} missing`);
      }
      if (e && typeof e.gap_status === "string" && !["open", "mitigated", "accepted", "unassessed"].includes(e.gap_status)) {
        errors.push(`risk_register.entries[${i}].gap_status invalid enum`);
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function attachAndValidateSlots(report: Report, intake: Intake): { attached: string[]; validation: SlotValidation } {
  const attached: string[] = [];
  try {
    report.attestation_block = buildAttestationBlock(intake, report);
    attached.push("attestation_block");
  } catch (_) { /* fall through */ }
  try {
    report.submission_summary = buildSubmissionSummary(intake, report);
    attached.push("submission_summary");
  } catch (_) { /* fall through */ }
  try {
    report.risk_register = buildRiskRegister(report);
    attached.push("risk_register");
  } catch (_) { /* fall through */ }
  const validation = validateSlots(report);
  return { attached, validation };
}
