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
// The § 7150(b)(2)(A) personnel carve-out was the one genuine gap in this
// set at phase 1 (filed as PN-CORPUS-L-RISK-1); it was RESOLVED in the
// phase-2 redline (2026-08-22) with a dedicated gate-eval.ts branch, the
// q15d_hr_carveout intake field, and the exempt_b2a determined-outcome
// sentence — see row 01's curation_note.

import type { CorpusMap } from "../cam-types.ts";

// WAVE C1 (2026-08-23, doc 62 §11 / doc 63 §2 — CEO-ratified via the Fable
// block's advance acceptance): every render_eligible row below gains
// `purpose_class`; the 3 AP citations upgrade to full-date CF-ENF form
// with `citation_source` (display-consistency invariant now checks them);
// 5 factor rows gain a ratified `trail_impact` tag (doc 62 §11's R1
// amendment) — ONE representative row per factor cluster, per the R2
// admission rule, so the ToA cell never silts up with per-row citations.

// PHASE 2 (v2, 2026-08-22, CEO-directed "complete Phase 2"): adds the
// render-eligible planes —
//   * 3 S0 rows: the risk intake's live unpinned FSOR callouts
//     (useFscrCallouts) become pinned rows; the frontend renders the
//     pinned literal (CPPARiskFsorCallouts.ts) with a parity test. The
//     4th live citation ("11 CCR § 7156(a)") was queried and has NO row
//     in cppa_fsor_callouts — that callout renders nothing today, so
//     nothing is pinned for it (honest absence, not an oversight).
//   * 3 AP rows + 1 AOW row: the S5 Persuasive Authority appendix
//     (Appendix I), doc 49 A.2.4. Verified-only law applied: Foodinho
//     (doc 27 §4's candidate) is verification_status='failed' on both
//     its rows and is EXCLUDED; Deliveroo Italy is the verified
//     representative of the same algorithmic-management class.
//     Provenance reference: enforcement-snapshot-risk.json.
export const RISK_CORPUS_MAP: CorpusMap = {
  product: "cppa-risk",
  map_version: "cppa-risk-cam-v3-2026-08-23",
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
        kind: "implemented",
        branch_ref: "supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/gate-eval.ts:hrCarveoutApplies",
      },
      provenance: { verified_on: "2026-08-22" },
      curation_note:
        "The Agency added the § 7150(b)(2)(A) carve-out for sensitive-PI processing done solely for routine personnel purposes (compensation, employment authorization, benefits, legally required reasonable accommodation, wage reporting). Originally filed extension_filed (PN-CORPUS-L-RISK-1): no branch existed, and the gate registry's q_sensitive_pi_carveout field resolved to the WRONG question (q17's generic legal basis) with inverted polarity under the generic evaluator. RESOLVED 2026-08-22 (phase-2 redline): gate-eval.ts special-cases G.applicability.sensitive_pi against the new dedicated q15d_hr_carveout intake field (exact-literal match via hrCarveoutApplies), with the determined-outcome exempt sentence T.risk.applicability.exempt_b2a and the intake question at CPPARiskAssessment.tsx.",
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
      trail_impact:
        "CPPA, Final Statement of Reasons (Appendix pp. 10, 33, 57, 120, 122) — trigger implemented at full breadth: narrowing proposals (de-minimis sharing, volume thresholds, solely-automated limits, financial-institution carve-outs) were considered and rejected; the § 7150(b)(2)(A) personnel carve-out is the one adopted revision — interpretive",
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
        "The Agency confirmed the sensitive-location list is closed (\"establishing a closed list of specific physical places\"). TURN 1c (2026-08-26, CEO-directed redesign): sensitive_location_basis is now a direct Yes/No on the statute's actual element (inference FROM presence), not a location-type picker — the closed list of qualifying location types is preserved as examples in the question text and the rail's regulationText/plainSummary, not as dropdown options. The prior 9-option enum let a business engage the trigger merely by naming its sector (e.g. a healthcare analytics vendor with no presence-inference activity at all), independent of whether any inference was actually described on the record.",
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
      factor_id: "Material privacy risks",
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
      trail_impact:
        "CPPA, FSOR (pp. 35–36) — the negative-impacts list is non-exhaustive; harms are stated as \"could,\" not \"would\" — interpretive",
    },
    {
      id: "cppa-risk/material-privacy-risk-pathways/02",
      factor_id: "Material privacy risks",
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
      trail_impact:
        "CPPA, FSOR (p. 34) — generic purpose recitals (\"safety purposes\") are specifically inadequate — interpretive",
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
      trail_impact:
        "CPPA, FSOR (p. 37) — any safeguard qualifies; identification is simplified, not graded — interpretive",
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
      trail_impact:
        "CPPA, FSOR (Appendix p. 144) — only individuals who actually reviewed or approved are documented — interpretive",
    },

    // ── WAVE C1 — the FC-J bulk (dark; doc 55 §2, completes doc 27 §2) ──
    // 30 build-time-only support rows across 11 factors. logic_bearing:
    // false throughout — these are provenance/calibration rows, not
    // logic-shaping positions (the tree-audit register, doc 55 §1, is
    // closed; nothing here changes a determination). Per the R2 admission
    // rule (doc 62 §11), FC-J rows never print to the ToA trail — no
    // trail_impact field on any row below.
    {
      id: "cppa-risk/stakeholder-involvement-and-information-providers/01",
      factor_id: "Stakeholder involvement and information providers",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "7f8d543b-12eb-4b58-8fe7-c032671de4ab",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency clarified which employees must participate in risk assessments conducted under the CPRA.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 33", verified_on: "2026-08-23" },
      curation_note:
        "§ 7151(a): employees whose job duties involve the relevant processing activity must be included in the risk assessment process — the stakeholder-involvement factor's participation standard.",
    },
    {
      id: "cppa-risk/stakeholder-involvement-and-information-providers/02",
      factor_id: "Stakeholder involvement and information providers",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f45fcfbe-ca32-4985-b05f-406175211202",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Subsection (b) of section 7151 addresses how businesses may engage external parties when conducting risk assessments under the CPRA.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 33", verified_on: "2026-08-23" },
      curation_note:
        "§ 7151(b): businesses may utilize or gather information from external parties; the Agency broadened the permitted purposes for external engagement beyond identifying/assessing/mitigating risks.",
    },
    {
      id: "cppa-risk/stakeholder-involvement-and-information-providers/03",
      factor_id: "Stakeholder involvement and information providers",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b38f88d6-7305-42af-84f6-aed3f536f027",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7151(b) addresses whether businesses must use mandatory independent evaluations by external experts when assessing risks in automated decision-making technology systems.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 130", verified_on: "2026-08-23" },
      curation_note:
        "The Agency rejected mandatory independent external evaluation for ADMT risk assessments, retaining the flexible consult-at-discretion approach.",
    },
    {
      id: "cppa-risk/processing-methods-and-coherence/01",
      factor_id: "Processing methods and coherence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "c77a7555-d797-4edb-89e2-9bc7a606d32f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7152(a)(3) required businesses to identify all technology used in processing personal information.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 137", verified_on: "2026-08-23" },
      curation_note:
        "The Agency removed the technology-identification requirement from § 7152(a)(3) to simplify implementation, despite finding the original ask not overly broad.",
    },
    {
      id: "cppa-risk/processing-methods-and-coherence/02",
      factor_id: "Processing methods and coherence",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "61609bb4-42bb-4226-b682-0c245471d265",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must identify all operational elements of a processing activity in risk assessments or only those deemed \"relevant.\"",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 137", verified_on: "2026-08-23" },
      curation_note:
        "The Agency rejected adding a \"relevant\" limiting modifier — all identified operational elements under § 7152(a)(3) must be documented, not a filtered subset.",
    },
    {
      id: "cppa-risk/retention/01",
      factor_id: "Retention",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "057cbf2b-baa4-452c-98f8-03d139936457",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses need flexibility when disclosing personal information retention periods they have not yet determined.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 34", verified_on: "2026-08-23" },
      curation_note:
        "§ 7152(a)(3)(B): businesses may disclose either the planned retention period or the retention CRITERIA where the period itself is not yet determined — the retention factor's criteria-based sentence form (mirrors template 558's i2_retention_criteria_clause slot).",
    },
    {
      id: "cppa-risk/retention/02",
      factor_id: "Retention",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f265229b-d7fa-47bb-8853-b487196b21fb",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must estimate retention periods and criteria for personal information under the operational elements disclosure requirement.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 137", verified_on: "2026-08-23" },
      curation_note:
        "The Agency rejected requiring a single retention estimate — different categories of personal information within one processing activity may carry different retention periods.",
    },
    {
      id: "cppa-risk/consumer-interaction-and-scale/01",
      factor_id: "Consumer interaction and scale",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "215b00bf-25c0-4dac-a8e7-29eb0a9cb27e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Under section 11 CCR § 7152(a)(3)(C), businesses conducting risk assessments must identify information about how they interact with consumers and why.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 34", verified_on: "2026-08-23" },
      curation_note:
        "The Agency narrowed § 7152(a)(3)(C) to the method and purpose of consumer interaction only, not broader categories of interaction data.",
    },
    {
      id: "cppa-risk/consumer-interaction-and-scale/02",
      factor_id: "Consumer interaction and scale",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b9442df5-d1fa-4107-be05-6ea9bdac7a5c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses need to identify the approximate number of consumers whose personal information will be processed in their risk assessments, and whether this requirement is unclear or overly burdensome, particularly for new market entries.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 138", verified_on: "2026-08-23" },
      curation_note:
        "The Agency rejected additional guidance or flexibility for the approximate-consumer-count requirement, retaining it as-is under § 7152(a)(3)(D).",
    },
    {
      id: "cppa-risk/transparency-and-disclosures/01",
      factor_id: "Transparency and disclosures",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "78fbfd67-a5be-458d-a725-378172b4744c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency clarified what disclosures businesses must consider when assessing risks under 11 CCR § 7152(a)(3)(E).",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 34", verified_on: "2026-08-23" },
      curation_note:
        "§ 7152(a)(3)(E) clarifying edits: disclosures concern personal-information processing specifically, and future (not-yet-made) disclosures are within scope.",
    },
    {
      id: "cppa-risk/transparency-and-disclosures/02",
      factor_id: "Transparency and disclosures",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "1d8d25c9-adc6-4a67-9781-d13e84bf3feb",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "California privacy regulators decided whether businesses must document the specific actions they have taken or plan to take to address identified risks in their privacy impact assessments.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 35", verified_on: "2026-08-23" },
      curation_note:
        "The Agency removed the § 7152(a)(3)(F) requirement to document specific risk-mitigating actions taken or planned, reducing the disclosure's scope.",
    },
    {
      id: "cppa-risk/consumer-benefit/01",
      factor_id: "Consumer benefit",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4d69100d-f4e0-4d80-ad61-82d2245f9607",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can use generic terms when describing the data processing benefits they provide to consumers under CCPA disclosure requirements.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 139", verified_on: "2026-08-23" },
      curation_note:
        "§ 7152(a)(4) governs all four benefit sections this report composes (consumer/business/other-stakeholder/public); attached here as the representative benefit-factor row rather than duplicated four times. The Agency rejected generic benefit descriptions — benefits must be identified in specific, non-generic terms.",
    },
    {
      id: "cppa-risk/consumer-benefit/02",
      factor_id: "Consumer benefit",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "9c6cb558-c1a3-4292-ba8d-2a7f796cf37b",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7152(a)(4) addresses whether data processing benefits must apply uniformly to all stakeholders.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 139", verified_on: "2026-08-23" },
      curation_note:
        "Clarifies that § 7152(a)(4) benefits may apply to different stakeholder categories rather than requiring universal accrual — same representative-row convention as row 01.",
    },
    {
      id: "cppa-risk/consumer-benefit/03",
      factor_id: "Consumer benefit",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ac2d3934-57a5-4317-95d2-0571d70bb0f1",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency clarified how businesses must identify and describe benefits in risk assessments under 11 CCR § 7152(a)(4).",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 35", verified_on: "2026-08-23" },
      curation_note:
        "Added \"as applicable\" flexibility to § 7152(a)(4) for benefits that apply only to certain stakeholders; removed a redundant monetary-benefit clause — same representative-row convention as row 01.",
    },
    {
      id: "cppa-risk/admt-made-available-to-another-business/01",
      factor_id: "ADMT made available to another business",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4ad14141-eac7-4e40-8600-021a367a87b3",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulation addresses what information businesses must disclose about their use of automated decision-making technology to make significant decisions.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 38", verified_on: "2026-08-23" },
      curation_note:
        "§ 7153(a) final scope: disclosure covers only facts actually available to the business, and only when ADMT is used for significant decisions — narrowed from the proposal.",
    },
    {
      id: "cppa-risk/admt-made-available-to-another-business/02",
      factor_id: "ADMT made available to another business",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "eff51e0b-9351-42db-bec6-96d113a92e00",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether to retain subsection (b) under 11 CCR § 7153, which imposed disclosure obligations on businesses.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 38", verified_on: "2026-08-23" },
      curation_note:
        "§ 7153(b) was deleted entirely from the final regulation to reduce compliance burden.",
    },
    {
      id: "cppa-risk/admt-made-available-to-another-business/03",
      factor_id: "ADMT made available to another business",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "df19b3fb-20ee-43fa-a63d-e2de2879a53f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7153(a) requires businesses to conduct risk assessments when training AI and decision-making technology with consumer personal information.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 60", verified_on: "2026-08-23" },
      curation_note:
        "The Agency rejected arguments that the AI-training assessment duty exceeds its authority, is overly burdensome, or compels trade-secret disclosure — the duty was upheld as within the CPPA's mandate.",
    },
    {
      id: "cppa-risk/benefits-risks-balancing/01",
      factor_id: "Benefits-risks balancing",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "b46b8cdc-0344-4e5a-891e-a01fc102ea6d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Regulation 11 CCR § 7154 requires businesses to prohibit processing when privacy risks outweigh benefits, and the CCPA requires this explicit standard.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 146", verified_on: "2026-08-23" },
      curation_note:
        "The risk-outweighs-benefits prohibition standard is a direct statutory requirement the Agency retained without softening — the balancing factor's governing rule.",
    },
    {
      id: "cppa-risk/benefits-risks-balancing/02",
      factor_id: "Benefits-risks balancing",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3c5ad118-8ce3-4171-bda8-fdcbb65068ab",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether the regulations should explicitly include the statutory goal of a risk assessment for clarity.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 39", verified_on: "2026-08-23" },
      curation_note:
        "§ 7154(a) incorporates the Civil Code § 1798.185(a)(14)(B) statutory goal language directly, consolidating the requirement and the goal in one place.",
    },
    {
      id: "cppa-risk/assessment-timing-and-material-changes/01",
      factor_id: "Assessment timing and material changes",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "780f1d8c-627a-420d-ae52-c2f58600db0b",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether companies must conduct privacy risk assessments on a recurring three-year cycle or whether this requirement should be deleted.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 148", verified_on: "2026-08-23" },
      curation_note:
        "The Agency retained the mandatory three-year review cycle (§ 7155(a)(2)), rejecting deletion, to keep assessments current and consistent with EU/Colorado practice.",
    },
    {
      id: "cppa-risk/assessment-timing-and-material-changes/02",
      factor_id: "Assessment timing and material changes",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f16f279f-224f-4995-964f-e419bfbe8110",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "When businesses must update their risk assessments following a material change to their data processing activities, the CPPA requires updates to be completed as soon as feasibly possible, but no later than 45 calendar days from the date of the material change, under 11 CCR § 7155(a)(3).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 39", verified_on: "2026-08-23" },
      curation_note:
        "The 45-calendar-day outer bound for material-change updates (§ 7155(a)(3)) — the timing factor's concrete deadline, already carried verbatim in the spine (cppa-risk.spine.ts:489).",
    },
    {
      id: "cppa-risk/assessment-retention/01",
      factor_id: "Assessment retention",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "59546c1c-ccf7-46ca-a9c5-de75af9fe39d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must retain their risk assessments for a specified minimum period.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 150", verified_on: "2026-08-23" },
      curation_note:
        "The Agency retained the mandatory five-year retention requirement (§ 7155(c)), rejecting deletion.",
    },
    {
      id: "cppa-risk/prior-dpia-or-other-assessment/01",
      factor_id: "Prior DPIA or other assessment",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "509dd4cf-d16e-4873-907f-a95ea1187163",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The California Privacy Protection Agency amended Section 7156 to clarify how businesses may conduct risk assessments using comparable sets of processing activities or in compliance with other applicable laws and regulations.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 40", verified_on: "2026-08-23" },
      curation_note:
        "§ 7156 comparable-set flexibility: streamlined or consolidated assessments are permitted where processing activities present similar risks.",
    },
    {
      id: "cppa-risk/prior-dpia-or-other-assessment/02",
      factor_id: "Prior DPIA or other assessment",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2233c908-c366-4033-a18a-81f16fe62e87",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether conducting a risk assessment requires documenting information in a risk assessment report.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 40", verified_on: "2026-08-23" },
      curation_note:
        "§ 7156(a)(1) clarifies that CONDUCTING a risk assessment includes documenting the required information in the report — closes a could-conduct-without-documenting reading.",
    },
    {
      id: "cppa-risk/prior-dpia-or-other-assessment/03",
      factor_id: "Prior DPIA or other assessment",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "de045b84-dca4-44ef-a36a-63aa7e188aad",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can use existing risk assessments conducted under GDPR or other state laws to satisfy California's DPIA requirements under section 7152.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 151", verified_on: "2026-08-23" },
      curation_note:
        "§ 7156(b): GDPR/other-law assessments may be reused if they contain all § 7152 elements, or supplemented where they fall short — the dark twin of the S0 row (source_row_id 061ef698) pinned at this same factor.",
    },
    {
      id: "cppa-risk/cppa-submission-and-certifying-executive/01",
      factor_id: "CPPA submission and certifying executive",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8e2bc0ab-308f-47a0-a1f0-59f31bbe42ae",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is when and how businesses must submit risk assessment information to the California Privacy Protection Agency.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 41", verified_on: "2026-08-23" },
      curation_note:
        "§ 7157(a)(1)/(a)(2) submission deadlines (April 1, 2028 for 2026-27 assessments, annually thereafter) aligned to the cybersecurity-audit deadlines; § 7157(b)(1) contact-information contents.",
    },
    {
      id: "cppa-risk/cppa-submission-and-certifying-executive/02",
      factor_id: "CPPA submission and certifying executive",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "6e206530-900f-473b-9ae1-7531d69a3de9",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether executives should be required to sign risk assessment attestations under penalty of perjury or use a softer \"best of knowledge\" standard.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 77", verified_on: "2026-08-23" },
      curation_note:
        "The Agency retained the penalty-of-perjury attestation standard, rejecting a softer \"best of knowledge\" formulation, to maintain executive accountability.",
    },
    {
      id: "cppa-risk/cppa-submission-and-certifying-executive/03",
      factor_id: "CPPA submission and certifying executive",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "18a32edb-09af-4c57-933a-dadd7457ec3c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether a designated executive must certify review and approval of all of a business's risk assessments.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 42", verified_on: "2026-08-23" },
      curation_note:
        "§ 7157(b)(6): the single-executive-certify-all-assessments requirement was removed in favor of a higher-level attestation (still under penalty of perjury, no signature required).",
    },
    {
      id: "cppa-risk/cppa-submission-and-certifying-executive/04",
      factor_id: "CPPA submission and certifying executive",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "25640cac-9e1f-4f99-99b0-79e9fd047f9d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether existing automated decision-making technology (ADMT) users would be forced to make false attestations under the attestation requirements in section 7157(b).",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 155", verified_on: "2026-08-23" },
      curation_note:
        "§ 7157(b)(5) attestation scope clarified to cover only the submission period's own processing — pre-effective-date ADMT users are not forced into a false attestation.",
    },
    {
      id: "cppa-risk/cppa-submission-and-certifying-executive/05",
      factor_id: "CPPA submission and certifying executive",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "06533762-060a-458b-bf18-4735b4ee704e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether businesses should be required to submit detailed annual risk assessment information to the California Privacy Protection Agency.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 42", verified_on: "2026-08-23" },
      curation_note:
        "The Agency simplified the § 7157 annual submission requirements by deleting subsections requiring extensive additional information, reducing preparation burden.",
    },

    // ── PHASE 2 — S0 intake callouts (pinned; doc 49 A.2.3(b)) ──────────
    {
      id: "cppa-risk/processing-purpose-specificity/s0-01",
      factor_id: "Processing purpose specificity",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "41408f4d-6355-499e-8c66-33022becb826",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is how to identify processing purposes in specific, non-generic terms when conducting risk assessments under 11 CCR § 7152(a)(1). The CPPA added an example to subsection (a)(1) to clarify the necessary level of specificity required when identifying a purpose for risk assessment purposes.",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "action",
      s0_field: "11 CCR § 7152(a)(1)",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 34", verified_on: "2026-08-22" },
      curation_note:
        "The risk intake's 'Why does the Agency require this?' callout for the purpose field. Previously fetched live and unpinned from the cppa_fsor_callouts view at page load; this row pins the exact summary the intake shows, closing the silent-drift exposure (doc 48 §II.4a finding 2).",
    },
    {
      id: "cppa-risk/admt-logic-and-limitations/s0-01",
      factor_id: "ADMT logic and limitations",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "5768684d-a418-46e9-bd3b-0f359e014c07",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether the automated decision-making technology (ADMT) risk assessment requirement in 11 CCR § 7152(a)(3)(G) should specify the particular technology used and clarify how ADMT output relates to significant consumer decisions. The Agency removed the requirement to identify the specific technology to simplify compliance, but added language requiring businesses to explain how they will use ADMT output \"to make a significant decision\" about consumers, thereby focusing the assessment on the material decision-making impact rather than technical specifications.",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "action",
      s0_field: "11 CCR § 7152(a)(3)(G)",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 35", verified_on: "2026-08-22" },
      curation_note:
        "The intake callout for the ADMT logic/output fields — the Agency's own explanation of why § 7152(a)(3)(G) asks for output-use rather than technology identification. Pinned from the live view's projection source (cppa_fsor_commentary).",
    },
    {
      id: "cppa-risk/prior-dpia-or-other-assessment/s0-01",
      factor_id: "Prior DPIA or other assessment",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "061ef698-84e8-46a5-84e6-0202afe8b286",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can reuse a risk assessment prepared for compliance with other laws to satisfy the CPRA's risk assessment requirements under section 7152. The Agency modified section 7156(b) to permit businesses to use risk assessments prepared for other purposes, provided that the assessment contains all the information required by section 7152 or is paired with additional information to fill any gaps. This approach allows businesses to leverage existing compliance work while ensuring the final assessment meets CPRA standards and maintains adequate privacy protections.",
      render_eligible: true,
      render_surface: "S0",
      purpose_class: "action",
      s0_field: "11 CCR § 7156(b)",
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 40", verified_on: "2026-08-22" },
      curation_note:
        "The intake callout for the existing-DPIA field — the Agency's position on reusing assessments prepared for other laws. Pinned from the live view's projection source. NOTE: the intake also requests a callout for '11 CCR § 7156(a)', but the cppa_fsor_callouts view carries NO row for that citation (verified live 2026-08-22) — that callout renders nothing today, so no row is pinned for it.",
    },

    // ── PHASE 2 — S5 Persuasive Authority appendix (doc 49 A.2.4) ───────
    // Verified-only law: every source row below is verification_status=
    // 'verified' (re-checked live 2026-08-22; see enforcement-snapshot-
    // risk.json for the provenance capture). Display strings are the
    // CEO-ratifiable annotation layer — shipped under the 2026-08-22
    // continue-all-spec-builds direction and flagged for the
    // advance-ratification ledger.
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/ap-01",
      factor_id: "Regulatory trigger and applicability",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["trigger_engaged"],
      display: {
        matter: "AEPD (Spain) — AENA, S.M.E., S.A. (2025)",
        what_happened:
          "A fine of EUR 10,043,002 under GDPR Art. 35: the airport operator's data protection impact assessment for biometric passenger processing omitted the required analysis of the suitability, necessity, and proportionality of the processing (Art. 35(7)).",
        bearing:
          "Analogous to the risk-assessment obligation this report addresses: where an assessment trigger is engaged, the assessment must actually analyze necessity, proportionality, and safeguards. A document that omits those elements did not satisfy the analogous EU duty.",
        // Wave C1 citation-form upgrade (doc 63 §2.1, CF-ENF): full date +
        // docket-shaped case_reference, replacing the year-only form.
        authority_label:
          "AEPD (Spain), AENA, S.M.E., S.A., decision of 6 November 2025, ref. EXP202304532 — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "AEPD, AENA (2025)",
      },
      citation_source: {
        regulator: "AEPD (Spain)",
        subject: "AENA, S.M.E., S.A.",
        jurisdiction: "Spain",
        decision_date: "2025-11-06",
        case_reference: "EXP202304532",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00431-2024.pdf",
        verified_on: "2026-08-22",
      },
      curation_note:
        "The pure failure-to-assess precedent (doc 27 §4 / doc 49 A.2.4 release-1 list). Renders whenever any § 7150(b) trigger is engaged — the class of decision most directly analogous to the duty this product documents.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/ap-02",
      factor_id: "Regulatory trigger and applicability",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "b3a1a34f-9138-4f93-bcea-9286f9534fe9",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["7150(b)(3)"],
      display: {
        matter: "Garante (Italy) — Deliveroo Italy s.r.l. (2021)",
        what_happened:
          "A fine of EUR 2,500,000: rider-management algorithms operated without adequate transparency about the automated decision-making, with excessive location data, inadequate retention and security measures, and without the required impact assessment (GDPR Arts. 5, 13, 22(3), 25, 32, 35).",
        bearing:
          "Analogous to the § 7150(b)(3) ADMT trigger engaged in this assessment: using automated decisionmaking for significant decisions about individuals carried an assessment duty under the analogous EU rule, and operating the system without that assessment was penalized.",
        // Wave C1 citation-form upgrade (doc 63 §2.1, CF-ENF). Deliveroo's
        // verified row carries no case_reference — docket rule: omitted,
        // never invented.
        authority_label:
          "Garante (Italy), Deliveroo Italy s.r.l., decision of 22 July 2021 — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "Garante, Deliveroo (2021)",
      },
      citation_source: {
        regulator: "Garante (Italy)",
        subject: "Deliveroo Italy s.r.l.",
        jurisdiction: "Italy",
        decision_date: "2021-07-22",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.gpdp.it/web/guest/home/docweb/-/docweb-display/docweb/9685994",
        verified_on: "2026-08-22",
      },
      curation_note:
        "The algorithmic-management precedent class (doc 27 §4 named Foodinho; both Foodinho rows are verification_status='failed', so the verified-only law substitutes Deliveroo — same regulator, same class, Art. 35 among the violations). Keyed to the (b)(3) prong.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/ap-03",
      factor_id: "Regulatory trigger and applicability",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "e7ad2d7a-bce7-493d-8cd9-b8966fb9114d",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["7150(b)(4)"],
      display: {
        matter: "CNIL (France) — Amazon France Logistique (2023)",
        what_happened:
          "A fine of EUR 32,000,000: warehouse employees' activity and performance were monitored through scanner and video data at a granularity the regulator found excessive, violating data minimization, the legitimate-interest basis, and transparency duties (GDPR Arts. 5(1)(c), 6(1)(f), 12, 13, 32).",
        bearing:
          "Analogous to the § 7150(b)(4) systematic-observation trigger engaged in this assessment: continuous monitoring of workers is the processing pattern the analogous EU decision penalized, and the elements it faulted — minimization, lawful basis, transparency — are factors this report assesses.",
        // Wave C1 citation-form upgrade (doc 63 §2.1, CF-ENF).
        authority_label:
          "CNIL (France), Amazon France Logistique, decision of 7 December 2023, ref. SAN-2023-021 — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "CNIL, Amazon France Logistique (2023)",
      },
      citation_source: {
        regulator: "CNIL (France)",
        subject: "Amazon France Logistique",
        jurisdiction: "France",
        decision_date: "2023-12-07",
        case_reference: "SAN-2023-021",
      },
      direction: "supports",
      logic_bearing: false,
      provenance: {
        source_url: "https://gdprhub.eu/index.php?title=CNIL_(France)_-_SAN-2023-021",
        verified_on: "2026-08-22",
      },
      curation_note:
        "The worker-surveillance cluster's verified representative (doc 27 §4 / doc 49 A.2.4). Keyed to the (b)(4) systematic-observation prong.",
    },
    {
      id: "cppa-risk/regulatory-trigger-and-applicability/aow-01",
      factor_id: "Regulatory trigger and applicability",
      role: "AOW",
      source_table: "enforcement_actions",
      source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "consequence",
      render_when: ["trigger_engaged", "record_incomplete"],
      // v4.7.2 warning-text revision (2026-08-25, CEO-ordered polish round):
      // (1) the old text named Deliveroo, which is a (b)(3)-keyed row that
      // does not render for non-ADMT activities — the caution referenced a
      // decision the reader's own Appendix B table did not contain; it now
      // names only AENA, the row this warning is bound to. (2) "This
      // assessment's record is not yet complete" undercut the report's
      // finality — a final report can carry Conditions to Proceed and open
      // record items without being unfinished; the reframe says exactly
      // that. Trigger state (trigger_engaged + record_incomplete) unchanged.
      warning_text:
        "Caution. Regulators applying analogous data-protection law have penalized businesses that carried out processing requiring an assessment without a complete assessment record: in AENA (AEPD, Spain, 2025) a EUR 10,043,002 fine issued where the impact assessment omitted the required necessity and proportionality analysis. This assessment identifies Conditions to Proceed or open record items; satisfying them before initiating or continuing the processing reduces the exposure this class of decisions illustrates. The decision was issued under the GDPR, not the CCPA, and is persuasive context only.",
      direction: "limits",
      logic_bearing: false,
      provenance: {
        source_url: "https://www.aepd.es/documento/ps-00431-2024.pdf",
        verified_on: "2026-08-22",
      },
      curation_note:
        "The one release-1 adverse-outcome warning (doc 49 A.2.4): bound to the 'trigger engaged + assessment record incomplete' adverse state, citing the failure-to-assess class. Placement: inside Appendix I, after the precedent table — keeping all persuasive content on one surface rather than splicing a warning into the determination sections.",
    },
  ],
};
