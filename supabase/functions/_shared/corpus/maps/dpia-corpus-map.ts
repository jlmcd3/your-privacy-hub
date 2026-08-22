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

export const DPIA_CORPUS_MAP: CorpusMap = {
  product: "dpia",
  map_version: "dpia-cam-v1-2026-08-22",
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
  ],
};
