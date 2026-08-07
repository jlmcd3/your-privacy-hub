// ITEM 399 — R11: THE ASSEMBLED-PROSE LINT (the class-ender).
//
// WHY THIS EXISTS
// ---------------
// R1-R10 fixed structure. The prose audit then found a defect family the seam
// tests could never see: they assert on BUILDER LITERALS, while the defects are
// born when those literals are CONCATENATED. Markdown that was fine as a
// heading token becomes literal asterisks in the PDF; a pinpoint that each half
// legitimately owns appears twice back to back; a frame clause and a pinned
// verbatim quote each parse alone and collapse together.
//
// This lint therefore runs over the FINAL assembled strings of a rendered
// document, not over any builder input.
//
// CONTRACT
// --------
//   · DETECTS ONLY. It never mutates the report. Fixes happen at source.
//   · Fail-open: it never throws; a crash is reported as `crashed: true`.
//   · Byte-pinned surfaces (locked sentences, banners, disclaimers, verbatim
//     quotations) are PROTECTED by this lint, never restyled by it.
//   · Wired twice: as a build-breaking test battery over each product's perfect
//     fixture rendered through the FULL production call path, and as fail-open
//     runtime telemetry at `_meta.internal.prose_lint`.

export const PROSE_LINT_VERSION = "assembled-prose-lint-2026-08-07-item399";

export type ProseLintRule =
  | "markdown_token"
  | "quote_frame_break"
  | "duplicate_pinpoint"
  | "splice_pattern"
  | "headline_in_paragraph";

export interface ProseLintFinding {
  rule: ProseLintRule;
  path: string;
  sample: string;
  /** Rule 5 is conservative: uncertain hits are flagged, not failed. */
  advisory?: boolean;
}

export interface ProseLintResult {
  version: string;
  count: number;
  /** Findings excluding advisory-only ones — the build-breaking set. */
  blocking: number;
  findings: ProseLintFinding[];
  crashed: boolean;
}

// Keys whose values are machinery, telemetry or byte-pinned chrome. The lint
// reads customer PROSE only.
const SKIP_KEYS = new Set([
  "_meta",
  "_staging",
  "_revision",
  "build_stamp",
  "prompt_version",
  "banner_html",
  "draft_banner",
  "action_plan_banner",
  "disclaimer",
  "framework_disclaimer",
  "authority_verbatim",
  "verbatim",
  "verbatim_quote",
  "citation_ledger",
  "deterministic_checks",
  "rule_ids",
  "decision",
  "html",
]);

// ── rule 1 — markdown tokens ────────────────────────────────────────────────
// `**bold**`, `## heading`, backtick code spans, bullet glyphs at line start.
const MARKDOWN_RES: RegExp[] = [
  /\*\*/,
  /(?:^|\n)\s{0,3}#{1,6}\s/,
  /`/,
  /(?:^|\n)\s{0,3}[•▪◦]\s/,
  /(?:^|\n)\s{0,3}[*+]\s+\S/,
];

// ── rule 2 — quote-frame breaks ─────────────────────────────────────────────
// A frame that supplies a subject or determiner immediately before a quotation
// whose own first words supply one too.
const QUOTE_FRAME_RES: RegExp[] = [
  /\bwhere\s+it\s+["“]/i,
  /\bthat\s+it\s+["“]/i,
  /\bit\s+["“](?:processing|the|a|an)\b/i,
  // duplicated determiner across the quote mark: `the "the …`
  /\b(the|a|an)\s+["“]\s*\1\b/i,
];

// ── rule 3 — duplicated citation pinpoint within one string ─────────────────
const PINPOINT_RE =
  /(?:\d+\s*CCR\s*)?§+\s*\d[\d.]*(?:\([a-z0-9]+\))*|Article\s+\d+(?:\(\d+\))*(?:\([a-z]\))?/gi;

// ── rule 4 — known splice patterns ──────────────────────────────────────────
const SPLICE_RES: RegExp[] = [
  // missing relative pronoun: "The gap is the reserved judgment must be …"
  /\bis\s+the\s+[a-z][a-z\s-]{2,60}?\s+must\b/i,
  // internal Owner: scaffolding surviving mid-string
  /\S\s+Owner:\s/,
  // two imperatives run together without a joiner: "… the risk it addresses
  // complete and retain the record …"
  /\b(?:addresses|requires|applies)\s+(?:complete|record|document|retain|attach)\s+(?:and|the)\b/i,
];

// ── rule 5 — headline jammed into a paragraph (conservative / advisory) ─────
// A sentence ending, then a Title-Case fragment that terminates in a period and
// contains no finite verb.
const VERBS_RE =
  /\b(is|are|was|were|has|have|had|does|do|did|shall|must|may|can|will|would|records?|carries|requires?|processes|documents?|sets?|shows?|includes?|applies|reserves?|permits?)\b/i;
const HEADLINE_RES = /(?:^|(?<=[.!?]\s))([A-Z][A-Za-z]*(?:\s+(?:&|and|of|for|the|to|[A-Z][A-Za-z]*)){0,6})\.(?=\s|$)/g;

function isProseString(s: string): boolean {
  return s.length >= 24 && /\s/.test(s);
}

function lintString(s: string, path: string, out: ProseLintFinding[]): void {
  const sample = s.length > 180 ? `${s.slice(0, 180)}…` : s;

  for (const re of MARKDOWN_RES) {
    if (re.test(s)) {
      out.push({ rule: "markdown_token", path, sample });
      break;
    }
  }

  for (const re of QUOTE_FRAME_RES) {
    if (re.test(s)) {
      out.push({ rule: "quote_frame_break", path, sample });
      break;
    }
  }

  const pins = (s.match(PINPOINT_RE) ?? []).map((p) => p.replace(/\s+/g, " ").trim().toLowerCase());
  if (pins.length > 1) {
    const seen = new Set<string>();
    for (const p of pins) {
      // Only a pinpoint with a subsection is specific enough to call duplicate;
      // bare "§ 7152" recurring across a long paragraph is normal drafting.
      if (!/\(/.test(p)) continue;
      if (seen.has(p)) {
        out.push({ rule: "duplicate_pinpoint", path, sample });
        break;
      }
      seen.add(p);
    }
  }

  for (const re of SPLICE_RES) {
    if (re.test(s)) {
      out.push({ rule: "splice_pattern", path, sample });
      break;
    }
  }

  for (const m of s.matchAll(HEADLINE_RES)) {
    const frag = m[1];
    if (!frag || frag.split(/\s+/).length < 2) continue;
    if (VERBS_RE.test(frag)) continue;
    out.push({ rule: "headline_in_paragraph", path, sample, advisory: true });
    break;
  }
}

/** Walk every customer prose string of an assembled report. */
export function lintAssembledProse(report: unknown): ProseLintResult {
  const findings: ProseLintFinding[] = [];
  let crashed = false;
  try {
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") {
        if (isProseString(node)) lintString(node, path, findings);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if (SKIP_KEYS.has(k)) continue;
          walk(v, path ? `${path}.${k}` : k);
        }
      }
    };
    walk(report, "");
  } catch {
    crashed = true;
  }
  return {
    version: PROSE_LINT_VERSION,
    count: findings.length,
    blocking: findings.filter((f) => !f.advisory).length,
    findings,
    crashed,
  };
}

/**
 * Runtime wiring: fail-open telemetry only. NEVER mutates prose.
 */
export function attachProseLint(report: Record<string, unknown>): ProseLintResult {
  const result = lintAssembledProse(report);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.prose_lint = {
      version: result.version,
      count: result.count,
      blocking: result.blocking,
      crashed: result.crashed,
      paths: result.findings.map((f) => ({ rule: f.rule, path: f.path, advisory: !!f.advisory })),
    };
  } catch {
    /* fail-open: telemetry must never block a document */
  }
  return result;
}
