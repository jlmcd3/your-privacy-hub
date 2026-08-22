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

export const ADMT_CORPUS_MAP: CorpusMap = {
  product: "cppa-admt",
  map_version: "cppa-admt-cam-v1-2026-08-22",
  snapshot_file: "tests/edge/corpus/__snapshots__/fsor-snapshot-admt.json",
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
    },
  ],
};
