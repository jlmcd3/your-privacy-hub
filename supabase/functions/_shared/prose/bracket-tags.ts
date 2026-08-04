// ITEM 372 (DPIA QUALITY PILOT, METHOD 2b) — BRACKET TAGS OUT OF SENTENCES.
//
// THE DEFECT
// ----------
// Completion placeholders were written INTO the prose: "…a data processing
// agreement must be in place [TO COMPLETE — confirm processor list]." The
// reader meets a form instruction in the middle of counsel's sentence, and the
// ask itself is buried where no one can action it.
//
// WHAT THIS PASS DOES
// -------------------
//   (a) A string that is NOTHING BUT a tag — the shape a table cell takes —
//       becomes a short labelled blank: "To be completed: <what>".
//   (b) A tag INSIDE a sentence is lifted out. The sentence closes cleanly and
//       the string gains one controlled absence literal, which the live frame
//       substitution pass (which runs immediately after this one) rewrites into
//       the product's approved counsel-voice register.
//   (c) Every lifted tag is recorded as an entry on the asks surface
//       (`information_needed`), so nothing is silently dropped.
//
// ORDER: emit gate → **bracket tags (this pass)** → frame substitution → cap.
//
// CONTRACT: deterministic key-order walk, mutates in place, never throws,
// never touches `_meta` / `_staging`, and never invents a fact. Telemetry rides
// `_meta.internal.bracket_tags`.

import { INFO_NEEDED_LITERAL } from "./frame-substitution.ts";

export const BRACKET_TAG_VERSION = "bracket-tags-2026-08-04-item372";

/** `[TO COMPLETE — …]`, `[TO BE ASSESSED — …]`, and the bare forms. */
export const BRACKET_TAG_RE =
  /\[\s*(?:TO\s+COMPLETE|TO\s+BE\s+ASSESSED|TO\s+BE\s+COMPLETED|INSERT)\b[^\][]*\]/gi;

/** Keys whose values are structural asks already, and are left alone. */
const SKIP_KEYS = new Set(["_meta", "_staging", "information_needed", "open_items"]);

export interface BracketTagCounters {
  version: string;
  /** tags found anywhere in the document */
  found: number;
  /** whole-value tags rewritten as a labelled blank */
  labelled_blanks: number;
  /** tags lifted out of a surrounding sentence */
  lifted_from_prose: number;
  /** asks appended to `information_needed` */
  asks_added: number;
  /** bracketed interruptions left inside prose sentences afterwards */
  interruptions_remaining: number;
  crashed: boolean;
}

/** "[TO COMPLETE — DPO name and contact]" → "DPO name and contact". */
export function describeTag(tag: string): string {
  const inner = String(tag || "").replace(/^\[|\]$/g, "").trim();
  const stripped = inner
    .replace(/^(?:TO\s+COMPLETE|TO\s+BE\s+ASSESSED|TO\s+BE\s+COMPLETED|INSERT)\b/i, "")
    .replace(/^[\s—–:-]+/, "")
    .trim();
  return stripped;
}

/** The labelled blank a table cell gets in place of a bare tag. */
export function labelledBlank(tag: string): string {
  const what = describeTag(tag);
  return what ? `To be completed: ${what}` : "To be completed.";
}

/** True when the whole string is a single tag and nothing else. */
export function isBareTag(value: string): boolean {
  const t = String(value ?? "").trim();
  if (!t) return false;
  const matches = t.match(BRACKET_TAG_RE);
  return matches?.length === 1 && matches[0].length === t.length;
}

/**
 * A closing bracket with no opener in the same string is the wreckage of a
 * placeholder that collapsed into the sentence. It is never content, so it is
 * removed here rather than shipped.
 */
export function dropOrphanBrackets(text: string): string {
  const t = String(text ?? "");
  if (!/[\[\]]/.test(t)) return t;
  let depth = 0;
  let out = "";
  for (const ch of t) {
    if (ch === "[") { depth += 1; out += ch; continue; }
    if (ch === "]") {
      if (depth === 0) continue; // orphan — drop it
      depth -= 1;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Tidy the whitespace and punctuation a lifted tag leaves behind. */
function tidy(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,;:])\s*\./g, ".")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .trim();
}

/** Count bracketed interruptions still sitting inside a longer sentence. */
export function countProseInterruptions(doc: unknown): number {
  let n = 0;
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      const tags = node.match(BRACKET_TAG_RE);
      if (tags && !isBareTag(node)) n += tags.length;
      return;
    }
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        walk(v);
      }
    }
  };
  walk(doc);
  return n;
}

export interface BracketTagAsk {
  field: string;
  dimensions: string;
  provision: string;
  enables: string;
}

function pushAsk(
  asks: BracketTagAsk[],
  seen: Set<string>,
  path: string,
  what: string,
): boolean {
  const dimensions = what || "the entry this document leaves blank";
  const key = dimensions.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  asks.push({ field: path || "document", dimensions, provision: "", enables: "" });
  return true;
}

export function applyBracketTagPass(
  report: Record<string, unknown> | null | undefined,
  opts: { absenceLiteral?: string } = {},
): BracketTagCounters {
  const c: BracketTagCounters = {
    version: BRACKET_TAG_VERSION,
    found: 0,
    labelled_blanks: 0,
    lifted_from_prose: 0,
    asks_added: 0,
    interruptions_remaining: 0,
    crashed: false,
  };
  const absence = opts.absenceLiteral ?? INFO_NEEDED_LITERAL;
  try {
    if (!report || typeof report !== "object") return c;

    const asks: BracketTagAsk[] = [];
    const seen = new Set<string>();
    const existing = Array.isArray(report.information_needed)
      ? (report.information_needed as unknown[])
      : [];
    for (const e of existing) {
      const d = (e as { dimensions?: unknown })?.dimensions;
      if (typeof d === "string" && d.trim()) seen.add(d.trim().toLowerCase());
    }

    const rewrite = (rawValue: string, path: string): string => {
      const value = dropOrphanBrackets(rawValue);
      const tags = value.match(BRACKET_TAG_RE);
      if (!tags || tags.length === 0) {
        return value === rawValue ? rawValue : tidy(value);
      }
      c.found += tags.length;

      if (isBareTag(value)) {
        if (pushAsk(asks, seen, path, describeTag(tags[0]))) c.asks_added += 1;
        c.labelled_blanks += 1;
        return labelledBlank(value.trim());
      }

      for (const t of tags) {
        if (pushAsk(asks, seen, path, describeTag(t))) c.asks_added += 1;
      }
      c.lifted_from_prose += tags.length;
      const stripped = tidy(value.replace(BRACKET_TAG_RE, " "));
      if (!stripped || /^[\s.,;:—–-]*$/.test(stripped)) {
        // The tag WAS the sentence, with punctuation around it.
        return labelledBlank(tags[0]);
      }
      const closed = /[.!?]"?$/.test(stripped) ? stripped : `${stripped}.`;
      return closed.includes(absence) ? closed : `${closed} ${absence}`;
    };

    const walk = (node: unknown, path: string): unknown => {
      if (typeof node === "string") return rewrite(node, path);
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) node[i] = walk(node[i], `${path}[${i}]`);
        return node;
      }
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        for (const k of Object.keys(obj).sort()) {
          if (SKIP_KEYS.has(k)) continue;
          obj[k] = walk(obj[k], path ? `${path}.${k}` : k);
        }
        return obj;
      }
      return node;
    };

    walk(report, "");

    if (asks.length) {
      report.information_needed = [...existing, ...asks];
    }
    c.interruptions_remaining = countProseInterruptions(report);

    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.bracket_tags = { ...c };
  } catch (e) {
    c.crashed = true;
    console.warn("[bracket-tags] failed (non-fatal):", (e as Error)?.message);
  }
  return c;
}
