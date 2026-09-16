/**
 * admtReview.ts — the "Review your answers" model for the CPPA ADMT intake.
 *
 * Modeled on src/lib/cppaRiskReview.ts: one ordered field inventory keyed by
 * the payload's own top-level keys, grouped by intake step, so a field
 * cannot be collected and silently omitted from review. Three answer states
 * are distinguished on purpose: answered; an explicit negative / unsure
 * answer ("No", "None…", "Unsure", "Not applicable…", "Not yet…", "None of
 * the above…"), which is a complete answer; and never answered. An exhibit
 * sentinel ("[See attached Exhibit…") is shown as deferred work, not as an
 * answer.
 *
 * admt_detail is one shared object in the payload
 * (src/pages/admt/ADMTChecker.tsx: `admt_detail: adv`), but its sub-keys are
 * asked across three different steps: vendor / decision / human-involvement
 * detail in Step 1, appeal / sole-use / bias detail (and
 * opt_out_exception_other) in Step 3, and access-delivery detail in Step 4.
 * Each sub-key therefore gets its own FieldSpec keyed "admt_detail.<sub>",
 * read through a small dotted-path accessor — unlike notice_element_text and
 * access_readiness, which are each asked in one place and so stay grouped
 * under a single "object" row, matching cppaRiskReview's "object" kind.
 */

export type ReviewState = "answered" | "negative" | "unanswered" | "exhibit";

export interface ReviewRow {
  readonly key: string;
  readonly label: string;
  readonly state: ReviewState;
  /** Rendered text (may be multi-line). Empty for "unanswered". */
  readonly text: string;
  /** Sub-rows for structured objects (notice_element_text, access_readiness). */
  readonly items?: readonly { readonly label: string; readonly text: string }[];
}

export interface ReviewSection {
  readonly step: number;
  readonly title: string;
  readonly rows: readonly ReviewRow[];
}

type Kind = "scalar" | "list" | "object";

interface FieldSpec {
  /** Dotted for admt_detail sub-rows, e.g. "admt_detail.hosting". */
  readonly key: string;
  readonly step: number;
  readonly label: string;
  readonly kind: Kind;
  /** For kind "object": [subKey, label] pairs. */
  readonly fields?: readonly [string, string][];
}

const EXHIBIT_SENTINEL_PREFIX = "[See attached Exhibit";

/** Explicit negatives / unknowns the intake treats as complete answers. */
const NEGATIVE_RE = /^(no|none|unsure|not sure|n\/a|none of the above|none of these categories|not applicable|not yet)\b/i;

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
  // A multi-select list whose only entry is itself a negative (e.g. vendor
  // docs on file: ["None on file"]) is a complete negative answer.
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

/** Reads a possibly-dotted key ("admt_detail.hosting") out of the intake. */
function getValue(intake: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let v: unknown = intake;
  for (const part of parts) {
    if (v === undefined || v === null || typeof v !== "object") return undefined;
    v = (v as Record<string, unknown>)[part];
  }
  return v;
}

/** "custom_new_field" -> "Custom new field", for an admt_detail key the table below does not name. */
function humanize(key: string): string {
  const s = key.replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const STEP_TITLES: Record<number, string> = {
  1: "System scope",
  2: "Pre-use notice",
  3: "Opt-out and exceptions",
  4: "Access requests",
};

/**
 * Every top-level key the page writes into the generation payload, plus one
 * row per admt_detail sub-key, in review order. Keep this in step with the
 * `intake` builder in src/pages/admt/ADMTChecker.tsx.
 */
export const ADMT_REVIEW_FIELDS: readonly FieldSpec[] = [
  // ── Step 1 — System scope ────────────────────────────────────────────────
  { key: "organization_name", step: 1, label: "Which organization is running this assessment?", kind: "scalar" },
  { key: "system_name", step: 1, label: "System name", kind: "scalar" },
  { key: "system_type", step: 1, label: "System type (optional)", kind: "scalar" },
  { key: "system_description", step: 1, label: "What does this system decide, and how?", kind: "scalar" },
  { key: "decision_domains", step: 1, label: "What significant decision(s) does this system make?", kind: "list" },
  { key: "human_review", step: 1, label: "Human review of system outputs", kind: "scalar" },
  { key: "training_data_use", step: 1, label: "Do you use personal information to train any automated decision system?", kind: "scalar" },
  { key: "profiling_use", step: 1, label: "Do you use automated processing to profile consumers (predict behavior, preferences, or characteristics) even without making a 'significant decision'?", kind: "scalar" },
  { key: "ca_consumer_count", step: 1, label: "Approximate number of California consumers this system makes decisions about each year", kind: "scalar" },
  { key: "third_party_admt", step: 1, label: "Are you using any third-party tools or APIs that make, or materially contribute to, this decision? (optional)", kind: "scalar" },
  { key: "admt_system_count", step: 1, label: "How many distinct ADMT systems does your business run for significant decisions?", kind: "scalar" },
  { key: "affected_population_band", step: 1, label: "How many Californians does this system reach? (11 CCR § 7152(a)(3)(D))", kind: "scalar" },
  { key: "role_roster", step: 1, label: "Which internal roles already have defined responsibilities for this system? (11 CCR § 7157(c))", kind: "list" },

  // ── Step 1 — admt_detail: vendor, decision, and human-involvement detail ──
  { key: "admt_detail.vendor_status", step: 1, label: "Vendor's role under the CCPA", kind: "scalar" },
  { key: "admt_detail.vendor_docs", step: 1, label: "Vendor documentation on file (select all that apply)", kind: "list" },
  { key: "admt_detail.v_audit", step: 1, label: "Rights to audit and monitor the vendor", kind: "scalar" },
  { key: "admt_detail.v_assist", step: 1, label: "Help answering consumer access requests", kind: "scalar" },
  { key: "admt_detail.v_optout", step: 1, label: "Passing opt-outs on to anyone downstream", kind: "scalar" },
  { key: "admt_detail.v_appeal", step: 1, label: "Support for appeals and human review", kind: "scalar" },
  { key: "admt_detail.v_incident", step: 1, label: "Telling you about incidents", kind: "scalar" },
  { key: "admt_detail.vendor_makes_available", step: 1, label: "Does the vendor make this ADMT available to other businesses?", kind: "scalar" },
  { key: "admt_detail.vendor_training_rights", step: 1, label: "Can the vendor use your data to train or improve its models, and who else touches the data?", kind: "scalar" },
  // Table A1-20: "No separate visible label; follows 'What significant decision(s) does this system make?'" — label invented.
  { key: "admt_detail.decision_domains_other", step: 1, label: "Other significant decision (describe)", kind: "scalar" },
  { key: "admt_detail.housing_decision_basis", step: 1, label: "Is the housing decision based solely on the availability or vacancy of the housing, or on the successful receipt of payment for it? (§ 7001(ddd)(2))", kind: "scalar" },
  { key: "admt_detail.vendor_product", step: 1, label: "Vendor / product name & version", kind: "scalar" },
  { key: "admt_detail.hosting", step: 1, label: "Where is the system hosted?", kind: "scalar" },
  { key: "admt_detail.model_types", step: 1, label: "Model type (select all that apply)", kind: "list" },
  { key: "admt_detail.decision_effects", step: 1, label: "What does the decision actually do? (select all)", kind: "list" },
  { key: "admt_detail.decision_cadence", step: 1, label: "Decision cadence", kind: "scalar" },
  { key: "admt_detail.sole_factor", step: 1, label: "Is the ADMT output the sole factor in the decision?", kind: "scalar" },
  { key: "admt_detail.other_factors", step: 1, label: "What other factors feed the decision, and how are they weighted?", kind: "scalar" },
  { key: "admt_detail.feeds_future_decisions", step: 1, label: "Will this output be used to make later significant decisions?", kind: "scalar" },
  { key: "admt_detail.solely_advertising", step: 1, label: "Is this system used solely for advertising?", kind: "scalar" },
  { key: "admt_detail.hi_reviewer_present", step: 1, label: "Is a human reviewer involved in the decision?", kind: "scalar" },
  { key: "admt_detail.hi_reviewer_role", step: 1, label: "Reviewer role / title", kind: "scalar" },
  { key: "admt_detail.hi_stage", step: 1, label: "At what stage does the reviewer act?", kind: "scalar" },
  { key: "admt_detail.hi_trained", step: 1, label: "Has the reviewer been trained to read what the system produces?", kind: "scalar" },
  { key: "admt_detail.hi_reviews_other_info", step: 1, label: "Does the reviewer look at anything besides the system's output?", kind: "scalar" },
  { key: "admt_detail.hi_authority_override", step: 1, label: "Can the reviewer change the decision?", kind: "scalar" },
  { key: "admt_detail.hi_override_rate", step: 1, label: "Actual override rate, last 12 months (optional)", kind: "scalar" },

  // ── Step 2 — Pre-use notice ─────────────────────────────────────────────
  { key: "notice_delivery", step: 2, label: "How do you deliver the Pre-use Notice to consumers?", kind: "list" },
  { key: "notice_timing", step: 2, label: "When is the Pre-use Notice presented?", kind: "scalar" },
  { key: "notice_has_specific_purpose", step: 2, label: "Does your Pre-use Notice state the specific purpose for ADMT use in plain language?", kind: "scalar" },
  { key: "notice_purpose_text", step: 2, label: "Paste your specific purpose statement as it appears in the notice:", kind: "scalar" },
  { key: "notice_full_text", step: 2, label: "Paste your published Pre-use Notice in full", kind: "scalar" },
  {
    key: "notice_element_text",
    step: 2,
    label: "Pre-use Notice elements",
    kind: "object",
    fields: [
      ["purpose", "What you use the system for"],
      ["optout", "The right to opt out, and how to ask"],
      ["access", "The right to ask what the system did, and how to ask"],
      ["antiretaliation", "That you will not retaliate for using these rights"],
      ["howworks_inputs", "What information goes into the system"],
      ["howworks_output", "What the system produces, and how you use it"],
      ["altprocess", "What happens instead for someone who opts out"],
    ],
  },
  { key: "notice_has_opt_out_desc", step: 2, label: "Does your notice describe the consumer's right to opt out and how to submit a request?", kind: "scalar" },
  { key: "notice_has_access_desc", step: 2, label: "Does your notice describe the consumer's right to access ADMT information and how to submit a request?", kind: "scalar" },
  { key: "notice_has_anti_retaliation", step: 2, label: "Does your notice state that the business is prohibited from retaliating against consumers for exercising CCPA rights?", kind: "scalar" },
  { key: "notice_has_how_it_works", step: 2, label: "Does your notice include additional information about how the ADMT works?", kind: "scalar" },
  { key: "notice_has_alternative_process", step: 2, label: "Does the notice describe what happens to consumers who opt out — the alternative decision-making process?", kind: "scalar" },

  // ── Step 3 — Opt-out and exceptions ─────────────────────────────────────
  { key: "opt_out_exception", step: 3, label: "Are you providing a full opt-out right, or relying on an exception?", kind: "scalar" },
  { key: "opt_out_methods", step: 3, label: "Opt-out submission methods provided", kind: "list" },
  { key: "opt_out_link_title", step: 3, label: "Opt-out link title (as it appears in your Pre-use Notice)", kind: "scalar" },
  { key: "opt_out_confirmation_mechanism", step: 3, label: "Opt-out confirmation mechanism", kind: "scalar" },
  { key: "opt_out_15_day_process", step: 3, label: "Operational opt-out process: how do you action an opt-out request within 15 business days?", kind: "scalar" },
  { key: "opt_out_handling_confirmations", step: 3, label: "Which of the following can you confirm about how opt-out requests are handled?", kind: "list" },
  { key: "opt_out_no_cookie_banner", step: 3, label: "Is a cookie banner your only way to opt out?", kind: "scalar" },
  { key: "opt_out_no_account_required", step: 3, label: "Does someone have to create an account to opt out?", kind: "scalar" },
  { key: "opt_out_appeal_process", step: 3, label: "Describe your human appeal process in detail", kind: "scalar" },
  { key: "opt_out_fairness_doc", step: 3, label: "Describe your fairness and non-discrimination testing", kind: "scalar" },

  // ── Step 3 — admt_detail: appeal, sole-use, and bias-testing detail ──────
  { key: "admt_detail.opt_out_exception_other", step: 3, label: "Other — my situation differs (describe)", kind: "scalar" },
  { key: "admt_detail.appeal_reviewer_role", step: 3, label: "Appeal reviewer role / title", kind: "scalar" },
  { key: "admt_detail.appeal_trained", step: 3, label: "Trained to interpret output?", kind: "scalar" },
  { key: "admt_detail.appeal_authority_overturn", step: 3, label: "Authority to overturn?", kind: "scalar" },
  { key: "admt_detail.appeal_step_count", step: 3, label: "Steps from decision to human reviewer", kind: "scalar" },
  { key: "admt_detail.appeal_consumer_submit", step: 3, label: "What may the consumer submit on appeal? (select all)", kind: "list" },
  { key: "admt_detail.appeal_timeline", step: 3, label: "Target response timeline", kind: "scalar" },
  { key: "admt_detail.appeal_reversal_rate", step: 3, label: "Reversal rate, 12 mo (optional)", kind: "scalar" },
  { key: "admt_detail.appeal_outcomes", step: 3, label: "Appeal outcome categories (select all)", kind: "list" },
  { key: "admt_detail.sole_use_attestation", step: 3, label: "Sole-use condition of the exception claimed (§ 7221(b)(2)(A): solely to assess ability to perform; § 7221(b)(3)(A): solely for the allocation/assignment of work or compensation)", kind: "scalar" },
  { key: "admt_detail.nondiscrimination_testing", step: 3, label: "Do you hold a non-discrimination testing record for this ADMT?", kind: "scalar" },
  { key: "admt_detail.bias_protected_chars", step: 3, label: "Protected characteristics tested (select all)", kind: "list" },
  { key: "admt_detail.bias_proxy_vars", step: 3, label: "Proxy variables identified & how mitigated", kind: "scalar" },
  { key: "admt_detail.bias_testing_cadence", step: 3, label: "Fairness-testing cadence", kind: "scalar" },
  { key: "admt_detail.bias_last_test", step: 3, label: "Last test date", kind: "scalar" },
  { key: "admt_detail.bias_next_test", step: 3, label: "Next test date", kind: "scalar" },
  { key: "admt_detail.bias_adverse_impact", step: 3, label: "Adverse-impact analysis performed?", kind: "scalar" },
  { key: "admt_detail.bias_outcome_summary", step: 3, label: "Outcome distribution / false-positive & false-negative rates by group", kind: "scalar" },

  // ── Step 4 — Access requests ─────────────────────────────────────────────
  { key: "access_submission_methods", step: 4, label: "Submission methods for access requests", kind: "scalar" },
  { key: "access_verification_process", step: 4, label: "Identity verification process for access requests", kind: "scalar" },
  { key: "access_logic_disclosure", step: 4, label: "What do you tell someone about how the system reached its result?", kind: "scalar" },
  { key: "access_outcome_disclosure", step: 4, label: "What do you tell someone about the decision itself?", kind: "scalar" },
  { key: "access_response_timeline", step: 4, label: "Response timeline for access requests", kind: "scalar" },
  { key: "access_trade_secret_policy", step: 4, label: "Trade secret and security information policy", kind: "scalar" },
  {
    key: "access_readiness",
    step: 4,
    label: "Access-response readiness (§ 7222(b))",
    kind: "object",
    fields: [
      ["b1_purpose_ready", "Why you used the system for that person (§ 7222(b)(1))"],
      // Table A4-02: "No separate visible label; shared question" — label invented (suffix distinguishes the readiness choice from its follow-up text).
      ["b1_purpose_process", "Why you used the system for that person (§ 7222(b)(1)) — your process"],
      ["b2_logic_ready", "How the system works, including what it assumes and where it falls short (§ 7222(b)(2))"],
      ["b2_logic_process", "How the system works, including what it assumes and where it falls short (§ 7222(b)(2)) — your process"],
      ["b3_output_use_ready", "What the system produced, and how you used it (§ 7222(b)(3))"],
      ["b3_output_use_process", "What the system produced, and how you used it (§ 7222(b)(3)) — your process"],
      ["b3_outcome_ready", "What the person's decision ended up being (§ 7222(b)(3))"],
      ["b3_outcome_process", "What the person's decision ended up being (§ 7222(b)(3)) — your process"],
      ["b3_human_role_ready", "What a human did, if anything (§ 7222(b)(3))"],
      ["b3_human_role_process", "What a human did, if anything (§ 7222(b)(3)) — your process"],
      ["b4_rights_ready", "That you cannot retaliate, and how to exercise other CCPA rights — with links to the request form or portal (§ 7222(b)(4))"],
      ["b4_rights_process", "That you cannot retaliate, and how to exercise other CCPA rights — with links to the request form or portal (§ 7222(b)(4)) — your process"],
    ],
  },

  // ── Step 4 — admt_detail: access-delivery detail ─────────────────────────
  { key: "admt_detail.access_secure_transmission", step: 4, label: "How do you securely transmit the access response?", kind: "scalar" },
  { key: "admt_detail.access_denial_basis", step: 4, label: "If you would partially or fully deny an access request, on what basis?", kind: "scalar" },
];

export interface BuildAdmtReviewOptions {
  /** Row keys (or "admt_detail.<sub>" for sub-rows) whose answer belongs to a branch the current answers no longer select — retained and flagged, never dropped. */
  readonly inactiveKeys?: ReadonlySet<string>;
  /** Row keys (or "admt_detail.<sub>" for sub-rows) whose value was filled in by the system and not yet confirmed. */
  readonly provisionalKeys?: ReadonlySet<string>;
}

function labelFor(spec: { readonly key: string; readonly label: string }, opts?: BuildAdmtReviewOptions): string {
  let label = spec.label;
  if (opts?.inactiveKeys?.has(spec.key)) label += " (inactive branch — answer retained)";
  if (opts?.provisionalKeys?.has(spec.key)) label += " (suggested — not yet confirmed)";
  return label;
}

function stateOf(v: unknown): ReviewState {
  if (isExhibitValue(v)) return "exhibit";
  if (isBlank(v)) return "unanswered";
  if (isNegative(v)) return "negative";
  return "answered";
}

function rowFor(spec: FieldSpec, intake: Record<string, unknown>, opts?: BuildAdmtReviewOptions): ReviewRow {
  const label = labelFor(spec, opts);
  const v = getValue(intake, spec.key);

  if (spec.kind === "object") {
    const obj = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    const pairs = (spec.fields ?? [])
      .filter(([k]) => !isBlank(obj[k]))
      .map(([k, l]) => ({ label: l, text: text(obj[k]) }));
    if (!pairs.length) return { key: spec.key, label, state: "unanswered", text: "" };
    return { key: spec.key, label, state: "answered", text: `${pairs.length} answered`, items: pairs };
  }

  // scalar / list
  const st = stateOf(v);
  return {
    key: spec.key,
    label,
    state: st,
    text: st === "exhibit" ? "Exhibit deferred — to be completed and attached to the report" : text(v),
  };
}

const ADMT_DETAIL_PREFIX = "admt_detail.";

export function buildAdmtReview(intake: Record<string, unknown>, opts?: BuildAdmtReviewOptions): ReviewSection[] {
  const byStep = new Map<number, ReviewRow[]>();
  for (const spec of ADMT_REVIEW_FIELDS) {
    if (!byStep.has(spec.step)) byStep.set(spec.step, []);
    byStep.get(spec.step)!.push(rowFor(spec, intake, opts));
  }

  // An admt_detail sub-key this table does not yet name (e.g. a new field
  // added to the page ahead of this review model) still renders, with a
  // humanised label, rather than being silently dropped from review.
  const known = new Set(
    ADMT_REVIEW_FIELDS.filter((f) => f.key.startsWith(ADMT_DETAIL_PREFIX)).map((f) => f.key.slice(ADMT_DETAIL_PREFIX.length)),
  );
  const admtDetail =
    intake.admt_detail && typeof intake.admt_detail === "object" && !Array.isArray(intake.admt_detail)
      ? (intake.admt_detail as Record<string, unknown>)
      : {};
  const extraKeys = Object.keys(admtDetail).filter((k) => !known.has(k));
  if (extraKeys.length) {
    if (!byStep.has(1)) byStep.set(1, []);
    for (const k of extraKeys) {
      const spec: FieldSpec = { key: `${ADMT_DETAIL_PREFIX}${k}`, step: 1, label: humanize(k), kind: "scalar" };
      byStep.get(1)!.push(rowFor(spec, intake, opts));
    }
  }

  return [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, rows]) => ({ step, title: STEP_TITLES[step] ?? `Step ${step}`, rows }));
}

/** Keys the review knows about (dotted for admt_detail sub-rows). */
export const ADMT_REVIEW_KEYS: ReadonlySet<string> = new Set(ADMT_REVIEW_FIELDS.map((f) => f.key));

/**
 * Maps each review key to the page's validation/anchor field key. Scalars
 * and lists use the same string as the payload key; admt_detail sub-rows use
 * the dotted key ("admt_detail.hosting"); the grouped object rows use their
 * own top-level key ("access_readiness", "notice_element_text").
 */
export const ADMT_REVIEW_FIELD_KEYS: Record<string, string> = Object.fromEntries(
  ADMT_REVIEW_FIELDS.map((f) => [f.key, f.key]),
);
