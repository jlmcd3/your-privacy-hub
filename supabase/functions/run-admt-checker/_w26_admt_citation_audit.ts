// ─────────────────────────────────────────────────────────────────────────
// W26-ADMT-CITATION-AUDIT (2026-07-25) — deploy turn on run-admt-checker.
// Dispatch W26-ADMT-CITATION-AUDIT-2026-07-25 (controller tick 23:09Z).
// Discharges ledger item-78 queued candidate (a) / WAVE-26 DIGEST driver
// (i): the neutral fallback phrase "the applicable ADMT-subchapter
// provision" was leaking into customer prose in TWO defect shapes even
// though a verified registry pinpoint was available:
//
//   CLASS 1 — REGISTRY-FIRST SUBSTITUTION.
//     Well-formed occurrences of the fallback (e.g. "under the applicable
//     ADMT-subchapter provision") on entries whose proposition_key /
//     _va_stamp resolves to a verified ADMT_VERIFIED_AUTHORITIES row are
//     rewritten to the verified subsection pinpoint (e.g.
//     "under 11 CCR § 7150(b)(3)"). If the entry has NO resolvable
//     registry pinpoint, the fallback is kept verbatim — omission over
//     invention.
//
//   CLASS 2 — GARBLED MID-NOUN-PHRASE EXCISION.
//     Sentences where the fallback interpolates inside a noun phrase
//     ("no enumerated the applicable ADMT-subchapter provision category
//     applies") are excised WHOLE per item-84c whole-sentence-excision
//     doctrine — never patched with string surgery. Deterministic
//     rebuild is not attempted here (Class 1 already handles rebuilds
//     via registry substitution when a pinpoint exists).
//
// OUT OF SCOPE (own turns): h6/h7 (h6_admt_governing_anchor and h7
// blanket-range 7200-7222 substitution in notice_gaps/opt_out_gaps),
// T7 opening wiring for admt (HELD pending CEO checkpoint), instrument/
// rubric/grader edits, sample regen, all other products.
//
// DISCIPLINE (all mandatory):
//   • Deterministic post-emitter only — the model never writes prose.
//   • Omission over invention on unresolved keys.
//   • Fail-open at every helper and the orchestrator (try/catch).
//   • Anchor keys (citation, verbatim_quote, proposition_key, id,
//     source_fields, subsection, provision, stamp, build_stamp) are
//     never mutated by the prose walker.
//   • Idempotent: entries tagged with `_w26_citation_audit_ran = true`.
//   • Telemetry ONLY under `_meta.internal.admt_w26_citation_audit`
//     (whitelist serializer preserves).
// ─────────────────────────────────────────────────────────────────────────

import { ADMT_VERIFIED_AUTHORITIES } from "../_shared/registry/admt-verified-authorities.ts";

export const W26_ADMT_CITATION_AUDIT_STAMP =
  "w26-admt-citation-audit@2026-07-25T23:34:00Z";

const FALLBACK = "the applicable ADMT-subchapter provision";
const FALLBACK_ESC = FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Customer-visible buckets (mirrors _w24_admt_audit.ts).
const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
  "information_needed", "annotations",
];

// Never touched by the prose walker.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp", "subsection",
]);

// Determiners / quantifiers / bare adjectives that, when they appear
// immediately before the fallback (which itself starts with "the …"),
// produce ungrammatical noun-phrase interpolation.
const GARBLED_PREFIX_TOKENS = new Set([
  "no", "any", "each", "every", "some", "all", "both", "either", "neither",
  "enumerated", "listed", "same", "such", "this", "that", "these", "those",
  "another", "other", "one", "two", "three", "four", "five",
]);

// Nouns that, when they appear immediately AFTER the fallback with no
// intervening preposition/verb/punctuation, indicate the fallback has
// been spliced into a noun phrase.
const GARBLED_SUFFIX_NOUNS = new Set([
  "category", "provision", "section", "subsection", "obligation",
  "requirement", "trigger", "test", "notice", "rule", "element",
  "item", "criterion", "criteria", "standard", "clause", "row",
  "entry", "definition",
]);

// Sentence splitter (whole-sentence excision doctrine).
export function splitSentences(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out.length > 0 ? out : [text];
}

export function rejoinSentences(sentences: string[]): string {
  return sentences
    .map((s) => s.replace(/^\s+/, ""))
    .filter((s) => s.length > 0)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Detect a garbled interpolation on a single sentence.
export function isGarbledInterpolation(sentence: string): boolean {
  if (!sentence.toLowerCase().includes(FALLBACK.toLowerCase())) return false;
  const re = new RegExp(`(\\S+)?\\s*${FALLBACK_ESC}\\s*(\\S+)?`, "i");
  const m = re.exec(sentence);
  if (!m) return false;
  const prev = (m[1] ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const next = (m[2] ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (prev && GARBLED_PREFIX_TOKENS.has(prev)) return true;
  if (next && GARBLED_SUFFIX_NOUNS.has(next)) return true;
  return false;
}

// Resolve the entry's verified subsection pinpoint from _va_stamp or
// proposition_key. Returns "" when no verified pinpoint exists.
export function resolveEntrySubsection(entry: any): string {
  if (!entry || typeof entry !== "object") return "";
  const stampSub = entry?._va_stamp?.subsection;
  if (typeof stampSub === "string" && /§/.test(stampSub)) return stampSub.trim();
  const pk = typeof entry.proposition_key === "string"
    ? entry.proposition_key.trim() : "";
  if (!pk) return "";
  const row: any = (ADMT_VERIFIED_AUTHORITIES as any)[pk];
  if (row && typeof row.subsection === "string" && /§/.test(row.subsection)) {
    return row.subsection.trim();
  }
  return "";
}

// Substitute well-formed occurrences of the fallback with the resolved
// pinpoint. `sentence` is guaranteed NOT to be a garbled interpolation
// (Class 2 handles those). Returns { out, count }.
export function substituteFallbackWithPinpoint(
  sentence: string,
  pinpoint: string,
): { out: string; count: number } {
  if (!pinpoint) return { out: sentence, count: 0 };
  const re = new RegExp(FALLBACK_ESC, "gi");
  let count = 0;
  const out = sentence.replace(re, () => { count++; return pinpoint; });
  return { out, count };
}

// Process a single prose string on an entry.
export function processProseString(
  value: string,
  pinpoint: string,
): { out: string; sentences_excised: number; pinpoint_substitutions: number } {
  if (typeof value !== "string" || value.length === 0) {
    return { out: value, sentences_excised: 0, pinpoint_substitutions: 0 };
  }
  if (!value.toLowerCase().includes(FALLBACK.toLowerCase())) {
    return { out: value, sentences_excised: 0, pinpoint_substitutions: 0 };
  }
  const sentences = splitSentences(value);
  const kept: string[] = [];
  let excised = 0;
  let subs = 0;
  for (const s of sentences) {
    if (!s.toLowerCase().includes(FALLBACK.toLowerCase())) {
      kept.push(s);
      continue;
    }
    if (isGarbledInterpolation(s)) {
      excised++;
      continue; // whole-sentence excision
    }
    if (pinpoint) {
      const r = substituteFallbackWithPinpoint(s, pinpoint);
      subs += r.count;
      kept.push(r.out);
    } else {
      // No registry pinpoint → keep fallback verbatim (omission over invention).
      kept.push(s);
    }
  }
  if (excised === 0 && subs === 0) {
    return { out: value, sentences_excised: 0, pinpoint_substitutions: 0 };
  }
  return {
    out: rejoinSentences(kept),
    sentences_excised: excised,
    pinpoint_substitutions: subs,
  };
}

export interface W26AdmtCitationAuditDiag {
  version: string;
  entries_scanned: number;
  entries_with_pinpoint: number;
  class_1_pinpoint_substitutions: number;
  class_2_sentences_excised: number;
  fields_touched: number;
  stamp_echo_registered: boolean;
}

function emptyDiag(): W26AdmtCitationAuditDiag {
  return {
    version: W26_ADMT_CITATION_AUDIT_STAMP,
    entries_scanned: 0,
    entries_with_pinpoint: 0,
    class_1_pinpoint_substitutions: 0,
    class_2_sentences_excised: 0,
    fields_touched: 0,
    stamp_echo_registered: false,
  };
}

function bucketRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as any).rows)) {
    return (raw as any).rows;
  }
  return [];
}

export function applyW26AdmtCitationAudit(report: any): W26AdmtCitationAuditDiag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") return diag;

  for (const bucket of CUSTOMER_BUCKETS) {
    try {
      const rows = bucketRows((report as any)[bucket]);
      for (const entry of rows) {
        if (!entry || typeof entry !== "object") continue;
        if (entry._w26_citation_audit_ran === true) continue;
        diag.entries_scanned++;
        const pinpoint = resolveEntrySubsection(entry);
        if (pinpoint) diag.entries_with_pinpoint++;

        try {
          for (const k of Object.keys(entry)) {
            if (ANCHOR_KEYS.has(k)) continue;
            const v = entry[k];
            if (typeof v !== "string") continue;
            const r = processProseString(v, pinpoint);
            if (r.sentences_excised > 0 || r.pinpoint_substitutions > 0) {
              entry[k] = r.out;
              diag.fields_touched++;
              diag.class_1_pinpoint_substitutions += r.pinpoint_substitutions;
              diag.class_2_sentences_excised += r.sentences_excised;
            }
          }
        } catch (e) {
          console.warn(
            "[w26-admt-citation-audit] entry field walk failed (non-fatal):",
            (e as Error)?.message,
          );
        }

        entry._w26_citation_audit_ran = true;
      }
    } catch (e) {
      console.warn(
        `[w26-admt-citation-audit] bucket ${bucket} failed (non-fatal):`,
        (e as Error)?.message,
      );
    }
  }

  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal : {};
    r._meta.internal.admt_w26_citation_audit = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  FALLBACK,
  CUSTOMER_BUCKETS,
  ANCHOR_KEYS,
  GARBLED_PREFIX_TOKENS,
  GARBLED_SUFFIX_NOUNS,
};
