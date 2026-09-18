// product-test-grade — cross-block invariants family (doc 272 §6.3).
//
// Runs the mirrored `lintDocument` (see `_local/review/lint.ts` +
// `lint-profiles.ts`, byte-identical copies of
// `ptest-run-driver/_local/review/*` — tests/edge/product-test/mirror.test.ts)
// over the tool's skeleton document, plus three authored governance label
// pairs (doc 269 §3.5) and one generic table-of-authorities completeness
// check for every skeleton product.
//
// L-ENUM is EXCLUDED from the risk/admt/cyber mapping (structure.ts already
// owns those leaks for the profiled products) but INCLUDED for
// dpia/lia/governance/registration per the brief's explicit instruction to
// run "the profile-free rules (L-DUP, L-XREF, L-ENUM, L-QUOTE)" for them.

import { lintDocument, type LintHit, type LintProfile, type LintRuleId } from "../review/lint.ts";
import { LINT_PROFILES } from "../review/lint-profiles.ts";
import type { RenderedSkeletonDocument } from "../../../_shared/prose/skeleton-render.ts";
import type { Check, ProductTestTool } from "../types.ts";
import { SKELETON_TOOLS } from "../variants/contracts-registry.ts";

const EMPTY_PROFILE: LintProfile = {
  product: "profile-free",
  registrySections: [],
  citeAllowlist: [],
  byDesignDuplicates: [],
  labelPairs: [],
  emptyCellExemptTables: [],
};

// Products that run the tool-specific lint profile (registry, label pairs,
// promise section, date rule) vs. the profile-free four-rule subset.
const PROFILED_TOOLS: ReadonlySet<ProductTestTool> = new Set(["cppa-risk", "cppa-admt", "cppa-cyber"]);
const PROFILE_FREE_TOOLS: ReadonlySet<ProductTestTool> = new Set(["dpia", "lia", "governance", "registration"]);
const PROFILE_FREE_RULES: ReadonlySet<LintRuleId> = new Set(["L-DUP", "L-XREF", "L-ENUM", "L-QUOTE"]);
// The brief's general rule-id -> check-id mapping list (L-ENUM excluded —
// structure.ts owns it for the profiled tools).
const PROFILED_RULES: ReadonlySet<LintRuleId> = new Set([
  "L-XREF", "L-PROMISE", "L-LABEL", "L-DUP", "L-CITE", "L-QUOTE", "L-LEADIN", "L-CELL", "L-DATE",
]);

/**
 * L-DUP restatement filter (lead, 2026-09-18). A summary or register TABLE
 * that quotes a body sentence verbatim is by design in the DPIA risk
 * register (each register table restates the risk) and the LIA balancing
 * ledger (the ledger cell restates the paragraph it scores); prose that
 * repeats prose is still a defect. A duplicate hit is dropped when either
 * side of it is a table.
 */
function tableKeysOf(doc: RenderedSkeletonDocument): Set<string> {
  const keys = new Set<string>();
  for (const s of doc.sections) {
    s.paragraphs.forEach((p, i) => {
      if (p.table) {
        if (p.table.key) keys.add(p.table.key);
        if (p.key) keys.add(p.key);
        keys.add(`${s.id}:${i}`);
      }
    });
  }
  return keys;
}

function isTableRestatement(h: LintHit, tableKeys: Set<string>): boolean {
  if (h.rule !== "L-DUP") return false;
  if (h.block_key && tableKeys.has(h.block_key)) return true;
  const m = /also rendered at (\S+)/.exec(h.detail ?? "");
  return !!(m && tableKeys.has(m[1]));
}

function hitToCheck(h: LintHit): Check {
  return {
    check_id: `lint.${h.rule}`,
    family: "cross-block",
    severity: h.severity === "defect" ? "high" : "editorial",
    passed: false,
    block_key: h.block_key,
    quote: h.quote,
    actual: h.detail,
    rule_ref: h.rule,
  };
}

function passCheck(rule: LintRuleId): Check {
  return { check_id: `lint.${rule}`, family: "cross-block", severity: "editorial", passed: true, rule_ref: rule };
}

// ── governance label pairs (doc 269 §3.5) ───────────────────────────────────

const WORD_TO_N: Readonly<Record<string, number>> = {
  none: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function flattenText(doc: RenderedSkeletonDocument): string {
  const parts: string[] = [];
  for (const s of doc.sections) {
    for (const p of s.paragraphs) {
      if (p.table) {
        for (const row of p.table.rows) parts.push(row.join(" "));
      } else if (typeof p.text === "string") parts.push(p.text);
    }
  }
  return parts.join("\n");
}

/** doc 269 §3.5 row 1 — the scoreboard's "Domains not fully evidenced" count
 *  must equal the complement of the determination's "N of the ten fully
 *  evidenced" sentence (governance-domain-tables.ts:551,
 *  governance-skeleton-assemble.ts:1109; both derive from `clean.length`, so
 *  a generator defect that lets them diverge is exactly what this catches). */
function governanceScoreboardCheck(doc: RenderedSkeletonDocument): Check[] {
  const text = flattenText(doc);
  const m = /(\w+)\s+of\s+the\s+ten\s+fully\s+evidenced/i.exec(text);
  if (!m) return []; // sentence absent (e.g. a thin/messy variant) — nothing to cross-check.
  const cleanCount = WORD_TO_N[m[1].toLowerCase()];
  if (cleanCount === undefined) return [];
  const expectedGap = 10 - cleanCount;

  const table = doc.sections.flatMap((s) => s.paragraphs).find((p) => p.table?.key === "executive_summary:3")?.table;
  const row = table?.rows.find((r) => /domains not fully evidenced/i.test(String(r[0] ?? "")));
  if (!row) return [];
  const rm = /(\d+)\s+of\s+(\d+)/.exec(String(row[1] ?? ""));
  if (!rm) return [];
  const actualGap = Number(rm[1]);
  const passed = actualGap === expectedGap;
  return [{
    check_id: "cross-block.gov_scoreboard_vs_determination",
    family: "cross-block",
    severity: "high",
    passed,
    block_key: "executive_summary:3",
    quote: `${row[0]} | ${row[1]}`,
    expected: `${expectedGap} of 10 (complement of "${m[1]} of the ten fully evidenced")`,
    actual: `${actualGap} of ${rm[2]}`,
    rule_ref: "doc269-3.5-row1",
  }];
}

/** doc 269 §3.5 row 2 — the ICO crosswalk's rating vocabulary must not
 *  diverge from the document's own stated overall readiness rating.
 *  SIMPLIFICATION (documented): the crosswalk table
 *  (governance-skeleton-assemble.ts icoCrosswalkRows) is ten per-domain
 *  verdict rows, not a single aggregate rating cell, so this checks that the
 *  stated `overall_readiness_rating` phrase also appears somewhere in the
 *  ico_crosswalk section rather than a single cell-to-cell comparison — the
 *  lead should verify this against doc 269 §3.5's exact wording, which this
 *  agent did not have access to. */
function governanceCrosswalkCheck(doc: RenderedSkeletonDocument, overallReadinessRating?: string): Check[] {
  if (!overallReadinessRating) return [];
  const crosswalk = doc.sections.find((s) => s.id === "ico_crosswalk");
  if (!crosswalk) return []; // no UK establishment => no crosswalk section; nothing to check.
  const crosswalkText = crosswalk.paragraphs
    .map((p) => (p.table ? p.table.rows.map((r) => r.join(" ")).join(" ") : p.text))
    .join("\n");
  const passed = crosswalkText.toLowerCase().includes(overallReadinessRating.toLowerCase());
  return [{
    check_id: "cross-block.gov_crosswalk_vs_readiness",
    family: "cross-block",
    severity: "high",
    passed,
    block_key: "ico_crosswalk",
    expected: `crosswalk section references the stated readiness rating "${overallReadinessRating}"`,
    actual: passed ? "referenced" : "not referenced",
    rule_ref: "doc269-3.5-row2",
  }];
}

// ── generic table-of-authorities completeness (doc 269 §3.5 row 3, every
//    skeleton product) ───────────────────────────────────────────────────

const CITATION_RE = /\b11\s?CCR\s?§\s?\d{4}(?:\([a-z0-9]{1,3}\))*|\bCiv\.\s?Code\s?§\s?1798\.\d+(?:\([a-z0-9]{1,3}\))*|\bArt(?:icle)?\.?\s?\d{1,3}[A-Za-z]?\b/g;

/**
 * Section-level key of a citation (lead correction 2026-09-18 after the
 * CEO's first Risk run): the body cites pinpoints ("11 CCR § 7150(b)(1)")
 * while an authority matrix cites ranges ("11 CCR § 7150(a)–(b)"), so an
 * exact-string comparison reported ten false omissions on a clean
 * document. A body citation is covered when its section (the part before
 * any pinpoint, whitespace-normalised) appears in the authorities section;
 * a section cited in the body and absent from the table still fails.
 */
export function citationSectionKey(c: string): string {
  return c
    .replace(/\((?:[a-z0-9]{1,3})\)/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s?§\s?/, " § ")
    // "Article 35", "Art 35" and "Art. 35" are one citation.
    .replace(/^Art(?:icle)?\.?\s?/i, "Art. ")
    .trim();
}

/** In the CPPA products "Article 9" / "Article 11" name a CCR article
 *  heading (the cybersecurity-audit or ADMT article), not a citation the
 *  authorities table would list; only the § forms are citations there. */
const CPPA_CITATION_TOOLS: ReadonlySet<ProductTestTool> = new Set(["cppa-risk", "cppa-cyber", "cppa-admt"]);

/**
 * CEO ruling 2026-09-18 (doc 275 §3, option 2): a product's authority
 * matrix lists the factors the assessment ANALYSES; a provision the body
 * cites for an administrative duty need not appear in it. Each entry is a
 * section key (`citationSectionKey` form) the check ignores for that
 * product, with the ruling that put it there. Anything not listed here is
 * still a failure — the allow-list grows only by a CEO ruling per entry.
 */
export const TOA_ALLOWLIST: Readonly<Partial<Record<ProductTestTool, readonly string[]>>> = {
  // Risk Appendix A is the factor/determination/authority matrix (§§ 7150–7155);
  // § 7157 governs submission to the Agency, carried by the body's governance
  // sub-part E and the Agency Submission Checklist, not an assessed factor.
  // Ruled after run ae174db5 (ten fixtures, the only failure on each).
  "cppa-risk": ["11 CCR § 7157"],
};

function tableOfAuthoritiesCheck(tool: ProductTestTool, doc: RenderedSkeletonDocument): Check[] {
  const toa = doc.sections.find((s) => /table.of.authorities|authority.exhibit/i.test(s.id) || /table of authorities|authorities cited|authority matrix/i.test(s.title));
  if (!toa) return []; // no ToA section in this document — nothing to check.
  const keyOf = (m: RegExpMatchArray) => citationSectionKey(m[0]);
  const isCitationForTool = (k: string) => !(CPPA_CITATION_TOOLS.has(tool) && k.startsWith("Art."));
  const toaText = toa.paragraphs.map((p) => (p.table ? p.table.rows.map((r) => r.join(" ")).join(" ") : p.text)).join("\n");
  const toaKeys = new Set([...toaText.matchAll(CITATION_RE)].map(keyOf));
  const bodySections = doc.sections.filter((s) => s.id !== toa.id);
  const bodyText = bodySections.map((s) => s.paragraphs.map((p) => (p.table ? p.table.rows.map((r) => r.join(" ")).join(" ") : p.text)).join("\n")).join("\n");

  const allowed = new Set(TOA_ALLOWLIST[tool] ?? []);
  const cited = new Set([...bodyText.matchAll(CITATION_RE)].map(keyOf).filter(isCitationForTool));
  const missing = [...cited].filter((c) => !toaKeys.has(c) && !allowed.has(c));
  return [{
    check_id: "cross-block.table_of_authorities_complete",
    family: "cross-block",
    severity: "high",
    passed: missing.length === 0,
    block_key: toa.id,
    quote: missing[0],
    expected: "every citation rendered in the body appears in the Table of Authorities",
    actual: missing.length ? `${missing.length} missing: ${missing.slice(0, 12).map((m) => `"${m}"`).join(", ")}${missing.length > 12 ? ", …" : ""}` : "complete",
    rule_ref: "doc269-3.5-row3",
  }];
}

export function checkCrossBlock(
  tool: ProductTestTool,
  output: Record<string, unknown>,
): Check[] {
  const doc = output?.skeleton_document as RenderedSkeletonDocument | undefined;
  if (!SKELETON_TOOLS.has(tool) || !doc || !Array.isArray(doc.sections)) return [];

  const checks: Check[] = [];
  const tableKeys = tableKeysOf(doc);

  if (PROFILED_TOOLS.has(tool)) {
    const profile = LINT_PROFILES[tool] ?? EMPTY_PROFILE;
    const result = lintDocument(doc, profile);
    const seenPass = new Set<LintRuleId>();
    for (const h of result.hits) {
      if (!PROFILED_RULES.has(h.rule)) continue; // L-ENUM excluded here (structure.ts owns it).
      if (isTableRestatement(h, tableKeys)) continue;
      checks.push(hitToCheck(h));
      seenPass.add(h.rule);
    }
    for (const r of PROFILED_RULES) if (!seenPass.has(r)) checks.push(passCheck(r));
  } else if (PROFILE_FREE_TOOLS.has(tool)) {
    const result = lintDocument(doc, EMPTY_PROFILE);
    const seenPass = new Set<LintRuleId>();
    for (const h of result.hits) {
      if (!PROFILE_FREE_RULES.has(h.rule)) continue;
      if (isTableRestatement(h, tableKeys)) continue;
      checks.push(hitToCheck(h));
      seenPass.add(h.rule);
    }
    for (const r of PROFILE_FREE_RULES) if (!seenPass.has(r)) checks.push(passCheck(r));
  }

  if (tool === "governance") {
    checks.push(...governanceScoreboardCheck(doc));
    checks.push(...governanceCrosswalkCheck(doc, typeof output?.overall_readiness_rating === "string" ? output.overall_readiness_rating as string : undefined));
  }

  checks.push(...tableOfAuthoritiesCheck(tool, doc));

  return checks;
}
