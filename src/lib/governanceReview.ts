/**
 * governanceReview.ts — GDPR Accountability (governance) assessment master
 * review: the read-only review of every active answer, built from the SAME
 * payload the page submits (GovernanceAssessment.tsx buildIntake), so
 * nothing the customer answered is omitted from what they confirm before
 * paying. Rows carry a state so the review can say "Not answered" and list
 * unresolved items instead of skipping blanks.
 *
 * Pure module (no React). Keys are the payload keys buildIntake() emits.
 * Modelled directly on the sibling module src/lib/liaReview.ts — same
 * shapes, same helper semantics.
 *
 * "n/a" handling: several fields are set to the literal string "n/a" by
 * buildIntake when their parent branch is not selected (e.g.
 * privacy_notice_coverage when privacy_policy doesn't start with "Yes").
 * A stored "n/a" on those fields means the branch was never shown, not that
 * the customer answered "n/a" — so it is treated as INACTIVE, never as a
 * negative or an answer.
 */

export type GovernanceReviewState = "answered" | "negative" | "unanswered" | "inactive";

export interface GovernanceReviewRow {
  readonly key: string;
  readonly label: string;
  readonly state: GovernanceReviewState;
  readonly text: string;
}

export interface GovernanceReviewSection {
  readonly id: "scope" | "data" | "governance" | "measures" | "processors" | "context";
  readonly title: string;
  readonly rows: readonly GovernanceReviewRow[];
}

interface Spec {
  readonly key: string;
  readonly section: GovernanceReviewSection["id"];
  readonly label: string;
  /** When present, the row is INACTIVE (branch not selected) unless this returns true. */
  readonly activeWhen?: (intake: Record<string, unknown>) => boolean;
}

// Deliberately excludes "n/a" — a stored "n/a" is a branch-not-selected
// sentinel handled by activeWhen/notNA, never an honest negative answer.
const NEGATIVE_RE = /^(no|none|not|unknown|unsure|uncertain|never)\b/i;

function get(intake: Record<string, unknown>, key: string): unknown {
  let cur: unknown = intake;
  for (const seg of key.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function blank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "boolean") return false;
  return false;
}

function text(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join("; ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v ?? "");
}

const has = (key: string, value: string) => (i: Record<string, unknown>) => {
  const v = get(i, key);
  return Array.isArray(v) ? v.includes(value) : v === value;
};

const startsWith = (key: string, prefix: string) => (i: Record<string, unknown>) => {
  const v = get(i, key);
  return typeof v === "string" && v.startsWith(prefix);
};

/** True unless the field carries the branch-not-selected sentinel "n/a". */
const notNA = (key: string) => (i: Record<string, unknown>) => get(i, key) !== "n/a";

/** True once the gating field has a real answer — not blank, not "n/a". */
const answeredGate = (key: string) => (i: Record<string, unknown>) => {
  const v = get(i, key);
  return v !== "n/a" && v !== "";
};

const or = (...fns: Array<(i: Record<string, unknown>) => boolean>) => (i: Record<string, unknown>) =>
  fns.some((fn) => fn(i));

/**
 * Keys deliberately not reviewed as their own row, with the reason. Kept as
 * an explicit set (rather than a silent omission) so a test can assert the
 * exemption is intentional and not a missed key.
 *
 * - remediation_defaults: a nested aggregate object buildIntake sends
 *   alongside the four flat remediation_default_* keys (accountable_owner,
 *   target_date, priority, validation_method) purely for the deliverables
 *   builder's convenience. Those four values are already reviewed via their
 *   flat keys, so reviewing the nested object too would duplicate every row.
 */
export const GOVERNANCE_REVIEW_SKIPPED_KEYS: ReadonlySet<string> = new Set(["remediation_defaults"]);

export const GOVERNANCE_REVIEW_FIELDS: readonly Spec[] = [
  // Step 1 — Scope and footprint
  { key: "organization_name", section: "scope", label: "Organisation being assessed" },
  { key: "sector", section: "scope", label: "Primary sector" },
  { key: "sector_other", section: "scope", label: "Other sector, described", activeWhen: has("sector", "Other") },
  { key: "org_size", section: "scope", label: "Number of employees" },
  { key: "jurisdictions", section: "scope", label: "Jurisdictions where you operate or process personal data" },
  { key: "jurisdictions_other", section: "scope", label: "Other jurisdiction, described", activeWhen: has("jurisdictions", "Other") },
  { key: "eu_uk_data", section: "scope", label: "Do you process personal data of EU or UK residents?" },
  { key: "territorial_scope_basis", section: "scope", label: "Basis for territorial scope (Art. 3 GDPR)" },
  { key: "tools", section: "scope", label: "Technology tools that process personal data" },

  // Step 2 — Data and processing profile
  { key: "data_categories", section: "data", label: "Categories of personal data processed" },
  { key: "data_categories_other", section: "data", label: "Other data category, described", activeWhen: has("data_categories", "Other") },
  { key: "special_category", section: "data", label: "Do you process health, biometric, or other special category data?" },
  { key: "special_categories_list", section: "data", label: "Which special categories apply?", activeWhen: has("special_category", "Yes") },
  { key: "sc_core_activity", section: "data", label: "Is processing this special-category data a primary activity, or inextricably connected with delivering your principal products or services? (Art. 37(1)(c))", activeWhen: notNA("sc_core_activity") },
  { key: "sc_core_activity_explanation", section: "data", label: "What the activity is and why it is primary or ancillary", activeWhen: has("special_category", "Yes") },
  { key: "sc_data_subjects_count", section: "data", label: "Approximate number of individuals whose special-category data is processed in a year", activeWhen: has("special_category", "Yes") },
  { key: "sc_population_proportion", section: "data", label: "Is that a significant proportion of the relevant population?", activeWhen: notNA("sc_population_proportion") },
  { key: "sc_data_volume", section: "data", label: "Volume and range of special-category data involved", activeWhen: has("special_category", "Yes") },
  { key: "sc_duration", section: "data", label: "How long does the processing run?", activeWhen: notNA("sc_duration") },
  { key: "sc_geographic_scope", section: "data", label: "Geographical scope of the processing", activeWhen: notNA("sc_geographic_scope") },

  // Step 3 — Governance infrastructure
  { key: "privacy_policy", section: "governance", label: "Documented privacy policy or notice" },
  { key: "privacy_notice_coverage", section: "governance", label: "Does your published notice describe all current processing, recipients, international transfers, retention periods, and rights?", activeWhen: notNA("privacy_notice_coverage") },
  { key: "dpo_status", section: "governance", label: "Is a data protection officer or equivalent designated?", activeWhen: notNA("dpo_status") },
  { key: "dpia_status", section: "governance", label: "Has any data protection impact assessment been conducted?" },
  { key: "dpia_ai_coverage", section: "governance", label: "Do those assessments cover your current AI and high-risk tools?", activeWhen: notNA("dpia_ai_coverage") },
  { key: "incident_response", section: "governance", label: "Incident response plan covering personal data breaches" },
  { key: "dsr_capability", section: "governance", label: "If someone asked for their data, could you find it, hand it over, or delete it — including data your vendors hold?" },
  { key: "dsr_rights_tested", section: "governance", label: "Which rights have you tested end-to-end?", activeWhen: has("dsr_capability", "Yes — documented and tested across all vendors") },
  { key: "inventory_audit", section: "governance", label: "Is your tool and processing inventory audited for unauthorised tools, with an approval route for new ones?" },
  { key: "retention_schedule_status", section: "governance", label: "Are retention periods documented for each category of personal data? (Art. 30(1)(f))" },

  // Step 4 — Measures, training and remediation
  { key: "training_status", section: "measures", label: "Privacy and data protection training" },
  { key: "training_ai_coverage", section: "measures", label: "Does training cover prohibited use of AI tools and data-submission risk?", activeWhen: notNA("training_ai_coverage") },
  { key: "tool_instruction", section: "measures", label: "Instruction on what data may and may not be submitted to external technology tools" },
  { key: "technical_controls", section: "measures", label: "Do technical controls, not only policy, stop prohibited personal data reaching your AI and cloud tools?" },
  { key: "technical_controls_list", section: "measures", label: "Which controls are in place?", activeWhen: or(has("technical_controls", "Yes — DLP/content filtering actively enforced"), startsWith("technical_controls", "Partial")) },
  { key: "measures_review_cadence", section: "measures", label: "How often is the set of technical and organisational measures reviewed? (Art. 24(1))" },
  { key: "measures_last_review_date", section: "measures", label: "Date the measures were last reviewed" },
  { key: "processing_nature", section: "measures", label: "Nature of the processing (Art. 24(1))" },
  { key: "processing_scope", section: "measures", label: "Scope of the processing" },
  { key: "processing_context", section: "measures", label: "Context of the processing" },
  { key: "processing_purposes", section: "measures", label: "Purposes of the processing" },
  { key: "remediation_default_owner", section: "measures", label: "Who is accountable for remediation?" },
  { key: "remediation_default_target_date", section: "measures", label: "Default target date for remediation" },
  { key: "remediation_default_priority", section: "measures", label: "Default remediation priority" },
  { key: "remediation_default_validation_method", section: "measures", label: "How will remediation be validated?" },

  // Step 5 — Processors and international transfers
  { key: "dpa_status", section: "processors", label: "Data processing agreements signed with relevant vendors (Art. 28(3))", activeWhen: notNA("dpa_status") },
  { key: "dpa_art28_verified", section: "processors", label: "Have those agreements been verified against the Art. 28(3) mandatory clauses?", activeWhen: notNA("dpa_art28_verified") },
  { key: "processor_count", section: "processors", label: "Number of processors/vendors in scope", activeWhen: answeredGate("dpa_status") },
  { key: "uncovered_vendors", section: "processors", label: "Vendors without a signed data processing agreement", activeWhen: answeredGate("dpa_status") },
  { key: "transfer_status", section: "processors", label: "Cross-border transfers outside the EU or UK", activeWhen: notNA("transfer_status") },
  { key: "transfer_mechanism", section: "processors", label: "Which transfer mechanism is in place for those transfers?", activeWhen: notNA("transfer_mechanism") },
  { key: "transfer_routes", section: "processors", label: "Cross-border transfer routes and destination countries", activeWhen: answeredGate("transfer_status") },

  // Additional context
  { key: "additional_context", section: "context", label: "Anything material to your privacy programme not captured above" },
];

const TITLES: Record<GovernanceReviewSection["id"], string> = {
  scope: "Step 1 — Scope and footprint",
  data: "Step 2 — Data and processing profile",
  governance: "Step 3 — Governance infrastructure",
  measures: "Step 4 — Measures, training and remediation",
  processors: "Step 5 — Processors and international transfers",
  context: "Additional context",
};

export function buildGovernanceReview(intake: Record<string, unknown>): GovernanceReviewSection[] {
  const bySection = new Map<GovernanceReviewSection["id"], GovernanceReviewRow[]>();
  for (const spec of GOVERNANCE_REVIEW_FIELDS) {
    const v = get(intake, spec.key);
    const active = spec.activeWhen ? spec.activeWhen(intake) : true;
    let state: GovernanceReviewState;
    if (!active) state = "inactive";
    else if (blank(v)) state = "unanswered";
    else if (typeof v === "string" && NEGATIVE_RE.test(v.trim())) state = "negative";
    else state = "answered";
    const row: GovernanceReviewRow = { key: spec.key, label: spec.label, state, text: state === "unanswered" || state === "inactive" ? "" : text(v) };
    if (!bySection.has(spec.section)) bySection.set(spec.section, []);
    bySection.get(spec.section)!.push(row);
  }
  return (Object.keys(TITLES) as GovernanceReviewSection["id"][])
    .filter((id) => bySection.has(id))
    .map((id) => ({ id, title: TITLES[id], rows: bySection.get(id)! }));
}

/** Every payload key the review knows. */
export const GOVERNANCE_REVIEW_KEYS: ReadonlySet<string> = new Set(GOVERNANCE_REVIEW_FIELDS.map((f) => f.key));

/** Unanswered rows on the active path — the "unresolved items" the review lists. */
export function governanceUnresolvedRows(sections: readonly GovernanceReviewSection[]): GovernanceReviewRow[] {
  return sections.flatMap((s) => s.rows.filter((r) => r.state === "unanswered"));
}
