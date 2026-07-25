// ─────────────────────────────────────────────────────────────────────────
// W25-ADMT-SANITIZER-FIX (cppa-admt) — controller dispatch
// W25-ADMT-SANITIZER-FIX-2026-07-25, ledger item 84 queued candidates
// (a)+(b). Applies the cross-tool WHOLE-SENTENCE-EXCISION doctrine
// (ledger item 84c): sentence-excision passes MUST consume whole
// sentences from start boundary through terminal period inclusive,
// with whitespace re-join. Drop-only or registry-first-rewrite; the
// model never writes/edits customer prose.
//
// This module runs AFTER _w24_admt_attr_fix / _w24_admt_audit / _w24_h6
// and BEFORE the LEAK-PREV-P1 emit gate. It supersedes the partial
// excision behaviour of W24 T-Ab and widens W24 T-B coverage to detect
// the unresolved-fallback phrase in ANY grammatical position — including
// nested customer prose that the top-level entry walker never reached.
//
// Regression pins (wave-25 / wave-26 evidence):
//   • T-Ab splice defect — doc 04e7393b access_logic — orphaned tail
//     spliced onto the prior sentence with no space
//     ("assessment.exists to pronounce ... on this record.").
//   • T-B nested-position miss — doc 2235d1f6 — attributive noun
//     modifier ("the applicable ADMT-subchapter provision trigger,
//     conditional on the scope determination being confirmed.").
//   • T-B mid-sentence interpolation — doc 0481fc0c —
//     ("no enumerated the applicable ADMT-subchapter provision category
//      applies").
//
// GUARDRAILS
//   • Fail-open at every helper and the orchestrator (try/catch +
//     console.warn) — availability is never blocked.
//   • Anchor keys are never mutated by prose walkers.
//   • Registry-first rewrite when a proposition_key resolves via the
//     nearest enclosing object; otherwise whole-sentence drop.
//   • Telemetry only under `_meta.internal.admt_w25_sanitizer`.
// ─────────────────────────────────────────────────────────────────────────

import { ADMT_VERIFIED_AUTHORITIES } from "../_shared/registry/admt-verified-authorities.ts";
import { resolveByPropositionKey } from "../_shared/verified-authority-resolver.ts";

export const W25_ADMT_SANITIZER_STAMP = "w25-admt-sanitizer@2026-07-25T22:43:00Z";
export const W25_ADMT_SANITIZER_VERSION = "1.0.0";

// Anchor keys prose walkers must never mutate.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp", "subsection",
]);

// Reserved subtrees never walked.
const RESERVED_KEYS = new Set(["_meta", "_internal", "_debug"]);

// Unresolved-fallback phrase variants (T-B). Detected in ANY grammatical
// position via substring match on the lowercased string.
const UNRESOLVED_TEMPLATE_PHRASES = [
  "the applicable ADMT-subchapter provision",
  "the applicable ADMT subchapter provision",
  "the applicable ADMT-subchapter",
];

// T-Ab — "X information is needed" sentence classifier. Whole-sentence
// excision. Case-insensitive; matches "more/additional/further
// information is needed" anywhere inside the sentence.
const INFO_NEEDED_RE =
  /\b(?:more|additional|further)\s+information\s+is\s+needed\b/i;

// Sentence splitter that preserves the terminator on each sentence so
// re-join is lossless. Handles ., !, ?, and end-of-string with no
// trailing terminator.
export function splitSentences(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];
  // Match runs of non-terminator chars followed by a terminator, or the
  // trailing fragment. Terminator characters kept with the sentence.
  const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

// Re-join with a single space between sentences. Collapses any interior
// whitespace runs and trims. Idempotent.
export function rejoinSentences(sents: string[]): string {
  return sents
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function containsUnresolvedTemplate(s: string): boolean {
  const low = s.toLowerCase();
  return UNRESOLVED_TEMPLATE_PHRASES.some((p) => low.includes(p.toLowerCase()));
}

export interface SanitizeResult {
  out: string;
  info_needed_sentence_drops: number;
  template_sentence_rewrites: number;
  template_sentence_drops: number;
}

export function sanitizeString(
  text: string,
  nearestEntry: Record<string, unknown> | null,
): SanitizeResult {
  const result: SanitizeResult = {
    out: text,
    info_needed_sentence_drops: 0,
    template_sentence_rewrites: 0,
    template_sentence_drops: 0,
  };
  if (typeof text !== "string" || text.length === 0) return result;
  if (!INFO_NEEDED_RE.test(text) && !containsUnresolvedTemplate(text)) {
    return result;
  }
  const sents = splitSentences(text);
  if (sents.length === 0) return result;

  // Resolve registry replacement once, using nearest enclosing entry's
  // proposition_key when present.
  let replacement: string | null = null;
  try {
    const pk = nearestEntry && typeof nearestEntry.proposition_key === "string"
      ? (nearestEntry.proposition_key as string).trim()
      : "";
    if (pk) {
      const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
      if (row && typeof row.subsection === "string" && row.subsection.trim()) {
        replacement = row.subsection.trim();
      }
    }
  } catch { /* fail-open */ }

  const kept: string[] = [];
  for (const s of sents) {
    // T-Ab: whole-sentence drop of info-needed prose.
    if (INFO_NEEDED_RE.test(s)) {
      result.info_needed_sentence_drops++;
      continue;
    }
    // T-B: unresolved template phrase in ANY position.
    if (containsUnresolvedTemplate(s)) {
      if (replacement) {
        let rewritten = s;
        for (const p of UNRESOLVED_TEMPLATE_PHRASES) {
          // Case-insensitive replace, all occurrences.
          const re = new RegExp(escapeRegExp(p), "gi");
          rewritten = rewritten.replace(re, replacement);
        }
        kept.push(rewritten);
        result.template_sentence_rewrites++;
      } else {
        result.template_sentence_drops++;
      }
      continue;
    }
    kept.push(s);
  }
  result.out = rejoinSentences(kept);
  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface W25SanitizerDiag {
  version: string;
  stamp: string;
  strings_scanned: number;
  strings_mutated: number;
  info_needed_sentence_drops: number;
  template_sentence_rewrites: number;
  template_sentence_drops: number;
  errors: number;
}

function emptyDiag(): W25SanitizerDiag {
  return {
    version: W25_ADMT_SANITIZER_VERSION,
    stamp: W25_ADMT_SANITIZER_STAMP,
    strings_scanned: 0,
    strings_mutated: 0,
    info_needed_sentence_drops: 0,
    template_sentence_rewrites: 0,
    template_sentence_drops: 0,
    errors: 0,
  };
}

// Deep walk: recurse into arrays and plain objects, track the nearest
// enclosing plain-object ancestor as the "entry" for proposition_key
// resolution. Anchor keys are not walked as prose; reserved subtrees
// (`_meta` etc.) are skipped entirely.
function walkDeep(
  node: unknown,
  parent: Record<string, unknown> | unknown[] | null,
  keyOrIdx: string | number | null,
  nearestEntry: Record<string, unknown> | null,
  diag: W25SanitizerDiag,
): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    if (parent === null || keyOrIdx === null) return;
    if (typeof keyOrIdx === "string" && ANCHOR_KEYS.has(keyOrIdx)) return;
    diag.strings_scanned++;
    try {
      const r = sanitizeString(node, nearestEntry);
      if (r.out !== node) {
        // Only write back if there is a real mutation.
        (parent as Record<string | number, unknown>)[keyOrIdx as never] = r.out;
        diag.strings_mutated++;
      }
      diag.info_needed_sentence_drops += r.info_needed_sentence_drops;
      diag.template_sentence_rewrites += r.template_sentence_rewrites;
      diag.template_sentence_drops += r.template_sentence_drops;
    } catch {
      diag.errors++;
    }
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walkDeep(node[i], node, i, nearestEntry, diag);
    }
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    // Advance nearest-entry to this object (any object with fields is a
    // candidate — proposition_key lookup is a no-op if absent).
    const nextEntry = obj;
    for (const k of Object.keys(obj)) {
      if (RESERVED_KEYS.has(k)) continue;
      if (ANCHOR_KEYS.has(k)) continue;
      walkDeep(obj[k], obj, k, nextEntry, diag);
    }
  }
}

export function applyW25AdmtSanitizerFix(report: unknown): W25SanitizerDiag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") return diag;
  try {
    walkDeep(report, null, null, null, diag);
  } catch (e) {
    diag.errors++;
    console.warn("[w25-admt-sanitizer] walk failed (non-fatal):", (e as Error)?.message);
  }
  // Telemetry stamp under _meta.internal.
  try {
    const r = report as Record<string, unknown>;
    const meta = (r._meta && typeof r._meta === "object")
      ? (r._meta as Record<string, unknown>)
      : (r._meta = {} as Record<string, unknown>) as Record<string, unknown>;
    const internal = (meta.internal && typeof meta.internal === "object")
      ? (meta.internal as Record<string, unknown>)
      : (meta.internal = {} as Record<string, unknown>) as Record<string, unknown>;
    internal.admt_w25_sanitizer = diag;
  } catch { /* noop */ }
  return diag;
}

export const _internals = {
  ANCHOR_KEYS,
  RESERVED_KEYS,
  UNRESOLVED_TEMPLATE_PHRASES,
  INFO_NEEDED_RE,
  splitSentences,
  rejoinSentences,
};
