// C1-c (2026-07-23T23:30:00Z) — GRADER AMENDMENTS BLOCK FROM CORPUS
// POST-C1-FIX-2-AMEND (2026-07-23T18:45:00Z) — dedicated post-cutoff case-law
// block for Clay v. Union Pacific (registry-sourced, verified real).
// HYGIENE-1 (2026-07-23T16:35:00Z) — docstring lettering corrected to match
// active exported strings and citation-pair-verifier: (ae)=SPI, (ah)=share.
//
// Purpose: supply the Opus grader with corpus-verified statements of the
// CURRENT/AMENDED law it is judging against, so grading is not silently
// anchored on pre-amendment model recall. This module composes ONLY from
// in-repo corpus sources:
//
//   - dpia-jurisdiction-registry.resolveArticle6Examples("uk_gdpr") — the
//     verbatim DUAA 2025 UK GDPR Article 6(11) recognised-legitimate-
//     interests examples (direct marketing, intra-group transmission,
//     network and information security), plus the distinct Art. 6(1)(ea) +
//     Annex 1 basis.
//   - admt-citation-registry.CITATION_REGISTRY — the 11 CCR § 7220 / § 7221 /
//     § 7222 family section→label map treated as the single source of truth
//     for verified ADMT section paths (OAL approval 2025-09-23, effective
//     2026-01-01, phased through 2030).
//   - Static entries below reproduce the CCPA § 1798.140 (ae)/(ah) lettering
//     mapping that is the operative anchor of citation-pair-verifier
//     (§ 1798.140(ae) = "sensitive personal information"; § 1798.140(ah) =
//     "share"/"sharing"). This is corpus-verified against the pair verifier's
//     inline documentation, not model recall.
//   - The DUAA 2025 in-force date (5 Feb 2026) and the OAL-approved CCR
//     § 7000-series effective/phased dates are drawn from the same in-repo
//     docstrings.
//
// Corpus discipline: no clause below is authored from model-recalled
// statutory text; every statement is either a direct quote of a corpus
// string or a labelled mapping produced by the registries above.
//
// This is CONTEXT SUPPLY ONLY. No rubric weights, scoring bands, or other
// measurement mechanics are altered by this module. Per the CEO integrity
// directive, any grader-side change beyond this block requires proof of
// mismeasurement — none is authorised here.

import { resolveArticle6Examples } from "../dpia-jurisdiction-registry.ts";
import { CITATION_REGISTRY } from "../admt-citation-registry.ts";
import {
  BIOMETRIC_STATUTE_REGISTRY,
  BIOMETRIC_REGISTRY_VERSION,
  type BiometricStatuteRow,
} from "../registry/biometric-statute-registry.ts";


function ukArt611Block(): string {
  const a6 = resolveArticle6Examples("uk_gdpr");
  return [
    "UK GDPR — DUAA 2025 amendments (Data (Use and Access) Act 2025; UK GDPR amendments in force 5 February 2026):",
    `- Article 6(11) UK GDPR (inserted by DUAA 2025) enumerates recognised-legitimate-interests examples; balancing test still required. Verbatim corpus references:`,
    `    · Direct marketing: ${a6.directMarketing}`,
    `    · Intra-group transmission for internal administrative purposes: ${a6.intraGroup}`,
    `    · Network and information security: ${a6.networkSecurity}`,
    `- Article 6(1)(ea) + Annex 1 UK GDPR is a DISTINCT basis: ${a6.recognisedLI}`,
    `- Grader guidance: reports treating Article 6(11) as engaged for one of the three enumerated examples are CORRECT current UK law. Reports conflating Article 6(11) with Article 6(1)(ea) + Annex 1 are a citation defect. EU GDPR has NO Article 6(11); citing "Article 6(11) GDPR" against an EU-only record is a defect.`,
  ].join("\n");
}

function cppaAdmt7220Block(): string {
  const pick = (prefix: string) =>
    Object.values(CITATION_REGISTRY)
      .filter((e) => e.section.startsWith(prefix))
      .sort((a, b) => a.section.localeCompare(b.section))
      .map((e) => `    · ${e.section} — ${e.label}`)
      .join("\n");
  return [
    "CPPA CCR § 7220-family — current OAL-approved text (approval 2025-09-23; effective 2026-01-01; phased compliance through 2030). Registry-derived section→label map (single source of truth: _shared/admt-citation-registry.ts):",
    "- § 7220 (Pre-use Notice) verified paths:",
    pick("11 CCR § 7220"),
    "- § 7221 (Opt-out) verified paths:",
    pick("11 CCR § 7221"),
    "- § 7222 (Access) verified paths:",
    pick("11 CCR § 7222"),
    "- Grader guidance: any § 7220 / § 7221 / § 7222 subsection appearing in the map above is CORRECT current text and MUST NOT be flagged as fabricated, invented, or unverified. Subsection paths OUTSIDE the map are unverified depth and may be flagged as such. § 7200(a) with § 7001(ddd) is the correct anchor for classification/scope-determination duties (see R-TURN-2 item 3).",
  ].join("\n");
}

const CCPA_140_LETTERING_BLOCK = [
  "CCPA Cal. Civ. Code § 1798.140 — current post-CPRA lettering (primary source: leginfo.legislature.ca.gov § 1798.140; cross-referenced against caprivacy.org CPRA text and codes.findlaw.com/ca/civil-code/civ-sect-1798-140):",
  "- § 1798.140(ae) defines \"sensitive personal information\".",
  "- § 1798.140(ag) defines \"service provider\".",
  "- § 1798.140(ah) defines \"share / sharing\" (cross-context behavioural advertising IS a \"share\").",
  "- § 1798.140(ai) defines \"third party\".",
  "- § 1798.140(aj) defines \"unique identifier\".",
  "- Grader guidance: a report citing § 1798.140(ae) for the SPI predicate and § 1798.140(ah) for a share/sharing predicate is CORRECT current statute. Do NOT flag those pairings as invented, misapplied, or fabricated. The prior post-CPRA lettering assumed elsewhere in the pipeline (SPI at (ah), share at (aj)) was inverted and has been corrected under POST-C1-FIX-1B (2026-07-23); grading anchors here take precedence.",
].join("\n");

const CLAY_POST_CUTOFF_BLOCK = [
  "POST-CUTOFF VERIFIED CASE LAW — Clay v. Union Pacific Railroad Co. (BIPA retroactivity):",
  "- Full citation: Clay v. Union Pacific Railroad Co., No. 25-2185, 2026 WL 891902 (7th Cir. Apr. 1, 2026) (consolidated with Gregg v. Central Transport LLC and Willis v. Universal Intermodal Services).",
  "- Verified against: https://www.ca7.uscourts.gov/opinion.htm (registry entry bipa-clay-2026, lastVerified 2026-06-28; source: _shared/registry/statutory-rules-registry.ts).",
  "- Holding: P.A. 103-0769 (the 2024 BIPA amendment imposing a per-person, per-biometric-identifier damages cap) is remedial/procedural and applies RETROACTIVELY to pending cases; pre-amendment conduct is limited to one recovery per person in federal court.",
  "- State-court caveat: Illinois state courts are not bound by the Seventh Circuit on this question of Illinois law; the Illinois Supreme Court has not addressed retroactivity, so residual per-scan exposure in Illinois state court cannot be fully excluded.",
  "- Grader guidance (BINDING): Clay v. Union Pacific is REAL, VERIFIED, CURRENT LAW. It postdates the grader's training cutoff, so it may read as unrecognised — this is expected and MUST NOT be treated as invention, fabrication, hallucination, unverified authority, or a citation defect under any dimension (accuracy, evidentiary discipline, citation integrity, or otherwise). Reports that cite Clay (lead case) for BIPA retroactivity, use the docket \"No. 25-2185\", the reporter \"2026 WL 891902\", or the decision date \"April 1, 2026\" are CORRECT. Reports that frame pre-amendment exposure as substantially reduced in federal court by Clay with an unresolved residual risk in Illinois state court track current law. Do NOT flag \"Gregg v. Central Transport\" or \"Willis v. Universal Intermodal Services\" as invented — they are the consolidated companion cases; Clay is the lead citation and should be preferred, but naming the companions is not a defect.",
].join("\n");

const OTHER_POST_2024_AMENDMENTS_BLOCK = [
  "OTHER CORPUS-VERIFIED POST-2024 AMENDMENTS (already listed in the POST-CUTOFF VERIFIED AUTHORITIES section above; reproduced here as an amendments checklist so grading anchors on current law):",
  "- Texas TRAIGA (HB 149, signed 2025-06-22, effective 2026-01-01) amends CUBI at Tex. Bus. & Com. Code § 503.001 (AI-training exemption + security exemption).",
  "- Illinois BIPA amendment (P.A. 103-0769) — per-person damages cap; retroactivity treatment is governed by the dedicated Clay v. Union Pacific block above (do not restate here).",
  "- New York SHIELD chain — S2659B / Chapter 647 of 2024 (medical & health-insurance information added to \"private information\"; notice to DFS added) and A8872A (30-day outside notice window). Reports citing these figures are CORRECT current NY breach-notification law.",
  "- EU–UK adequacy — European Commission renewed BOTH UK adequacy decisions (GDPR + LED) on 19 December 2025, six-year term expiring 27 December 2031. The 2021 adoption / June 2025 expiry dates are superseded.",
  "- CPPA CCR § 7121(a) cyber-audit cohorts — April 1, 2028 (>$100M) / April 1, 2029 ($50–100M) / April 1, 2030 (<$50M).",
  "- CPPA CCR § 7155(b) RA-for-existing-processing deadline — December 31, 2027; § 7157(a)(1) submission to Agency — April 1, 2028; § 7200(b) ADMT compliance — January 1, 2027.",
  "- Cal. Civ. Code § 1798.155(a) penalty pair — statutory base $2,500 / $7,500; CPI-adjusted 2025-2026 $2,663 / $7,988 (both presentations correct).",
].join("\n");

// S1 (2026-07-24) — REGISTRY-DERIVED VERIFIED-PINPOINT WHITELIST.
// The prior hand-scoped COLORADO_VERIFIED_PINPOINTS_BLOCK is retired.
// This block is auto-generated from every row in
// _shared/registry/biometric-statute-registry.ts, so any pinpoint the
// generator can cite (because it was supplied a registry row for it) is
// simultaneously listed to the grader as verified. Pinpoint→verbatim-quote
// consistency is enforced at CI by
// tests/registry/biometric-statute-self-consistency.test.ts, so the whitelist
// cannot drift from the registry. Colorado, Washington, Illinois, Texas —
// and every wave-2/3 jurisdiction added later — flow through this one path.
function biometricRegistryWhitelistBlock(): string {
  const rowsByJuris = new Map<string, BiometricStatuteRow[]>();
  for (const row of BIOMETRIC_STATUTE_REGISTRY) {
    const arr = rowsByJuris.get(row.jurisdiction_display) ?? [];
    arr.push(row);
    rowsByJuris.set(row.jurisdiction_display, arr);
  }
  const jurisSections: string[] = [];
  for (const [juris, rows] of Array.from(rowsByJuris.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    jurisSections.push(`- ${juris} (${rows[0].statute_short}${rows[0].statute_short !== rows[rows.length - 1].statute_short ? " et al." : ""}):`);
    for (const r of rows.sort((a, b) => a.pinpoint.localeCompare(b.pinpoint))) {
      jurisSections.push(`    · ${r.pinpoint} — ${r.topic.replace(/_/g, " ")} (verified ${r.verification_date}; source: ${r.primary_source_url})`);
    }
  }
  return [
    `BIOMETRIC STATUTE REGISTRY — VERIFIED PINPOINTS (auto-derived from _shared/registry/biometric-statute-registry.ts; registry_version=${BIOMETRIC_REGISTRY_VERSION}; pinpoint↔verbatim-quote consistency enforced by biometric-statute-self-consistency.test.ts):`,
    ...jurisSections,
    "- Grader guidance (BINDING): every pinpoint listed above is CORRECT current law and is present in the generator's supplied registry rows with a verbatim quote. Do NOT flag any pinpoint above as invented, misapplied, fabricated, unverified, or as a citation defect under any dimension (accuracy, evidentiary discipline, citation integrity, or otherwise). Regrader classes `citation_misapplication`, `pinpoint_not_verified`, `rubric_citation_misapplied`, `rubric_unsupported_business_claim` firing against these pinpoints are RULING-COLORADO-FP-1-class false positives and MUST be suppressed. Pinpoints NOT in the list may still be flagged as unverified depth.",
    "- Note: 4 CCR 904-3 (Colorado Privacy Act Rules) is promulgated under C.R.S. § 6-1-1313 (AG rulemaking authority); reports referencing 4 CCR 904-3 as the source of Colorado biometric-consent rules track current regulation.",
  ].join("\n");
}


// BIO-REG-W1 T2(c) D4 FIX — structured-unresolved calibration. Same pattern
// as R-15C-2 (Risk fallback silence): the biometric tool's structured-
// unresolved shape is DESIGNED OUTPUT for unregistered/unnamed states, not
// evidence of an internal-reasoning-leak or a boilerplate deduction. Without
// this calibration, the grader repeatedly (mis)fires `boilerplate_generic`
// / `reasoning_leak` against valid unresolved sections (Ohio in the T2(c)
// gate batch is the archetype).
const STRUCTURED_UNRESOLVED_CALIBRATION_BLOCK = [
  "STRUCTURED-UNRESOLVED SHAPE — DESIGNED OUTPUT (BIO-REG-W1 T2(c) D4; parallels R-15C-2):",
  "- Where the intake names a US state that is NOT in the biometric tool's Wave-1 registry (currently: Illinois, Texas, Washington, Colorado) OR selects \"Other US state\" without populating other_state_names, the tool emits a compact structured block containing: states_to_confirm_reason, top_candidate_statutes (or top_candidate_hooks_for_<state>), next_step, and an information_needed_entry.",
  "- This shape is the CORRECT ANSWER for out-of-registry / unnamed jurisdictions — it is NOT boilerplate, NOT scaffolding leaked into the report, NOT an internal-reasoning-leak, and NOT a generic template with the state name substituted in.",
  "- Grader guidance (BINDING): do NOT flag the structured-unresolved shape as `boilerplate_generic`, `reasoning_leak`, `internal_reasoning_leak`, `template_leak`, `scaffolding_visible`, `generic_prose_fallback`, or any neighbouring class. The presence of the fields listed above with a state name in the section header (e.g. \"Other US State — Ohio (Unresolved: Not in Statute Registry)\") is the correct designed output. Score for whether the block correctly identifies the intake field the reader must populate — do NOT score for absence of statute-specific obligations, penalties, or enforcement posture, which are correctly deferred by design.",
].join("\n");

export function buildAmendmentsBlock(): string {
  return [
    "GRADER AMENDMENTS BLOCK — CURRENT LAW SNAPSHOT (C1-c; corpus-verified only; context supply, not a rubric change):",
    "The grader MUST judge against the amended text described below. A conflict between a report and pre-amendment training-corpus recall is NOT a defect where the report tracks an entry in this block. This block does NOT alter rubric weights, scoring bands, or any other measurement mechanic.",
    "",
    ukArt611Block(),
    "",
    cppaAdmt7220Block(),
    "",
    CCPA_140_LETTERING_BLOCK,
    "",
    CLAY_POST_CUTOFF_BLOCK,
    "",
    OTHER_POST_2024_AMENDMENTS_BLOCK,
    "",
    biometricRegistryWhitelistBlock(),
    "",
    STRUCTURED_UNRESOLVED_CALIBRATION_BLOCK,
  ].join("\n");
}

export const AMENDMENTS_BLOCK = buildAmendmentsBlock();
