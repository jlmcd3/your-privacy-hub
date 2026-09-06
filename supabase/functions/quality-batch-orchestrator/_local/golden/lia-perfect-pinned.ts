// LIA L0.5 D1 (2026-08-25) — PINNED PERFECT LIA FIXTURES.
//
// Perfect is defined by the product itself (the 8K rationale, carried over
// from DPIA/Risk): these two intakes were constructed against the ITEM-311 +
// UPGRADE-4 builders' own acceptance predicate (enumerated live from
// build.ts / build-upgrade4.ts / elements.ts this session) and proven clean
// through checkPerfectLiaIntake (perfect-closed-loop-lia.ts) at the mirror
// HEAD current when L-CA landed (4fbd93a5f).
//
// BOTH fixtures record an EU jurisdiction, so automated_decision_analysis
// stays "record_insufficient" on both by DESIGN (the mandatory-degradation
// carve-out documented in perfect-closed-loop-lia.ts) — that is the expected,
// correct output for any EU/UK LIA record, not a gap in these fixtures.
//
// TWO substantive shapes, both "complete" (nothing missing):
//   - lia-perfect-eu-clean: potential_harm "Severe" PAIRED WITH recorded
//     safeguards, so the record is complete AND the balance carries the
//     processing outright (outcome: legitimate_interests_available).
//   - lia-perfect-eu-mitigations-required: identical record MINUS the
//     safeguards array, so the same "Severe" harm is left unanswered and the
//     balance requires mitigations (outcome: available_only_with_mitigations)
//     — a DIFFERENT, equally complete, equally "perfect" substantive result.
//     Mirrors the CPPA-Risk/DPIA convention that the DETERMINATION is never
//     itself a rejection reason.
//
// DELIBERATE CHOICE — "Severe", never "Minor"/"Moderate"/"None / negligible":
// live code reading this session found that build-upgrade4.ts's severityOf()
// (potential_harms builder) only recognises text starting with "severe",
// "significant", "limited", or "negligible" — NONE of which match three of
// the four real contract enum values ("None / negligible", "Minor",
// "Moderate"; only "Severe" matches). Selecting anything but "Severe" here
// would silently produce the FALSE sentence "The record does not
// characterise how serious this harm would be" in potential_harms.application
// despite the record stating an answer — a real, confirmed, live product
// defect (flagged separately; NOT fixed by this fixture, which sidesteps it
// by using the one enum value the lexicon actually recognises).

import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian Fitness Ltd",
  subject_anchor: "Existing gym members using the mobile app",
  processing_description:
    "Meridian Fitness analyses workout session and equipment check-in data from existing members' own mobile app usage to recommend personalised class schedules and equipment availability alerts, using only the member's own recorded activity within the gym's own facilities.",
  data_categories: ["Contact data", "Device/technical data"],
  relationship_type: "Existing customer",
  jurisdictions: ["EU (GDPR)"],

  stated_purpose:
    "To recommend personalised class times and equipment availability to members based on their own recorded gym visits and app usage, so that members can plan visits around quieter times and their preferred classes.",
  alternatives_considered:
    "Consent under Article 6(1)(a) — members could decline app-based recommendations entirely, which would remove the scheduling and availability feature members have said in surveys they value, and would need to be re-obtained at every renewal. Manual scheduling by staff — would not scale to the volume of daily bookings and could not update live equipment availability in real time.",

  purpose_details: {
    interest_holder: "Our business",
    interest_type: "Commercial benefit — improving the member experience and supporting subscription retention",
    interest_statement:
      "Meridian's interest is to help existing members get more value from their membership by recommending class times and equipment availability that match their own recorded gym habits, which in turn supports member retention.",
    controller_is_public_authority: "No",
    public_task_processing: "Not applicable",
    // DOC 189 (2026-09-05) — the ePrivacy device-access question: check-ins
    // and bookings are recorded server-side when the member scans in; the
    // app stores or reads nothing on the device for this processing.
    device_access: "No",
    specific_benefit:
      "Members receive personalised scheduling recommendations that reduce time spent waiting for equipment and increase the classes they can attend, and Meridian sees improved membership retention as a result.",
    beneficiary: "Our business and the individuals",
  },

  necessity_details: {
    alternatives:
      "Consent under Article 6(1)(a) — members could decline app-based recommendations entirely, which would remove the scheduling and availability feature members have said in surveys they value, and would need to be re-obtained at every renewal. Manual scheduling by staff — would not scale to the volume of daily bookings and could not update live equipment availability in real time.",
    // L4 (2026-08-26): filled — a "perfect" record states WHY each
    // alternative was rejected, on purpose-defeat grounds; the empty
    // string here produced the fixture-borne conformance finding both
    // rendering paths carried.
    alternatives_rationale:
      "Each alternative was rejected on purpose-defeat grounds rather than cost: renewal-cycle consent would drop the live availability feature for members who do not re-consent in time, and manual staff scheduling cannot reflect equipment check-ins as they happen.",
    why_consent_not_used: "",
    data_minimised:
      "Only the member's own session timestamps and equipment check-in/out events are used; no data from any other member is included in an individual's recommendations.",
    pseudonymisation_options: "",
  },

  balancing_details: {
    reasonable_expectation: "Yes",
    reasonable_expectation_detail:
      "Members join and use the app specifically to book classes and see equipment availability, so recommendations drawn from their own recorded gym visits sit squarely within the service they signed up for.",
    collection_context:
      "The session and check-in data are collected automatically each time a member scans into the gym or completes a class booking in the app, which every member does as part of using the membership they hold.",
    vulnerable_subjects: [] as string[],
    vulnerable_subjects_other: "",
    children_data_subjects: "No",
    potential_harm: "Severe",
    potential_harm_detail:
      "If recommendation data were exposed, it could reveal a member's gym attendance patterns, which for some members could be sensitive if it discloses times of day or routines they would not want disclosed.",
    potential_harms: [
      "Disclosure of attendance patterns to unauthorised parties",
      "Inference of routine or health-related timing from visit patterns",
    ],
    safeguards_other: "",
    additional_mitigations: "",
    opt_out_mechanism:
      "Members can turn off personalised recommendations at any time from their account settings, with immediate effect and no loss of any other membership feature.",
    special_category_data: false,
    relationship_category: "Customer",
    scale_approx: "Approximately 4,200 active app users across all Meridian locations.",
    frequency: "Recommendations are recalculated after each gym visit or class booking, so multiple times per week per active member.",
    duration: "Session and check-in data used for recommendations is retained for 12 months on a rolling basis, after which it is deleted.",
    opt_out_available: "Yes — unconditional, on request, with no consequence",
    statutory_restrictions: "",
    employment_safeguards: "",
    additional_context: "",
  },

  attestation: {
    dpo_reviewed: "Yes",
    dpo_reviewer: "Priya Nathwani",
    dpo_review_date: "2026-07-14",
    approver_name: "Priya Nathwani",
    approver_position: "Data Protection Officer",
    approval_date: "2026-07-15",
    review_triggers: [] as string[],
  },

  stage: "submitted",
};

export const LIA_PERFECT_PINNED: GoldenCase[] = [
  {
    id: "lia-perfect-eu-clean",
    tool: "lia",
    set: "tuning",
    intake: {
      ...base,
      preview_assessment_id: "lia-perfect-eu-clean-0001",
      balancing_details: {
        ...base.balancing_details,
        // Severe harm PAIRED WITH recorded safeguards — build.ts's
        // materialHarm-failing branch requires BOTH materialHarm AND an
        // empty safeguards array to push "balancing" onto `failing`; a
        // non-empty array here keeps the record on the clean-pass path.
        safeguards: ["Access controls", "Encryption in transit and at rest"],
      },
    },
    assertions: [],
  },
  {
    id: "lia-perfect-eu-mitigations-required",
    tool: "lia",
    set: "tuning",
    intake: {
      ...base,
      preview_assessment_id: "lia-perfect-eu-mitigations-required-0001",
      balancing_details: {
        ...base.balancing_details,
        // Identical record, safeguards withdrawn: same "Severe" harm now
        // triggers build.ts's failing.push("balancing") — a COMPLETE record
        // (nothing missing) with a substantive mitigations-required outcome.
        safeguards: [] as string[],
      },
    },
    assertions: [],
  },
];
