/**
 * Doc 261-review (2026-09-15, EX 11 / LIVE07 / EX 18) — the Step 8 "Review
 * your answers" model for the CPPA Risk intake.
 *
 * The previous review rendered 37 legacy scalar rows and stopped: none of the
 * structured § 7152(a)(2)/(4)/(5)/(6) records (data elements, harm pathways,
 * safeguards, benefits, recipients, per-category retention, disclosures,
 * business purposes, the extended ADMT record) were shown back, although every
 * one of them was already saved and sent. A reviewer approves what the screen
 * shows them, so the review must cover the whole payload.
 *
 * Design: one ordered field inventory keyed by the payload's own top-level
 * keys, grouped by intake step. src/test/cppa-risk-review-coverage.test.ts
 * parses the page's payload builder and fails if any key is missing here, so
 * a field cannot be collected and silently omitted from review again.
 *
 * Three answer states are distinguished on purpose (EX 11): answered; an
 * explicit negative / unsure answer ("None", "No", "Unsure"…), which is a
 * complete answer; and never answered. An exhibit sentinel is shown as
 * deferred work, not as an answer (CL-T07).
 */

export type ReviewState = "answered" | "negative" | "unanswered" | "exhibit";

export interface ReviewRow {
  readonly key: string;
  readonly label: string;
  readonly state: ReviewState;
  /** Rendered text (may be multi-line). Empty for "unanswered". */
  readonly text: string;
  /** Sub-rows for repeatable blocks / structured objects. */
  readonly items?: readonly { readonly label: string; readonly text: string }[];
}

export interface ReviewSection {
  readonly step: number;
  readonly title: string;
  readonly rows: readonly ReviewRow[];
}

type Kind = "scalar" | "list" | "rows" | "object";

interface FieldSpec {
  readonly key: string;
  readonly step: number;
  readonly label: string;
  readonly kind: Kind;
  /** For kind "rows": how to title one row and which sub-fields to show. */
  readonly row?: {
    readonly title: (r: Record<string, unknown>, i: number) => string;
    readonly fields: readonly [string, string][]; // [subKey, label]
  };
  /** For kind "object": [subKey, label] pairs. */
  readonly fields?: readonly [string, string][];
  /** Legacy duplicate of another key; rendered only when the primary is blank. */
  readonly legacyOf?: string;
}

const EXHIBIT_SENTINEL_PREFIX = "[See attached Exhibit";

/** Explicit negatives / unknowns the intake treats as complete answers. */
const NEGATIVE_RE = /^(no|none|unsure|not sure|n\/a|none of the above|none of these categories|no formal process in place|not applicable)\b/i;

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

const STEP_TITLES: Record<number, string> = {
  1: "The activity you are assessing",
  2: "Why an assessment is required",
  3: "The information, its sources, and its recipients",
  4: "Minimum necessary, retention, and business purposes",
  5: "Negative impacts and safeguards",
  6: "Benefits and weighing",
  7: "Who prepared this, and who signs it",
  8: "Finalization",
};

const nth = (label: string) => (_r: Record<string, unknown>, i: number) => `${label} #${i + 1}`;

/**
 * Every top-level key the page writes into the generation payload, in review
 * order. Keep this in step with the `intake` builder in
 * src/pages/CPPARiskAssessment.tsx — the coverage test enforces it.
 */
export const CPPA_RISK_REVIEW_FIELDS: readonly FieldSpec[] = [
  // ── Step 1 ──────────────────────────────────────────────────────────────
  { key: "entity_name", step: 1, label: "Entity name", kind: "scalar" },
  { key: "subject_anchor", step: 1, label: "Subject of this assessment", kind: "scalar" },
  { key: "primary_activity_name", step: 1, label: "Activity name", kind: "scalar" },
  { key: "primary_activity_purpose", step: 1, label: "What the activity does with personal information", kind: "scalar" },
  { key: "processing_entry_point", step: 1, label: "Where personal information first enters", kind: "scalar" },
  { key: "processing_methods", step: 1, label: "How the information is processed", kind: "object", fields: [["collection_method", "Collected"], ["use_method", "Used"], ["disclosure_method", "Disclosed"], ["retention_method", "Retained"], ["other_processing_method", "Otherwise processed"]] },
  { key: "processing_result", step: 1, label: "What the activity produces or supports", kind: "scalar" },
  { key: "purpose_specificity_facts", step: 1, label: "What the stated purpose itself identifies", kind: "list" },
  { key: "i1_processing_purpose", step: 1, label: "Specific purpose of the processing", kind: "scalar" },
  { key: "has_secondary_uses", step: 1, label: "Same data used for other distinct purposes", kind: "scalar" },
  { key: "secondary_activities", step: 1, label: "Other uses of the same data", kind: "rows", row: { title: (r, i) => text(r.name) || `Other use #${i + 1}`, fields: [["purpose", "Purpose"], ["relation_to_primary", "Relation to the primary purpose"], ["disclosed_in_notice", "Disclosed at or before collection"], ["divergence", "Comparison with this activity"]] } },
  { key: "out_of_scope_confirmation", step: 1, label: "Same information processed for anything else", kind: "scalar" },
  { key: "out_of_scope_activities", step: 1, label: "Those other activities", kind: "scalar" },
  { key: "comparable_processing_status", step: 1, label: "Single activity or comparable set", kind: "scalar" },
  { key: "comparable_processing_basis", step: 1, label: "Basis for treating the set as comparable", kind: "scalar" },
  { key: "q3_sector", step: 1, label: "Primary business sector", kind: "scalar" },
  { key: "i9_has_existing_dpia", step: 1, label: "Existing impact assessment", kind: "scalar" },
  { key: "i9_existing_dpia_summary", step: 1, label: "Existing impact assessment summary", kind: "scalar" },
  { key: "material_change_since_prior", step: 1, label: "Changed materially since the last assessment", kind: "scalar" },
  { key: "processing_status", step: 1, label: "Processing status", kind: "scalar" },
  { key: "processing_start_date", step: 1, label: "Processing start date", kind: "scalar" },
  { key: "planned_start_date", step: 1, label: "Planned start date", kind: "scalar" },
  { key: "prior_risk_assessment_date", step: 1, label: "Prior risk assessment date", kind: "scalar" },
  { key: "material_change_date", step: 1, label: "Date of the material change", kind: "scalar" },
  { key: "material_change_description", step: 1, label: "What changed", kind: "scalar" },

  // ── Step 2 ──────────────────────────────────────────────────────────────
  { key: "q1_revenue", step: 2, label: "Annual gross revenue", kind: "scalar" },
  { key: "q2_consumers", step: 2, label: "California consumers processed per year (business-wide)", kind: "scalar" },
  { key: "q5_sell_share", step: 2, label: "Sell or share personal information", kind: "scalar" },
  { key: "q5c_share_revenue_50pct", step: 2, label: "50% or more of revenue from selling or sharing", kind: "scalar" },
  { key: "bought_sold_shared_count", step: 2, label: "Consumers whose information is bought, sold, or shared per year", kind: "scalar" },
  { key: "q5b_profiling_observation", step: 2, label: "Inference from systematic observation of workers, students, or applicants", kind: "scalar" },
  { key: "sensitive_location_basis", step: 2, label: "Inference from presence at a sensitive location", kind: "scalar" },
  { key: "q18_admt_use", step: 2, label: "Automated decisionmaking technology in use", kind: "scalar" },
  { key: "q19_admt_description", step: 2, label: "The ADMT system and its decisions", kind: "scalar" },
  { key: "q19a_decision_categories", step: 2, label: "Kind of decision the ADMT makes or contributes to", kind: "list" },
  { key: "q19b_housing_basis", step: 2, label: "Housing decision based solely on availability, vacancy, or payment", kind: "scalar" },
  { key: "q20_admt_opt_out", step: 2, label: "Right to opt out of ADMT", kind: "scalar" },
  { key: "admt_made_available_to_other_business", step: 2, label: "ADMT made available to another business", kind: "scalar" },
  { key: "admt_provider_trained_using_pi", step: 2, label: "That ADMT trained using personal information", kind: "scalar" },
  { key: "recipient_business_uses_admt_for_significant_decision", step: 2, label: "Recipient business uses it for a significant decision", kind: "scalar" },
  { key: "q18b_admt_training", step: 2, label: "Processing to train ADMT or recognition technology", kind: "scalar" },
  { key: "i5_admt_logic", step: 2, label: "ADMT logic summary", kind: "scalar" },
  { key: "i5_admt_training_source", step: 2, label: "Training-data source", kind: "scalar" },
  { key: "i5_admt_fairness_testing", step: 2, label: "Fairness / bias testing", kind: "scalar" },
  { key: "i5_admt_human_review", step: 2, label: "Human review process for outputs", kind: "scalar" },
  { key: "admt_operational_role", step: 2, label: "Operational role the ADMT plays", kind: "scalar" },
  { key: "admt_assumptions_limitations", step: 2, label: "Key assumptions and limitations", kind: "scalar" },
  { key: "admt_output", step: 2, label: "What the ADMT outputs", kind: "scalar" },
  { key: "admt_output_use", step: 2, label: "How the output is used", kind: "scalar" },
  { key: "admt_consumer_effect", step: 2, label: "Effect of the output on the consumer", kind: "scalar" },
  { key: "admt_role_type", step: 2, label: "Role of the ADMT in the decision", kind: "scalar" },
  { key: "admt_logic_documented", step: 2, label: "How the ADMT's logic is documented", kind: "scalar" },
  { key: "human_review_facts", step: 2, label: "Human-review facts that can be confirmed", kind: "list" },
  { key: "admt_testing_facts", step: 2, label: "Testing record that can be confirmed", kind: "list" },
  { key: "q6_right_know_multi", step: 2, label: "How consumers request access", kind: "list" },
  { key: "q6_right_know", step: 2, label: "How consumers request access (joined)", kind: "scalar", legacyOf: "q6_right_know_multi" },
  { key: "q7_right_delete", step: 2, label: "How consumers request deletion", kind: "scalar" },
  { key: "q8_right_correct", step: 2, label: "How consumers request correction", kind: "scalar" },
  { key: "q9_opt_out", step: 2, label: "Do Not Sell or Share link", kind: "scalar" },
  { key: "q10_id_verification", step: 2, label: "Identity verification for rights requests", kind: "scalar" },
  { key: "choice_architecture_check", step: 2, label: "How consumers are asked to permit this processing", kind: "list" },

  // ── Step 3 ──────────────────────────────────────────────────────────────
  { key: "q4_pi_categories", step: 3, label: "Categories of personal information processed", kind: "list" },
  { key: "q15_sensitive_pi", step: 3, label: "Sensitive personal information processed", kind: "scalar" },
  { key: "q15c_spi_volume", step: 3, label: "Consumers whose sensitive information is processed", kind: "scalar" },
  { key: "q16_sensitive_limit", step: 3, label: "Right to limit use of sensitive information", kind: "scalar" },
  { key: "q17_sensitive_basis", step: 3, label: "Legal basis for processing sensitive information", kind: "scalar" },
  { key: "q15d_hr_carveout", step: 3, label: "Sensitive information solely of personnel, for personnel purposes", kind: "scalar" },
  { key: "spi_employment_exception_facts", step: 3, label: "Employment-basis justification", kind: "scalar" },
  { key: "q15b_under16_knowledge", step: 3, label: "Actual knowledge of consumers under 16", kind: "scalar" },
  { key: "i4b_sources", step: 3, label: "Where the personal information comes from", kind: "scalar" },
  { key: "source_categories", step: 3, label: "Source categories", kind: "list" },
  { key: "i3_ca_consumer_band", step: 3, label: "California consumers affected by this activity", kind: "scalar" },
  { key: "approximate_ca_consumers", step: 3, label: "Approximate number of California consumers", kind: "scalar" },
  { key: "consumer_interaction_method", step: 3, label: "How the business interacts with these consumers", kind: "scalar" },
  { key: "consumer_interaction_purpose", step: 3, label: "Why the consumer interacts with the business", kind: "scalar" },
  { key: "consumer_relationship_context", step: 3, label: "Who the affected consumers are, in relation to the business", kind: "scalar" },
  { key: "expectation_check", step: 3, label: "Facts framing what a consumer can expect", kind: "list" },
  { key: "i6_vendors", step: 3, label: "Service providers, contractors, and third parties (summary)", kind: "scalar" },
  { key: "recipients_none_declared", step: 3, label: "No recipient receives this information", kind: "scalar" },
  { key: "recipients", step: 3, label: "Recipients of the personal information", kind: "rows", row: { title: (r, i) => text(r.recipient_name_or_category) || `Recipient #${i + 1}`, fields: [["recipient_type", "Type"], ["pi_categories_made_available", "Categories made available"], ["disclosure_purpose", "Purpose of the disclosure"], ["contractual_protections", "Contractual protections"]] } },
  { key: "vendor_dependency", step: 3, label: "Any recipient or vendor essential to the processing", kind: "scalar" },
  { key: "essential_vendors", step: 3, label: "Essential vendors", kind: "scalar" },
  { key: "q11_policy_review", step: 3, label: "Privacy policy last reviewed", kind: "scalar" },
  { key: "q12_notice_at_collection", step: 3, label: "Notice at collection", kind: "scalar" },
  { key: "q13_notice_content", step: 3, label: "Notice content", kind: "scalar" },
  { key: "q14_employee_notice", step: 3, label: "Employee / applicant notice", kind: "scalar" },
  { key: "i4_disclosure_mechanisms", step: 3, label: "How consumers are informed of this activity", kind: "list" },
  { key: "activity_disclosures", step: 3, label: "Disclosures for this activity", kind: "rows", row: { title: nth("Disclosure"), fields: [["disclosure_content", "What consumers are or will be told"], ["disclosure_method", "How it is made"], ["status", "Made or planned"], ["timing_or_location", "Timing / location"]] } },
  { key: "public_privacy_policy_url", step: 3, label: "Public privacy policy URL", kind: "scalar" },

  // ── Step 4 ──────────────────────────────────────────────────────────────
  { key: "i1b_min_pi", step: 4, label: "Minimum personal information necessary", kind: "scalar" },
  { key: "a2_necessity_set", step: 4, label: "Data elements and their necessity", kind: "rows", row: { title: (r, i) => text(r.element) || `Element #${i + 1}`, fields: [["necessity", "Necessary to the stated purpose?"], ["justification", "Reason"]] } },
  { key: "i2_retention_period", step: 4, label: "Retention period (activity level)", kind: "scalar" },
  { key: "i2_retention_criteria", step: 4, label: "Retention criteria (activity level)", kind: "scalar" },
  { key: "i2_retention_detail", step: 4, label: "Retention detail", kind: "scalar" },
  { key: "retention_by_pi_category", step: 4, label: "Retention by category", kind: "rows", row: { title: (r, i) => text(r.pi_category) || `Category #${i + 1}`, fields: [["retention_period", "Period"], ["retention_criteria", "Criteria"]] } },
  { key: "exceptions_intake", step: 4, label: "Business purposes and statutory exemptions claimed", kind: "object" },

  // ── Step 5 ──────────────────────────────────────────────────────────────
  { key: "impact_intake", step: 5, label: "Impact summary (legacy fields)", kind: "object", fields: [["likelihood", "Likelihood of harm"], ["severity", "Severity of harm"], ["harmTypes", "Types of harm"], ["harmCauses", "Sources and causes"], ["vulnerable", "Vulnerable populations"], ["safeguards", "Safeguards (summary)"], ["cyberGaps", "Cybersecurity gaps"], ["benefitsOutweigh", "Benefits outweigh risks"], ["benefitsRationale", "Weighing rationale"], ["businessBenefits", "Business benefits (summary)"], ["consumerBenefits", "Consumer benefits (summary)"], ["stakeholderBenefits", "Stakeholder benefits (summary)"]] },
  { key: "a5_harm_pathways", step: 5, label: "Negative impacts and their causes", kind: "rows", row: { title: (r, i) => text(r.harm) || `Impact #${i + 1}`, fields: [["data_involved", "Data involved"], ["actor", "Who or what acts on the data"], ["source", "Source of the impact"], ["cause", "Cause"], ["likelihood", "Likelihood"], ["severity", "Severity"]] } },
  { key: "risk_interdependency_check", step: 5, label: "Do the impacts compound each other", kind: "scalar" },
  { key: "compounding_pathways", step: 5, label: "Pathways that could compound", kind: "list" },
  { key: "a6_safeguards", step: 5, label: "Safeguards", kind: "rows", row: { title: (r, i) => text(r.safeguard) || `Safeguard #${i + 1}`, fields: [["harm", "Impact addressed"], ["safeguard_status", "Implementation status"], ["residual", "Residual risk"], ["effectiveness_basis", "Effectiveness evidence"], ["planned_timeline", "Committed timeline"]] } },
  { key: "harm_category_review_status", step: 5, label: "Harm-category review status (internal)", kind: "rows", row: { title: (r) => text(r.harm_category), fields: [["review_status", "Status"]] } },

  // ── Step 6 ──────────────────────────────────────────────────────────────
  { key: "benefit_business_identified", step: 6, label: "Distinct benefit to the business", kind: "scalar" },
  { key: "a4_benefit_business", step: 6, label: "Business benefit", kind: "scalar" },
  { key: "a4_benefit_business_fact", step: 6, label: "Fact supporting the business benefit", kind: "scalar" },
  { key: "benefit_business_magnitude_basis", step: 6, label: "Basis for the business benefit's size", kind: "scalar" },
  { key: "benefit_consumer_identified", step: 6, label: "Distinct benefit to the consumer", kind: "scalar" },
  { key: "a4_benefit_consumer", step: 6, label: "Consumer benefit", kind: "scalar" },
  { key: "a4_benefit_consumer_fact", step: 6, label: "Fact supporting the consumer benefit", kind: "scalar" },
  { key: "benefit_consumer_magnitude_basis", step: 6, label: "Basis for the consumer benefit's size", kind: "scalar" },
  { key: "benefit_other_stakeholders_identified", step: 6, label: "Distinct benefit to other stakeholders", kind: "scalar" },
  { key: "a4_benefit_other_stakeholders", step: 6, label: "Other-stakeholder benefit", kind: "scalar" },
  { key: "a4_benefit_other_stakeholders_fact", step: 6, label: "Fact supporting the other-stakeholder benefit", kind: "scalar" },
  { key: "benefit_other_stakeholders_magnitude_basis", step: 6, label: "Basis for the other-stakeholder benefit's size", kind: "scalar" },
  { key: "benefit_public_identified", step: 6, label: "Distinct benefit to the public", kind: "scalar" },
  { key: "a4_benefit_public", step: 6, label: "Public benefit", kind: "scalar" },
  { key: "a4_benefit_public_fact", step: 6, label: "Fact supporting the public benefit", kind: "scalar" },
  { key: "benefit_public_magnitude_basis", step: 6, label: "Basis for the public benefit's size", kind: "scalar" },

  // ── Step 7 ──────────────────────────────────────────────────────────────
  { key: "i7_internal_contributors", step: 7, label: "Internal contributors and consultees", kind: "scalar" },
  { key: "section_7151_operational_participants", step: 7, label: "Employees whose duties include this processing", kind: "rows", row: { title: (r, i) => text(r.name) || `Participant #${i + 1}`, fields: [["role", "Title or role"], ["processing_responsibility", "Responsibility in the processing"], ["participation_confirmed", "Included in the assessment process"]] } },
  { key: "i7_external_consultees", step: 7, label: "External consultees", kind: "scalar" },
  { key: "i8_certifying_exec_name", step: 7, label: "Certifying executive", kind: "scalar" },
  { key: "i8_certifying_exec_title", step: 7, label: "Certifying executive title", kind: "scalar" },
  { key: "i8_contact_phone", step: 7, label: "Contact phone", kind: "scalar" },
  { key: "i8_contact_email", step: 7, label: "Contact email", kind: "scalar" },
  { key: "a9_approver_name", step: 7, label: "Approver name", kind: "scalar" },
  { key: "a9_approver_position", step: 7, label: "Approver position", kind: "scalar" },
  { key: "a9_approval_date", step: 7, label: "Approval date", kind: "scalar" },
  { key: "a8_information_providers", step: 7, label: "Who provided the information", kind: "scalar" },

  // ── Step 8 (finalization) ───────────────────────────────────────────────
  { key: "final_processing_decision", step: 8, label: "Final processing decision", kind: "scalar" },
  { key: "final_processing_decision_notes", step: 8, label: "Decision notes", kind: "scalar" },
  { key: "assessment_reviewers_approvers", step: 8, label: "Reviewers and approvers", kind: "rows", row: { title: (r, i) => text(r.name) || `Reviewer #${i + 1}`, fields: [["position", "Position"], ["role", "Role"]] } },
  { key: "approver_authority_confirmed", step: 8, label: "Approver has authority", kind: "scalar" },
  { key: "approver_authority_basis", step: 8, label: "Basis for approver authority", kind: "scalar" },
  { key: "finalization_follow_up_resolved", step: 8, label: "Follow-up items resolved or deferred", kind: "scalar" },
];

function stateOf(v: unknown): ReviewState {
  if (isExhibitValue(v)) return "exhibit";
  if (isBlank(v)) return "unanswered";
  if (isNegative(v)) return "negative";
  return "answered";
}

function rowFor(spec: FieldSpec, intake: Record<string, unknown>): ReviewRow | null {
  const v = intake[spec.key];
  if (spec.legacyOf && !isBlank(intake[spec.legacyOf])) return null; // derived duplicate of a shown field
  const base = { key: spec.key, label: spec.label };

  if (spec.kind === "rows") {
    const arr = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
    if (!arr.length) return { ...base, state: "unanswered", text: "" };
    const items = arr.map((r, i) => ({
      label: spec.row!.title(r, i),
      text: spec.row!.fields
        .map(([k, l]) => (isBlank(r[k]) ? "" : `${l}: ${text(r[k])}`))
        .filter(Boolean)
        .join(" · "),
    }));
    return { ...base, state: "answered", text: `${arr.length} ${arr.length === 1 ? "entry" : "entries"}`, items };
  }

  if (spec.kind === "object") {
    const obj = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    if (spec.key === "exceptions_intake") {
      const claimed = Object.entries(obj).filter(([, c]) => c && typeof c === "object" && (c as Record<string, unknown>).claimed === true);
      if (!claimed.length) return { ...base, state: "negative", text: "None claimed" };
      const items = claimed.map(([k, c]) => {
        const cc = c as Record<string, unknown>;
        return {
          label: k.replace(/_/g, " "),
          text: [["scope", "Scope"], ["safeguards", "Safeguards"], ["authority_basis", "Authority"], ["retention_period", "Retention"]]
            .map(([f, l]) => (isBlank(cc[f]) ? "" : `${l}: ${text(cc[f])}`))
            .filter(Boolean)
            .join(" · "),
        };
      });
      return { ...base, state: "answered", text: `${claimed.length} claimed`, items };
    }
    const pairs = (spec.fields ?? Object.keys(obj).map((k) => [k, k] as [string, string]))
      .filter(([k]) => !isBlank(obj[k]))
      .map(([k, l]) => ({ label: l, text: text(obj[k]) }));
    if (!pairs.length) return { ...base, state: "unanswered", text: "" };
    return { ...base, state: "answered", text: `${pairs.length} answered`, items: pairs };
  }

  // scalar / list
  const st = stateOf(v);
  return { ...base, state: st, text: st === "exhibit" ? "Exhibit deferred — to be completed and attached to the report" : text(v) };
}

export function buildCppaRiskReview(intake: Record<string, unknown>): ReviewSection[] {
  const byStep = new Map<number, ReviewRow[]>();
  for (const spec of CPPA_RISK_REVIEW_FIELDS) {
    const row = rowFor(spec, intake);
    if (!row) continue;
    if (!byStep.has(spec.step)) byStep.set(spec.step, []);
    byStep.get(spec.step)!.push(row);
  }
  return [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, rows]) => ({ step, title: STEP_TITLES[step] ?? `Step ${step}`, rows }));
}

/** Keys the review knows about — the coverage test compares this with the page's payload. */
export const CPPA_RISK_REVIEW_KEYS: ReadonlySet<string> = new Set(CPPA_RISK_REVIEW_FIELDS.map((f) => f.key));
