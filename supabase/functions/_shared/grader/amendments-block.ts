// C1-c (2026-07-23T23:30:00Z) — GRADER AMENDMENTS BLOCK FROM CORPUS
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
//   - Static entries below reproduce the CCPA § 1798.140 (ah)/(aj) lettering
//     mapping that is already the operative anchor of citation-pair-verifier
//     (§ 1798.140(ah) = "sensitive personal information"; § 1798.140(aj) =
//     "share"). This is corpus-verified against the pair verifier's inline
//     documentation, not model recall.
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
  "CCPA Cal. Civ. Code § 1798.140 — current post-CPRA lettering (corpus-verified via _shared/citation-pair-verifier.ts):",
  "- § 1798.140(ah) defines \"sensitive personal information\".",
  "- § 1798.140(aj) defines \"share / sharing\" (cross-context behavioural advertising IS a \"share\").",
  "- Grader guidance: a report citing § 1798.140(ah) for the SPI predicate and § 1798.140(aj) for a share/sharing predicate is CORRECT. Swapped citations (SPI cited to (aj), or share cited to (ah)) are a confusion-pair defect already deterministically flagged by citation-pair-verifier — do NOT treat the flag as a fabrication finding; treat it as a citation defect at the pair-verifier's severity.",
].join("\n");

const OTHER_POST_2024_AMENDMENTS_BLOCK = [
  "OTHER CORPUS-VERIFIED POST-2024 AMENDMENTS (already listed in the POST-CUTOFF VERIFIED AUTHORITIES section above; reproduced here as an amendments checklist so grading anchors on current law):",
  "- Texas TRAIGA (HB 149, signed 2025-06-22, effective 2026-01-01) amends CUBI at Tex. Bus. & Com. Code § 503.001 (AI-training exemption + security exemption).",
  "- Illinois BIPA amendment (P.A. 103-0769) — per-person damages cap; applies retroactively per Clay v. Union Pacific Railroad Co., No. 25-2185 (7th Cir. Apr. 1, 2026).",
  "- New York SHIELD chain — S2659B / Chapter 647 of 2024 (medical & health-insurance information added to \"private information\"; notice to DFS added) and A8872A (30-day outside notice window). Reports citing these figures are CORRECT current NY breach-notification law.",
  "- EU–UK adequacy — European Commission renewed BOTH UK adequacy decisions (GDPR + LED) on 19 December 2025, six-year term expiring 27 December 2031. The 2021 adoption / June 2025 expiry dates are superseded.",
  "- CPPA CCR § 7121(a) cyber-audit cohorts — April 1, 2028 (>$100M) / April 1, 2029 ($50–100M) / April 1, 2030 (<$50M).",
  "- CPPA CCR § 7155(b) RA-for-existing-processing deadline — December 31, 2027; § 7157(a)(1) submission to Agency — April 1, 2028; § 7200(b) ADMT compliance — January 1, 2027.",
  "- Cal. Civ. Code § 1798.155(a) penalty pair — statutory base $2,500 / $7,500; CPI-adjusted 2025-2026 $2,663 / $7,988 (both presentations correct).",
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
    OTHER_POST_2024_AMENDMENTS_BLOCK,
  ].join("\n");
}

export const AMENDMENTS_BLOCK = buildAmendmentsBlock();
