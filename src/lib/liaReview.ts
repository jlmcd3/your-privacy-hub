/**
 * liaReview.ts — LIA master review (2026-09-15, F22): the read-only review
 * of every active answer, built from the SAME payload the page submits, so
 * nothing the customer answered is omitted from what they confirm before
 * paying. Rows carry a state so the review can say "Not answered" and list
 * unresolved items instead of skipping blanks.
 *
 * Pure module (no React). Keys are the payload keys of
 * liAssessmentStageBContract (dotted for nested groups).
 */

export type LiaReviewState = "answered" | "negative" | "unanswered" | "inactive";

export interface LiaReviewRow {
  readonly key: string;
  readonly label: string;
  readonly state: LiaReviewState;
  readonly text: string;
}

export interface LiaReviewSection {
  readonly id: "screening" | "purpose" | "necessity" | "balancing" | "attestation";
  readonly title: string;
  readonly rows: readonly LiaReviewRow[];
}

interface Spec {
  readonly key: string;
  readonly section: LiaReviewSection["id"];
  readonly label: string;
  /** When present, the row is INACTIVE (branch not selected) unless this returns true. */
  readonly activeWhen?: (intake: Record<string, unknown>) => boolean;
}

const NEGATIVE_RE = /^(no\b|none\b|not (yet )?(assessed|known|applicable|sure|drafted)|unknown|n\/a|none identified|no opt-out)/i;

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

const pd = (k: string) => `purpose_details.${k}`;
const nd = (k: string) => `necessity_details.${k}`;
const bd = (k: string) => `balancing_details.${k}`;
const at = (k: string) => `attestation.${k}`;

const has = (key: string, value: string) => (i: Record<string, unknown>) => {
  const v = get(i, key);
  return Array.isArray(v) ? v.includes(value) : v === value;
};
const nonNull = (key: string) => (i: Record<string, unknown>) => get(i, key) !== null && get(i, key) !== undefined;

export const LIA_REVIEW_FIELDS: readonly Spec[] = [
  // Screening (Stage A, re-sent)
  { key: "organization_name", section: "screening", label: "Organisation being assessed" },
  { key: "subject_anchor", section: "screening", label: "What this assessment covers" },
  { key: "processing_description", section: "screening", label: "Processing described" },
  { key: "use_case_code_confirmed", section: "screening", label: "Use case confirmed at screening (in place of the detected one)" },
  { key: "data_categories", section: "screening", label: "Data categories" },
  { key: "relationship_type", section: "screening", label: "Relationship with data subjects (screening)" },
  { key: "jurisdictions", section: "screening", label: "Jurisdictions" },
  // Purpose
  { key: pd("interest_holder"), section: "purpose", label: "Whose interest is served" },
  { key: pd("interest_holder_other"), section: "purpose", label: "Other interest holder", activeWhen: has(pd("interest_holder"), "Other (describe below)") },
  { key: pd("interest_type"), section: "purpose", label: "Type of interest" },
  { key: pd("interest_type_other"), section: "purpose", label: "Other interest type", activeWhen: has(pd("interest_type"), "Other (describe below)") },
  { key: pd("interest_statement"), section: "purpose", label: "The legitimate interest, in your words" },
  { key: pd("controller_is_public_authority"), section: "purpose", label: "Public authority?" },
  { key: pd("public_task_processing"), section: "purpose", label: "Processing in performance of public tasks?", activeWhen: has(pd("controller_is_public_authority"), "Yes") },
  { key: pd("device_access"), section: "purpose", label: "Stores or reads information on people's devices?" },
  { key: pd("device_access_strictly_necessary"), section: "purpose", label: "Device access limited to what is strictly necessary?", activeWhen: has(pd("device_access"), "Yes") },
  { key: "stated_purpose", section: "purpose", label: "Purpose as stated to data subjects" },
  { key: pd("stated_purpose_status"), section: "purpose", label: "Status of that wording (published / proposed / not drafted)" },
  { key: pd("specific_benefit"), section: "purpose", label: "Specific benefit" },
  { key: pd("beneficiary"), section: "purpose", label: "Who receives the benefit" },
  { key: pd("marketing_channels"), section: "purpose", label: "Direct-marketing channels", activeWhen: nonNull(pd("marketing_channels")) },
  { key: pd("marketing_consent_basis"), section: "purpose", label: "Permission for e-mail or SMS marketing", activeWhen: nonNull(pd("marketing_consent_basis")) },
  { key: bd("statutory_restrictions"), section: "purpose", label: "Sector or jurisdiction-specific restrictions", activeWhen: nonNull(bd("statutory_restrictions")) },
  // Necessity
  { key: nd("alternatives"), section: "necessity", label: "Alternatives considered" },
  { key: nd("alternatives_rationale"), section: "necessity", label: "What each alternative delivers and where it falls short" },
  { key: nd("achievable_without_personal_data"), section: "necessity", label: "Achievable without personal data?" },
  { key: nd("achievable_without_personal_data_rationale"), section: "necessity", label: "Why personal data is required", activeWhen: has(nd("achievable_without_personal_data"), "No — personal data is required (explain why below)") },
  { key: nd("why_consent_not_used"), section: "necessity", label: "Bases considered and why this one fits" },
  { key: nd("data_minimised"), section: "necessity", label: "How the data was minimised" },
  { key: nd("pseudonymisation_options"), section: "necessity", label: "Pseudonymisation or aggregation", activeWhen: nonNull(nd("pseudonymisation_options")) },
  // Balancing
  { key: bd("art9_condition"), section: "balancing", label: "Article 9(2) condition", activeWhen: nonNull(bd("art9_condition")) },
  { key: bd("biometric_unique_identification"), section: "balancing", label: "Biometric data used to uniquely identify individuals?", activeWhen: (i) => !blank(get(i, bd("biometric_unique_identification"))) || (Array.isArray(get(i, "data_categories")) && (get(i, "data_categories") as string[]).includes("Biometric data")) },
  { key: bd("special_category_data"), section: "balancing", label: "Special-category data (as classified from your answers)" },
  { key: bd("relationship_category"), section: "balancing", label: "Relationship with these individuals" },
  { key: bd("reasonable_expectation"), section: "balancing", label: "Would data subjects reasonably expect this?" },
  { key: bd("reasonable_expectation_detail"), section: "balancing", label: "Reasoning behind that answer" },
  { key: bd("collection_context"), section: "balancing", label: "When and in what setting the data was collected" },
  { key: bd("children_data_subjects"), section: "balancing", label: "Are any data subjects children?" },
  { key: bd("children_age_band"), section: "balancing", label: "Children's age range", activeWhen: has(bd("children_data_subjects"), "Yes") },
  { key: bd("vulnerable_subjects"), section: "balancing", label: "Vulnerable groups" },
  { key: bd("vulnerable_subjects_other"), section: "balancing", label: "Other vulnerable group", activeWhen: has(bd("vulnerable_subjects"), "Other") },
  { key: bd("potential_harm"), section: "balancing", label: "Worst-case impact" },
  { key: bd("potential_harm_detail"), section: "balancing", label: "Harms considered and who bears them" },
  { key: bd("scale_approx"), section: "balancing", label: "Approximate number of people" },
  { key: bd("frequency"), section: "balancing", label: "How often it runs" },
  { key: bd("duration"), section: "balancing", label: "How long the data is held" },
  { key: bd("potential_harms"), section: "balancing", label: "Harms this processing could cause" },
  { key: bd("safeguards"), section: "balancing", label: "Safeguards in place" },
  { key: bd("safeguards_other"), section: "balancing", label: "Other safeguard", activeWhen: has(bd("safeguards"), "Other") },
  { key: bd("additional_mitigations"), section: "balancing", label: "Measures added beyond baseline obligations" },
  { key: bd("additional_context"), section: "balancing", label: "Anything else to weigh" },
  { key: bd("opt_out_available"), section: "balancing", label: "Opt-out available?" },
  { key: bd("opt_out_mechanism"), section: "balancing", label: "How data subjects object or opt out" },
  { key: bd("employment_safeguards"), section: "balancing", label: "Safeguards for the employment power imbalance", activeWhen: nonNull(bd("employment_safeguards")) },
  // Attestation
  { key: at("dpo_reviewed"), section: "attestation", label: "Reviewed by the data protection function?" },
  { key: at("dpo_reviewer"), section: "attestation", label: "Reviewer" },
  { key: at("dpo_review_date"), section: "attestation", label: "Date of review" },
  { key: at("approval_status"), section: "attestation", label: "Approval status" },
  { key: at("approver_name"), section: "attestation", label: "Approved by" },
  { key: at("approver_position"), section: "attestation", label: "Approver's title" },
  { key: at("approval_date"), section: "attestation", label: "Date of approval" },
  { key: at("review_triggers"), section: "attestation", label: "Re-review triggers" },
];

const TITLES: Record<LiaReviewSection["id"], string> = {
  screening: "Screening (Step 1)",
  purpose: "Purpose test",
  necessity: "Necessity test",
  balancing: "Balancing test",
  attestation: "Attestation and review",
};

export function buildLiaReview(intake: Record<string, unknown>): LiaReviewSection[] {
  const bySection = new Map<LiaReviewSection["id"], LiaReviewRow[]>();
  for (const spec of LIA_REVIEW_FIELDS) {
    const v = get(intake, spec.key);
    const active = spec.activeWhen ? spec.activeWhen(intake) : true;
    let state: LiaReviewState;
    if (!active) state = "inactive";
    else if (blank(v)) state = "unanswered";
    else if (typeof v === "string" && NEGATIVE_RE.test(v.trim())) state = "negative";
    else state = "answered";
    const row: LiaReviewRow = { key: spec.key, label: spec.label, state, text: state === "unanswered" || state === "inactive" ? "" : text(v) };
    if (!bySection.has(spec.section)) bySection.set(spec.section, []);
    bySection.get(spec.section)!.push(row);
  }
  return (Object.keys(TITLES) as LiaReviewSection["id"][])
    .filter((id) => bySection.has(id))
    .map((id) => ({ id, title: TITLES[id], rows: bySection.get(id)! }));
}

/** Every payload key the review knows (dotted). */
export const LIA_REVIEW_KEYS: ReadonlySet<string> = new Set(LIA_REVIEW_FIELDS.map((f) => f.key));

/** Unanswered rows on the active path — the "unresolved items" the review lists. */
export function liaUnresolvedRows(sections: readonly LiaReviewSection[]): LiaReviewRow[] {
  return sections.flatMap((s) => s.rows.filter((r) => r.state === "unanswered"));
}
