/**
 * value-screen — Stage-B AUTHOR-CHECKPOINT (2026-07-27).
 *
 * ITEM-204 CEO RULING (Defect A) — 2026-07-27T~17Z:
 *   The bare "We " lexicon entry (seeded from A.i #178 owner-slot leak)
 *   false-positived on all ordinary prose containing the word "We ".
 *   The ACTUAL leaked fragment from the A.i #178 trace was a structured
 *   slot whose ENTIRE value was truncated to a single pronoun/article
 *   (verbatim evidence: `deadline_basis: "We"` — DUAL-SMOKE-POSTFIX
 *   2026-07-27 courier §3, table row 2, "Owner-slot / placeholder
 *   cleanup — PARTIAL — deadline_basis:\"We\" still emitted (1×)").
 *
 *   Fix class: replace the substring lexicon entry with a STRUCTURAL
 *   EXACT-VALUE guard. `TRUNCATED_SLOT_VALUES` fires only when a string
 *   value's entire trimmed content is one of a small closed set of
 *   pronouns/articles/short determiners — which cannot legitimately be
 *   the entire value of any customer-facing slot. Ordinary prose
 *   containing the word "We " passes cleanly.
 *
 *   AUDIT — other bare/short-substring lexicon entries removed in the
 *   same class-fix sweep (each falsely fired on ordinary counsel prose):
 *     • "We "               → REMOVED (replaced by TRUNCATED_SLOT_VALUES exact-match)
 *     • "our internal"      → REMOVED (fires on "our internal policies", etc.)
 *     • "internal review"   → REMOVED (legitimate legal prose)
 *     • "…"                 → REMOVED (ordinary ellipsis is common in counsel prose;
 *                             the truncation-residue class remains covered by
 *                             `...\n` and the exact-value guard)
 *   Retained entries are either (a) module/system names that never
 *   legitimately appear in customer prose or (b) explicit placeholder
 *   sentinels (`{{intake:`, `{{cite:`, `[filtered]`, `TODO`, etc.).
 */

export const VALUE_SCREEN_VERSION = "value-screen@2026-07-28-item235-residue";

/**
 * Substring-match lexicon — kept ONLY for entries that cannot false-
 * positive on ordinary counsel prose. Extend by evidence only.
 */
export const LEAK_LEXICON: readonly string[] = [
  // Historical filter-annotation leaks
  "[filtered]",
  "[redacted by policy]",
  "chain-of-thought",
  // Historical module-name leaks (Item 136 CUT + Item 178)
  "cross_tool_recommendations",
  "risk-surface-map",
  "Engine-A",
  "Engine-B",
  "RenderPlan",
  // Placeholder / substitution leaks
  "{{intake:",
  "{{cite:",
  "{{plan:",
  "<placeholder>",
  // Truncation residue tail
  "...\n",
] as const;

/**
 * ITEM 235 (T-M9.5) — INTERPOLATION-RESIDUE PATTERNS.
 * Blank-slot artifacts observed in run #169: "For ___, the benefits…",
 * "— Deadline basis: ___ (11 CCR § 7150(b)(1))". Fill-or-omit at render
 * eliminates the class upstream; these patterns are the shipped-surface
 * defense-in-depth that prevents any blank interpolation from reaching
 * the customer even if a future template escapes required-slot registry.
 */
export const INTERPOLATION_RESIDUE_RES: readonly RegExp[] = [
  / For , /,
  /: {2,}\(/,
  /— {2,}/,
  /: \./,
  / \(\)/,
] as const;

/**
 * ITEM-204 (Defect A) STRUCTURAL GUARD — exact-value match.
 * Fires only when a string value's entire trimmed content equals one of
 * these tokens. Catches the A.i #178 owner-slot truncation class
 * (`deadline_basis: "We"`, `owner: "The"`, etc.) without touching any
 * substring of ordinary prose.
 */
export const TRUNCATED_SLOT_VALUES: readonly string[] = [
  "We", "The", "A", "An", "Our", "Their", "It", "This", "That",
  "TODO", "TBD",
] as const;
export const TRUNCATED_SLOT_VALUE_SET: ReadonlySet<string> = new Set(TRUNCATED_SLOT_VALUES);

const CITE_SPAN_RE = /\{\{cite:[^}]+\}\}/g;
const INTAKE_SPAN_RE = /\{\{intake:[^}]+\}\}/g;

export class ValueScreenError extends Error {
  readonly hits: readonly ValueScreenHit[];
  constructor(hits: readonly ValueScreenHit[]) {
    super(`[value-screen] ${hits.length} hit(s): ${hits.map((h) => h.kind + ":" + h.match).join(" | ")}`);
    this.hits = hits;
    this.name = "ValueScreenError";
  }
}

export interface ValueScreenHit {
  readonly kind: "leak-lexicon" | "statutory-text" | "truncated-slot-value";
  readonly match: string;
  readonly path: string;
  readonly context: string;
}

export interface ScreenInput {
  readonly reportData: unknown;
  readonly corpusSnippets?: readonly string[];
  readonly statutoryLenThreshold?: number;
}

function scrubSpans(s: string): string {
  return s.replace(CITE_SPAN_RE, " ").replace(INTAKE_SPAN_RE, " ");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Anchor / metadata paths whose values are structured tokens, not customer prose. */
export function isAnchorPath(path: string): boolean {
  const lastKey = path.split(".").pop() ?? "";
  const bare = lastKey.replace(/\[\d+\]$/, "");
  if (bare.startsWith("_")) return true;
  return (
    bare === "id" ||
    bare === "key" ||
    bare === "stamp" ||
    bare === "build_stamp" ||
    bare === "version" ||
    bare === "schema_version" ||
    bare === "citation" ||
    bare === "provision" ||
    bare === "regulatory_citation" ||
    bare === "proposition_key" ||
    bare === "field" ||
    bare === "url" ||
    bare === "primary_source_url"
  );
}

function* walkStrings(node: unknown, path = ""): Generator<{ path: string; value: string }> {
  if (typeof node === "string") {
    yield { path, value: node };
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* walkStrings(node[i], `${path}[${i}]`);
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      // Skip _meta/_internal reserved subtrees entirely.
      if (k.startsWith("_")) continue;
      yield* walkStrings(v, path ? `${path}.${k}` : k);
    }
  }
}

/** Run the screen. Returns [] if clean; throws ValueScreenError on hit. */
export function runValueScreen(input: ScreenInput): void {
  const hits: ValueScreenHit[] = [];
  const threshold = input.statutoryLenThreshold ?? 60;
  const normalizedSnippets = (input.corpusSnippets ?? [])
    .filter((s) => s && s.length >= threshold)
    .map((s) => ({ raw: s, norm: normalize(s) }));

  for (const { path, value } of walkStrings(input.reportData)) {
    // (a) Structural: exact-value truncation guard (A.i #178 class).
    const trimmed = value.trim();
    if (!isAnchorPath(path) && TRUNCATED_SLOT_VALUE_SET.has(trimmed)) {
      hits.push({
        kind: "truncated-slot-value",
        match: trimmed,
        path,
        context: value.slice(0, 120),
      });
      // Fall through so lexicon/statutory checks still run.
    }

    const scrubbed = scrubSpans(value);
    const lower = scrubbed.toLowerCase();
    for (const needle of LEAK_LEXICON) {
      if (lower.includes(needle.toLowerCase())) {
        hits.push({
          kind: "leak-lexicon",
          match: needle,
          path,
          context: value.slice(0, 120),
        });
      }
    }
    if (normalizedSnippets.length > 0) {
      const scrubbedNorm = normalize(scrubbed);
      for (const snip of normalizedSnippets) {
        if (scrubbedNorm.includes(snip.norm)) {
          hits.push({
            kind: "statutory-text",
            match: snip.raw.slice(0, 80) + (snip.raw.length > 80 ? "…" : ""),
            path,
            context: value.slice(0, 120),
          });
        }
      }
    }
  }

  if (hits.length > 0) throw new ValueScreenError(hits);
}
