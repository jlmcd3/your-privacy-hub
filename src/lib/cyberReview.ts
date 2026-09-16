/**
 * cyberReview.ts — the "Review your answers" model for the CPPA
 * Cybersecurity Audit Readiness intake (src/pages/CPPACybersecurity.tsx),
 * which has no review screen today.
 *
 * Modeled on src/lib/cppaRiskReview.ts / src/lib/admtReview.ts: the same
 * three answer states (answered; an explicit negative / unsure answer,
 * which is a complete answer; and never answered), the same treatment of
 * blank values as "unanswered" rather than a manufactured negative (a blank
 * evidence checklist is unanswered, never "nothing on file"), and rows that
 * are never filtered out of a section, except the one row that the payload
 * itself only ever populates conditionally (see below).
 *
 * Payload shape (src/pages/CPPACybersecurity.tsx `intake`, ~line 212):
 *   { profile: { ...22 keys }, controls: [{ key, label, maturity, notes,
 *     evidence: string[], na_reason }] × 18 }
 *
 * Four profile keys — consumer_notice_status, agency_notice_status,
 * q1_revenue_threshold_check, q1_revenue_reference_year — are not yet
 * written by the live intake. They are carried here as forward-looking rows
 * (per the register's F06/F07 findings: separate the regulatory incident
 * count from internal severity and split "notified" into a consumer branch
 * and an agency branch; give the revenue answer an explicit reference year
 * and, optionally, a direct threshold question). Absent from an intake
 * object, they render as ordinary "unanswered" rows rather than being
 * dropped, so the review model does not have to change again the day the
 * intake grows them.
 */

export type ReviewState = "answered" | "negative" | "unanswered" | "exhibit";

export interface ReviewRow {
  readonly key: string;
  readonly label: string;
  readonly state: ReviewState;
  /** Rendered text (may be multi-line). Empty for "unanswered". */
  readonly text: string;
  /** Sub-rows for structured objects. Unused by this review (no object-kind profile fields today). */
  readonly items?: readonly { readonly label: string; readonly text: string }[];
}

export interface ReviewSection {
  readonly step: number;
  readonly title: string;
  readonly rows: readonly ReviewRow[];
}

type Kind = "scalar" | "list";
type ProfileGroup = "profile" | "applicability";

interface FieldSpec {
  readonly key: string;
  readonly group: ProfileGroup;
  readonly label: string;
  readonly kind: Kind;
}

const EXHIBIT_SENTINEL_PREFIX = "[See attached Exhibit";

/** Explicit negatives / unknowns the intake treats as complete answers. */
const NEGATIVE_RE = /^(no|none|unsure|not sure|n\/a|none of the above|none on file|not applicable|not yet)\b/i;

function isBlank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function isNegative(v: unknown): boolean {
  if (typeof v === "string") return NEGATIVE_RE.test(v.trim());
  if (typeof v === "boolean") return v === false;
  // An evidence / multi-select list whose only entry is itself a negative
  // (e.g. ["None on file"]) is a complete negative answer, not silence.
  if (Array.isArray(v) && v.length > 0) return v.every((x) => typeof x === "string" && NEGATIVE_RE.test(x.trim()));
  return false;
}

function isExhibitValue(v: unknown): boolean {
  return typeof v === "string" && v.trim().startsWith(EXHIBIT_SENTINEL_PREFIX);
}

function text(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join("; ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => !isBlank(x))
      .map(([k, x]) => `${k}: ${text(x)}`)
      .join("; ");
  }
  return String(v);
}

function stateOf(v: unknown): ReviewState {
  if (isExhibitValue(v)) return "exhibit";
  if (isBlank(v)) return "unanswered";
  if (isNegative(v)) return "negative";
  return "answered";
}

/**
 * Every profile key the page writes (or is expected to write — see the
 * module comment) into the generation payload, in review order. Keep this
 * in step with the `profile` state object in
 * src/pages/CPPACybersecurity.tsx.
 */
export const CYBER_REVIEW_PROFILE_FIELDS: readonly FieldSpec[] = [
  { key: "entity_name", group: "profile", label: "Entity name", kind: "scalar" },
  { key: "industry", group: "profile", label: "Industry sector", kind: "scalar" },
  { key: "incidents_12mo", group: "profile", label: "Reportable security incidents in the last 12 months", kind: "scalar" },
  { key: "incident_notifications", group: "profile", label: "Did any of those incidents require notification to affected consumers or to an agency?", kind: "scalar" },
  // F07 (not yet in the live intake) — the regulatory incident count and the
  // notification follow-up are collected as one combined answer today; the
  // register recommends separating consumer notices actually provided from
  // agency notices legally required or actually made. Label invented.
  { key: "consumer_notice_status", group: "profile", label: "Consumer notification actually provided for a reportable incident", kind: "scalar" },
  { key: "agency_notice_status", group: "profile", label: "Agency notification legally required, or actually made, for a reportable incident", kind: "scalar" },
  { key: "framework", group: "profile", label: "Primary security framework in use", kind: "scalar" },
  { key: "last_audit", group: "profile", label: "Last independent security audit", kind: "scalar" },
  { key: "q1_revenue", group: "applicability", label: "What is your business's annual gross revenue? (§ 1798.140(d)(1)(A))", kind: "scalar" },
  // F06 (not yet in the live intake) — recommends a dated threshold-aware
  // field contract with an explicit reference year, or a direct threshold
  // question, rather than a stored revenue band relabelled against a moving
  // statutory figure. Labels invented.
  { key: "q1_revenue_threshold_check", group: "applicability", label: "Was your business's gross revenue above the CCPA threshold for the stated calendar year?", kind: "scalar" },
  { key: "q1_revenue_reference_year", group: "applicability", label: "Calendar year the stated revenue answer covers", kind: "scalar" },
  { key: "q2_consumers", group: "applicability", label: "How many California consumers' personal information do you process in a year? (§ 7120(b)(2)(A))", kind: "scalar" },
  { key: "q5_sell_share", group: "applicability", label: "Do you sell or share personal information for cross-context behavioural advertising?", kind: "scalar" },
  { key: "q5c_share_revenue_50pct", group: "applicability", label: "Does 50% or more of your annual gross revenue derive from selling or sharing personal information? (§ 1798.140(d)(1)(C) / 11 CCR § 7120(b)(1))", kind: "scalar" },
  { key: "q15_sensitive_pi", group: "applicability", label: "Do you process any sensitive PI?", kind: "scalar" },
  { key: "q15c_spi_volume", group: "applicability", label: "For how many California consumers do you process sensitive personal information annually? (§ 7120(b)(2)(B))", kind: "scalar" },
  { key: "password_auth_used", group: "profile", label: "Does your authentication method include passwords or passphrases? (optional)", kind: "scalar" },
  { key: "in_scope_frameworks", group: "profile", label: "Frameworks in scope for this audit (optional)", kind: "list" },
  { key: "audit_scope_rationale", group: "profile", label: "Audit scope rationale (optional)", kind: "scalar" },
  { key: "auditor_engagement_status", group: "profile", label: "Auditor engagement status (optional)", kind: "scalar" },
  { key: "prior_audit_scope", group: "profile", label: "Prior audit scope (optional)", kind: "scalar" },
  { key: "remediation_owner", group: "profile", label: "Who owns remediation of findings from this audit? (optional)", kind: "scalar" },
];

export const CYBER_REVIEW_PROFILE_KEYS: ReadonlySet<string> = new Set(CYBER_REVIEW_PROFILE_FIELDS.map((f) => f.key));

const CYBER_NOT_APPLICABLE_MATURITY = "Not applicable to our information system";

interface CyberControl {
  readonly key: string;
  readonly label: string;
  readonly maturity: string;
  readonly notes: string;
  readonly evidence: readonly string[];
  readonly na_reason: string;
}

function profileRow(spec: FieldSpec, profile: Record<string, unknown>): ReviewRow {
  const v = profile[spec.key];
  const st = stateOf(v);
  return {
    key: spec.key,
    label: spec.label,
    state: st,
    text: st === "exhibit" ? "Exhibit deferred — to be completed and attached to the report" : text(v),
  };
}

function controlSection(control: CyberControl, index: number): ReviewSection {
  const nn = String(index + 1).padStart(2, "0");
  const rows: ReviewRow[] = [];

  const maturityState = stateOf(control.maturity);
  rows.push({ key: `${control.key}.maturity`, label: "Maturity", state: maturityState, text: text(control.maturity) });

  const notesState = stateOf(control.notes);
  rows.push({
    key: `${control.key}.notes`,
    label: "Notes",
    state: notesState,
    text: notesState === "exhibit" ? "Exhibit deferred — to be completed and attached to the report" : text(control.notes),
  });

  const evidenceState = stateOf(control.evidence);
  rows.push({ key: `${control.key}.evidence`, label: "Evidence available", state: evidenceState, text: text(control.evidence) });

  // The payload only ever carries na_reason alongside the not-applicable
  // maturity (see src/pages/CPPACybersecurity.tsx: `na_reason: maturity ===
  // CYBER_NOT_APPLICABLE_MATURITY ? ... : ""`) — showing it for the other 17
  // components would be 17 permanently "unanswered" rows with no bearing on
  // the finding, so it is included only when the maturity selects it.
  if (control.maturity === CYBER_NOT_APPLICABLE_MATURITY) {
    const naState = stateOf(control.na_reason);
    rows.push({
      key: `${control.key}.na_reason`,
      label: "Why this component does not apply",
      state: naState,
      text: naState === "exhibit" ? "Exhibit deferred — to be completed and attached to the report" : text(control.na_reason),
    });
  }

  return { step: index + 3, title: `${nn} ${control.label}`, rows };
}

export function buildCyberReview(intake: Record<string, unknown>): ReviewSection[] {
  const profile = intake.profile && typeof intake.profile === "object" && !Array.isArray(intake.profile) ? (intake.profile as Record<string, unknown>) : {};
  const controlsRaw = Array.isArray(intake.controls) ? intake.controls : [];
  const controls: CyberControl[] = controlsRaw.map((c) => {
    const cc = (c ?? {}) as Record<string, unknown>;
    return {
      key: typeof cc.key === "string" ? cc.key : "",
      label: typeof cc.label === "string" ? cc.label : "",
      maturity: typeof cc.maturity === "string" ? cc.maturity : "",
      notes: typeof cc.notes === "string" ? cc.notes : "",
      evidence: Array.isArray(cc.evidence) ? (cc.evidence as string[]) : [],
      na_reason: typeof cc.na_reason === "string" ? cc.na_reason : "",
    };
  });

  const profileRows = CYBER_REVIEW_PROFILE_FIELDS.filter((f) => f.group === "profile").map((f) => profileRow(f, profile));
  const applicabilityRows = CYBER_REVIEW_PROFILE_FIELDS.filter((f) => f.group === "applicability").map((f) => profileRow(f, profile));

  const sections: ReviewSection[] = [
    { step: 1, title: "Organization profile", rows: profileRows },
    { step: 2, title: "Audit applicability", rows: applicabilityRows },
    ...controls.map((c, i) => controlSection(c, i)),
  ];
  return sections;
}
