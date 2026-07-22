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
  dimension: dim, severity, passed: false, evidence: evidence.slice(0, 1000),
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
  // "the audit-cohort determination resolved"
  /\bthe\s+[a-z][a-z0-9/\-]*\s+determination[-\s]resolved\b/i,
  /\b[a-z][a-z0-9/\-]*-determination[-\s]resolved\b/i,
  /\bdetermination[-\s]resolved\s+determination\b/i,
  // CPPA-HF2 F1: explicit "the audit-cohort determination" leakage (with or without trailing "resolved")
  /\bthe\s+audit-cohort\s+determination\b/i,
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
  // CPPA-HF4 Task F — ADMT pipeline element ids surfaced in prose.
  /\baccess_verify(?:_nonacct)?\b/i,
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

// ── H4 (CPPA-HF2 Task B) ─────────────────────────────────────────────
// Evasive-placeholder ban. Model attempts to sidestep the citation
// registry by writing "the cited provision governing [topic]" or
// "under the cited provision" in narrative fields. These read as
// concrete citations to a reader but resolve to nothing.
export const HF1_EVASIVE_PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bthe\s+cited\s+provision\s+governing\b/i,
  /\bunder\s+the\s+cited\s+provision\b/i,
  /\bpursuant\s+to\s+the\s+cited\s+provision\b/i,
  /\bthe\s+cited\s+(?:provision|section|subsection)\s+(?:above|below|referenced)\b/i,
];

export function checkH4EvasivePlaceholder(text: string): FormatFinding[] {
  if (!text) return [pass("h4_evasive_placeholder_ok", "citation_accuracy")];
  const findings: FormatFinding[] = [];
  for (const re of HF1_EVASIVE_PLACEHOLDER_PATTERNS) {
    const m = text.match(re);
    if (m) {
      findings.push(fail("h4_evasive_placeholder", "citation_accuracy", "high",
        `evasive-placeholder leakage: "${m[0]}"`));
      if (findings.length >= 5) break;
    }
  }
  if (findings.length === 0) {
    findings.push(pass("h4_evasive_placeholder_ok", "citation_accuracy"));
  }
  return findings;
}

// ── H3 ────────────────────────────────────────────────────────────────
// ADMT verified §§ 7220–7222 citation whitelist. Any § 7220/7221/7222 cite
// whose full path (parent + sub-parts) does not appear here is flagged.
// The list mirrors the sub-subsections actually referenced in the current
// ADMT rulebook (see run-admt-checker/index.ts).
// CPPA-HF2 Task A — expanded whitelist verified against 11 CCR final
// text (OAL-approved 2025-09) fetched from Westlaw. Each entry below is
// confirmed against the operative subsection structure.
export const ADMT_VERIFIED_CITES: ReadonlySet<string> = new Set([
  // § 7220 — Pre-use Notice
  "7220",
  "7220(a)", "7220(b)", "7220(b)(1)", "7220(b)(2)", "7220(b)(3)",
  "7220(c)", "7220(c)(1)", "7220(c)(2)", "7220(c)(2)(A)", "7220(c)(2)(B)",
  "7220(c)(3)", "7220(c)(4)",
  "7220(c)(5)", "7220(c)(5)(A)", "7220(c)(5)(B)", "7220(c)(5)(C)",
  "7220(d)", "7220(d)(1)",
  "7220(d)(2)", "7220(d)(2)(A)", "7220(d)(2)(B)", "7220(d)(2)(C)",
  "7220(e)", "7220(e)(1)", "7220(e)(2)", "7220(e)(3)", "7220(e)(4)",
  // § 7221 — Requests to Opt-Out of ADMT
  "7221",
  "7221(a)",
  "7221(b)",
  "7221(b)(1)", "7221(b)(1)(A)", "7221(b)(1)(B)",
  "7221(b)(2)", "7221(b)(2)(A)", "7221(b)(2)(B)",
  "7221(b)(3)", "7221(b)(3)(A)", "7221(b)(3)(B)",
  "7221(c)", "7221(c)(1)", "7221(c)(2)", "7221(c)(3)", "7221(c)(4)",
  "7221(d)", "7221(e)", "7221(f)", "7221(g)", "7221(h)", "7221(i)",
  "7221(j)", "7221(k)", "7221(l)", "7221(m)",
  "7221(n)", "7221(n)(1)", "7221(n)(2)",
  // § 7222 — Requests to Access ADMT
  "7222",
  "7222(a)",
  "7222(b)", "7222(b)(1)", "7222(b)(2)",
  "7222(b)(3)", "7222(b)(3)(A)",
  "7222(b)(4)", "7222(b)(4)(A)",
  "7222(c)", "7222(c)(1)",
  "7222(c)(2)", "7222(c)(2)(A)", "7222(c)(2)(B)", "7222(c)(2)(C)",
  "7222(d)", "7222(e)", "7222(f)", "7222(g)", "7222(h)", "7222(i)",
  "7222(j)", "7222(k)", "7222(l)",
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

// ── H5 (CPPA-HF3 B2, CPPA-HF5 Task H) ─────────────────────────────────
// Ban bracketed INTERNAL <anything> / annotation blocks in user-rendered
// prose. HF5 extends match to any "[INTERNAL <TOKEN>…" bracket block
// (INTERNAL NOTE, INTERNAL PROCEDURE, INTERNAL REVIEW, …).
export const HF3_INTERNAL_NOTE_RE =
  /\[\s*(?:INTERNAL(?:\s+[A-Z][A-Z\-]*)*|NOTE\s+TO\s+REVIEWER|EDITOR\s+NOTE|TODO|FOR\s+INTERNAL\s+USE)\b/i;

export function checkH5InternalNoteBlock(text: string): FormatFinding[] {
  if (!text) return [pass("h5_internal_note_ok")];
  const m = text.match(HF3_INTERNAL_NOTE_RE);
  if (m) {
    return [fail("h5_internal_note_block", "hallucination", "high",
      `bracketed internal-annotation block: "${m[0]}"`)];
  }
  return [pass("h5_internal_note_ok")];
}

// ── H6 (CPPA-HF4 Task B1; CPPA-HF5 Task C) ────────────────────────────
// § 7001 subdivisions are DEFINITIONAL. They may never appear (i) as the
// sole governing anchor for an ADMT action duty, or (ii) inside a
// substantive citation CHAIN alongside § 7220/7221/7222 as if they
// carried co-equal action-authority weight. Definitional support
// belongs in narrative, not in the chain.
const HF4_H6_ADMT_DUTY_VERBS =
  /\b(?:must\s+(?:disclose|provide|notify|respond|confirm|deliver|honor|honour|allow|permit)|shall\s+(?:disclose|provide|notify|respond|honor|honour)|the\s+business\s+must|response\s+must|access\s+response|opt[-\s]?out\s+response|pre[-\s]?use\s+notice|access\s+request)\b/i;
const HF4_H6_S7001_RE = /\bs?§?\s*7001(?:\([a-z0-9]+\))*/i;
const HF4_H6_ADMT_ANCHOR_RE = /\bs?§?\s*722[012](?:\([a-z0-9]+\))*/i;
// A "chain" is a compact sequence of §-cites joined by "+" or by direct
// enumeration with only whitespace/punctuation between the section tokens.
// Prose references like "…, per § 7001(e)(1) definition, the …" are NOT
// chains — they contain word tokens between the § tokens and are permitted.
const HF4_H6_CHAIN_JOINER_RE = /\+/;
const HF5_H6_ADJ_CHAIN_RE = /§\s*7001(?:\([a-z0-9]+\))*[\s,;]*(?:\+|and|with)?\s*(?:11\s*CCR\s*)?§\s*722[012]|§\s*722[012](?:\([a-z0-9]+\))*[\s,;]*(?:\+|and|with)\s*(?:11\s*CCR\s*)?§\s*7001/i;

export function checkH6AdmtGoverningAnchor(text: string): FormatFinding[] {
  if (!text) return [pass("h6_admt_governing_anchor_ok", "citation_accuracy")];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const findings: FormatFinding[] = [];
  for (const s of sentences) {
    if (!HF4_H6_S7001_RE.test(s)) continue;
    const hasDuty = HF4_H6_ADMT_DUTY_VERBS.test(s);
    const hasAnchor = HF4_H6_ADMT_ANCHOR_RE.test(s);
    if (hasDuty && !hasAnchor) {
      findings.push(fail("h6_admt_governing_anchor", "citation_accuracy", "high",
        `§ 7001 cited as sole governing anchor for an ADMT action duty: "${s.slice(0, 1000)}"`));
      if (findings.length >= 5) break;
      continue;
    }
    // CEO ruling (QB-P15 followup): when a §§ 7200–7222 operative anchor
    // co-appears in the same sentence as § 7001, the ADMT action is grounded
    // in the operative citation and co-citation with the definitional cite
    // is PERMITTED. Prior chain-pattern rejection removed — hasAnchor alone
    // now clears the sentence.
    if (hasAnchor) {
      // pass — operative § 722x anchor present alongside § 7001 definition
    }
  }
  if (findings.length === 0) {
    findings.push(pass("h6_admt_governing_anchor_ok", "citation_accuracy"));
  }
  return findings;
}

// ── Runners ───────────────────────────────────────────────────────────
/** CPPA-Risk / CPPA-Cyber: H1 + H2 + H4 + H5 (no H3/H6 — ADMT-scoped). */
export function runCppaHf1Checks(text: string): FormatFinding[] {
  return [
    ...checkH1ArticlePhrasing(text),
    ...checkH2InternalVocab(text),
    ...checkH4EvasivePlaceholder(text),
    ...checkH5InternalNoteBlock(text),
  ];
}

/** ADMT: H1 + H2 + H3 + H4 + H5 + H6. */
export function runAdmtHf1Checks(text: string): FormatFinding[] {
  return [
    ...checkH1ArticlePhrasing(text),
    ...checkH2InternalVocab(text),
    ...checkH3AdmtCitationDepth(text),
    ...checkH4EvasivePlaceholder(text),
    ...checkH5InternalNoteBlock(text),
    ...checkH6AdmtGoverningAnchor(text),
  ];
}
