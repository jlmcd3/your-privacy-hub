// CPPA ADMT v2 — Curated Attachment Map (Phase 1: FC-L logic-triage set).
// Built per doc 52 §5 against the live FSOR corpus (queried 2026-08-22,
// snapshot: tests/edge/corpus/__snapshots__/fsor-snapshot-admt.json).
// factor_id values are the EXACT labels the Appendix B row array uses in
// buildFactorMatrixTable (run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts).
//
// Shared § 7001 cluster note (doc 49 B.2): the human-involvement FSOR row
// (2ca61bd1) is the SAME source row the Risk map would cite for its own
// § 7001(e) ADMT factors — reused here as its own ADMT-map row per doc
// 48's CAM row schema (factor_id is per-product; source_row_id may repeat
// across maps).
//
// Two positions doc 52 §5 anticipated were investigated and NOT filed as
// rows (see 52a build log for detail): the § 7222(k) FSOR cluster is
// entirely about adverse-significant-decision NOTICE content, not a
// physical/biological carve-out as doc 52 guessed, and § 7222(k) has no
// corresponding Appendix B factor row today — no factor, no admission
// under the Factor-Bearing Law. The § 7001(ddd) "retain significant-
// decision definition" row (b4ce05e1) was too thin in the live text to
// ground a row honestly ("the complete details ... are not provided in
// the excerpt supplied") and was dropped rather than forced.

import type { CorpusMap } from "../cam-types.ts";

// WAVE C1 (2026-08-23, doc 56 / doc 62 §9's amendment / doc 63 §3 — CEO-
// ratified via the Fable block's advance acceptance): the map's second
// s4_ratification stamp (Cyber's is the first, wave C3). Two factors open
// on S4 — human involvement (2 rows, the redundant third row dropped per
// doc 62's amendment) and advertising exclusion (1 row) — plus the S5
// release-1 precedent (Deliveroo alone; Friuli deferred). The § 7222(k)
// adverse-decision-notice cluster (11 rows) resolves the doc 51 §2
// mischaracterization ("the physical/biological identification carve"):
// the OAL-approved final § 7222(k) is a NON-RETALIATION provision (byte-
// verified against the cppa-7222 provision row this session); the
// proposal's adverse-decision notice duty was REMOVED during rulemaking.
// Disposition: DECLINED — the engine correctly has no branch for a duty
// that does not exist in the final regulation. Filed dark, direction
// limits, so a future drafter never re-imports the withdrawn duty from
// proposal-era FSOR text (doc 56 §1, item A1).
export const ADMT_CORPUS_MAP: CorpusMap = {
  product: "cppa-admt",
  map_version: "cppa-admt-cam-v2-2026-08-23",
  snapshot_file: "tests/edge/corpus/__snapshots__/fsor-snapshot-admt.json",
  s4_ratification: {
    ratified_by: "CEO",
    ratified_on: "2026-08-23",
    ledger_ref: "PN-CMP-B3",
  },
  rows: [
    {
      id: "cppa-admt/human-involvement/01",
      factor_id: "Human involvement",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2ca61bd1-bb8a-4715-9e54-e20c4a266b4e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency considered whether the threshold for automated decision-making technology (ADMT) scope should be \"substantially facilitate\" or \"substantially replace\" human decisionmaking in 11 CCR § 7001(e)(1).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts:humanInvolvementEffect",
      },
      provenance: { page_ref: "p. 11", verified_on: "2026-08-22" },
      curation_note:
        "The Agency's three-part human-involvement test (understand/interpret the output, review it with other information, and hold actual authority to change the decision) is encoded as a single closed-enum intake answer — HUMAN_REVIEW_OPTIONS[0] in src/pages/admt/ADMTChecker.tsx literally states all three elements — which computeScope's humanInvolvementEffect branch consumes.",
    },
    {
      id: "cppa-admt/advertising-exclusion/01",
      factor_id: "Advertising exclusion",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "30f8c40b-1d60-4623-829a-06f68c77ca2f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether advertising directed to a consumer constitutes a \"significant decision\" under 11 CCR § 7001(ddd)(6).",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts:advertisingEffect",
      },
      provenance: { page_ref: "p. 14", verified_on: "2026-08-22" },
      curation_note:
        "The Agency excluded consumer-directed advertising from the § 7001(ddd) significant-decision definition. computeScope's advertisingEffect branch treats solely_advertising==='Yes' as WEIGHS_AGAINST significant-decision scope, consistent with the exclusion.",
    },
    {
      id: "cppa-admt/opt-out-pathway/01",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3b49cfa7-04ac-411d-b1c4-4ed38ad82f57",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses using automated decision-making technology (ADMT) to make significant decisions must provide consumers with an opt-out right.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts:computeOptOutPath",
      },
      provenance: { page_ref: "p. 48", verified_on: "2026-08-22" },
      curation_note:
        "The Agency confirmed opt-out is required by default, subject ONLY to the three closed exceptions in § 7221(b)(1)-(3). computeOptOutPath is a closed four-branch classifier (the three named exceptions + FULL_OPT_OUT) plus an explicit OTHER_UNRESOLVED fallback for anything that doesn't match — it never invents a fifth exception.",
      trail_impact:
        "CPPA, FSOR (pp. 48-49) — opt-out duty for significant decisions; the human-appeal exception requires a qualified reviewer with actual authority — interpretive",
    },
    {
      id: "cppa-admt/opt-out-pathway/02",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f229e04d-57ae-4e9b-b799-34dea8eb9966",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is what qualifications and procedures businesses must follow to provide human appeal rights for decisions made by automated decision-making technology.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts:HUMAN_APPEAL_EXCEPTION",
      },
      provenance: { page_ref: "p. 49", verified_on: "2026-08-22" },
      curation_note:
        "The Agency removed 'qualified' from § 7221(b)(2) and consolidated reviewer-qualification requirements into (b)(1)(A) — the human-appeal exception's requirements now read against a single, simplified reviewer standard. computeOptOutPath's HUMAN_APPEAL_EXCEPTION branch classifies against the Company's own opt_out_exception selection without imposing a 'qualified reviewer' gate the current regulation dropped.",
    },
    {
      id: "cppa-admt/vendor-dependency/01",
      factor_id: "Vendor dependency",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "00d4c654-afee-4ded-91ef-48c26e3b6c12",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue addresses which specific automated decision-making technology (ADMT) a consumer has opted out of and what notifications a business must send to third parties regarding that opt-out.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: true,
      logic_disposition: {
        kind: "implemented",
        branch_ref: "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts:VENDOR_MATERIALITY_MATRIX",
      },
      provenance: { page_ref: "p. 51", verified_on: "2026-08-22" },
      curation_note:
        "The Agency clarified that a business's § 7221(n)(2) third-party-notification duty is scoped to the SPECIFIC ADMT/vendor a consumer opted out of, not all vendors generally. VENDOR_MATERIALITY_MATRIX operationalizes exactly that pathway-specific scoping — e.g. the 'optout' control is material only on the full-opt-out pathway, the 'appeal' control only on the human-appeal-exception pathway — rather than treating every vendor control as universally material.",
      trail_impact:
        "CPPA, FSOR (p. 51) — service-provider notification duties attach on opt-out — interpretive",
    },

    // ── WAVE C1 — S4 (per-factor regulator commentary; requires the map's
    // s4_ratification stamp, above). 2 rows on Human involvement, 1 on
    // Advertising exclusion — the two definitional factors customers most
    // often push back on, per doc 47/49's own finding. The redundant third
    // human-involvement row (3e23741f — restates row s4-01's scope point
    // from the other direction) was dropped at the doc 62 gate review.
    {
      id: "cppa-admt/human-involvement/s4-01",
      factor_id: "Human involvement",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2ca61bd1-bb8a-4715-9e54-e20c4a266b4e",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency considered whether the threshold for automated decision-making technology (ADMT) scope should be \"substantially facilitate\" or \"substantially replace\" human decisionmaking in 11 CCR § 7001(e)(1). The Agency adopted \"substantially replace human decisionmaking\" as the appropriate threshold and defined it to mean a business using the technology's output to make a decision without human involvement. The Agency clarified that true human involvement requires the reviewer to understand and interpret the technology's output, review it alongside other relevant information, and possess actual authority to make or change the decision.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      // NOT gated on admt_in_scope: computeScope routes human_review
      // starting with "Yes" (qualifying review — the exact pushback this
      // content answers) to scopeState OUT_OF_SCOPE, not IN_SCOPE. Gating
      // on admt_in_scope would make this content unreachable in precisely
      // the case it exists for. Renders whenever the human-review question
      // was substantively answered, in either direction (verified live
      // against admt-v2-deterministic.ts's computeScope this session).
      render_when: ["human_involvement_addressed"],
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 11", verified_on: "2026-08-23" },
      curation_note:
        "S4 render of the same source row as the dark human-involvement/01 FC-L row (2ca61bd1) — the Agency's own account of WHY the three-part test exists, answering the customer's likeliest pushback (\"we have a human in the loop\") directly from the FSOR. Frame: F-ADMT-HI (doc 63 §3.1).",
    },
    {
      id: "cppa-admt/human-involvement/s4-02",
      factor_id: "Human involvement",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "d544f101-4a87-41fd-ae4c-2399c5f6cc8a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the definition of Automated Decision-Making Technology (ADMT) is overly broad and whether human override capability should exclude a system from being classified as automated. The Agency retained its position that ADMT regulations fall within its statutory authority under the CCPA and that human capability to override an automated decision does not make the decision non-automated, but modified the definition under 11 CCR § 7001(e) to focus on higher-risk uses—specifically ADMT that replaces or substantially replaces human decision-making without human involvement—to balance consumer privacy protections with implementation feasibility for businesses.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      render_when: ["human_involvement_addressed"],
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 14", verified_on: "2026-08-23" },
      curation_note:
        "The exact rebuttal to the second-most-common pushback: a mere override CAPABILITY does not exclude a system from ADMT status — only qualifying involvement (per s4-01) does. Frame: F-ADMT-HI.",
    },
    {
      id: "cppa-admt/advertising-exclusion/s4-01",
      factor_id: "Advertising exclusion",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "30f8c40b-1d60-4623-829a-06f68c77ca2f",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether advertising directed to a consumer constitutes a \"significant decision\" under 11 CCR § 7001(ddd)(6). The Agency modified the definition of \"significant decision\" to explicitly exclude advertising to a consumer, streamlining compliance obligations for businesses while aligning with privacy frameworks used in other jurisdictions like the GDPR and Colorado Privacy Act.",
      render_eligible: true,
      render_surface: "S4",
      purpose_class: "misreading",
      // NOT gated on admt_in_scope (unlike human-involvement, above):
      // advertising drives the report to OUT_OF_SCOPE precisely when the
      // exclusion applies, and section 2 renders before that early return —
      // this content is most valuable exactly there (doc 63 §3.2: "renders
      // when the advertising-exclusion branch was evaluated").
      render_when: ["advertising_exclusion_addressed"],
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 14", verified_on: "2026-08-23" },
      curation_note:
        "S4 render of the same source row as the dark advertising-exclusion/01 FC-L row (30f8c40b) — the Agency's own account of the exclusion's origin and scope. Frame: F-ADMT-AD (doc 63 §3.1).",
    },

    // ── WAVE C1 — S5 release-1 (Deliveroo alone; Friuli deferred per the
    // doc 62 gate review — patient-profiling is an imperfect analogy to
    // ADMT significant decisions). Reuses the Risk Appendix-I display
    // shape verbatim (doc 63 §3.3).
    {
      id: "cppa-admt/significant-decision/ap-01",
      factor_id: "Significant decision",
      role: "AP",
      source_table: "enforcement_actions",
      source_row_id: "b3a1a34f-9138-4f93-bcea-9286f9534fe9",
      excerpt_field: "key_compliance_failure",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      render_when: ["admt_in_scope"],
      display: {
        matter: "Garante (Italy) — Deliveroo Italy s.r.l. (2021)",
        what_happened:
          "Italy's data protection authority fined Deliveroo €2,500,000 after finding it failed to adequately inform riders about algorithmic decision-making, processed excessive location data, applied inappropriate retention, and lacked adequate security measures and a required impact assessment.",
        bearing:
          "An algorithmic system allocating work and evaluating workers is the processing class this report's significant-decision analysis addresses; the decision shows regulators treat transparency about automated decision-making as enforceable. Decided under the GDPR; California's ADMT rules are analogous but distinct.",
        authority_label:
          "Garante (Italy), Deliveroo Italy s.r.l., decision of 22 July 2021 — persuasive only; decided under the GDPR, not the CCPA",
        trail_cite: "Garante, Deliveroo (2021) — analogous enforcement for algorithmic management",
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
        verified_on: "2026-08-23",
      },
      curation_note:
        "The verified representative of the algorithmic-management enforcement class (the same source row as Risk's ap-02; doc 27 §4 named Foodinho, which remains verification_status='failed' on both its rows — re-confirmed live this session, still barred). Renders whenever ADMT is in scope.",
    },

    // ── WAVE C1 — the FC-J bulk (dark; doc 56 §2c). 30 rows across
    // Notice delivery/content, Opt-out pathway, Access process, Vendor
    // dependency, and Significant decision (the § 7222(k) cluster + the
    // reallocated cybersecurity-exemption row). logic_bearing: false
    // throughout — the tree audit (doc 56 §1) is closed; the one logic
    // question this sweep raised (§ 7222(k), item A1) is DECLINED, not a
    // new branch, so it needs no logic_disposition on these rows.
    {
      id: "cppa-admt/notice-delivery/01",
      factor_id: "Notice delivery",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "663f411b-5e6d-48de-a960-2b11e189bae6",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses must provide a Pre-use Notice and a Notice at Collection as separate documents or may consolidate them into one.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 44", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(a): businesses may combine the Pre-use Notice with the Notice at Collection provided the consolidated notice carries all required (b)/(c) content.",
    },
    {
      id: "cppa-admt/notice-delivery/02",
      factor_id: "Notice delivery",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "74fbdfc0-d129-4f39-9fd3-ff4e34dde46c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is when a business must provide consumers with a Pre-use Notice before processing personal information through automated decision-making technology (ADMT).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 45", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(b)(2): notice is due at or before collection for the ADMT purpose, including when previously-collected information is later repurposed for ADMT.",
    },
    {
      id: "cppa-admt/notice-content/01",
      factor_id: "Notice content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "7f616c44-b6f9-43b0-9891-1fdbd501bffc",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can use generic terms in Pre-use Notices or must explain the specific purpose for their planned use of automated decision-making technology (ADMT).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 45", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(c)(1): specific, non-generic purpose explanations are required — the notice-content specificity standard, the ADMT twin of Risk's non-generic-purposes position.",
    },
    {
      id: "cppa-admt/notice-content/02",
      factor_id: "Notice content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "89656f98-6426-4f87-a64a-3014d177fb6a",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is what information businesses must disclose to consumers about how they use automated decision-making technology (ADMT) to make significant decisions.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 45", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(c)(5): the Pre-use Notice must clearly explain how the ADMT works and what the opt-out process looks like.",
    },
    {
      id: "cppa-admt/notice-content/03",
      factor_id: "Notice content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "9d6af2e0-10b3-40f5-b280-0bc2cc188328",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "California's CPRA Pre-use Notice requirements allow businesses to withhold certain sensitive information from consumer disclosures.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 47", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(d): trade-secret and security/fraud/safety-sensitive information may be withheld from the (c)(5) disclosure — the notice-content withholding boundary.",
    },
    {
      id: "cppa-admt/notice-content/04",
      factor_id: "Notice content",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "90a48324-9277-4db8-9f74-d8d555f882f0",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7220(d)(2) addresses when a business uses multiple automated decision-making tools to reach a single significant decision about a job applicant.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 47", verified_on: "2026-08-23" },
      curation_note:
        "§ 7220(d)(2): multiple ADMTs feeding one significant decision may be covered by a single Pre-use Notice rather than one notice per tool.",
    },
    {
      id: "cppa-admt/opt-out-pathway/03",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f660aa63-f605-4b00-93d6-6f9b31108677",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the \"solely for\" limitation in the ADMT work allocation exception should be removed and whether businesses can rely on developer assessments rather than ensuring compliance themselves.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 101", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(b)(3): the \"solely for\" limitation was retained (kept narrow) with a performance-based standard added — the ADMT must actually work for the stated purpose without unlawful discrimination.",
    },
    {
      id: "cppa-admt/opt-out-pathway/04",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "7006e7ca-592f-437d-b177-08e1be0010f0",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7221(b)(6) addresses the threshold for when businesses must implement safeguards related to behavioral advertising.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 212", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(b)(6): the behavioral-advertising safeguard threshold was retained as-is rather than made more stringent.",
    },
    {
      id: "cppa-admt/opt-out-pathway/05",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f01296a0-92d6-447a-8dfa-4789e3b4a5dc",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is what title or language must appear on an opt-out link for automated decisionmaking technology under 11 CCR § 7221(c)(1).",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 50", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(c)(1): the fixed \"Opt-out of Automated Decisionmaking Technology\" title requirement was removed in favor of any label that states what the consumer is opting out of.",
    },
    {
      id: "cppa-admt/opt-out-pathway/06",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "4b2d39e1-4cd0-4579-9c0f-35f06e476120",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cookie notifications or cookie consent tools can be used as the method for consumers to submit opt-out requests for automated decision-making technology (ADMT).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 212", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(c)(4): cookie banners/consent tools are prohibited as an ADMT opt-out method — retained after the Agency observed businesses misusing them for this purpose.",
    },
    {
      id: "cppa-admt/opt-out-pathway/07",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f0113d25-882a-4d55-8a54-e8627d243fe6",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether to retain a requirement prohibiting businesses from using or retaining personal information after ceasing automated decision-making technology (ADMT) processing.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 50", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(n)(1): the standalone post-cessation use/retention prohibition was deleted as redundant — a business that cannot process is already prohibited from using or retaining the information.",
    },
    {
      id: "cppa-admt/opt-out-pathway/08",
      factor_id: "Opt-out pathway",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "2951b3e7-c3f6-4ab8-a9fa-e8f2e207ab56",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is what qualifications, responsibilities, and authority human reviewers must have when businesses use automated decision-making technology (ADMT) appeals processes for significant decisions.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 49", verified_on: "2026-08-23" },
      curation_note:
        "§ 7221(b)(2)(A): the designated human reviewer must understand the ADMT's output, hold authority to change the decision, and consider consumer-supplied appeal information — the human-appeal exception's reviewer standard.",
    },
    {
      id: "cppa-admt/access-process/01",
      factor_id: "Access process",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "a50f2dd6-2dff-4edf-84c3-2959bdee12ea",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is what types of automated decision-making technology (ADMT) uses trigger a business's obligation to provide consumers access to information about that ADMT.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "p. 51", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(a): access obligations are limited to ADMT used for a \"significant decision\" — aligned to the § 7200(a) scope definition, narrowing the universe of ADMT uses that trigger access rights.",
    },
    {
      id: "cppa-admt/access-process/02",
      factor_id: "Access process",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "7adc97a2-bc8b-4a82-abea-e4c3d7db6fb3",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7222(b) addresses what businesses must disclose when consumers request access to automated decision-making technology (ADMT).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 51", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(b): meaningful-information-about-the-logic and likely-outcome disclosures are required in access responses.",
    },
    {
      id: "cppa-admt/access-process/03",
      factor_id: "Access process",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "3e9d4a74-0820-451d-b4d9-f0ab5cc0b2b9",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue concerns what information businesses must disclose to consumers about how automated decision-making technology (ADMT) processed their personal information.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 51", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(b)(2): a flexible, performance-based logic-disclosure standard — parameters and/or the specific output, businesses' choice, so long as consumers can understand how their data produced the result.",
    },
    {
      id: "cppa-admt/access-process/04",
      factor_id: "Access process",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f4b221e6-62f9-4e52-bdd3-0b5805c57e94",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is what information businesses must disclose when responding to consumer access requests about automated decision-making technology (ADMT).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "p. 52", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(b)(3)(A): the outcome and how ADMT output was used must be disclosed, including whether it was the sole factor and any human role.",
    },
    {
      id: "cppa-admt/access-process/05",
      factor_id: "Access process",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "84d00bed-b711-4b62-be13-b1a739d7b97b",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether businesses can use generic phrases like \"to improve our services\" when describing purposes for processing consumer data in communications and risk assessments under § 7222(b)(1).",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 67", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(b)(1): non-generic, specific purpose identification is required in access responses — the access-process twin of the notice-content specificity standard.",
    },
    {
      id: "cppa-admt/vendor-dependency/02",
      factor_id: "Vendor dependency",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "88f44d5e-fbaa-450f-a51e-3855240579fb",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed technical revisions to the Automated Decision Technology (ADMT) access request rule to improve clarity and internal consistency.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "p. 53", verified_on: "2026-08-23" },
      curation_note:
        "§ 7222(i): technical clean-up of the service-provider assistance duty for access requests; businesses may voluntarily provide more than the regulation requires.",
    },

    // ── The § 7222(k) adverse-decision-notice cluster (11 rows) — see the
    // file-header note. All direction: limits (the duty they discuss was
    // withdrawn; filed as a guard against re-importing it from proposal-
    // era sources). Factor: Significant decision (the definitional factor
    // this withdrawn duty would have attached to).
    {
      id: "cppa-admt/significant-decision/k-01",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "6d9eb976-fb44-4c37-a13a-8fccd450d2b2",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7222(k) addresses notice requirements when businesses make adverse significant decisions affecting consumers.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 109", verified_on: "2026-08-23" },
      curation_note:
        "Removed as duplicative of the Pre-use Notice / access-right transparency the final regulation already provides.",
    },
    {
      id: "cppa-admt/significant-decision/k-02",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "dbb6ac8d-646a-4d6c-b728-361030924eb9",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether specific notice requirements should be removed from the ADMT adverse decision provisions to reduce business compliance burdens.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 109", verified_on: "2026-08-23" },
      curation_note:
        "An intermediate comment-response describing partial retention; superseded by the final regulation's full removal (confirmed against the OAL-approved § 7222(k) text this session — the final subsection is non-retaliation only).",
    },
    {
      id: "cppa-admt/significant-decision/k-03",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "8f868baa-9995-4601-b670-d4428deaeb66",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the ADMT regulations should include specific carve-outs or modifications for independent contractor work allocation, adverse decision notices, vehicle-based AI, and differentiated compliance burdens based on business size and AI ecosystem roles.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 109 (cont.)", verified_on: "2026-08-23" },
      curation_note:
        "Confirms the § 7222(k) adverse-decision-notice deletion in favor of Pre-use Notice + access rights serving the same transparency function.",
    },
    {
      id: "cppa-admt/significant-decision/k-04",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "9aa619fd-5e11-4256-abba-a013557ba659",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether the CPRA regulations help businesses manage security and privacy risks while building consumer trust.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 109 (cont.)", verified_on: "2026-08-23" },
      curation_note:
        "General retained-provisions statement; does not itself address the adverse-decision-notice deletion.",
    },
    {
      id: "cppa-admt/significant-decision/k-05",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ae4961a5-8538-4ae1-b457-dc5b08954777",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7222(k) requires businesses to notify consumers when taking adverse actions in response to consumer requests under the California Consumer Privacy Act.",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 224", verified_on: "2026-08-23" },
      curation_note:
        "An intermediate comment-response describing retention of a notification requirement; superseded by the final regulation's removal of the adverse-significant-decision notice (confirmed against the OAL-approved provision text — the final § 7222(k) is non-retaliation only, not a notice duty).",
    },
    {
      id: "cppa-admt/significant-decision/k-06",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "ad2bb6f5-6228-484a-9085-81cd44bf71ad",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue was whether businesses need 15-day notice and 45-day explanation timelines when making adverse significant decisions using automated decision-making technology.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 224", verified_on: "2026-08-23" },
      curation_note:
        "The 15-day/45-day adverse-decision timelines were removed from the final regulation.",
    },
    {
      id: "cppa-admt/significant-decision/k-07",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "5162c100-dfeb-477c-a3ed-b902357ba8a6",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The regulatory issue is whether businesses must provide notice to consumers when making adverse significant decisions, such as denying credit or financial services.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 225", verified_on: "2026-08-23" },
      curation_note:
        "Removed despite the commenter's support for the protection, to simplify implementation.",
    },
    {
      id: "cppa-admt/significant-decision/k-08",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "f7ae500a-94ec-4c35-b7c3-060ef3d48a78",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the CPPA has authority to require businesses to provide notices about adverse significant decisions without a consumer request.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 225", verified_on: "2026-08-23" },
      curation_note:
        "The Agency confirmed it HAS the authority to require such notices, but removed the requirement anyway to simplify implementation — an authority-exists-but-declined-to-exercise-it posture.",
    },
    {
      id: "cppa-admt/significant-decision/k-09",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "affc9b4c-6bb9-4233-b163-58a257d8ec3d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "Section 7222(k) addresses notice requirements for adverse significant decisions.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 225", verified_on: "2026-08-23" },
      curation_note:
        "The removal record cited in the B3 CMP gate review (doc 56 §1) as the primary evidence that the adverse-decision-notice duty was withdrawn during rulemaking.",
    },
    {
      id: "cppa-admt/significant-decision/k-10",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "0695c66f-6865-47e4-872a-3d96b990131d",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The Agency addressed competing requests to expand, narrow, or eliminate automated decision-making technology (ADMT) disclosure and consent requirements under the CCPA.",
      render_eligible: false,
      direction: "limits",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 226 (cont.)", verified_on: "2026-08-23" },
      curation_note:
        "Confirms the adverse-significant-decision notice was removed while the § 7222(b) Pre-use Notice / access-right transparency was retained as the functional substitute.",
    },
    {
      id: "cppa-admt/significant-decision/k-11",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "5b588992-503f-493d-92b2-5e2579a3ee9c",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether the California Privacy Protection Agency has legal authority to adopt the regulations under section 7222(k)(1).",
      render_eligible: false,
      direction: "neutral",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 226 (cont.)", verified_on: "2026-08-23" },
      curation_note:
        "An authority-confirmation row only; does not itself bear on the notice-duty's removal.",
    },
    {
      id: "cppa-admt/significant-decision/02",
      factor_id: "Significant decision",
      role: "FC",
      source_table: "cppa_fsor_commentary",
      source_row_id: "83bcecda-c1fd-4daf-b80f-63d8218a42a1",
      excerpt_field: "agency_position_summary",
      pinned_excerpt:
        "The issue is whether cybersecurity threat-combating technologies should be excluded from the definition of \"significant decision\" under automated decision-making rules.",
      render_eligible: false,
      direction: "supports",
      logic_bearing: false,
      provenance: { page_ref: "Appendix, p. 24", verified_on: "2026-08-23" },
      curation_note:
        "Reallocated here from the advertising-exclusion factor at the doc 62 gate review — this row is about a DIFFERENT rejected exemption (cybersecurity tools), not advertising. The Agency rejected a security-tool carve-out, keeping such uses subject to full Article 10/11 duties (existing §§ 7220(d)(2)/7222(c)(2) already address security/fraud specifically) — supports the broad significant-decision definition.",
    },
  ],
};
