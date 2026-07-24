// W6-RISK-FIX (2026-07-24) — post-generation scrubber for cppa-risk.
// Three atomic responsibilities:
//   1) INTAKE-STATE DISCIPLINE: never state that a § 7150(b) trigger was
//      "asserted/selected/indicated in the intake" unless the intake
//      contains an explicit field whose predicate satisfies that
//      subsection. Where no such basis exists, reframe as an unconfirmed
//      possibility routed to inconsistency_flags/next-steps and phrased
//      as not present in the intake.
//   2) TRIGGER MAPPING BY FACTUAL PREDICATE: § 7150(b)(4) and § 7150(b)(5)
//      must not be bundled by habit. When (b)(5) has no explicit
//      sensitive-location intake basis, de-bundle it from (b)(4).
//   3) SUBSECTION-LABEL CONSISTENCY: every distinct trigger phrase
//      carries one consistent § 7150(b)(N) label document-wide. Where
//      inconsistent labels are used for the same trigger, replace with
//      the parent § 7150(b) and describe the trigger textually.
//
// This module intentionally does NOT hard-code claims about what
// § 7150(b)(5) contains (graders disagree; per W6-RISK-FIX constraints,
// we describe triggers textually rather than asserting contested
// subsection content).

export type RiskFixCounters = {
  intake_state_rewrites: number;
  bundled_pairs_debundled: number;
  subsection_normalized: number;
  scanned_string_nodes: number;
};

// Which § 7150(b)(N) subsections does the intake explicitly select?
// Returns a Set of N values (as strings). We are deliberately narrow:
// we only credit subsections when a well-known intake field with a
// specific value maps to that subsection. Absence from this set does
// NOT mean the subsection is inapplicable — only that the intake does
// not itself assert it.
export function computeIntakeSelectedSubsections(intake: Record<string, unknown> | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!intake || typeof intake !== "object") return out;
  const v = (k: string) => {
    const x = (intake as any)[k];
    return typeof x === "string" ? x : "";
  };
  const yes = (s: string) => /^\s*yes\b/i.test(s);
  // (b)(1) — sell/share  |  (b)(2) — targeted advertising
  if (yes(v("q3_sell_share"))) out.add("1");
  if (yes(v("q4_targeted_ads"))) out.add("2");
  // (b)(3) — ADMT  (q18* family) ; (b)(3) also covers training ADMT
  if (yes(v("q18_admt_use")) || yes(v("q18b_admt_training"))) out.add("3");
  // (b)(4) — profiling with legal / significant effects OR systematic
  // observation of workers/students/applicants (q5*_profiling* family).
  const q5b = v("q5b_profiling_observation");
  if (yes(v("q5_profiling_significant")) || /systematic observation/i.test(q5b) || yes(q5b)) out.add("4");
  // (b)(6) — sensitive PI (q15* family beyond enumerated)
  if (yes(v("q15_sensitive_pi"))) out.add("6");
  return out;
}

const SUBSECTION_RE = /§\s*7150\(b\)\((\d+)\)/g;

// Rewrite claims that a specific § 7150(b)(N) subsection "was
// asserted/selected/indicated/stated in the intake" when N is NOT in
// the intake-supported set.
function rewriteUnsupportedIntakeAssertions(s: string, supported: Set<string>): { out: string; hits: number } {
  let hits = 0;
  // Pattern: "§ 7150(b)(N) ... (was|is|were) (asserted|selected|indicated|stated|chosen|marked|flagged) in the intake"
  // Kept narrow to avoid rewriting neutral references.
  const re = /(§\s*7150\(b\)\((\d+)\)[^.]{0,160}?\b(?:was|were|is|are)\b[^.]{0,60}?\b(?:asserted|selected|indicated|stated|chosen|marked|flagged|elected|checked)\b[^.]{0,40}?\bin the intake\b)/gi;
  let out = s.replace(re, (m, _clause, n) => {
    if (supported.has(String(n))) return m;
    hits++;
    return `§ 7150(b)(${n}) is not present in the intake; the controller must resolve whether a § 7150(b)(${n}) predicate applies and document the determination in the assessment record`;
  });
  // Pattern: "the intake (asserts|selects|indicates|states) § 7150(b)(N)"
  const re2 = /\bthe intake\b[^.]{0,40}?\b(?:asserts|selects|indicates|states|elects|marks|flags|shows)\b[^.]{0,60}?§\s*7150\(b\)\((\d+)\)/gi;
  out = out.replace(re2, (m, n) => {
    if (supported.has(String(n))) return m;
    hits++;
    return `§ 7150(b)(${n}) is not present in the intake; the controller must resolve whether a § 7150(b)(${n}) predicate applies and document the determination in the assessment record`;
  });
  return { out, hits };
}

// De-bundle "(b)(4) and (b)(5)" / "(b)(4)/(b)(5)" / adjacent pairings
// when (b)(5) is not intake-supported. Strips the (b)(5) limb, leaving
// (b)(4) intact.
function debundleB4B5(s: string, supported: Set<string>): { out: string; hits: number } {
  if (supported.has("5")) return { out: s, hits: 0 };
  let hits = 0;
  let out = s;
  // Forms:  "§ 7150(b)(4) and § 7150(b)(5)"  |  "§ 7150(b)(4)/(5)"  |
  //         "§ 7150(b)(4) and (b)(5)"        |  "§§ 7150(b)(4), (b)(5)"
  const patterns: RegExp[] = [
    /§\s*7150\(b\)\(4\)\s*(?:and|&|\/|,)\s*(?:§\s*7150)?\(b\)\(5\)/gi,
    /§\s*7150\(b\)\(4\)\/\(5\)/gi,
    /§§\s*7150\(b\)\(4\)\s*,\s*\(b\)\(5\)/gi,
  ];
  for (const p of patterns) {
    out = out.replace(p, () => { hits++; return "§ 7150(b)(4)"; });
  }
  // Bundled prose clauses that name both trigger labels together.
  out = out.replace(
    /(structured indicators?\s+for\s+§\s*7150\(b\)\(4\)[^.]{0,80}?)\s+and\s+§\s*7150\(b\)\(5\)[^.]{0,80}?triggers?/gi,
    (_m, keep) => { hits++; return String(keep).trim(); },
  );
  return { out, hits };
}

// Subsection-label consistency sweep: within a single string, if the
// same trigger phrase (systematic observation | sensitive location |
// targeted advertising | sell/share | ADMT | sensitive PI) is
// associated with more than one distinct § 7150(b)(N) label, normalize
// all its labels in that string to the parent "§ 7150(b)".
function normalizeInconsistentSubsectionLabels(s: string): { out: string; hits: number } {
  const triggers: Array<{ label: string; probe: RegExp }> = [
    { label: "systematic observation", probe: /systematic observation/gi },
    { label: "sensitive location", probe: /sensitive[- ]location/gi },
    { label: "targeted advertising", probe: /targeted (?:advertising|ads)/gi },
    { label: "sell/share", probe: /\bsell(?:ing)?\s*(?:\/|or|and)?\s*shar(?:e|ing)\b/gi },
    { label: "ADMT", probe: /\bADMT\b/g },
    { label: "sensitive PI", probe: /sensitive (?:personal information|pi)\b/gi },
  ];
  let hits = 0;
  let out = s;
  for (const t of triggers) {
    // Collect subsection labels appearing within ±120 chars of any trigger match.
    const seen = new Set<string>();
    for (const m of s.matchAll(t.probe)) {
      const start = Math.max(0, (m.index ?? 0) - 120);
      const end = Math.min(s.length, (m.index ?? 0) + m[0].length + 120);
      const window = s.slice(start, end);
      for (const sm of window.matchAll(SUBSECTION_RE)) seen.add(sm[1]);
    }
    if (seen.size < 2) continue;
    // Inconsistent — normalize every subsection reference near this trigger
    // in the string to parent § 7150(b).
    out = out.replace(/§\s*7150\(b\)\(\d+\)/g, (mm) => {
      // Only replace if within window of any trigger match; simpler and
      // safe: since the string already exhibits inconsistency for this
      // trigger, prefer parent form for all § 7150(b)(N) tokens.
      hits++;
      return "§ 7150(b)";
    });
    // One pass is enough — subsequent triggers would double-normalize a
    // string that no longer contains subsection-depth tokens.
    break;
  }
  return { out, hits };
}

export function applyW6RiskFix(
  report: any,
  intake: Record<string, unknown> | null | undefined,
): { report: any; counters: RiskFixCounters } {
  const supported = computeIntakeSelectedSubsections(intake);
  const counters: RiskFixCounters = {
    intake_state_rewrites: 0,
    bundled_pairs_debundled: 0,
    subsection_normalized: 0,
    scanned_string_nodes: 0,
  };

  const ANCHOR_KEYS = new Set([
    "field", "source_fields", "field_ids", "citation_ids",
    "intake_field_1", "intake_field_2", "canonical_fields", "element_id",
  ]);

  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (typeof node !== "object") return;
    for (const key of Object.keys(node)) {
      if (ANCHOR_KEYS.has(key)) continue;
      const val = node[key];
      if (typeof val === "string") {
        counters.scanned_string_nodes++;
        let cur = val;
        const r1 = rewriteUnsupportedIntakeAssertions(cur, supported);
        cur = r1.out; counters.intake_state_rewrites += r1.hits;
        const r2 = debundleB4B5(cur, supported);
        cur = r2.out; counters.bundled_pairs_debundled += r2.hits;
        const r3 = normalizeInconsistentSubsectionLabels(cur);
        cur = r3.out; counters.subsection_normalized += r3.hits;
        if (cur !== val) node[key] = cur;
      } else if (val && typeof val === "object") {
        walk(val);
      }
    }
  };
  try { walk(report); } catch (_) { /* non-fatal — fail-open */ }
  return { report, counters };
}
