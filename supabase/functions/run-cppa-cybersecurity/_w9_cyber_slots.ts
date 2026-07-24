// TURN 3 (cppa-cyber) — deterministic slot reprojection.
//
// C-A. SoA discipline — 18-component applicability matrix (applicability
//      ruling or justified n/a; silence is never a ruling).
// C-B. ISO 19011 evidence typing — each component names the evidence type(s)
//      supplied via the intake evidence-availability checklist.
// C-C. Scope-justification opener — one block naming the frameworks in scope
//      and any § 7123(f) leverage, before the component matrix.
//
// The generator emits `null` in the three slots; this module stamps final
// values from intake + generated controls. No LLM calls. No fabrication.
// Fail-open on any error.

export const W9_CYBER_SLOTS_STAMP = "w9-cyber-turn3-slots@2026-07-24T10:35:19Z";

// 18-component citation registry (mirrors § 7123(c)(1)..(18)).
const COMPONENT_CITATIONS: Record<string, string> = {
  c1_auth: "11 CCR § 7123(c)(1)",
  c2_encryption: "11 CCR § 7123(c)(2)",
  c3_account_access: "11 CCR § 7123(c)(3)",
  c4_inventory: "11 CCR § 7123(c)(4)",
  c5_secure_config: "11 CCR § 7123(c)(5)",
  c6_vuln_mgmt: "11 CCR § 7123(c)(6)",
  c7_audit_logs: "11 CCR § 7123(c)(7)",
  c8_network_mon: "11 CCR § 7123(c)(8)",
  c9_anti_malware: "11 CCR § 7123(c)(9)",
  c10_segmentation: "11 CCR § 7123(c)(10)",
  c11_port_protocol: "11 CCR § 7123(c)(11)",
  c12_awareness: "11 CCR § 7123(c)(12)",
  c13_training: "11 CCR § 7123(c)(13)",
  c14_secure_dev: "11 CCR § 7123(c)(14)",
  c15_third_party: "11 CCR § 7123(c)(15)",
  c16_retention: "11 CCR § 7123(c)(16)",
  c17_incident: "11 CCR § 7123(c)(17)",
  c18_continuity: "11 CCR § 7123(c)(18)",
};

export type ComponentApplicability = "applicable" | "n/a" | "insufficient_basis";

export interface ComponentMatrixRow {
  key: string;
  label: string;
  citation: string;
  applicability: ComponentApplicability;
  maturity: string;
  evidence_types: string[];
  evidence_present: boolean;
  justification: string;
}

export interface ScopeJustification {
  primary_framework: string;
  in_scope_frameworks: string[];
  audit_scope_rationale: string;
  leveraging_prior_audit: boolean;
  leveraging_authorized: "yes" | "no" | "insufficient_basis";
  leverage_note: string;
  authorities: Array<{ citation: string; subsection: string }>;
}

export interface TopAction {
  text: string;
  owner: string;
  trigger: string;
  citation: string;
}

export interface SlotValidation { ok: boolean; errors: string[]; warnings: string[]; }

const NA_TOKENS = /^(n\/?a|not applicable|does not apply)$/i;

function toArrayOfString(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

// ---------- C-A + C-B : COMPONENT MATRIX --------------------------------
export function buildComponentMatrix(intake: any, report: any): ComponentMatrixRow[] {
  const intakeControls: any[] = Array.isArray(intake?.controls) ? intake.controls : [];
  const reportControls: any[] = Array.isArray(report?.controls) ? report.controls : [];
  const byKeyIntake = new Map<string, any>();
  for (const c of intakeControls) if (c && typeof c.key === "string") byKeyIntake.set(c.key, c);
  const byLabelReport = new Map<string, any>();
  for (const c of reportControls) if (c) byLabelReport.set(String(c.control ?? "").trim().toLowerCase(), c);

  const rows: ComponentMatrixRow[] = [];
  const keys = Object.keys(COMPONENT_CITATIONS);
  for (const key of keys) {
    const ic = byKeyIntake.get(key) || {};
    const label: string = String(ic.label || key);
    const maturity: string = String(ic.maturity || "").trim();
    const evidence_types = toArrayOfString(ic.evidence);
    const notes: string = String(ic.notes || "").trim();
    const rc = byLabelReport.get(label.toLowerCase()) || {};
    const rcStatus: string = String(rc.status ?? "").trim();

    let applicability: ComponentApplicability;
    if (NA_TOKENS.test(maturity) || NA_TOKENS.test(notes)) applicability = "n/a";
    else if (!maturity) applicability = "insufficient_basis";
    else applicability = "applicable";

    const evidence_present = evidence_types.length > 0 && !evidence_types.includes("None on file");

    let justification: string;
    if (applicability === "n/a") {
      justification = "Marked not applicable in the intake; the auditor still records the justification in the audit report per § 7123(b)(2).";
    } else if (applicability === "insufficient_basis") {
      justification = "Maturity was not supplied; treated as insufficient basis pending completion of the intake for this component.";
    } else if (!evidence_present) {
      justification = `Maturity supplied ("${maturity}") but no evidence type is on file; ISO 19011 evidence typing is required before the auditor can rely on the maturity claim.`;
    } else {
      justification = `Maturity "${maturity}" supported by ${evidence_types.length} evidence type(s): ${evidence_types.join(", ")}.`;
    }

    rows.push({
      key,
      label,
      citation: COMPONENT_CITATIONS[key],
      applicability,
      maturity: maturity || "",
      evidence_types,
      evidence_present,
      justification: rcStatus && applicability === "applicable" ? `${justification} Assessed status: ${rcStatus}.` : justification,
    });
  }
  return rows;
}

// ---------- C-C : SCOPE JUSTIFICATION -----------------------------------
export function buildScopeJustification(intake: any, _report: any): ScopeJustification {
  const profile: any = intake?.profile || {};
  const primary: string = String(profile.framework || "").trim();
  const inScope: string[] = toArrayOfString(profile.in_scope_frameworks);
  const rationale: string = String(profile.audit_scope_rationale || "").trim();
  const leveraging = inScope.length > 0 && inScope.some((f) => f !== primary && f !== "None / informal");

  let leveraging_authorized: ScopeJustification["leveraging_authorized"] = "insufficient_basis";
  let leverage_note: string;
  if (!leveraging) {
    leveraging_authorized = "no";
    leverage_note = "No prior framework leveraged; the audit will be built de novo against the § 7123(c) components.";
  } else if (rationale.length >= 40) {
    leveraging_authorized = "yes";
    leverage_note = `Frameworks in scope for leverage under § 7123(f): ${inScope.join(", ")}. Supplementation rationale on file. § 7123(f) permits leveraging a prior audit if all Article 9 elements are met, alone or with supplementation.`;
  } else {
    leverage_note = `Frameworks proposed for leverage (${inScope.join(", ")}) require a documented supplementation rationale under § 7123(f); the intake's rationale is missing or too brief to evaluate.`;
  }

  return {
    primary_framework: primary || "(not specified)",
    in_scope_frameworks: inScope,
    audit_scope_rationale: rationale,
    leveraging_prior_audit: leveraging,
    leveraging_authorized,
    leverage_note,
    authorities: [
      { citation: "11 CCR § 7122", subsection: "(a) — auditor qualifications & independence" },
      { citation: "11 CCR § 7123", subsection: "(b) — audit scope; (f) — leveraging prior audits" },
    ],
  };
}

// ---------- TOP-3 ACTIONS ------------------------------------------------
export function buildTopThreeActions(matrix: ComponentMatrixRow[], report: any): TopAction[] {
  const severityRank = (r: ComponentMatrixRow): number => {
    if (r.applicability === "applicable" && !r.evidence_present) return 0; // worst
    if (r.applicability === "insufficient_basis") return 1;
    if (r.applicability === "applicable" && /partial|ad hoc|not implemented/i.test(r.maturity)) return 2;
    return 5;
  };
  const ranked = [...matrix]
    .filter((r) => severityRank(r) < 5)
    .sort((a, b) => severityRank(a) - severityRank(b));

  const out: TopAction[] = [];
  for (const r of ranked.slice(0, 3)) {
    let text: string;
    let trigger: string;
    if (r.applicability === "applicable" && !r.evidence_present) {
      text = `Attach at least one evidence artefact (policy, runbook, config export, sample log, or SOC 2 letter) for the ${r.label} component so the auditor can test the claimed maturity.`;
      trigger = "Before the next audit fieldwork window.";
    } else if (r.applicability === "insufficient_basis") {
      text = `Complete the intake for the ${r.label} component (maturity + evidence type) so the auditor can rule on applicability under § 7123(b)(2).`;
      trigger = "Before the next audit scoping meeting.";
    } else {
      text = `Advance the ${r.label} component beyond ${r.maturity}: document the remaining implementation steps and evidence collection plan.`;
      trigger = "Within the current audit cycle.";
    }
    out.push({ text, owner: "CISO / cybersecurity audit lead", trigger, citation: r.citation });
  }
  // Backfill from existing report.next_steps if we do not have three.
  if (out.length < 3) {
    const ns: any[] = Array.isArray(report?.next_steps) ? report.next_steps : [];
    for (const n of ns) {
      if (out.length >= 3) break;
      const text = typeof n === "string" ? n : String(n?.text ?? n?.action ?? "");
      if (!text) continue;
      out.push({
        text,
        owner: String(n?.owner ?? "CISO / cybersecurity audit lead"),
        trigger: String(n?.trigger ?? "Within the current audit cycle."),
        citation: "11 CCR § 7123",
      });
    }
  }
  return out;
}

// ---------- Validator ---------------------------------------------------
export function validateCyberSlots(report: any): SlotValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cm = report?.component_matrix;
  if (!Array.isArray(cm)) errors.push("component_matrix missing");
  else if (cm.length !== 18) errors.push(`component_matrix must have 18 rows, got ${cm.length}`);
  const sj = report?.scope_justification;
  if (!sj || typeof sj !== "object") errors.push("scope_justification missing");
  else if (!["yes", "no", "insufficient_basis"].includes(sj.leveraging_authorized)) {
    errors.push(`scope_justification.leveraging_authorized invalid: ${sj.leveraging_authorized}`);
  }
  const tt = report?.top_3_actions;
  if (!Array.isArray(tt)) errors.push("top_3_actions missing");
  else if (tt.length === 0) warnings.push("top_3_actions empty");
  else if (tt.length > 3) errors.push(`top_3_actions must be ≤ 3, got ${tt.length}`);
  return { ok: errors.length === 0, errors, warnings };
}

// ---------- Attach entrypoint ------------------------------------------
export function attachAndValidateCyberSlots(report: any, intake: any): {
  attached: string[]; validation: SlotValidation;
} {
  const attached: string[] = [];
  let matrix: ComponentMatrixRow[] = [];
  try { matrix = buildComponentMatrix(intake, report); report.component_matrix = matrix; attached.push("component_matrix"); } catch (_) { /* noop */ }
  try { report.scope_justification = buildScopeJustification(intake, report); attached.push("scope_justification"); } catch (_) { /* noop */ }
  try { report.top_3_actions = buildTopThreeActions(matrix, report); attached.push("top_3_actions"); } catch (_) { /* noop */ }
  return { attached, validation: validateCyberSlots(report) };
}
