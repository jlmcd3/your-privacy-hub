// ─────────────────────────────────────────────────────────────────────────
// WAVE24 ADMT RESOLVER-AUDIT + BUSINESS-CLAIM + ACTIONABILITY TURN.
// Dispatch W24-ADMT-RESOLVER-AUDIT-2026-07-25 (controller tick 18:35Z,
// five-lens TEAM-REVIEWED). Deploy turn on run-admt-checker ONLY.
//
// SCOPE (three classes; from run 113 / quality_run f2c7deca evidence):
//   (A) Resolver key-selection audit at post-generation surface.
//       Detects entries where the emitted proposition_key resolves to a
//       registry row whose SUBSECTION disagrees with pinpoint tokens
//       actually named in the entry's own action/description prose
//       (e.g. ra_trigger_admt → § 7150(b)(3) while action text
//       references (b)(1)/(b)(2)). On mismatch: drop the resolved
//       stamp (citation, verbatim_quote, subsection) so the never-
//       fabricate path (structured info-needed / neutral fallback)
//       carries the fact. Records `_va_key_mismatch` on the entry.
//   (B) rubric_unsupported_business_claim guard on customer prose.
//       Detects assertive negative business-fact sentences of the form
//       "the business does not …", "the intake explicitly records …
//       as not described", "the record does not track …", and rewrites
//       them to an attributed form ("Based on the intake, no
//       information about … was provided.") unless the referenced
//       phrase appears verbatim in the intake fact-ledger corpus.
//   (C) rubric_actionability audit on priority_actions / top_3_actions.
//       For entries with a resolved `_va_stamp.subsection`, appends
//       the pinpoint reference "(see § X)" to the action prose when
//       absent. For pure-deferral entries ("We could not verify this
//       item …") with no concrete step, prepends an intake-grounded
//       "Confirm and document …" cue derived from entry.field /
//       entry.title when present.
//
// HARD CONSTRAINTS honored:
//   • Instrument s4 gc-2026-07-25-s4-eu-uk-ca-au-sg FROZEN — no edits
//     to prompts/rubrics/graders/goldens/contracts/fixtures/samples/
//     registries/corpus. This module is PRODUCT code only.
//   • h6_admt_governing_anchor and h7_admt_blanket_range are OUT of
//     scope for this turn (each gets its own turn).
//   • Fail-open at every helper and the orchestrator (try/catch +
//     console.warn) — availability never blocked.
//   • Anchor keys (citation, verbatim_quote, proposition_key, id,
//     source_fields, subsection, provision, stamp, build_stamp) are
//     never mutated by prose walkers. Class A mutates the stamp
//     container `_va_stamp` on the entry — the WHITELIST serializer
//     keeps this off customer surface but preserves it under
//     `_meta.internal`.
//   • LEAK-PREV P0-P2 preserved: telemetry ONLY under
//     _meta.internal.admt_w24_audit (stamp-echo). The whitelist
//     serializer keeps `_meta.internal` verbatim — no schema edit.
//   • Idempotent: repeated invocation on the same report is a no-op
//     beyond diag counters (we tag processed entries with
//     `_w24_audit_ran = true`).
// ─────────────────────────────────────────────────────────────────────────

export const W24_ADMT_AUDIT_STAMP = "w24-admt-audit@__STAMP__";

// ── Buckets we walk (customer-facing surface) ─────────────────────────
const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
  "information_needed", "annotations",
];

// Actionability-relevant buckets (Class C).
const ACTION_BUCKETS = new Set(["top_3_actions", "priority_actions"]);

// Anchor keys never touched by prose walkers.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp", "subsection",
]);

// Neutral fallback the resolver leaves when no row resolves — we must
// not treat this as a business claim.
const NEUTRAL_FALLBACK = "the applicable ADMT-subchapter provision";

// ── Class A — resolver key-selection audit ────────────────────────────
// Extract subsection-level pinpoint tokens like "§ 7150(b)(3)" (with or
// without the "11 CCR" prefix) from arbitrary prose. Returns normalized
// strings such as "7150(b)(3)". Duplicates preserved.
const PINPOINT_RE = /§\s*(\d{4}(?:\([a-z0-9]+\))+)/gi;

export function extractPinpoints(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  PINPOINT_RE.lastIndex = 0;
  while ((m = PINPOINT_RE.exec(text)) !== null) {
    out.push(m[1].toLowerCase().replace(/\s+/g, ""));
  }
  return out;
}

// Normalize a registry subsection (e.g. "11 CCR § 7150(b)(3)") into a
// pinpoint token ("7150(b)(3)"). Returns "" when the input carries no
// parenthesized subdivision (i.e., section-level only — no mismatch
// possible against a subdivision-level pinpoint).
export function normalizeSubsectionPinpoint(subsection: string): string {
  if (typeof subsection !== "string") return "";
  const m = /(\d{4}(?:\([a-z0-9]+\))+)/i.exec(subsection);
  return m ? m[1].toLowerCase().replace(/\s+/g, "") : "";
}

// Detect key-selection mismatch: the entry's prose names a pinpoint at
// the SAME parent section as the resolved subsection, but at a DIFFERENT
// subdivision (e.g. 7150(b)(1)/7150(b)(2) vs resolved 7150(b)(3)).
// Section-level differences (e.g. 7221 vs 7150) do NOT trigger the
// heuristic here — those are class-mixing errors that the neutral
// fallback path already handles via unresolved keys.
export function detectKeySelectionMismatch(
  entryProse: string,
  resolvedSubsection: string,
): { mismatch: boolean; expected: string; found: string[] } {
  const resolved = normalizeSubsectionPinpoint(resolvedSubsection);
  if (!resolved) return { mismatch: false, expected: "", found: [] };
  const foundAll = extractPinpoints(entryProse);
  if (foundAll.length === 0) return { mismatch: false, expected: resolved, found: [] };
  // Same parent section (first 4 digits) and a different subdivision.
  const parent = resolved.slice(0, 4);
  const sameParentDifferent = foundAll.filter((p) => p.startsWith(parent) && p !== resolved);
  if (sameParentDifferent.length === 0) return { mismatch: false, expected: resolved, found: foundAll };
  // If the resolved pinpoint ALSO appears in the prose, no mismatch —
  // the entry legitimately cross-references sibling subdivisions.
  if (foundAll.some((p) => p === resolved)) return { mismatch: false, expected: resolved, found: foundAll };
  return { mismatch: true, expected: resolved, found: sameParentDifferent };
}

// Concatenate all string values on the entry (respecting ANCHOR_KEYS)
// into a single audit corpus.
function entryProseCorpus(entry: any): string {
  if (!entry || typeof entry !== "object") return "";
  const parts: string[] = [];
  for (const k of Object.keys(entry)) {
    if (ANCHOR_KEYS.has(k)) continue;
    const v = entry[k];
    if (typeof v === "string" && v.length > 0) parts.push(v);
  }
  return parts.join(" \n ");
}

// ── Class B — unsupported business-claim guard ────────────────────────
// Assertive negative business-fact sentence patterns. Each match is a
// full sentence up to a terminal .!? — replacement drops the sentence
// and inserts an attributed hedge when the paragraph would otherwise
// end empty.
const UNSUPPORTED_NEG_CLAIM_RES: RegExp[] = [
  /(?:^|(?<=[.!?]\s))[^.!?]*\bthe business (?:does not|doesn['’]t|has not|hasn['’]t)\s+(?:sell|share|process|track|maintain|deploy|use|operate|collect|retain|profile)[^.!?]*[.!?]/gi,
  /(?:^|(?<=[.!?]\s))[^.!?]*\bthe intake (?:explicitly records|records this as|explicitly states|explicitly confirms)[^.!?]*[.!?]/gi,
  /(?:^|(?<=[.!?]\s))[^.!?]*\bthe record does not (?:track|contain|include|record|indicate)[^.!?]*[.!?]/gi,
];

const ATTRIBUTED_HEDGE =
  "The intake does not include information sufficient to confirm this item.";

// Cheap intake corpus concatenation (all string values, lower-cased).
function intakeCorpus(intake: Record<string, unknown> | null | undefined): string {
  if (!intake || typeof intake !== "object") return "";
  const parts: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") { parts.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") {
      for (const val of Object.values(v as Record<string, unknown>)) walk(val);
    }
  };
  try { walk(intake); } catch { /* fail-open */ }
  return parts.join(" ").toLowerCase();
}

// Split a candidate sentence into its ~topical noun phrase for a
// containment check. Very conservative — only returns tokens with 5+
// alphabetic chars, filtered against a small stoplist. Empty result
// means "no positive intake support required to remove the sentence".
const STOP = new Set([
  "business", "intake", "record", "provide", "explicitly", "record",
  "records", "does", "not", "the", "and", "for", "with", "this",
  "that", "sell", "share", "process", "track", "maintain",
  "deploy", "use", "operate", "collect", "retain", "profile",
]);

function candidateTopics(sentence: string): string[] {
  const out: string[] = [];
  const toks = sentence.toLowerCase().match(/[a-z][a-z\-]{4,}/g) || [];
  for (const t of toks) if (!STOP.has(t)) out.push(t);
  return out;
}

export function scrubUnsupportedBusinessClaim(
  text: string,
  intakeLower: string,
): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  let hits = 0;
  let cur = text;
  for (const re of UNSUPPORTED_NEG_CLAIM_RES) {
    cur = cur.replace(re, (match) => {
      // Do not scrub the neutral fallback sentence.
      if (match.toLowerCase().includes(NEUTRAL_FALLBACK)) return match;
      // If intake positively supports the referenced topic, keep the
      // sentence (attribution not needed).
      const topics = candidateTopics(match);
      if (topics.length > 0 && intakeLower && topics.every((t) => intakeLower.includes(t))) {
        return match;
      }
      hits++;
      return " " + ATTRIBUTED_HEDGE;
    });
  }
  if (hits === 0) return { out: text, hits: 0 };
  const cleaned = cur.replace(/\s{2,}/g, " ").trim();
  return { out: cleaned, hits };
}

// ── Class C — actionability audit ─────────────────────────────────────
const PURE_DEFERRAL_RE =
  /^(?:\s*)(?:we could not verify this item|this item cannot be assessed|the applicable authority is not verified)[^]*$/i;

const ACTION_TEXT_KEYS = ["action", "recommendation", "step", "description", "text"];

function pickActionText(entry: any): { key: string; value: string } | null {
  for (const k of ACTION_TEXT_KEYS) {
    const v = entry?.[k];
    if (typeof v === "string" && v.trim().length > 0) return { key: k, value: v };
  }
  return null;
}

function fieldCue(entry: any): string {
  const f = entry?.field ?? entry?.title ?? entry?.element_id ?? "";
  if (typeof f !== "string" || !f.trim()) return "";
  return f.replace(/[_-]+/g, " ").trim();
}

export function auditActionability(
  entry: any,
): { changed: boolean; pinpoint_appended: boolean; deferral_prefixed: boolean } {
  const at = pickActionText(entry);
  if (!at) return { changed: false, pinpoint_appended: false, deferral_prefixed: false };
  let value = at.value;
  let pinpoint_appended = false;
  let deferral_prefixed = false;

  // (i) Append pinpoint from resolved stamp if entry has one but text
  //     lacks any "§" token.
  const stamp = entry?._va_stamp;
  const resolvedSub = typeof stamp?.subsection === "string" ? stamp.subsection.trim() : "";
  if (resolvedSub && !/§/.test(value)) {
    value = value.replace(/[\s.!?]*$/, "").trim() +
      ` (see ${resolvedSub}).`;
    pinpoint_appended = true;
  }

  // (ii) Pure-deferral rewrite: prepend an intake-grounded confirm cue.
  if (PURE_DEFERRAL_RE.test(value)) {
    const cue = fieldCue(entry);
    if (cue) {
      value = `Confirm and document ${cue}; ${value.charAt(0).toLowerCase() + value.slice(1)}`;
      deferral_prefixed = true;
    }
  }

  if (value === at.value) return { changed: false, pinpoint_appended, deferral_prefixed };
  entry[at.key] = value;
  return { changed: true, pinpoint_appended, deferral_prefixed };
}

// ── Diag + orchestrator ───────────────────────────────────────────────
export interface W24AdmtAuditDiag {
  version: string;
  entries_scanned: number;
  class_a_key_mismatch_drops: number;
  class_a_details: Array<{ bucket: string; entry_id: string; expected: string; found: string[] }>;
  class_b_business_claim_scrubs: number;
  class_c_pinpoint_appends: number;
  class_c_deferral_prefixes: number;
  stamp_echo_registered: boolean;
}

function emptyDiag(): W24AdmtAuditDiag {
  return {
    version: W24_ADMT_AUDIT_STAMP,
    entries_scanned: 0,
    class_a_key_mismatch_drops: 0,
    class_a_details: [],
    class_b_business_claim_scrubs: 0,
    class_c_pinpoint_appends: 0,
    class_c_deferral_prefixes: 0,
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

export function applyW24AdmtAudit(
  report: any,
  intake: Record<string, unknown> | null | undefined,
): W24AdmtAuditDiag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") return diag;
  const intakeLower = intakeCorpus(intake);

  for (const bucket of CUSTOMER_BUCKETS) {
    try {
      const rows = bucketRows((report as any)[bucket]);
      for (const entry of rows) {
        if (!entry || typeof entry !== "object") continue;
        if (entry._w24_audit_ran === true) continue;
        diag.entries_scanned++;

        // ── Class A — resolver key selection audit ─────────────────────
        try {
          const stamp = entry._va_stamp;
          const sub = typeof stamp?.subsection === "string" ? stamp.subsection : "";
          if (sub) {
            const prose = entryProseCorpus(entry);
            const chk = detectKeySelectionMismatch(prose, sub);
            if (chk.mismatch) {
              diag.class_a_key_mismatch_drops++;
              diag.class_a_details.push({
                bucket,
                entry_id: String(entry.id ?? entry.element_id ?? entry.field ?? ""),
                expected: chk.expected,
                found: chk.found,
              });
              // Drop the resolved stamp so the never-fabricate path
              // takes over: clear citation-carrying anchors that were
              // stamped from the wrong row.
              entry._va_key_mismatch = { expected: chk.expected, found: chk.found };
              entry._va_stamp_unresolved = {
                proposition_key: typeof entry.proposition_key === "string" ? entry.proposition_key : "",
                reason: "key_selection_mismatch",
              };
              delete entry._va_stamp;
              if (typeof entry.citation === "string") entry.citation = "";
              if (typeof entry.regulatory_citation === "string") entry.regulatory_citation = "";
              if (typeof entry.verbatim_quote === "string") entry.verbatim_quote = "";
              if (typeof entry.subsection === "string") entry.subsection = "";
            }
          }
        } catch (e) {
          console.warn("[w24-admt-audit] class A entry failed (non-fatal):", (e as Error)?.message);
        }

        // ── Class B — unsupported business-claim scrub on prose keys ──
        try {
          for (const k of Object.keys(entry)) {
            if (ANCHOR_KEYS.has(k)) continue;
            const v = entry[k];
            if (typeof v !== "string") continue;
            const r = scrubUnsupportedBusinessClaim(v, intakeLower);
            if (r.hits > 0) {
              entry[k] = r.out;
              diag.class_b_business_claim_scrubs += r.hits;
            }
          }
        } catch (e) {
          console.warn("[w24-admt-audit] class B entry failed (non-fatal):", (e as Error)?.message);
        }

        // ── Class C — actionability (action buckets only) ──────────────
        if (ACTION_BUCKETS.has(bucket)) {
          try {
            const r = auditActionability(entry);
            if (r.pinpoint_appended) diag.class_c_pinpoint_appends++;
            if (r.deferral_prefixed) diag.class_c_deferral_prefixes++;
          } catch (e) {
            console.warn("[w24-admt-audit] class C entry failed (non-fatal):", (e as Error)?.message);
          }
        }

        entry._w24_audit_ran = true;
      }
    } catch (e) {
      console.warn(`[w24-admt-audit] bucket ${bucket} failed (non-fatal):`, (e as Error)?.message);
    }
  }

  // Stamp-echo under _meta.internal (whitelist-preserved).
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal : {};
    r._meta.internal.admt_w24_audit = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  CUSTOMER_BUCKETS,
  ACTION_BUCKETS,
  ANCHOR_KEYS,
  UNSUPPORTED_NEG_CLAIM_RES,
  ATTRIBUTED_HEDGE,
  PURE_DEFERRAL_RE,
  NEUTRAL_FALLBACK,
};
