// ITEM 383 LEG 1 — LIA PERFECT FIXTURE (×1).
//
// One truly-complete LIA record under the item380r5 `emptyAskedKeys`
// semantics: every field the Stage-B contract (`liAssessmentStageBContract`)
// presents is non-empty, except (a) the three branch-gated conditionals whose
// trigger this record does not show (`necessity_details.pseudonymisation_options`,
// `balancing_details.statutory_restrictions`,
// `balancing_details.employment_safeguards`) and (b) SYSTEM_KEYS.
//
// SUFFICIENCY, NOT PRESENCE. Every answer names a mechanism, a system, a role
// or a date. The balancing side is two-sided: the benefit is stated with the
// decision it changes, and the intrusion is stated with the effect it has on
// the people involved.
//
// FACT-EXEMPT REFERENCE RENDER (item 382 hard rule). This scenario is entirely
// new. No token from `REFERENCE_RENDER_TOKENS` (the approved Meridian Insights
// reference render) appears anywhere below; the item-383 test battery asserts
// that mechanically.
//
// Jurisdiction: United Kingdom (UK GDPR) — the approved plan's primary
// reference is ICO legitimate-interests guidance.

import type { GoldenCase } from "./types.ts";

export const LIA_PERFECT: GoldenCase[] = [
  {
    id: "lia-uk-chargeback-fraud-perfect",
    tool: "lia",
    set: "tuning",
    intake: {
      // ── Stage A ────────────────────────────────────────────────────────
      organization_name: "Ravensmoor Cycles Ltd",
      subject_anchor: "Customers placing card orders on the Ravensmoor online store",
      processing_description:
        "Each card order placed on ravensmoor.co.uk is scored for payment fraud before the order is released to the warehouse. The scoring service reads the delivery and billing address pair, the order value, the customer's prior order and chargeback history held in the Ravensmoor order system, and four device signals collected by the checkout page: browser and operating-system version, screen resolution, timezone offset, and a hashed device identifier. Scores above the review threshold hold the order for manual review by the Ravensmoor payments team; scores below it release automatically. No order is refused by the score alone.",
      data_categories: [
        "Contact data",
        "Purchase/transaction history",
        "Device/technical data",
      ],
      relationship_type: "Existing customer",
      jurisdictions: ["United Kingdom (UK GDPR)"],

      // ── Stage B — purpose ──────────────────────────────────────────────
      stated_purpose:
        "Prevent payment fraud on card orders placed on the Ravensmoor online store, so that fraudulent orders are held before dispatch rather than recovered as chargebacks after the goods have left the warehouse.",
      alternatives_considered:
        "Manual review of every order, the card scheme's own 3-D Secure step-up alone, and a fixed order-value threshold were each considered and are set out with their rationale in the necessity record.",
      purpose_details: {
        interest_holder: "Other",
        interest_holder_other:
          "Ravensmoor Cycles Ltd as controller, and the cardholders whose cards would otherwise be used fraudulently on the store.",
        interest_type: "Other",
        interest_type_other:
          "Commercial and fraud-prevention interest in preventing loss on card-not-present orders.",
        interest_statement:
          "Ravensmoor loses stock and carriage costs on every fraudulent card order it dispatches, and the cardholder whose card was used bears the dispute. Screening the order before dispatch prevents both.",
        specific_benefit:
          "In the twelve months to 31 March 2026 Ravensmoor dispatched 214 orders that were later charged back as fraudulent, at a stock and carriage cost of GBP 96,400. Pre-dispatch scoring holds those orders for review before the goods leave the warehouse, so the loss is avoided rather than written off, and the affected cardholders are not left to raise disputes with their banks.",
        beneficiary: "Our business and the individuals",
        controller_is_public_authority: "No",
        public_task_processing: "Not applicable",
      },

      // ── Stage B — necessity ────────────────────────────────────────────
      necessity_details: {
        alternatives:
          "Manual review of every order; 3-D Secure step-up alone; a fixed order-value review threshold; refusing card-not-present orders entirely.",
        alternatives_rationale:
          "Manual review of every order — the store takes approximately 18,000 card orders a month and the payments team is three people, so universal manual review would either delay all dispatches or be performed too shallowly to catch anything.\n3-D Secure step-up alone — it authenticates the cardholder at the issuer but does not detect the pattern Ravensmoor actually loses money to, which is a genuine authentication followed by delivery to a re-shipping address.\nA fixed order-value threshold — the median fraudulent order in the 2025-26 sample was GBP 340, below the value at which any workable threshold would sit, so a threshold both misses most fraud and holds legitimate high-value orders.\nRefusing card-not-present orders — the store is card-not-present in its entirety, so this would end the business line rather than manage its risk.",
        why_consent_not_used:
          "A customer who intended to use a stolen card would decline the screening, and the screening only works if it runs on every order. Consent would also be a condition of purchase rather than a free choice, so it would not be valid consent.",
        data_minimised:
          "The score reads four device signals rather than a full fingerprint: no advertising identifier, no installed-font or canvas signal, and no location data are collected. Device signals are held for 90 days and the score outcome for 24 months; the underlying order record follows the ordinary seven-year accounting retention. The hashed device identifier is a salted SHA-256 hash and the salt is rotated annually.",
        // Branch-gated (analytics branch not engaged): stored null by the form.
        pseudonymisation_options: null,
      },

      // ── Stage B — balancing ────────────────────────────────────────────
      balancing_details: {
        reasonable_expectation: "Yes",
        reasonable_expectation_detail:
          "Fraud screening at checkout is described in the Ravensmoor privacy notice at the point of payment and is standard for UK online retail; customers of this store have a purchase relationship with Ravensmoor and would expect their order to be checked before dispatch. What they would not expect is the device signal set, which is why it is listed by name in the notice.",
        collection_context:
          "The device signals are collected by the checkout page at the moment the customer submits payment, immediately below the payment panel where the fraud-screening notice appears. The order and chargeback history is already held from the customer's previous purchases.",
        vulnerable_subjects: ["Other"],
        vulnerable_subjects_other:
          "Customers using an accessibility overlay or an unusual screen resolution can score as anomalous on the device signals, so their orders are more likely to be held for review. Manual review, not automatic refusal, is what a held order produces, and the payments team is instructed to release on this ground.",
        children_data_subjects: "No",
        potential_harm: "Minor",
        potential_harm_detail:
          "A held order delays dispatch by up to one working day and, for a customer whose order is held repeatedly, produces a service experience they cannot see the reason for. The device signals also reveal a small amount about the customer's equipment that they did not set out to disclose when buying a bicycle.",
        potential_harms: [
          "Loss of autonomy or control over data",
          "Distress or intrusion",
        ],
        safeguards: ["Other"],
        safeguards_other:
          "No order is refused on the score alone — every held order is reviewed by a named member of the payments team, who records the release or refusal reason in the order system. Device signals are held 90 days. The scoring service runs in the London region of Ravensmoor's hosting provider and receives no marketing data. Access to the score history is limited to the three payments-team accounts and the head of e-commerce.",
        additional_mitigations:
          "Beyond the measures the UK GDPR already requires, Ravensmoor added two: a same-day release SLA for held orders so no order waits over a weekend, and a quarterly review of held-order rates by delivery region, so a region that scores anomalously as a group is retuned rather than left to accumulate holds.",
        opt_out_mechanism:
          "A customer may object at any time by email to privacy@ravensmoor.co.uk or by telephone to customer services. On objection the account is flagged and future orders on it bypass the score; they are instead released manually by the payments team, with no delay charged to the customer and no change to price or delivery.",
        opt_out_available: "Yes — unconditional, on request, with no consequence",
        special_category_data: false,
        relationship_category: "Customer",
        scale_approx:
          "Approximately 18,000 card orders per month, from approximately 42,000 active UK customer accounts",
        frequency: "Once per card order — typically three to five orders per customer per year",
        duration:
          "Device signals retained 90 days; score outcomes 24 months; the order record itself seven years under the accounting retention",
        additional_context:
          "The scoring service is Ravensmoor's own rule set running on its own infrastructure. No score, signal or outcome is shared with any third party, and no data from the screening is used for marketing, segmentation or credit assessment.",
        // Branch-gated (marketing / employment branches not engaged).
        statutory_restrictions: null,
        employment_safeguards: null,
      },

      // ── Stage B — attestation close ────────────────────────────────────
      attestation: {
        dpo_reviewed: "Yes",
        dpo_reviewer: "Bethan Carrow, Data Protection Officer",
        dpo_review_date: "2026-04-09",
        approver_name: "Gareth Okonjo",
        approver_position: "Head of E-commerce",
        approval_date: "2026-04-17",
        review_triggers: [
          "A change in the purpose of the processing",
          "A change in the categories of data used",
          "An objection or complaint from a data subject",
          "New or amended regulatory guidance",
        ],
      },

      stage: "submitted",
      preview_assessment_id: "lia-perfect-preview-383",
    },
    assertions: [
      { kind: "must_include", pattern: "legitimate interest|Article\\s*6\\(1\\)\\(f\\)", flags: "i", label: "LI basis named" },
      { kind: "jurisdiction_resolved", label: "UK GDPR resolved" },
    ],
  },
];
