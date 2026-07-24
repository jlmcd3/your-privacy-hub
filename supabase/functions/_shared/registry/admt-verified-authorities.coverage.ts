// CPPA-PRODUCT-1 / S-A — cppa-admt registry coverage report.
//
// Maps each admt L1-tagged finding_check_id (from quality_finding_backlog
// as of 2026-07-24T07:40Z, W5-W8 aggregate) to the ADMT_VERIFIED_AUTHORITIES
// rows that would have prevented instances of that class if the registry had
// been wired at emit time. Also enumerates GAPS: L1-tagged findings whose
// prevention requires additional rows not yet authored.
//
// This is REPORT DATA (structural, machine-readable) — not runtime logic. It
// is consumed by:
//   1. The green test in src/registry/__tests__/admt-verified-authorities.test.ts
//      to prove every L1 finding class has ≥ 1 covering row OR is explicitly
//      listed as a known gap.
//   2. The admt wiring turn (next dispatch) to size the S5 slot map and to
//      seed the acceptance criteria for the deploy.

import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_ROWS,
} from "./admt-verified-authorities.ts";

/** Snapshot metadata — pin the coverage claim to the source data. */
export const ADMT_BACKLOG_SNAPSHOT = {
  snapshot_at: "2026-07-24T07:40:04Z",
  source_table: "quality_finding_backlog",
  waves_covered: "W5–W8 aggregate",
  tool: "cppa-admt",
} as const;

/** Every admt L1-tagged finding_check_id from the backlog, with occ counts. */
export const ADMT_L1_FINDINGS: readonly {
  finding_check_id: string;
  occurrence_count: number;
}[] = [
  { finding_check_id: "rubric_citation_misapplied", occurrence_count: 63 },
  { finding_check_id: "h3_admt_citation_depth",     occurrence_count: 37 },
  { finding_check_id: "h7_admt_blanket_range",      occurrence_count: 26 },
  { finding_check_id: "rubric_invented_admt_section", occurrence_count: 19 },
  { finding_check_id: "h6_admt_governing_anchor",   occurrence_count: 11 },
  { finding_check_id: "no_hallucinated_section_numbers", occurrence_count: 8 },
  { finding_check_id: "art11_gate_enforced",        occurrence_count: 2 },
];

/**
 * Coverage map — for each L1 finding class, list the proposition_keys in the
 * registry that structurally prevent an instance of that class.
 *
 * Prevention model:
 *   - rubric_citation_misapplied: the resolver forbids emitting a citation
 *     for a proposition unless the row's subsection matches the intake-
 *     resolved element. Any row anchored to the correct pinpoint prevents
 *     misapplication for that proposition.
 *   - h3_admt_citation_depth: rows carry an explicit depth_class; the
 *     generator cannot emit a shallower pinpoint than the registry allows.
 *     Any row with depth_class ∈ {subsection, sub_subsection, clause}
 *     eliminates the "cites only § 7220" defect for that proposition.
 *   - h7_admt_blanket_range: rows expose a single canonical pinpoint per
 *     proposition, so "§§ 7220–7222" ranges are structurally rejected.
 *   - rubric_invented_admt_section / no_hallucinated_section_numbers: the
 *     generator has no path to emit a section number outside the registry.
 *     Every row in the registry contributes.
 *   - h6_admt_governing_anchor: every row carries governing_anchor and the
 *     resolver refuses cross-anchor mixes (Art. 10 vs Art. 11).
 *   - art11_gate_enforced: scope_apply + scope_deadline gate every Art. 11
 *     proposition at resolve time.
 */
export const ADMT_COVERAGE: Record<string, {
  prevented_by: string[];
  rationale: string;
}> = {
  rubric_citation_misapplied: {
    prevented_by: [
      "admt_def", "admt_def_profiling", "human_involvement",
      "sig_decision", "sig_financial", "sig_housing", "sig_education",
      "sig_employment", "sig_healthcare",
      "notice_purpose", "notice_optout", "notice_access", "notice_antiretal",
      "notice_howworks_inputs", "notice_howworks_output", "notice_altprocess",
      "optout_offer", "optout_exc_appeal", "optout_exc_hire",
      "access_provide", "access_logic", "access_outcome", "access_timeline",
      "ra_trigger_admt", "ra_trigger_train", "ra_timing_new", "ra_timing_existing", "ra_submit",
      "fsor_advertising_exclusion", "fsor_human_involvement_three_part",
    ],
    rationale: "Each row pins one proposition to one authoritative pinpoint; the resolver refuses any emit that swaps pinpoints across propositions.",
  },
  h3_admt_citation_depth: {
    prevented_by: ADMT_VERIFIED_AUTHORITY_ROWS
      .filter((r) => r.depth_class !== "section")
      .map((r) => r.proposition_key),
    rationale: "Rows with depth_class deeper than section (subsection / sub_subsection / clause) force pinpoint depth at emit time; the generator cannot ship a bare-section citation for a proposition whose row carries a deeper pin.",
  },
  h7_admt_blanket_range: {
    prevented_by: Object.keys(ADMT_VERIFIED_AUTHORITIES),
    rationale: "Each proposition has exactly one canonical row; range citations like \"§§ 7220–7222\" are unreachable because the generator emits a proposition_key and the resolver returns a single row.",
  },
  rubric_invented_admt_section: {
    prevented_by: Object.keys(ADMT_VERIFIED_AUTHORITIES),
    rationale: "The generator has no path to a citation outside the registry (requireVerified throws on unknown keys), so no invented section can appear.",
  },
  no_hallucinated_section_numbers: {
    prevented_by: Object.keys(ADMT_VERIFIED_AUTHORITIES),
    rationale: "Same mechanism as rubric_invented_admt_section — registry-only emit.",
  },
  h6_admt_governing_anchor: {
    prevented_by: ADMT_VERIFIED_AUTHORITY_ROWS.map((r) => r.proposition_key),
    rationale: "Every row carries governing_anchor (Art. 10 vs Art. 11 vs statute); cross-anchor blending is detectable at resolve time.",
  },
  art11_gate_enforced: {
    prevented_by: ["scope_apply", "scope_deadline"],
    rationale: "scope_apply and scope_deadline supply the Art. 11 gate the checker consults before emitting any § 7220/7221/7222 proposition.",
  },
};

/**
 * Known gaps — L1 finding classes or specific propositions the S-A registry
 * does NOT yet cover. Enumerated so the follow-up admt wiring turn has an
 * explicit backlog and the coverage test does not silently miss them.
 *
 * Format: { area, missing, reason, deferred_to }
 */
export const ADMT_COVERAGE_GAPS: readonly {
  area: string;
  missing: string;
  reason: string;
  deferred_to: string;
}[] = [
  {
    area: "Pre-use Notice — trade-secret carve-outs",
    missing: "notice_ts_secret (§ 7220(d)(1)), notice_ts_security (§ 7220(d)(2))",
    reason: "Rarely-triggered carve-outs; S-A scope prioritized common-path propositions from the W5–W8 backlog.",
    deferred_to: "admt wiring turn (S-B) — add rows before removing carve-out fallbacks.",
  },
  {
    area: "Opt-out mechanics detail",
    missing: "optout_methods, optout_link_title, optout_wait12, optout_partial, optout_agent, optout_notify_sp, optout_cease15",
    reason: "Registry-injection contract is proven with the § 7221(a)/(b) core; mechanics rows are additive and do not change the resolver contract.",
    deferred_to: "admt wiring turn (S-B).",
  },
  {
    area: "Access response mechanics detail",
    missing: "access_methods, access_verify, access_denial, access_secure_tx, access_portal, access_sp_assist, access_aggregate",
    reason: "Same rationale as opt-out mechanics.",
    deferred_to: "admt wiring turn (S-B).",
  },
  {
    area: "Service-provider / third-party contracting propositions",
    missing: "sp_contract (§ 7050), tp_contract (§ 7052)",
    reason: "Cross-article rows; will be authored alongside cyber/risk registries so governing_anchor rules stay coherent.",
    deferred_to: "CPPA-PRODUCT-1 A2 shared-core turn.",
  },
  {
    area: "Unclassified finding IDs (open follow-up per R1 ruling)",
    missing: "h4_evasive_placeholder, h5_internal_note_block, h1_article_phrasing (and 5 others enumerated in the L5 backlog)",
    reason: "R1 ruling: unclassified check_ids remain on the follow-up list for the next L5 rules turn; S-A does not add them.",
    deferred_to: "next L5 rules turn.",
  },
];

/** Total covering-row count per finding class (used by the test summary). */
export function coverageSummary(): {
  finding_check_id: string;
  occurrence_count: number;
  covering_rows: number;
  status: "covered" | "gap";
}[] {
  return ADMT_L1_FINDINGS.map((f) => {
    const cov = ADMT_COVERAGE[f.finding_check_id];
    const n = cov ? cov.prevented_by.length : 0;
    return {
      finding_check_id: f.finding_check_id,
      occurrence_count: f.occurrence_count,
      covering_rows: n,
      status: n > 0 ? "covered" : "gap",
    };
  });
}
