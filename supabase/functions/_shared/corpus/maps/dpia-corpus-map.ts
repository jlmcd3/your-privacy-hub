// DPIA — Curated Attachment Map (Phase 1: FC-L logic-triage set).
// Built per doc 52 §6 against the live EDPB corpus (queried 2026-08-22,
// snapshot: tests/edge/corpus/__snapshots__/corpus-snapshot-dpia.json).
// factor_id values are the EXACT labels in DPIA_MATRIX_ROWS
// (supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts).
//
// WP248 criteria ↔ REASONS_TO_CONDUCT sweep (doc 52 §6 required set):
// REASONS_TO_CONDUCT (src/pages/DPIAFramework.enums.ts) offers a direct
// option for 8 of WP248's 9 criteria (evaluation/scoring; automated
// decision-making; sensitive/highly-personal data; large-scale
// processing; matching/combining datasets; vulnerable subjects;
// innovative technology; processing that prevents exercising a right).
// The 9th criterion — "systematic monitoring" in its GENERAL WP248 form
// — has NO matching option: REASONS_TO_CONDUCT only offers the narrower
// Art. 35(3)(c) mandatory-trigger phrasing ("Large-scale systematic
// monitoring of a public area"), but WP248's own worked example
// (snapshot row 792b08dd) applies "Systematic monitoring" to a company
// monitoring its EMPLOYEES' workstations and internet activity — neither
// large-scale nor a public area. Filed as PN-CORPUS-L-DPIA-1.

import type { CorpusMap } from "../cam-types.ts";

// WAVE C2 (2026-08-23, doc 57 / doc 63 §4 — CEO-ratified via the Fable
// block's advance acceptance): the determinism fix's build-time record,
// the WP248 FC sweep, and the S0 folds.
//
// AP/AOW ROWS ARE RECORD-ONLY FOR THE ENFORCEMENT SURFACE (unlike Risk/
// ADMT): DPIA's release-1 precedent list is a FIXED set of 6 verified
// rows (doc 57 §2a), not conditionally gated by fired states, and the
// `<EnforcementPrecedents>` React component (src/components/report-
// bodies/DPIAReportBody.tsx) needs a raw-fact shape (statutory_provisions,
// key_compliance_failure, etc.) that CamApDisplay's curated-prose fields
// don't carry. The 6 AP rows below are the CEO-ratified CUSTOMER-PROSE
// record (matter/what_happened/bearing) and the S3 ToA-trail admission;
// the actual runtime feed is the sibling pinned literal
// `dpia-enforcement-precedents-pinned.ts`, cross-referenced by the same
// 6 source_row_ids and kept in sync by dpia-c2-determinism.test.ts.
// `render_when: ["dpia_ap_record"]` is a fixed, always-true marker —
// these rows are NOT attached via attachCorpusRows at runtime.
//
// The AOW row (Prior consultation) is DIFFERENT: it renders inside the
// deterministic skeleton (dpia-skeleton-assemble.ts's Art. 36 composition)
// via a genuine attachCorpusRows call gated on the report's own
// consultation_required state — the same pattern as Risk/ADMT's AOWs.
//
// 49f63867 (WP248: a DPIA may be required again after a risk change) was
// investigated and NOT filed as a row: no DPIA_MATRIX_ROWS factor exists
// for the ongoing review/update obligation (the nearest branch,
// dpia-deliverables/minimal-units.ts's fixed review_schedule constant, is
// a governance fact, not a determination) — forcing it onto an ill-fitting
// factor would violate the Factor-Bearing Law's own admission test more
// than excluding it does. Filed here as the exclusion record, not silently
// dropped (the doc 52 "report ≠ assessment" precedent).
export const DPIA_CORPUS_MAP: CorpusMap = {
  product: "dpia",
  map_version: "dpia-cam-v2-2026-08-23",
  snapshot_file: "tests/edge/corpus/__snapshots__/corpus-snapshot-dpia.json",
  rows: [
    {
      id: "dpia/dpia-requirement-high-risk-trigger/01",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "792b08dd-43b8-49e2-93bf-edd398d11adf",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The gathering of public social media data for generating profiles. - Evaluation or scoring. - Data processed on a large scale.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/DPIAFramework.enums.ts:REASONS_TO_CONDUCT",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "WP248's worked example ties 'Evaluation or scoring' directly to a profiling scenario. REASONS_TO_CONDUCT offers 'Evaluation or scoring (incl. profiling / prediction)' as a direct, dedicated intake option feeding this factor's reportDetermination sentence.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/02",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "792b08dd-43b8-49e2-93bf-edd398d11adf",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "A company systematically monitoring its employees’ activities, including the monitoring of the employees’ work station, internet activity, etc. - Systematic monitoring. - Data concerning vulnerable data subjects.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/DPIAFramework.enums.ts:Systematic monitoring (of employees, a defined population, or a non-public space)",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "WP248 applies the general 'Systematic monitoring' criterion to employee/workplace monitoring — neither large-scale nor a public area. REASONS_TO_CONDUCT previously had no such general option (only 'Large-scale systematic monitoring of a public area (Art. 35(3)(c))', which does not cover this WP248 example). RESOLVED 2026-08-22 (phase-2 redline, PN-CORPUS-L-DPIA-1): a general 'Systematic monitoring (of employees, a defined population, or a non-public space)' option was added to REASONS_TO_CONDUCT (and its two mirror copies, DPIA_REASONS in the intake contract and DPIA_REASONS_TO_CONDUCT in field-enums.ts).",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/03",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "792b08dd-43b8-49e2-93bf-edd398d11adf",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "However, in some cases, a data controller can consider that a processing meeting only one of these criteria requires a DPIA.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: true,
      logic_disposition: {
        kind: "declined",
        reason:
          "WP248 itself declines to fix a numeric criteria-count threshold — it states that meeting even ONE criterion can require a DPIA, and that meeting more criteria only makes a DPIA MORE likely, not mechanically required. The product's reportDetermination for this factor states the Company's own recorded reasons verbatim (values.reasonsToConduct) and does not count or adjudicate them against a threshold. Hard-coding a 'two or more criteria required' rule into the product would MISSTATE WP248's own flexible standard, so no engine change is warranted here — this is the correct legal position, not a gap.",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "The WP248 'two-criteria' folk rule doesn't survive contact with WP248's own text. Filed as declined per doc 52 §6's worked exemplar — the product's current single-select-and-recite behavior is already correct.",
      trail_impact:
        "Article 29 WP, WP248 rev.01 (EDPB-endorsed) — criteria guide the analysis; the guidance itself declines a numeric criterion count — interpretive; persuasive (precedent appendix): AEPD, AENA (2025); AP (NL), ICS (2024) — failure-to-assess class",
    },
    {
      id: "dpia/necessity-and-proportionality/01",
      factor_id: "Necessity and proportionality",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "e9a2ce18-ca41-4a9b-8ccc-782ab4eb94d0",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "an assessment of the necessity and proportionality of the processing operations in relation to the purposes;",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts:section2_coverage",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "Art. 35(7)(b) requires 'an assessment of the necessity and proportionality' as one of a DPIA's four minimum elements. The engine's report.section2_coverage namespace tracks per-element coverage (e.g. section2_coverage.data_minimisation_retention) that this factor's reportDetermination reads via tableRowCount, rather than asserting necessity/proportionality coverage unconditionally.",
    },
    {
      id: "dpia/article-5-principles-accountability-measures/01",
      factor_id: "Article 5 principles / accountability measures",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "e9a2ce18-ca41-4a9b-8ccc-782ab4eb94d0",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "the measures envisaged to address the risks, including safeguards, security measures and mechanisms to ensure the protection of personal data",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts:section2_coverage",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "Art. 35(7)(d) requires 'the measures envisaged to address the risks' as a DPIA's fourth minimum element. This factor's reportDetermination reads tableRowCount(tables, ['section2_coverage.measures_article5']) — the same section2_coverage namespace as the necessity/proportionality row, keyed to the (d)-element sub-table rather than the (b)-element one.",
    },
    {
      id: "dpia/prior-consultation/01",
      factor_id: "Prior consultation",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "2b908008-47df-4f97-a267-4917b3351c6d",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "Whenever the data controller cannot find sufficient measures to reduce the risks to an acceptable level (i.e. the residual risks are still high), consultation with the supervisory authority is required",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts:composeArt36Sentence",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "WP248 ties the Art. 36(1) consultation duty to residual risk that CANNOT be sufficiently mitigated, not merely a numerically 'high' risk label. composeArt36Sentence's consultation_required branch states exactly that: the DPIA 'concludes that the intended processing would still result in a high risk that the company cannot sufficiently mitigate through the measures it has recorded' — matching WP248's 'cannot find sufficient measures to reduce the risks to an acceptable level' standard, not a bare severity threshold.",
    },

    // ── WAVE C2 — FC-L additions (logic-bearing; doc 57 §2b) ────────────
    {
      id: "dpia/views-of-data-subjects-representatives/01",
      factor_id: "Views of data subjects / representatives",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "2d056098-c15b-451c-8558-7d8bef78cd4d",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "Although it should be noted that consent to processing is obviously not a way for seeking the views of the data subjects",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts:dataSubjectsViewsSlot",
      },
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "WP248 explicitly rules out consent as a way of seeking data-subject views — a distinct question from whether the processing has a lawful basis. dataSubjectsViewsSlot() renders the views-of-subjects sentence from attributed verbatim views OR the honest negative that none were sought; there is no branch that reads a consent answer as satisfying this factor, consistent with WP248's position.",
      trail_impact:
        "WP248 rev.01 — consent is not a means of seeking data-subject views; views are recorded verbatim or their absence stated — interpretive",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/04",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "090e45c9-1744-4662-96a2-0dc36c3eebcf",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "In such cases the controller should justify and document the reasons for not carrying out a DPIA",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts:label: \"DPIA requirement / high-risk trigger\"",
      },
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "WP248 requires that a controller who decides against a DPIA document its reasons. This factor's reportDetermination states the Company's own recorded reasons for its trigger conclusion verbatim (the same mechanism the declined row 03 above verified) rather than asserting a bare 'not required' conclusion — consistent with the documentation duty.",
    },

    // ── WAVE C2 — FC-J bulk (dark; doc 57 §2b) ──────────────────────────
    {
      id: "dpia/dpia-requirement-high-risk-trigger/05",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "9a8bc2a6-cec9-4687-aa50-0f3f7da0852d",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "this is meant as a non-exhaustive list. There may be",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "Article 35(3)'s three examples are non-exhaustive; WP248's nine criteria extend beyond them. Supports the factor's own non-exhaustive framing.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/06",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "6cf5ee41-3a9a-4302-bdf6-cf9c15db55d0",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "Even though a DPIA could be required in other circumstances, Article 35(3) provides some examples when a processing operation is",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The three statutory Art. 35(3) examples (automated evaluation/profiling with legal/similar effect; large-scale special-category or criminal-conviction processing; large-scale public-area systematic monitoring) — the trigger factor's statutory anchor.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/07",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "caf64824-f50c-4452-8376-1749dba5491b",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "WP29 considers that a DPIA is not required in the following cases: - where the processing is not \"likely to result in a high risk",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The two WP29-recognized not-required cases: no likely high risk, or the processing closely matches previously-assessed similar processing.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/08",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "6d72f482-b7d7-4c3f-9914-cd341e32e277",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The requirement to carry out a DPIA applies to existing processing operations likely to result in a high risk to the rights and freedoms of natural persons and for which there has been a change of the risks",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The trigger applies to existing (not only new) processing whose risk profile has changed — the requirement is not a one-time gate at initial deployment.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/09",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "6abb7a2d-b279-494d-8d59-14cf550d7059",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "The GDPR makes it clear (Article 35(1) and recitals 89 and 91) that the use of a new technology",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "New-technology use, and processing that prevents a data subject from exercising a right or entering a contract, are two further WP248 criteria bearing on the trigger factor beyond the statutory Art. 35(3) examples.",
    },
    {
      id: "dpia/systematic-description-and-purposes/01",
      factor_id: "Systematic description and purposes",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "b8f47ad2-d533-4bcd-96fd-65a6d205a36d",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "A single DPIA could be used to assess multiple processing operations that are similar in terms of nature, scope, context, purpose, and risks.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "Recital 92's single-assessment-for-similar-processing allowance bears on how the systematic description factor may scope multiple related processing operations under one DPIA.",
    },
    {
      id: "dpia/processor-governance/01",
      factor_id: "Processor governance",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "03b8c2d7-05bf-4bee-831e-243336334c14",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "the roles and responsibilities of the processors must be contractually defined; and the DPIA must be carried out with the processor’s help",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The processor-assistance duty for DPIAs (Art. 28(3)(f)) — processor roles must be contractually defined and the processor must help carry out the DPIA.",
    },
    {
      id: "dpia/prior-consultation/02",
      factor_id: "Prior consultation",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "a2ba9bad-fed6-461c-be6c-64ad913d35f7",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "if the risks have been considered as sufficiently reduced by the data controller and following the reading of Article 36(1) and recitals 84 and 94, the processing can proceed without consultation with the supervisory authority",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The worked example (laptop encryption) illustrating exactly the consultation_required/not-required boundary the phase-1 declined-then-implemented row above states in the abstract.",
    },
    {
      id: "dpia/prior-consultation/03",
      factor_id: "Prior consultation",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "60a4f110-5890-4f84-b1e2-c969ebf64983",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "regardless of whether or not consultation with the supervisory is required based on the level of residual risk then the obligations of retaining a record of the DPIA and updating the DPIA in due course remain",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "Record-retention and update obligations survive regardless of the consultation determination — the consultation factor's own scope boundary (it governs only the supervisory-authority step, not the underlying record duties).",
    },
    {
      id: "dpia/necessity-and-proportionality/02",
      factor_id: "Necessity and proportionality",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "a9092df8-411f-4d5f-9d95-0b1a551bbe3f",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "necessity and proportionality are assessed (Article 35(7)(b))",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "WP29's Annex 2 acceptable-DPIA checklist names necessity-and-proportionality assessment as a discrete criterion under Art. 35(7)(b), alongside the systematic-description and measures-envisaged criteria this map's other rows cover.",
    },

    // ── WAVE C2 — S0 folds (pinned; doc 57 §2c, the two live WP248 intake
    // pins fold onto the CAM — bookkeeping + CI, per doc 57's own framing;
    // the live hook already falls back to this exact pinned text on any
    // miss, so this closes the residual drift exposure rather than fixing
    // a live bug). Source: DPIA_VERIFIED_AUTHORITIES (dpia-verified-
    // authorities.ts), consumed by src/components/dpia/EdpbDpiaGuidance.ts.
    {
      id: "dpia/dpia-requirement-high-risk-trigger/s0-01",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "792b08dd-43b8-49e2-93bf-edd398d11adf",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "In general, the WP29 considers that the more criteria are met by the processing, the more likely it is to present a high risk to the rights and freedoms of data subjects, and therefore to require a DPIA, regardless of the measures which the controller envisages to adopt. However, in some cases, a data controller can consider that a processing meeting only one of these criteria requires a DPIA.",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "action",
      s0_field: "0.5.reasons",
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The DPIA intake's '0.5 DPIA technical sheet — reasons to conduct' field callout (WP248_CRITERIA, dpia-verified-authorities.ts:444-454). Pins the exact verbatim quote useEdpbGuidelineRailEntry already falls back to on any live-fetch miss.",
    },
    {
      id: "dpia/necessity-and-proportionality/s0-01",
      factor_id: "Necessity and proportionality",
      role: "FC",
      source_table: "edpb_guidelines",
      source_row_id: "b61c71f6-f03b-4eb7-a5ce-6e292f696bf5",
      excerpt_field: "excerpt_text",
      pinned_excerpt:
        "origin, nature, particularity and severity of the risks are appreciated (cf. recital 84) or, more specifically, for each risk (illegitimate access, undesired modification, and disappearance of data) from the perspective of the data subjects",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "action",
      s0_field: "4.1.c",
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The DPIA intake's '4.1.3 Inherent risk assessment — severity appraisal' field callout (WP248_SEVERITY, dpia-verified-authorities.ts:455-465). Pins the exact verbatim quote useEdpbGuidelineRailEntry already falls back to on any live-fetch miss.",
    },

    // ── WAVE C2 — S5 release-1 (record-only; see file-header note) ──────
    {
      id: "dpia/dpia-requirement-high-risk-trigger/ap-01",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "AEPD (Spain) — AENA, S.M.E., S.A. (2025)",
        what_happened:
          "Spain's supervisory authority fined the national airport operator €10,043,002 for breaching Article 35(7): its impact assessment for biometric passenger processing omitted the required analysis of the suitability, necessity and proportionality of the processing.",
        bearing:
          "The fine attached to the QUALITY of the assessment itself — an incomplete Article 35(7) analysis was treated as a standalone violation. The rigor of this report's necessity-and-proportionality section is what that class of enforcement tests.",
        authority_label:
          "AEPD (Spain), AENA, S.M.E., S.A., decision of 6 November 2025, ref. EXP202304532 — persuasive authority",
        trail_cite: "AEPD, AENA (2025)",
      },
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "AENA, S.M.E., S.A.",
        jurisdiction: "Spain",
        decision_date: "2025-11-06",
        case_reference: "EXP202304532",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01) —
      // terms grounded verbatim in this row's own what_happened text.
      advisory_terms: ["biometric passenger processing", "airport", "biometric screening"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "Release-1 AP #1 (doc 63 §4.1) — the pure failure-to-assess anchor, same source row as Risk's ap-01.",
    },
    {
      id: "dpia/dpia-requirement-high-risk-trigger/ap-02",
      factor_id: "DPIA requirement / high-risk trigger",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "dc095815-d03d-4bb2-b3be-2711e7f7d459",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "AP (Netherlands) — International Card Services B.V. (2024)",
        what_happened:
          "The Dutch supervisory authority fined ICS €150,000 for failing to conduct a data protection impact assessment before introducing a digital identification process involving sensitive personal data.",
        bearing:
          "The obligation enforced was the one this report discharges: assess BEFORE deploying. No underlying misuse was required — not assessing was the violation.",
        authority_label:
          "AP (Netherlands), International Card Services B.V., decision of 15 January 2024 — persuasive authority",
        trail_cite: "AP (NL), ICS (2024)",
      },
      citation_source: {
        regulator: "AP (Netherlands)",
        subject: "International Card Services B.V.",
        jurisdiction: "Netherlands",
        decision_date: "2024-01-15",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["digital identification", "identity verification", "onboarding"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Release-1 AP #2 (doc 63 §4.1) — the clean small-scale failure-to-assess analog.",
    },
    {
      id: "dpia/lawful-basis/ap-01",
      factor_id: "Lawful basis",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "a3cf40b0-3625-4e78-bbe9-63624f17ceb0",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "Garante (Italy) — Poste Italiane S.p.a. (2026)",
        what_happened:
          "Italy's authority fined Poste Italiane €6,624,000 over a fraud-prevention tool that processed customer data excessively, without a sufficient legal basis, adequate transparency, or adequate protection measures.",
        bearing:
          "A legitimate security purpose did not excuse the basis and minimisation analysis — the factors this report documents for each processing operation.",
        authority_label:
          "Garante (Italy), Poste Italiane S.p.a., decision of 17 April 2026 — persuasive authority",
        trail_cite: "Garante, Poste Italiane (2026)",
      },
      citation_source: {
        regulator: "Garante (Italy)",
        subject: "Poste Italiane S.p.a.",
        jurisdiction: "Italy",
        decision_date: "2026-04-17",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["fraud prevention", "fraud detection"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Release-1 AP #3 (doc 63 §4.1) — lawful-basis and minimisation failure despite a legitimate purpose.",
    },
    {
      id: "dpia/systematic-description-and-purposes/ap-01",
      factor_id: "Systematic description and purposes",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "b3a1a34f-9138-4f93-bcea-9286f9534fe9",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "Garante (Italy) — Deliveroo Italy s.r.l. (2021)",
        what_happened:
          "Italy's data protection authority fined Deliveroo €2,500,000 after finding it failed to adequately inform riders about algorithmic decision-making, processed excessive location data, applied inappropriate retention, and lacked adequate security measures and a required impact assessment.",
        bearing:
          "The missing impact assessment was among the violations fined; the algorithmic-management processing this decision addresses is the same class of systematic, purpose-specific processing this factor documents.",
        authority_label:
          "Garante (Italy), Deliveroo Italy s.r.l., decision of 22 July 2021 — persuasive authority",
        trail_cite: "Garante, Deliveroo (2021)",
      },
      citation_source: {
        regulator: "Garante (Italy)",
        subject: "Deliveroo Italy s.r.l.",
        jurisdiction: "Italy",
        decision_date: "2021-07-22",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["algorithmic decision-making", "gig economy", "delivery riders", "location data"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Release-1 AP #4 (doc 63 §4.1) — same source row as Risk's ap-02 and ADMT's ap-01.",
    },
    {
      id: "dpia/special-category-condition/ap-01",
      factor_id: "Special-category condition",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "e58dfa97-b038-4ffa-9ca4-2b9aba436bbb",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "AEPD (Spain) — CARTONAJES BAÑERES, S.A. (2024)",
        what_happened:
          "Spain's authority fined the company €220,000 for biometric clock-in processing — photographing employees' faces at the entrance — without informed consent, and for ignoring an access request.",
        bearing:
          "Employee biometrics are special-category data on both sides of the analogy; the special-category condition this report analyses is the safeguard that processing lacked.",
        authority_label:
          "AEPD (Spain), CARTONAJES BAÑERES, S.A., decision of 5 January 2024, ref. EXP202212247 — persuasive authority",
        trail_cite: "AEPD, Cartonajes Bañeres (2024)",
      },
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "CARTONAJES BAÑERES, S.A.",
        jurisdiction: "Spain",
        decision_date: "2024-01-05",
        case_reference: "EXP202212247",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["biometric clock-in", "facial recognition", "time and attendance"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Release-1 AP #5 (doc 63 §4.1) — special-category biometric processing without consent.",
    },
    {
      id: "dpia/data-subject-rights/ap-01",
      factor_id: "Data-subject rights",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "dbfca969-3139-43d1-8a5b-7fff179f8db6",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["dpia_ap_record"],
      display: {
        matter: "Garante (Italy) — Comune di Bolzano (2021)",
        what_happened:
          "Italy's authority fined the municipality €84,000 for unlawfully monitoring employees' internet use and processing health data without a valid basis or adequate transparency.",
        bearing:
          "Workplace monitoring is among the processing contexts this assessment evaluates; the violations were basis and transparency — factors this report resolves before reaching data-subject rights.",
        authority_label:
          "Garante (Italy), Comune di Bolzano, decision of 13 May 2021 — persuasive authority",
        trail_cite: "Garante, Bolzano (2021)",
      },
      citation_source: {
        regulator: "Garante (Italy)",
        subject: "Comune di Bolzano",
        jurisdiction: "Italy",
        decision_date: "2021-05-13",
      },
      // DOC 132 (Track A advisory surfacing, CEO-ratified 2026-09-01).
      advisory_terms: ["employee monitoring", "internet usage monitoring", "workplace monitoring"],
      direction: "supports",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note: "Release-1 AP #6 (doc 63 §4.1) — workplace-monitoring basis/transparency failure.",
    },
    {
      id: "dpia/prior-consultation/aow-01",
      factor_id: "Prior consultation",
      role: "AOW",
      source_table: "enforcement_actions",
      source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "consequence",
      render_when: ["consultation_required"],
      warning_text:
        "Caution. Supervisory authorities treat the assessment obligations themselves as enforceable: an impact assessment that omitted the required necessity-and-proportionality analysis drew a fine of €10,043,002 (AEPD, AENA, 2025), and failing to assess before deployment drew a standalone fine (AP (Netherlands), ICS, 2024). This report's determination that prior consultation is required makes completing and documenting that consultation the operative next step. The decisions cited are persuasive context only.",
      direction: "limits",
      logic_bearing: false,
      provenance: { verified_on: "2026-08-23" },
      curation_note:
        "The release-1 AOW (doc 63 §4.2): bound to the consultation_required state the skeleton already computes (composeArt36Sentence). Placement: inside the Prior Consultation determination, the same one-warning-adjacent-to-the-adverse-determination pattern as Risk's AOW.",
    },
  ],
};
