// CPPA Risk — Curated Attachment Map (Phase 1: FC-L logic-triage set).
// Built per doc 52 §4.2 against the live FSOR corpus (queried 2026-08-22,
// snapshot: tests/edge/corpus/__snapshots__/fsor-snapshot-risk.json).
// factor_id values are the EXACT labels in FACTOR_MATRIX_ROWS
// (supabase/functions/_shared/ltp/risk-skeleton-assemble.ts).
//
// Every branch_ref below was read at the cited file/line before this map
// was authored (doc 52 rule: "For every claim you cannot verify in code:
// extension_filed or declined — never a guessed implemented").
//
// CORRECTION TO DOC 27/51/52's OWN ASSUMPTION (logged here and in 52a):
// doc 52 §4.2 expected the § 7150(b)(4) "physical/biological identification"
// position to be an extension_filed gap ("no dedicated enum"). Live
// investigation found the opposite: FSOR row cc52909f-... ties the
// § 7001(ee) "physical or biological identification or profiling"
// definition to the risk-assessment thresholds at §§ 7150(b)(4) AND (6),
// and CPPARiskAssessment.tsx's q5bProfiling / q18bTraining fields
// implement exactly that pairing (systematic-observation/sensitive-
// location profiling at (b)(4)-(5); training-technology profiling at
// (b)(6)). This row is filed IMPLEMENTED, not extension_filed.
//
// The § 7150(b)(2)(A) reasonable-accommodations exemption remains the
// one genuine gap in this set (pre-verified doc 52-authoring-session and
// re-verified this session: no "accommodat" branch in risk-factor-engine.ts
// or CPPARiskAssessment.tsx).

import type { CorpusMap } from "../cam-types.ts";

export const RISK_CORPUS_MAP: CorpusMap = {
  product: "cppa-risk",
  map_version: "cppa-risk-cam-v1-2026-08-22",
  snapshot_file: "tests/edge/corpus/__snapshots__/fsor-snapshot-risk.json",
  rows: [
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/01",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a2ce1f02-665d-4c53-90f6-36e0ecd2dbba",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is when businesses must conduct privacy risk assessments under the California Consumer Privacy Act.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "extension_filed",
        queue_ref: "PN-CORPUS-L-RISK-1",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "The Agency added a reasonable-accommodations carve-out at § 7150(b)(2)(A) for sensitive-PI processing done for legally-required personnel accommodations. Neither risk-factor-engine.ts nor the CPPARiskAssessment.tsx intake has an accommodations branch (grepped this session: zero matches for /accommodat/i in both files) — the (b)(2) sensitive-PI trigger fires unconditionally whenever sensitive PI is processed, with no carve-out for accommodation-driven processing. This is a genuine tree gap, not a citation gap.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/02",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3c5f1bae-a026-4728-b317-0db615e356c2",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether de minimis data sharing should be exempt from risk assessment requirements and whether behavioral advertising thresholds should apply to personal information sharing rules.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/CPPARiskAssessment.tsx:11 CCR § 7150(b)(1)",
      },
      provenance: { page_ref: "Appendix, p. 120", verified_on: "2026-08-22" },
      curation_note:
        "The Agency rejected a de-minimis-sharing exemption from § 7150(b)(1). The (b)(1) trigger in regulatoryFootprint (line 717-720) fires on any q5 sell/share answer with no volume, revenue, or de-minimis gate — consistent with the rejection.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/03",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "5806637b-4208-4ff2-996f-2696814842db",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns whether risk assessments should apply only when a business processes sensitive personal information of one million or more consumers or households in a calendar year.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/CPPARiskAssessment.tsx:11 CCR § 7150(b)(2)",
      },
      provenance: { page_ref: "Appendix, p. 122", verified_on: "2026-08-22" },
      curation_note:
        "The Agency rejected a 1,000,000-consumer volume floor for the § 7150(b)(2) sensitive-PI trigger. The (b)(2) condition (line 721-725: q15 === \"Yes\" || q4.some(SENSITIVE_PI_CATEGORIES)) carries no consumer-count gate — consistent with the rejection.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/04",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "0c0b95a6-d013-4aad-b90b-4c11e0190b80",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the definition of Automated Decision-Making Technology (ADMT) in section 7001(e) is overbroad and should be limited to solely automated decisions with no human involvement.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/CPPARiskAssessment.tsx:materially contributes to",
      },
      provenance: { page_ref: "Appendix, p. 10", verified_on: "2026-08-22" },
      curation_note:
        "The Agency rejected narrowing ADMT to solely-automated, no-human-involvement decisions. The q18 question (line 2051) asks whether ADMT \"makes, OR MATERIALLY CONTRIBUTES TO, decisions with significant effects\" — covering human-in-the-loop use, consistent with the rejection.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/05",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "27aacf0b-e79e-45f6-9509-39b2e778db0d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the list of sensitive locations in 11 CCR § 7150(b) should be explicitly designated as exhaustive or non-exhaustive.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/CPPARiskAssessment.tsx:SENSITIVE_LOCATION_BASIS_OPTS",
      },
      provenance: { page_ref: "Appendix, p. 57", verified_on: "2026-08-22" },
      curation_note:
        "The Agency confirmed the sensitive-location list is closed (\"establishing a closed list of specific physical places\"). The sensitive_location_basis field (line 2038-2049) is a closed enum, SENSITIVE_LOCATION_BASIS_OPTS, rendered as a <select> rather than free text — consistent with the closed-list holding.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/06",
      factor_id: "Regulatory trigger and applicability",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "cc52909f-d9f0-478b-a9c7-44e9a64f5fc0",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether to remove \"profiling\" language and references to vocal intonation, facial expression, and gesture analysis from the definition of biometric information in 11 CCR § 7001(ee).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "src/pages/CPPARiskAssessment.tsx:q5bProfiling",
      },
      provenance: { page_ref: "Appendix, p. 33", verified_on: "2026-08-22" },
      curation_note:
        "The § 7001(ee) 'physical or biological identification or profiling' definition is the basis for the § 7150(b)(4)/(6) thresholds (this row states so directly). q5bProfiling's systematic-observation prong (line 736-739, (b)(4)) and q18bTraining's facial/emotion/biometric prong ((b)(6)) implement exactly that pairing. CORRECTS an assumption in doc 27/51/52: this was expected to be an extension_filed gap (\"no dedicated enum\"); live grep + this FSOR row show it is implemented, just not under the literal words 'physical or biological' in the UI copy.",
    },
    {
      id: "cppa-risk/material-privacy-risk-pathways/01",
      factor_id: "Material privacy-risk pathways",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "36ccaa19-6dc0-4970-966c-317e463ee7e2",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7152(a)(5)(I) addresses how businesses must evaluate possible negative impacts to consumers from targeting or profiling practices.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/risk-factor-engine.ts:could compound each other",
      },
      provenance: { page_ref: "p. 36", verified_on: "2026-08-22" },
      curation_note:
        "The Agency changed 'would' to 'could' across § 7152(a)(5) to constrain harm sentences to possible-not-certain claims. The engine's interdependency sentence (line 1047: \"Two or more identified pathways could compound each other\") and its pathway-materiality sentences throughout Section VII consistently use 'could', never 'would', for harm-certainty claims.",
    },
    {
      id: "cppa-risk/material-privacy-risk-pathways/02",
      factor_id: "Material privacy-risk pathways",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "89c6105e-f589-4a94-bbdc-fd84149a2d6d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether risk assessments must disclose the specific criteria businesses use to determine negative privacy impacts, and whether the list of negative impacts is exhaustive.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/risk-factor-engine.ts:extractPathways",
      },
      provenance: { page_ref: "p. 35", verified_on: "2026-08-22" },
      curation_note:
        "The Agency clarified the § 7152(a)(5) negative-impacts list is non-exhaustive. extractPathways() (line 477) flatMaps over intake.a5_harm_pathways with no closed enum filtering harm types — any Company-entered harm row is included, consistent with a non-exhaustive taxonomy.",
    },
    {
      id: "cppa-risk/processing-purpose-specificity/01",
      factor_id: "Processing purpose specificity",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "41408f4d-6355-499e-8c66-33022becb826",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is how to identify processing purposes in specific, non-generic terms when conducting risk assessments under 11 CCR § 7152(a)(1).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/risk-factor-engine.ts:purpose_specificity_analysis",
      },
      provenance: { page_ref: "p. 34", verified_on: "2026-08-22" },
      curation_note:
        "The Agency added a clarifying example to § 7152(a)(1) on non-generic purpose specificity. The engine's specificity band (line 1637: specificityFacets.length >= 3 / >= 1 / else) operationalizes exactly that non-generic-vs-generic distinction against the Company's own typed facets.",
    },
    {
      id: "cppa-risk/safeguards/01",
      factor_id: "Safeguards",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "673baaee-9e97-4c26-91ee-a78d5cc32bae",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue concerns whether the list of safeguards in section 7152(a)(6)(A) is exhaustive or merely illustrative.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/risk-factor-engine.ts:materialSafeguards",
      },
      provenance: { page_ref: "p. 37", verified_on: "2026-08-22" },
      curation_note:
        "The Agency clarified the § 7152(a)(6)(A) safeguards list is illustrative, not exhaustive. materialSafeguards (line 1106) filters on materiality + status rank only; g.safeguard is free text with no closed-category check, so any Company-described safeguard qualifies.",
    },
    {
      id: "cppa-risk/approval-and-authority/01",
      factor_id: "Approval and authority",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "78a3d47c-aceb-453c-9b44-9b7a1c320f70",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether section 7152(a)(9) should be modified to accommodate large organizations with distributed decision-making authority rather than requiring a single individual to review and approve privacy impact assessments.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/_shared/ltp/risk-factor-engine.ts:approval_sufficiency_conclusion",
      },
      provenance: { page_ref: "Appendix, p. 144", verified_on: "2026-08-22" },
      curation_note:
        "The Agency rejected removing the single-reviewer requirement but clarified that any individual with authority to decide whether processing proceeds — not necessarily a sole decision-maker — satisfies it. The engine's approval_sufficiency_conclusion (line 2756) checks reviewers.length and approver_authority_confirmed, crediting authority-to-decide rather than a named sole approver.",
    },
  ],
};
