// W9-RISK-SLOTS — TURN 1a of CPPA-STANDARD-SETTER TURN 1.
// Builds three deterministic typed slots and pre-emit validates them.
// Slots derive from EXISTING intake fields (i7/i8 attestation identity;
// assessment_summary + priority_actions for submission_summary; the
// risk_assessment_by_activity.adverse_effects fan for the risk_register).
// No new intake surface is introduced here (see TURN 1b for intake changes).

export const W9_RISK_SLOTS_STAMP = "w9-risk-slots@2026-07-24T10:00:00Z";

export interface AttestationBlock {
  certifying_executive_name: string;
  certifying_executive_title: string;
  certifying_contact_email: string;
  certification_statement: string;
  statutory_basis: string;
  submission_status: "pending" | "submitted" | "not_required";
  submission_deadline: string;
}

export interface SubmissionSummary {
  assessment_date: string;
  business_name: string;
  statutory_framework: string;
  triggered_subsections: string[];
  compliance_deadline: string;
  submission_deadline: string;
  submission_basis: string;
}

export interface RiskRegisterEntry {
  id: string;
  activity: string;
  harm_type: string;
  likelihood: string;
  severity: string;
  current_safeguards: string;
  gap_status: "open" | "mitigated" | "accepted" | "unassessed";
  residual_risk_level: "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis";
  statutory_basis: string;
}

export interface RiskRegister {
  entries: RiskRegisterEntry[];
}

type Report = Record<string, any>;
type Intake = Record<string, any>;

const clampStr = (v: unknown): string => (typeof v === "string" ? v : "");

// § 7156 default certification statement — never a place-holder narrative;
// keeps prose fixed so goldens can lock the statutory language verbatim.
const CERTIFICATION_STATEMENT =
  "I certify, under penalty of perjury under the laws of the State of California, that I have reviewed this risk assessment and that its content satisfies the § 7152 required content elements and § 7154 balancing requirement, and that the safeguards described are those the business has implemented or has committed to implement.";

const STATUTORY_FRAMEWORK = "Cal. Code Regs. tit. 11, §§ 7150–7157";
const COMPLIANCE_DEADLINE = "December 31, 2027";
// § 7156(c) — attestation is submitted with the annual submission window
// (April 1 following the completed assessment). Frozen here for goldens.
const SUBMISSION_DEADLINE_DEFAULT = "April 1, 2028";

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
    // Extract § 7150(b)(N) style anchors; fall back to whole basis string.
    const m = raw.match(/§\s*7150\(b\)\(\d+\)(?:\([A-Za-z0-9]+\))?/g);
    const items = m && m.length ? m : [raw];
    for (const it of items) {
      if (!seen.has(it)) { seen.add(it); out.push(it); }
    }
  }
  return out;
}

export function buildAttestationBlock(intake: Intake, report: Report): AttestationBlock {
  const cd = extractContentDetail(intake);
  const summary = report?.assessment_summary ?? {};
  const requiresSubmission =
    Boolean(summary?.cybersecurity_audit_required) ||
    Boolean(summary?.admt_disclosure_required) ||
    (Array.isArray(summary?.triggered_activities) && summary.triggered_activities.length > 0);
  return {
    certifying_executive_name: clampStr(cd.certifying_exec_name),
    certifying_executive_title: clampStr(cd.certifying_exec_title),
    certifying_contact_email: clampStr(cd.certifying_contact_email),
    certification_statement: CERTIFICATION_STATEMENT,
    statutory_basis: "§ 7156(a)",
    submission_status: "pending",
    submission_deadline: requiresSubmission ? SUBMISSION_DEADLINE_DEFAULT : "not required",
  };
}

export function buildSubmissionSummary(intake: Intake, report: Report): SubmissionSummary {
  const summary = report?.assessment_summary ?? {};
  const cd = extractContentDetail(intake);
  const triggered = extractTriggeredSubsections(report);
  const basisBits: string[] = [];
  if (summary?.cybersecurity_audit_required) basisBits.push("§ 7121(a) cybersecurity-audit linkage");
  if (summary?.admt_disclosure_required) basisBits.push("§ 7220 ADMT pre-use notice linkage");
  if (triggered.length) basisBits.push(`triggered subsections: ${triggered.join(", ")}`);
  return {
    assessment_date: clampStr(summary?.assessment_date) || new Date().toISOString().slice(0, 10),
    business_name: clampStr(summary?.company_name) || clampStr(cd.business_name),
    statutory_framework: STATUTORY_FRAMEWORK,
    triggered_subsections: triggered,
    compliance_deadline: COMPLIANCE_DEADLINE,
    submission_deadline: SUBMISSION_DEADLINE_DEFAULT,
    submission_basis: basisBits.length ? basisBits.join("; ") : "§ 7156 attestation cycle (no triggered activity captured)",
  };
}

function residualRisk(likelihood: string, severity: string): RiskRegisterEntry["residual_risk_level"] {
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
    for (const eff of adverse) {
      entries.push({
        id: `RR-${String(idx).padStart(3, "0")}`,
        activity: clampStr(act?.activity),
        harm_type: clampStr(eff?.harm_type),
        likelihood: clampStr(eff?.likelihood),
        severity: clampStr(eff?.severity),
        current_safeguards: safeguards,
        gap_status: gaps.trim().length > 0 ? "open" : (safeguards ? "mitigated" : "unassessed"),
        residual_risk_level: residualRisk(clampStr(eff?.likelihood), clampStr(eff?.severity)),
        statutory_basis: clampStr(act?.statutory_basis) || "§ 7152(a)(5)",
      });
      idx += 1;
    }
  }
  return { entries };
}

// ---------------------------------------------------------------------------
// Pre-emit validator. Returns { ok, errors[] }. Never mutates the report.
// Errors are hard defects; caller decides whether to abort or annotate.
// ---------------------------------------------------------------------------
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

  // attestation_block (R-A): every required key present; statutory_basis mentions § 7156.
  if (!ab || typeof ab !== "object") errors.push("attestation_block missing or non-object");
  else {
    for (const k of ["certifying_executive_name", "certifying_executive_title", "certifying_contact_email", "certification_statement", "statutory_basis", "submission_status", "submission_deadline"]) {
      if (!(k in ab)) errors.push(`attestation_block.${k} missing`);
    }
    if (typeof ab.statutory_basis === "string" && !/7156/.test(ab.statutory_basis)) {
      errors.push("attestation_block.statutory_basis does not cite § 7156");
    }
    if (typeof ab.certification_statement === "string" && ab.certification_statement.length < 40) {
      warnings.push("attestation_block.certification_statement is unusually short");
    }
    if (typeof ab.submission_status === "string" && !["pending", "submitted", "not_required"].includes(ab.submission_status)) {
      errors.push("attestation_block.submission_status invalid enum");
    }
  }

  // submission_summary (R-B): required keys; triggered_subsections is array; framework anchor present.
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

  // risk_register (R-C): entries is an array; every row carries the hard keys.
  if (!rr || typeof rr !== "object") errors.push("risk_register missing or non-object");
  else if (!Array.isArray(rr.entries)) errors.push("risk_register.entries not an array");
  else {
    rr.entries.forEach((e: any, i: number) => {
      for (const k of ["id", "activity", "harm_type", "likelihood", "severity", "current_safeguards", "gap_status", "residual_risk_level", "statutory_basis"]) {
        if (!(k in e)) errors.push(`risk_register.entries[${i}].${k} missing`);
      }
      if (e && typeof e.gap_status === "string" && !["open", "mitigated", "accepted", "unassessed"].includes(e.gap_status)) {
        errors.push(`risk_register.entries[${i}].gap_status invalid enum`);
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Convenience — build all three, attach to report, then validate. Returns
// { attached: string[], validation }. Never throws.
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
