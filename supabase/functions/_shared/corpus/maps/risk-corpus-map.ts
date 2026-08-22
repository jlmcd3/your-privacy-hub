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
  map_version: "cppa-risk-cam-v2-2026-08-22",
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
      render_when: ["trigger_engaged"],
      display: {
        matter: "AEPD (Spain) — AENA, S.M.E., S.A. (2025)",
        what_happened:
          "A fine of EUR 10,043,002 under GDPR Art. 35: the airport operator's data protection impact assessment for biometric passenger processing omitted the required analysis of the suitability, necessity, and proportionality of the processing (Art. 35(7)).",
        bearing:
          "Analogous to the risk-assessment obligation this report addresses: where an assessment trigger is engaged, the assessment must actually analyze necessity, proportionality, and safeguards. A document that omits those elements did not satisfy the analogous EU duty.",
        authority_label: "AEPD, EXP202304532 / PS-00431-2024 (6 Nov. 2025), GDPR Art. 35 — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "AEPD, AENA (2025)",
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
      render_when: ["7150(b)(3)"],
      display: {
        matter: "Garante (Italy) — Deliveroo Italy s.r.l. (2021)",
        what_happened:
          "A fine of EUR 2,500,000: rider-management algorithms operated without adequate transparency about the automated decision-making, with excessive location data, inadequate retention and security measures, and without the required impact assessment (GDPR Arts. 5, 13, 22(3), 25, 32, 35).",
        bearing:
          "Analogous to the § 7150(b)(3) ADMT trigger engaged in this assessment: using automated decisionmaking for significant decisions about individuals carried an assessment duty under the analogous EU rule, and operating the system without that assessment was penalized.",
        authority_label: "Garante, doc. web 9685994 (22 July 2021) — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "Garante, Deliveroo (2021)",
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
      render_when: ["7150(b)(4)"],
      display: {
        matter: "CNIL (France) — Amazon France Logistique (2023)",
        what_happened:
          "A fine of EUR 32,000,000: warehouse employees' activity and performance were monitored through scanner and video data at a granularity the regulator found excessive, violating data minimization, the legitimate-interest basis, and transparency duties (GDPR Arts. 5(1)(c), 6(1)(f), 12, 13, 32).",
        bearing:
          "Analogous to the § 7150(b)(4) systematic-observation trigger engaged in this assessment: continuous monitoring of workers is the processing pattern the analogous EU decision penalized, and the elements it faulted — minimization, lawful basis, transparency — are factors this report assesses.",
        authority_label: "CNIL, SAN-2023-021 (7 Dec. 2023) — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "CNIL, Amazon France Logistique (2023)",
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
      render_when: ["trigger_engaged", "record_incomplete"],
      warning_text:
        "Caution. Regulators applying analogous data-protection law have penalized businesses that carried out processing requiring an assessment without a complete assessment record: in AENA (AEPD, Spain, 2025) a EUR 10,043,002 fine issued where the impact assessment omitted the required necessity and proportionality analysis, and in Deliveroo (Garante, Italy, 2021) the required assessment was absent altogether. This assessment's record is not yet complete; completing the open items identified in this report before initiating or continuing the processing reduces the exposure this class of decisions illustrates. These decisions were issued under the GDPR, not the CCPA, and are persuasive context only.",
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
