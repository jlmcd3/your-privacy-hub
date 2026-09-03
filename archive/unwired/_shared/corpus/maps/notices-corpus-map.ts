// Privacy Notices (EU + US) — Curated Attachment Map.
//
// GROUNDWORK AUDIT (2026-08-26), NOT a Conversion landing. Authored per
// doc 61 (CMP-B8) §1.1's ratified ruling: "the legal-text-assertions.ts
// manifest's entries become AQ rows ... the manually-invoked lint becomes
// the standard pin-CI test." That ruling is a CEO-cleared DESIGN (gate
// cleared 2026-08-23, doc 53 Phase B); this file is the first CODE
// implementation of it. Per the RENDER-READINESS LAW (doc 48 §II.6), a
// CAM may be authored in full ahead of a product's own Conversion, but
// every render-eligible surface must stay dark until that Conversion
// ratifies the customer bytes. Notices' generation logic is ALREADY
// deterministic (no model call in generate-eu-notice/generate-us-notice —
// re-verified this session), so the usual render-readiness BLOCKER
// (upstream state not yet code-computed) does not apply here. What DOES
// still block any render_eligible:true row is PN-N1 — the fleet's largest
// unresolved ratification surface (all template sentences, both notices,
// 12 EU/Global frameworks) — no template sentence here has been through a
// CEO redline round. Every row below is therefore render_eligible:false,
// no s2_ratification stamp, wiring left to the Notices N1 landing. Filed
// as a new decision-queue entry (see 03-DECISION-QUEUE.md, "Open —
// Notices") rather than resolved here.
//
// Source: `_shared/legal-text-assertions.ts`'s US_NOTICE_LEGAL_TEXT_ASSERTIONS
// (6 entries) + EU_NOTICE_LEGAL_TEXT_ASSERTIONS (7 entries) = 13 total —
// corrects doc 05 §5 / doc 48 Part I's stale "19 entries" figure (also
// independently found and corrected by doc 78 §4 this session).
//
// factor_id NOTE: unlike Risk/ADMT/DPIA/Cyber/LIA, Notices has no ratified
// factor vocabulary or Determination-appendix (doc 46) — a privacy notice
// states law, it does not weigh factors to reach a determination. Each
// row's factor_id below therefore names the NOTICE SECTION the assertion
// backs (e.g. "US Notice — Right to Delete"), not a determination-appendix
// label. This is a genuine design substitution, not an oversight — flagged
// in the decision-queue addition for explicit CEO/next-session
// confirmation before any row here is ever promoted to render_eligible.
//
// Every pinned_excerpt below was queried LIVE against production
// gdpr_articles/cppa_authorities this session (2026-08-26, via Lovable MCP
// query_database, SELECT-only) — all 13 manifest citations resolved with
// zero corpus_rows_missing and zero phrase_failures across every
// mustContain phrase in the source manifest (verified individually, not
// just the one phrase pinned per row below; see curation_note per row for
// the phrases NOT pinned but independently confirmed present). This is a
// live, positive run of what lint-deterministic-legal-text checks, without
// invoking the admin-only function itself.
//
// Snapshot: tests/edge/corpus/__snapshots__/corpus-snapshot-notices.json

import type { CorpusMap } from "../cam-types.ts";

export const NOTICES_CORPUS_MAP: CorpusMap = {
  product: "notices",
  map_version: "notices-cam-v1-2026-08-26",
  snapshot_file: "tests/edge/corpus/__snapshots__/corpus-snapshot-notices.json",
  rows: [
    // ---- EU notice (EU_NOTICE_LEGAL_TEXT_ASSERTIONS, 7 entries) ----
    {
      id: "notices/eu-lawful-basis/01",
      factor_id: "EU Notice — Lawful Basis (Art. 6)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "e3d9f1ea-994c-41cc-861f-4b79a3e680b0",
      excerpt_field: "body_text",
      pinned_excerpt: "the legitimate interests pursued by the controller or by a third party",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:6 entry (mustContain: consent, legitimate interests, legal obligation). Pin covers 'legitimate interests'; 'consent' and 'legal obligation' independently confirmed present in the same Art. 6(1) body_text this session, not separately pinned (one representative excerpt per manifest entry, per the 13-row 1:1 mapping this map uses).",
    },
    {
      id: "notices/eu-special-category/01",
      factor_id: "EU Notice — Special-Category Processing (Art. 9)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "0fde2f6f-b47b-44ad-9948-f3504705398f",
      excerpt_field: "body_text",
      pinned_excerpt: "the data subject has given explicit consent to the processing of those personal data",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:9 entry (mustContain: explicit consent). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/eu-timing-third-party-source/01",
      factor_id: "EU Notice — Timing When Not Collected From Subject (Art. 14)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "c2bba156-7965-4ad5-943f-5079aea74f80",
      excerpt_field: "body_text",
      pinned_excerpt: "at the latest within one month",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:14 entry (mustContain: one month). Single-phrase entry, fully pinned. NOTE (doc 77 §4 cross-check): this is the manifest's only Article 14 entry; the manifest carries no dedicated Article 13 (collected-from-subject) assertion, and no CAM row therefore exists to distinguish the two — see the decision-queue addition on WP260's Art.13/14 split.",
    },
    {
      id: "notices/eu-representative/01",
      factor_id: "EU Notice — EU Representative (Art. 27 EU)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "e3c5861d-2e7b-4242-811c-9afada520ce3",
      excerpt_field: "body_text",
      pinned_excerpt: "the controller or the processor shall designate in writing a representative in the Union",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:27 entry (mustContain: designate in writing a representative). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/eu-representative-uk/01",
      factor_id: "EU Notice — UK Representative (Art. 27 UK GDPR)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "a9818aa2-5405-4bdd-b04e-36cd11bc3291",
      excerpt_field: "body_text",
      pinned_excerpt: "shall designate in writing a representative in the United Kingdom",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:uk:27 entry (mustContain: representative). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/eu-transfer-safeguards/01",
      factor_id: "EU Notice — International Transfer Safeguards (Art. 46)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "6ad4853d-97a2-4773-85f6-c94d8e7f5c28",
      excerpt_field: "body_text",
      pinned_excerpt: "controller or processor has provided appropriate safeguards",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:46 entry (mustContain: appropriate safeguards). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/eu-transfer-derogations/01",
      factor_id: "EU Notice — Transfer Derogations (Art. 49)",
      role: "AQ",
      source_table: "gdpr_articles",
      source_row_id: "6c84376f-c4f7-445e-8f7b-63d93e9c43c9",
      excerpt_field: "body_text",
      pinned_excerpt: "appropriate safeguards pursuant to Article 46, including binding corporate rules",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs EU_NOTICE_LEGAL_TEXT_ASSERTIONS' gdpr:eu:49 entry (mustContain: appropriate safeguards). Single-phrase entry, fully pinned.",
    },

    // ---- US notice (US_NOTICE_LEGAL_TEXT_ASSERTIONS, 6 entries) ----
    {
      id: "notices/us-general-duties/01",
      factor_id: "US Notice — General Collection Duties (Civ. Code § 1798.100)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "3f9d3fd4-f76d-4c87-a6e3-ce2eb500e9b4",
      excerpt_field: "full_text",
      pinned_excerpt: "General Duties of Businesses that Collect Personal Information",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' Cal. Civ. Code § 1798.100 entry (mustContain: personal information). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/us-right-to-delete/01",
      factor_id: "US Notice — Right to Delete (Civ. Code § 1798.105)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "d175d2ad-19fd-4f8f-aacc-46c4a6a83bed",
      excerpt_field: "full_text",
      pinned_excerpt: "Consumers’ Right to Delete Personal Information",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' Cal. Civ. Code § 1798.105 entry (mustContain: right to delete). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/us-right-to-know/01",
      factor_id: "US Notice — Right to Know (Civ. Code § 1798.110)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "0f92901c-629d-4b5a-97b1-f9443a97dabb",
      excerpt_field: "full_text",
      pinned_excerpt: "Right to Know What Personal Information is Being Collected",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' Cal. Civ. Code § 1798.110 entry (mustContain: right to know). Single-phrase entry, fully pinned.",
    },
    {
      id: "notices/us-response-timing/01",
      factor_id: "US Notice — Response Timing and Authorized Agents (Civ. Code § 1798.130)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "6de9f0b1-7c90-4df4-9333-83f1855f3123",
      excerpt_field: "full_text",
      pinned_excerpt: "within 45 days of receiving a verifiable consumer request",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' Cal. Civ. Code § 1798.130 entry (mustContain: 45 days, authorized agent, extension — 3 phrases). Pin covers '45 days'; 'authorized agent' and 'extension' independently confirmed present in the same § 1798.130 full_text this session at separate positions (pos ~4281, ~2121), not separately pinned (one representative excerpt per manifest entry).",
    },
    {
      id: "notices/us-privacy-policy-content/01",
      factor_id: "US Notice — Privacy Policy Content Requirements (11 CCR § 7011)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "a9e4df36-2acc-4803-b636-ee829d175337",
      excerpt_field: "full_text",
      pinned_excerpt: "The purpose of the privacy policy is to provide consumers",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' 11 CCR § 7011 entry (mustContain: privacy policy, authorized agent — 2 phrases). Pin covers 'privacy policy'; 'authorized agent' independently confirmed present in the same § 7011 full_text this session (pos ~8464, the (H) sub-item on authorized-agent instructions), not separately pinned.",
    },
    {
      id: "notices/us-notice-at-collection/01",
      factor_id: "US Notice — Notice at Collection (11 CCR § 7012)",
      role: "AQ",
      source_table: "cppa_authorities",
      source_row_id: "3717caec-0edc-44cb-ad8c-dae33a9618b9",
      excerpt_field: "full_text",
      pinned_excerpt: "disclosure of their sensitive personal information",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-26" },
      curation_note:
        "Backs US_NOTICE_LEGAL_TEXT_ASSERTIONS' 11 CCR § 7012 entry (mustContain: privacy policy, sensitive personal information — 2 phrases). Pin covers 'sensitive personal information'; 'privacy policy' independently confirmed present in the same § 7012 full_text this session (pos ~3802, the notice's privacy-policy-link requirement), not separately pinned. NOTE (doc 77 §4 cross-check): § 7012(e)(4)'s retention-period-or-criteria fallback and the link-must-jump-to-section rule are NOT separately asserted anywhere in the manifest — see the decision-queue addition.",
    },
  ],
};
