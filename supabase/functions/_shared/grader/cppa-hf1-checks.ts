// CPPA-HF1 — additive deterministic checks for the three CPPA generators
// (risk, ADMT, cybersecurity). Additive to the existing E1–E6 suite in
// format-checks.ts; do NOT modify or remove existing checks.
//
// H1 — "Article \d+ (ADMT|CCPA|CPPA)" phrasing ban.
//      CPPA regulations use section numbering ("§ 7220"), not Articles.
//      Applies to all three tools.
//
// H2 — Internal-vocab lexicon leakage in customer-facing prose.
//      Pipeline vocabulary — "<X>-determination resolved", "normalised_intake",
//      "the audit-cohort determination", "the sensitive-PI determination
//      resolved:", raw intake keys used as body text (i7_internal_contributors,
//      i5_admt_logic, q15c_spi_volume, etc.) — must never appear in prose.
//      Extends the INTERNAL-VOCAB CLASS BAN rule.
//
// H3 — ADMT citation sub-subsection depth beyond verified list.
//      Only cites in ADMT_VERIFIED_CITES may appear at §§ 7220–7222; deeper
//      or unverified paths (e.g. § 7220(c)(5)(A)–(C)) are flagged.

import type { FormatFinding } from "./format-checks.ts";

const pass = (id: string, dim = "hallucination"): FormatFinding => ({
  check_id: id, check_type: "deterministic",
  dimension: dim, severity: "medium", passed: true, evidence: null,
});
const fail = (
  id: string, dim: "hallucination" | "citation_accuracy",
  severity: "high" | "medium" | "low", evidence: string,
): FormatFinding => ({
  check_id: id, check_type: "deterministic",
  dimension: dim, severity, passed: false, evidence: evidence.slice(0, 400),
});

// ── H1 ────────────────────────────────────────────────────────────────
// "Article 11 ADMT obligations", "Article 10 CCPA", etc. Ban the phrasing
// wherever it appears in prose. Whitelist the two upstream regulation
// authorities: "GDPR Article NN" and "Convention 108 Article NN" remain
// permitted — the ban is scoped to CPPA/CCPA/ADMT.
export const HF1_ARTICLE_N_RE = /\bArticle\s+\d+\s+(?:ADMT|CCPA|CPPA)\b/i;

export function checkH1ArticlePhrasing(text: string): FormatFinding[] {
  if (!text) return [pass("h1_article_phrasing_ok")];
  const hit = text.match(HF1_ARTICLE_N_RE);
  if (hit) {
    return [fail("h1_article_phrasing", "citation_accuracy", "high",
      `banned "Article N ${hit[0].split(/\s+/).slice(-1)[0]}" phrasing: "${hit[0]}" — CPPA regs use § numbering`)];
  }
  return [pass("h1_article_phrasing_ok")];
}

// ── H2 ────────────────────────────────────────────────────────────────
// Internal pipeline vocabulary. Two classes:
//   (a) "-determination resolved" / "the <X> determination:" patterns;
//   (b) explicit lexicon tokens used only inside the generator pipeline.
export const HF1_INTERNAL_VOCAB_PATTERNS: RegExp[] = [
  // "the sale/share-revenue determination-resolved determination"
  // "the sensitive-PI determination resolved:"
  // "the audit-cohort determination"
  /\bthe\s+[a-z][a-z0-9/\-]*\s+determination[-\s]resolved\b/i,
  /\b[a-z][a-z0-9/\-]*-determination[-\s]resolved\b/i,
  /\bdetermination[-\s]resolved\s+determination\b/i,
  // Pipeline field / stage names surfaced in prose
  /\bnormalised_intake\b/i,
  /\bnormalized_intake\b/i,
  // Raw intake field ids used as customer-facing prose. Only flag when they
  // appear outside allowed anchor contexts (source_fields / information_needed
  // fields are stripped before prose extraction).
  /\bi7_internal_contributors\b/i,
  /\bi5_admt_logic\b/i,
  /\bi1b_min_pi\b/i,
  /\bimpact_intake\b/i,
  /\bq1[5-9][a-z]?_[a-z_]+\b/i,
];

export function checkH2InternalVocab(text: string): FormatFinding[] {
  if (!text) return [pass("h2_internal_vocab_ok")];
  const findings: FormatFinding[] = [];
  for (const re of HF1_INTERNAL_VOCAB_PATTERNS) {
    const m = text.match(re);
    if (m) {
      findings.push(fail("h2_internal_vocab", "hallucination", "medium",
        `internal-vocab leakage: "${m[0]}"`));
      if (findings.length >= 5) break;
    }
  }
  if (findings.length === 0) findings.push(pass("h2_internal_vocab_ok"));
  return findings;
}

// ── H3 ────────────────────────────────────────────────────────────────
// ADMT verified §§ 7220–7222 citation whitelist. Any § 7220/7221/7222 cite
// whose full path (parent + sub-parts) does not appear here is flagged.
// The list mirrors the sub-subsections actually referenced in the current
// ADMT rulebook (see run-admt-checker/index.ts).
export const ADMT_VERIFIED_CITES: ReadonlySet<string> = new Set([
  // § 7220 — Pre-use notice
  "7220", "7220(b)", "7220(c)", "7220(c)(1)", "7220(c)(2)", "7220(c)(3)",
  "7220(c)(4)", "7220(c)(5)", "7220(d)", "7220(d)(1)", "7220(e)",
  // § 7221 — Opt-out
  "7221", "7221(b)", "7221(b)(1)", "7221(b)(2)", "7221(b)(3)",
  "7221(c)", "7221(g)", "7221(m)", "7221(n)", "7221(n)(1)", "7221(n)(2)",
  // § 7222 — Access
  "7222", "7222(b)", "7222(b)(3)", "7222(b)(3)(A)", "7222(b)(4)",
  "7222(c)", "7222(c)(1)", "7222(j)",
]);

const ADMT_CITE_RE_SRC = /(?<!\d)(722[012])((?:\([A-Za-z0-9]+\))+)?/;

/** Normalise a captured cite: "7220(c)(5)(A)" → "7220(c)(5)(A)". */
function normaliseAdmtCite(section: string, suffix: string | undefined): string {
  return suffix ? `${section}${suffix}` : section;
}

export function checkH3AdmtCitationDepth(text: string): FormatFinding[] {
  if (!text) return [pass("h3_admt_citation_depth_ok", "citation_accuracy")];
  const findings: FormatFinding[] = [];
  const seen = new Set<string>();
  // Fresh /g regex per invocation — module-level /g regexes retain lastIndex
  // across calls and cause spurious misses.
  const re = new RegExp(ADMT_CITE_RE_SRC.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const cite = normaliseAdmtCite(m[1], m[2]);
    if (ADMT_VERIFIED_CITES.has(cite)) continue;
    if (seen.has(cite)) continue;
    seen.add(cite);
    findings.push(fail("h3_admt_citation_depth", "citation_accuracy", "high",
      `unverified § ${cite} — not in ADMT_VERIFIED_CITES whitelist (§§ 7220–7222)`));
    if (findings.length >= 8) break;
  }
  if (findings.length === 0) {
    findings.push(pass("h3_admt_citation_depth_ok", "citation_accuracy"));
  }
  return findings;
}

// ── Runners ───────────────────────────────────────────────────────────
/** CPPA-Risk / CPPA-Cyber: H1 + H2 (no H3 — H3 is ADMT-scoped). */
export function runCppaHf1Checks(text: string): FormatFinding[] {
  return [
    ...checkH1ArticlePhrasing(text),
    ...checkH2InternalVocab(text),
  ];
}

/** ADMT: H1 + H2 + H3. */
export function runAdmtHf1Checks(text: string): FormatFinding[] {
  return [
    ...checkH1ArticlePhrasing(text),
    ...checkH2InternalVocab(text),
    ...checkH3AdmtCitationDepth(text),
  ];
}
