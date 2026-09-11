// BATCH e74fdbfd (2026-09-09) — the first all-products batch with every V3
// hook flag on. LIA run b66bf9a7 (Veltrix Digital Solutions Ltd) carried two
// customer-visible defects — one raised by the claude grader, one found on
// the rendered PDF:
//
//   (1) The exec/findings lead read "…subject to the conditions recorded
//       below" (BATCH a81e0240's hasConditions was true: the
//       lia/rule/necessity-anonymised-alternative require_condition rule had
//       fired and written its information_needed entry) and NOTHING below
//       recorded a condition — renderRuleClause places a clause only by
//       effect.element, which require_condition never carries, and the
//       information_needed spine section has had no composer since DOC 138
//       confirmed it dead. Fixed: collectLiaConditions +
//       composeLiaConditionsBlock (lia-skeleton-assemble.ts) render a
//       numbered block inside "findings:1", and hasConditions is true iff
//       that block renders.
//   (2) Section III's prose named two alternatives and the Alternatives
//       Considered table rendered one: "Anonymised aggregate reporting only"
//       appeared identically in all three source fields, so PANEL LIA-P3's
//       summary-line rule counted each copy as "containing" the other two and
//       dropped all three. Fixed: an identical label is never a contained
//       sub-label (build-upgrade4.ts).
//
// The intake below is the batch's own li_assessments row, read back verbatim.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import {
  assembleLiaSkeletonDocument,
  collectLiaConditions,
  composeLiaConditionsBlock,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

const VELTRIX: Bag = {
  organization_name: "Veltrix Digital Solutions Ltd",
  sector: "Online & Web Services",
  subject_anchor: "Behavioural analytics profiling of registered platform users",
  relationship_type: "Existing registered user (B2C and B2B subscriber)",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  data_categories: ["Customer records", "Location data", "Communications content", "Other"],
  processing_description:
    "Clickstream data, session duration, feature interaction events and device identifiers are collected from logged-in users and processed through an analytics pipeline to produce engagement scores and churn-risk profiles. These profiles are used to personalise in-product recommendations and inform product development priorities.",
  stated_purpose:
    "To understand how users interact with the Veltrix platform in order to improve service quality, reduce churn, and deliver relevant in-product recommendations.",
  alternatives_considered: "Anonymised aggregate reporting only\nConsent-based analytics with opt-in gate",
  purpose_details: {
    beneficiary: "Our business and the individuals",
    controller_is_public_authority: "No",
    device_access: "Yes",
    device_access_strictly_necessary: "Yes — all of it is strictly necessary",
    interest_holder: "Our organisation only",
    interest_statement:
      "Veltrix Digital Solutions Ltd analyses platform engagement data to identify friction points and personalise user experiences, sustaining product competitiveness and reducing subscriber churn.",
    interest_type: "Research / product improvement",
    marketing_channels: "",
    marketing_consent_basis: "",
    public_task_processing: "Not applicable",
    specific_benefit: "Reduced churn rate and improved user satisfaction scores through targeted feature recommendations",
  },
  necessity_details: {
    achievable_without_personal_data_rationale: "",
    alternatives: "Anonymised aggregate reporting only\nConsent-based opt-in analytics",
    alternatives_rationale:
      "Anonymised aggregate reporting only — cannot link behaviour to individual accounts for personalised recommendations\nConsent-based opt-in analytics — opt-in rates too low to produce statistically reliable churn signals",
    data_minimised:
      "Full page content and communications body text are excluded; only event metadata, timestamps, feature IDs and pseudonymous user IDs are retained.",
    pseudonymisation_options:
      "User IDs are hashed before entry into the analytics warehouse; raw identifiers are held in a separate access-controlled identity store accessible only to the identity management team.",
    why_consent_not_used:
      "The processing is integral to service delivery; requiring consent would result in material data gaps that prevent effective churn modelling and service optimisation.",
  },
  balancing_details: {
    additional_context:
      "A DPIA was completed prior to deployment of the analytics pipeline; the DPO reviewed and approved the LIA in conjunction with that assessment.",
    additional_mitigations:
      "Engagement profiles are never shared with third-party advertisers; a user-facing dashboard allows users to view and reset their profile at any time.",
    art9_condition: "",
    children_data_subjects: "No",
    collection_context:
      "Data is collected continuously during authenticated sessions on the Veltrix web and mobile platform; users are informed at account creation and via the privacy notice linked in the platform footer.",
    duration: "Profiles retained for 24 months from last active session",
    employment_safeguards: "",
    frequency: "Continuous during active sessions; batch processing nightly",
    opt_out_available: "Yes — unconditional, on request, with no consequence",
    opt_out_mechanism:
      "Users submit an opt-out via the Privacy Controls page in their account settings; processing stops within 48 hours and the engagement profile is deleted within 30 days.",
    potential_harm: "Limited — minor inconvenience or unwanted contact",
    potential_harm_detail:
      "Profiling could surface irrelevant recommendations or, if a profile is inaccurate, cause a user to miss relevant features — the worst case is wasted in-product nudges, not material loss.",
    potential_harms: ["Loss of autonomy or control over data", "Distress or intrusion"],
    reasonable_expectation: "Probably — disclosed in privacy notice and consistent with the relationship",
    reasonable_expectation_detail:
      "Users sign up knowing the platform is a data-driven service; the privacy notice explicitly references usage analytics, and this processing is consistent with that context.",
    relationship_category: "Customer",
    safeguards: [
      "Encryption at rest and in transit",
      "Pseudonymisation",
      "Access controls / least privilege",
      "Retention limits",
      "Independent oversight (DPO / privacy committee)",
      "DPIA completed",
    ],
    scale_approx: "Approximately 2.4 million registered users across the EU and UK",
    special_category_data: false,
    statutory_restrictions: "",
    vulnerable_subjects: ["None"],
  },
  attestation: {
    approval_date: "2026-08-18", // DOC 258: current, so no stale-review Condition
    approver_name: "James Whitford",
    approver_position: "Chief Privacy Officer",
    dpo_review_date: "2026-08-12",
    dpo_reviewed: "Yes",
    dpo_reviewer: "Marta Leclercq",
    review_triggers: ["A change in the purpose of the processing", "An objection or complaint from a data subject"],
  },
};

// lia/rule/necessity-anonymised-alternative (lia-rules.ts) — the rule the
// live run fired; its effect text and authority, verbatim.
const RULE_TEXT =
  "Record whether the purpose could be achieved with anonymised or synthetic data or a less intrusive method; if it could, the processing of personal data is not necessary.";
const RULE_CITATION = "EDPB Opinion 28/2024 ¶73–74; EDPB Guidelines 3/2019 ¶24 — determinative authority (condition)";

function withCondition(report: Bag): Bag {
  return {
    ...report,
    information_needed: [{
      field: "balancing_details.additional_mitigations",
      dimensions: RULE_TEXT,
      provision: RULE_CITATION,
      enables: "the necessity test",
    }],
    rule_applications: [{
      rule_id: "lia/rule/necessity-anonymised-alternative",
      effect: { kind: "require_condition", text: RULE_TEXT },
      reason_sentence: RULE_TEXT,
      authority_citation: RULE_CITATION,
      changed: true,
      concurred: false,
    }],
  };
}

function documentText(report: Bag, record: Bag): string {
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text)).join("\n");
}

// ── (2) the alternatives table ───────────────────────────────────────────────

Deno.test("batch e74fdbfd — Veltrix: an alternative named identically in all three sources is one row, not zero", () => {
  const result = buildAlternativesConsidered(VELTRIX);
  assertEquals(result.alternatives.length, 2, JSON.stringify(result.alternatives));
  const byAlt = Object.fromEntries(result.alternatives.map((a) => [a.alternative, a.why_inadequate]));
  assertEquals(
    byAlt["Anonymised aggregate reporting only"],
    "cannot link behaviour to individual accounts for personalised recommendations",
  );
  assertEquals(byAlt["Consent-based opt-in analytics"], "opt-in rates too low to produce statistically reliable churn signals");
  assertEquals(result.count_with_rationale, 2);
  assertStringIncludes(result.record_fact, "The record names 2 alternatives");
});

Deno.test("batch e74fdbfd — a genuine summary line naming two other alternatives is still dropped (PANEL LIA-P3 rule 1 intact)", () => {
  const result = buildAlternativesConsidered({
    necessity_details: {
      alternatives: "Scheduled check-ins and zone sensors only — each rejected as insufficient on its own",
      alternatives_rationale:
        "Scheduled check-ins — cannot detect a fall between visits\nZone sensors only — cannot distinguish a fall from a rest",
    },
  });
  const labels = result.alternatives.map((a) => a.alternative).sort();
  assertEquals(labels, ["Scheduled check-ins", "Zone sensors only"]);
});

// ── (1) the conditions the lead promises ─────────────────────────────────────

Deno.test("batch e74fdbfd — Veltrix: 'subject to the conditions recorded below' is honoured by a numbered conditions block in Section V", () => {
  const report = buildLiaDeliverables(VELTRIX) as unknown as Bag;
  const text = documentText(withCondition(report), VELTRIX);
  assertStringIncludes(text, "subject to the conditions recorded below");
  assertStringIncludes(
    text,
    "That determination is subject to the following condition, which names what the record does not yet state:",
  );
  assertStringIncludes(text, `1. ${RULE_TEXT} This completes the necessity test. (${RULE_CITATION}.)`);
  // iff-cited: the condition's authority is in the body AND the Table of Authorities.
  assert(text.split("EDPB Opinion 28/2024 ¶73–74").length - 1 >= 2, "the condition's authority must reach the Table of Authorities");
});

Deno.test("batch e74fdbfd — Veltrix: without a condition the lead makes no promise and no block renders", () => {
  const report = buildLiaDeliverables(VELTRIX) as unknown as Bag;
  const text = documentText(report, VELTRIX);
  assert(!text.includes("subject to the conditions recorded below"), "no promise without a condition");
  assert(!text.includes("That determination is subject to the following"), "no block without a condition");
});

Deno.test("batch e74fdbfd — a V3 ROO read-back ask is not a condition on the determination: no promise, no block", () => {
  const report = buildLiaDeliverables(VELTRIX) as unknown as Bag;
  const withRoo: Bag = {
    ...report,
    information_needed: [{
      field: "balancing_details.reasonable_expectation",
      dimensions: "One aspect of the assessment could not be settled on the current version of your answers.",
      ask: "One aspect of the assessment could not be settled on the current version of your answers.",
      provision: "GDPR Art. 6(1)(f)",
      enables: "the persuasive-authority comparison",
      source: "hook_selection",
      hook_id: "enforcement_actions:test:v1",
    }],
  };
  assertEquals(collectLiaConditions(withRoo, []), []);
  const text = documentText(withRoo, VELTRIX);
  assert(!text.includes("subject to the conditions recorded below"));
  assert(!text.includes("That determination is subject to the following"));
});

Deno.test("batch e74fdbfd — collectLiaConditions dedupes the rule trail against information_needed and strips an internal field-path prefix", () => {
  const conditions = collectLiaConditions(
    {
      information_needed: [
        { dimensions: `balancing_details.additional_mitigations — ${RULE_TEXT}`, provision: RULE_CITATION, enables: "the necessity test" },
        { dimensions: "State the retention period for engagement profiles", provision: "GDPR Art. 5(1)(e)", enables: "the balancing test" },
      ],
    },
    [{ effect: { kind: "require_condition", text: RULE_TEXT }, reason_sentence: RULE_TEXT, authority_citation: RULE_CITATION, changed: true }],
  );
  assertEquals(conditions.map((c) => c.text), [RULE_TEXT, "State the retention period for engagement profiles."]);
  const block = composeLiaConditionsBlock(conditions);
  assertStringIncludes(block, "That determination is subject to the following conditions, each of which names what the record does not yet state:");
  assertStringIncludes(
    block,
    `\n\n1. ${RULE_TEXT} This completes the necessity test. (${RULE_CITATION}.)\n\n2. State the retention period for engagement profiles. This completes the balancing test. (GDPR Art. 5(1)(e).)`,
  );
  assertEquals(composeLiaConditionsBlock([]), "");
});
