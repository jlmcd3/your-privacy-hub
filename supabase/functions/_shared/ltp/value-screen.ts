/**
 * value-screen — Stage-B AUTHOR-CHECKPOINT (2026-07-27).
 *
 * LEAK-PREV-P2 boundary choke-point value screen. Item 180.1 addendum.
 *
 * Two hit classes:
 *   (a) LEAK LEXICON — seeded from A.i traces + historical ledger
 *       leaks. Substring match, case-insensitive, on any string value
 *       written into report_data outside a substituted {{cite:…}} span.
 *   (b) STATUTORY-TEXT class — verbatim regulation / statute text
 *       appearing OUTSIDE a {{cite:…}} span. Normalized-substring
 *       match above LEN_THRESHOLD against caller-supplied corpus
 *       snippets. Detector is injected — the boundary caller passes
 *       the corpus snippets for the propositions being rendered.
 *
 * Behavior on hit: fail-loud (throw). Caller may catch and trigger
 * exactly ONE bounded recompose; a second hit escalates to
 * write-around per Item 179 / Item 185 discipline.
 */

export const VALUE_SCREEN_VERSION = "value-screen@2026-07-27";

/** A.i traces + historical ledger leaks. Extend by evidence only. */
export const LEAK_LEXICON: readonly string[] = [
  // A.i #178 traces
  "We ", // owner-slot leak fragment (Item 176 §2 / Item 178)
  "Our team",
  "internal review",
  "our internal",
  // Historical filter-annotation leaks
  "[filtered]",
  "[redacted by policy]",
  "reasoning:",
  "chain-of-thought",
  // Historical module-name leaks (Item 136 CUT + Item 178)
  "cross_tool_recommendations",
  "risk-surface-map",
  "Engine-A",
  "Engine-B",
  "Pass-1",
  "Pass-2",
  "Pass-G",
  "Pass-V",
  "RenderPlan",
  // Placeholder / substitution leaks
  "{{intake:",
  "{{cite:",
  "TODO",
  "TBD",
  "<placeholder>",
  // Truncation residue (Item 176 §6)
  "…",
  "...\n",
] as const;

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
  readonly kind: "leak-lexicon" | "statutory-text";
  readonly match: string;
  readonly path: string;
  readonly context: string;
}

export interface ScreenInput {
  /** Fully composed report_data (post-substitution). */
  readonly reportData: unknown;
  /**
   * Corpus snippets to check for statutory-text-outside-cite class.
   * Caller supplies only the snippets relevant to the current render
   * (typically the pinpoint verbatim_excerpt values that were bound
   * via {{cite:…}} tokens for this document).
   */
  readonly corpusSnippets?: readonly string[];
  /** Minimum length to treat a corpus-snippet match as a statutory-text hit. */
  readonly statutoryLenThreshold?: number;
}

/** Strip cite/intake spans so their contents don't produce false hits. */
function scrubSpans(s: string): string {
  return s.replace(CITE_SPAN_RE, " ").replace(INTAKE_SPAN_RE, " ");
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
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
