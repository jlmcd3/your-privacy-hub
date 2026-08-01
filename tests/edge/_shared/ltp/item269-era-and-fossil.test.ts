// ITEM 269 — era normalizer + fossil-note-on-present coherence rule.
//
// FIXTURE PROVENANCE: quality_archive.quality_run_documents_20260728
//   doc id 89ee89d5-b404-43f1-adb7-918a52d5c30c (one of the 26 ramp-3
//   pre-realignment write-around docs). intake_data read READ-ONLY and
//   recorded verbatim below.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { normalizeEraIntake, ERA_NORMALIZER_VERSION } from "./replay/era-normalize.ts";
import {
  screenPresentNoteCoherence,
  PASS1_COHERENCE_VERSION,
  MASS_ABSENCE_ABORT_THRESHOLD,
} from "./pass1-present-note-coherence.ts";
import type { FactorTableEntry } from "../render-plan/schema.ts";

// ── VERBATIM ERA FIXTURE (doc 89ee89d5-b404-43f1-adb7-918a52d5c30c) ──────
const ERA_INTAKE: Record<string, unknown> = {
  triggers: {
    admt_involved: false,
    sells_or_shares_pi: true,
    targeted_advertising: true,
    high_volume_processing: true,
    profiling_significant_effects: false,
    sensitive_pi_beyond_enumerated: false,
  },
  annual_consumer_volume: "Over 10 million",
  org_context: {
    sector: "AdTech / Digital Media Publishing",
    company_name: "Meridian Audience Network, Inc.",
    additional_context:
      "Company is in the process of evaluating a Consent Management Platform deployment but has not committed to a timeline. External privacy counsel engaged in Q1 2024 flagged GPC non-compliance; remediation roadmap presented to CTO but not yet approved or resourced.",
    board_level_oversight: false,
    dpo_or_privacy_officer: true,
    privacy_counsel_engaged: true,
    annual_revenue_threshold: "$100M–$500M",
    existing_privacy_programme:
      "Formal privacy programme exists on paper — privacy policy, DPA templates, and DAA membership — but operational controls are fragmented across legal, engineering, and revenue ops with no single accountability structure. No privacy-by-design process embedded in product development.",
    cppa_audit_notification_received: false,
  },
  impact: {
    harm_types: [
      "Unauthorised disclosure",
      "Reputational harm",
      "Chilling effects on free expression",
      "Identity theft / fraud",
    ],
    severity_of_harm: "Moderate",
    likelihood_of_harm: "Likely",
    prior_assessment_date: "",
    benefits_outweigh_risks: "Uncertain",
    prior_assessments_conducted: false,
    cybersecurity_gaps_identified: true,
    vulnerable_populations_detail:
      "No specific vulnerable population targeting identified, but general public audience includes individuals who may be experiencing financial hardship or health conditions, whose browsing behavior is captured and inferred without their meaningful awareness.",
    benefits_outweigh_risks_rationale:
      "Revenue dependency on data sharing is significant, but the breadth of third-party PI disclosure, contested transient-use exception, and incomplete GPC compliance mean consumers bear non-trivial re-identification and secondary-use risks that the current safeguard framework does not adequately address. Mitigation of GPC gaps and mobile opt-out would shift the balance, but those remediations are not yet scheduled.",
  },
  exceptions: {
    debugging: { scope: "", claimed: false, documented: false, safeguards: "" },
    transient_use: {
      scope:
        "Company asserts that behavioral signals (click-stream, dwell time, ad-interaction events) are used only in-session and discarded within 24 hours, never persisted to a user-level profile. However, cross-device graph vendor receives a hashed email and device fingerprint that persists for 90 days.",
      claimed: true,
      documented: false,
      safeguards:
        "Contractual data-processing addendum with ad-exchange partners; alleged 24-hour TTL on raw event data in Kafka topics. No technical enforcement mechanism has been independently verified; retention logs unavailable for audit.",
    },
    fraud_detection: { scope: "", claimed: false, documented: false, safeguards: "" },
    consumer_request: { scope: "", claimed: false, documented: false, safeguards: "" },
    legal_compliance: { scope: "", claimed: false, documented: false, safeguards: "" },
    internal_research: { scope: "", claimed: false, documented: false, safeguards: "" },
    employment_context: { scope: "", claimed: false, documented: false, safeguards: "" },
    security_integrity: { scope: "", claimed: false, documented: false, safeguards: "" },
  },
  activity_details: [
    {
      known_gaps:
        "GPC opt-out signal is not consistently honored across all ad-tech integrations — approximately 30% of DSP partners do not receive the suppression signal in real time. No opt-out for sale mechanism on mobile app. Data broker downstream re-identification risk not assessed. Transient-use exception is contested because 90-day cross-device graph persistence undermines the claim.",
      trigger_key: "sells_or_shares_pi",
      data_categories: ["identifiers", "browsing/search history", "inferences", "location"],
      business_benefits:
        "Generates approximately 62% of total company revenue; funds platform development and content licensing.",
      children_in_scope: false,
      consumer_benefits:
        "Consumers receive free access to news and entertainment content subsidised by advertising revenue.",
      current_safeguards:
        "Privacy policy discloses data sharing; opt-out link present via GPC signal detection (partially implemented); contractual SCCs with DSP partners; pseudonymous IDs used instead of raw emails in bid stream.",
      consumer_categories: ["website visitors", "general public"],
      purpose_description:
        "Syndication of pseudonymous audience segments — built from first-party browsing history, inferred interest categories, and IP-derived location — to approximately 140 programmatic demand-side platforms and data brokers via real-time bidding infrastructure. Revenue is generated on a CPM basis per segment match.",
      profiling_inferences: true,
      cross_context_tracking: true,
      third_party_recipients:
        "Approximately 140 DSPs including The Trade Desk, Xandr, Google DV360; three data enrichment brokers (LiveRamp, Neustar, Acxiom); one data clean room operator.",
    },
    {
      known_gaps:
        "No preference centre or granular consent management platform deployed. Mobile app tracking (ATT framework) opt-out not linked to DSP suppression. Cross-context data use from non-affiliate sites not disclosed with sufficient specificity in privacy notice. No data-minimisation review conducted for third-party pixel integrations in the last 18 months.",
      trigger_key: "targeted_advertising",
      data_categories: ["browsing/search history", "inferences", "identifiers", "location"],
      business_benefits:
        "Targeted ads yield 4–6x higher CPM rates versus contextual ads, directly impacting publisher yield and viability.",
      children_in_scope: false,
      consumer_benefits:
        "Theoretically reduces irrelevant ad exposure; however, no personalisation preference centre is offered to consumers.",
      current_safeguards:
        "AdChoices icon displayed on served ads; DAA opt-out supported on desktop only; internal ad-serving suppression list maintained for opted-out users.",
      consumer_categories: ["website visitors", "general public"],
      purpose_description:
        "Behaviorally targeted advertising delivered on-site and via retargeting pixels, using inferred audience segments (e.g., 'in-market auto buyer,' 'health-conscious shopper') derived from cross-site browsing history obtained through third-party cookie syncs and identity resolution partnerships.",
      profiling_inferences: true,
      cross_context_tracking: true,
      third_party_recipients:
        "Meta Pixel, Google Ads tag, DoubleVerify, Integral Ad Science, Criteo retargeting.",
    },
    {
      known_gaps:
        "Legacy unencrypted event tables covering approximately 34 months of historical data have not been remediated. No automated data-minimisation or field-level purge process. Retention policy enforcement is manual and audit trail incomplete. No Privacy-by-Design review was conducted when the event pipeline was expanded in Q3 2022.",
      trigger_key: "high_volume_processing",
      data_categories: ["identifiers", "browsing/search history", "inferences", "location", "other"],
      business_benefits:
        "Enables real-time audience segmentation refresh, improves ad fill rates, and supports yield optimisation models used by the revenue operations team.",
      children_in_scope: false,
      consumer_benefits:
        "Minimal direct consumer benefit; processing supports platform stability and content recommendation features.",
      current_safeguards:
        "Cloud data warehouse access controls with role-based permissions; data retention policy of 13 months (not consistently enforced); TLS in transit; no data-at-rest encryption for legacy event tables pre-2021.",
      consumer_categories: ["website visitors", "general public"],
      purpose_description:
        "Continuous ingestion and processing of event-stream data from over 18 million monthly unique visitors across owned-and-operated properties, including page-view sequences, session durations, scroll depth, ad engagement metrics, and device telemetry, routed through a cloud data warehouse for audience analytics and monetisation pipeline enrichment.",
      profiling_inferences: false,
      cross_context_tracking: true,
      third_party_recipients:
        "Snowflake (cloud data warehouse); Segment (CDP); internal analytics team; revenue operations team.",
    },
  ],
};

// ── FIX 1 — era normalizer ──────────────────────────────────────────────
Deno.test("item269 fix1 — era intake gains mapped modern keys via the reused production mapping", () => {
  const { intake, telemetry } = normalizeEraIntake(ERA_INTAKE);
  assertEquals(telemetry.applied, true);
  assertEquals(telemetry.version, ERA_NORMALIZER_VERSION);
  assert(telemetry.mapped_keys > 0, `expected mapped keys, got ${telemetry.mapped_keys}`);
  // q2_consumers is mapped from annual_consumer_volume and band-resolved.
  assertEquals(intake.q2_consumers, "1,000,000 or more");
  assert(telemetry.band_labels_resolved.some((s) => s.startsWith("q2_consumers:")));
  // q5_sell_share mapped from triggers.sells_or_shares_pi.
  assertEquals(intake.q5_sell_share, "Yes");
  // q15_sensitive_pi mapped from triggers.sensitive_pi_beyond_enumerated.
  assertEquals(intake.q15_sensitive_pi, "No");
  console.log("mapped_key_names:", JSON.stringify(telemetry.mapped_key_names));
  console.log("band_labels_resolved:", JSON.stringify(telemetry.band_labels_resolved));
});

Deno.test("item269 fix1 — unmapped legacy keys pass through untouched; no invention", () => {
  const { intake, telemetry } = normalizeEraIntake(ERA_INTAKE);
  for (const k of ["triggers", "org_context", "impact", "exceptions", "activity_details", "annual_consumer_volume"]) {
    assert(k in intake, `${k} must pass through`);
  }
  assertEquals(intake.org_context, ERA_INTAKE.org_context);
  // RESIDUAL GAP: q1_revenue is deliberately NOT back-filled from
  // org_context.annual_revenue_threshold (RC-A A5 single-truth rule).
  assertEquals("q1_revenue" in intake, false);
  // No narrative contract keys are invented.
  for (const k of ["i1_processing_purpose", "i6_vendors", "entity_name", "q3_sector", "q4_pi_categories"]) {
    assertEquals(k in intake, false, `${k} must NOT be invented`);
  }
  console.log("unmapped_legacy_keys:", JSON.stringify(telemetry.unmapped_legacy_keys));
});

Deno.test("item269 fix1 — modern flat intake is returned untouched", () => {
  const modern = { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", entity_name: "Acme" };
  const { intake, telemetry } = normalizeEraIntake(modern);
  assertEquals(telemetry.applied, false);
  assertEquals(telemetry.mapped_keys, 0);
  assertEquals(intake, modern);
});

// ── FIX 2 — fossil note on present row ──────────────────────────────────
function row(id: string, present: boolean, note: string): FactorTableEntry {
  return {
    factor_id: id,
    kind: "negative",
    jurisdiction_tag: "cppa-ca",
    present_in_intake: present,
    intake_ledger_refs: ["L.entity_name"],
    guidance_refs: [],
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    display_label: id,
    weight_note: note,
  } as unknown as FactorTableEntry;
}

Deno.test("item269 fix2 — present row carrying the canonical no-evidence note is rewritten to absent", () => {
  assert(PASS1_COHERENCE_VERSION.includes("item269-fossil-note-rule"), PASS1_COHERENCE_VERSION);
  const { factor_table, rewrites } = screenPresentNoteCoherence([
    row("neg.d.coercion_dark_patterns", true, "no record evidence"),
    row("neg.e.economic_harms", true, "No record evidence."),
  ]);
  assertEquals(factor_table.every((r) => r.present_in_intake === false), true);
  assertEquals(rewrites.length, 2);
  for (const rw of rewrites) {
    assertEquals(
      rw.reason,
      "present row carries the canonical no-evidence note — model's own evidence statement adopted",
    );
    assertEquals(rw.field_id, "(weight_note)");
  }
});

Deno.test("item269 fix2 — normal present rows and already-absent rows are untouched", () => {
  const input = [
    row("neg.a.sensitive", true, "Intake records 18 million monthly unique visitors in the event stream."),
    row("neg.b.other", false, "no record evidence"),
  ];
  const { factor_table, rewrites } = screenPresentNoteCoherence(input);
  assertEquals(rewrites.length, 0);
  assertEquals(factor_table[0].present_in_intake, true);
  assertEquals(factor_table[1].present_in_intake, false);
});

Deno.test("item269 fix2 — fossil-note rewrites count toward the mass-absence rate", () => {
  const table = [
    row("neg.a", true, "no record evidence"),
    row("neg.b", true, "no record evidence"),
    row("neg.c", true, "Intake records a 13-month retention policy that is not consistently enforced."),
  ];
  const { rewrites } = screenPresentNoteCoherence(table);
  const rate = rewrites.length / table.length;
  assertEquals(rewrites.length, 2);
  assert(rate > MASS_ABSENCE_ABORT_THRESHOLD, `rate=${rate}`);
});
