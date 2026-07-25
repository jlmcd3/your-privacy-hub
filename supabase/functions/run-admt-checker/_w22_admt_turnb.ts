// ─────────────────────────────────────────────────────────────────────────
// WAVE22-FIX TURN B (cppa-admt) — deploy turn on run-admt-checker.
// Controller dispatch 2026-07-25 (TEAM-REVIEWED, five-lens).
//
// Closes wave-22 admt findings that recurred after W21 turn B:
//  P1 — registry-first substitution at gap/table call sites emitting the
//       blanket "11 CCR §§ 7200–7222" range where a verified pinpoint
//       exists (resolved via proposition_key ONLY — never invented).
//  P2 — scrub "The applicable authority is not verified in our source
//       registry; a specific citation is …" phrasing from customer-visible
//       fields on deadline_table / opt_out_gaps / notice_gaps / access_gaps.
//       The catalog phrase is legitimate as an entry-level annotation, but
//       must NEVER leak into structured citation fields (subsection,
//       verbatim_quote, provision). Empty structured fields are removed
//       from the customer surface; the gap signal is routed to telemetry.
//  P3 — build-stamp echo key registration (surfacing under
//       _meta.internal.admt_w22b via the schema-preserved envelope).
//  P4 — e6_counsel_referral body-text class: broadened detector for
//       "Privacy Officer / DPO / legal team" duty-verb subjects that
//       W21 B3 did not catch.
//  P5 — § 7155(a)(1) submission-vs-timing distinction: broadened content-
//       row detector so any deadline_table row that names submission
//       CONTENT (methods, elements, format, requirements) with a
//       § 7155(a)(1) citation is downgraded to neutral.
//  P6 — h6_admt_governing_anchor completion: extends the W21 B4 § 7001
//       sole-anchor duty guard to `provision` and `governing_anchor`
//       fields on customer-facing entries.
//
// GUARDRAILS: fail-open at every helper and the orchestrator; anchor keys
// (`field`, `source_fields`, `citation`, `regulatory_citation`,
// `verbatim_quote`, `provision`, `proposition_key`, `id`, `key`, `stamp`,
// `build_stamp`) are never mutated by prose walkers; completed/correct
// pinpoint citations are untouched; telemetry only under
// `_meta.internal.admt_w22b` (the LEAK-PREV P2 whitelist serializer
// preserves the internal channel verbatim).
// ─────────────────────────────────────────────────────────────────────────

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import { resolveByPropositionKey } from "../_shared/verified-authority-resolver.ts";

export const W22_ADMT_TURNB_STAMP = "w22-admt-turnb@2026-07-25";

// Blanket range that W21 uses as its neutral write-around. Wave-22
// finding: this range recurs where a verified pinpoint exists — the
// substitution here is registry-only (never invented).
const BLANKET_RANGE_RE = /^11\s*CCR\s*§+\s*7200\s*[–\-]\s*7222\s*$/;
const NEUTRAL_CITATION = "11 CCR §§ 7200–7222";

// P2 — the catalog "unresolved.authority" phrase, tolerant to trailing
// ellipsis or punctuation truncation.
const UNRESOLVED_AUTHORITY_RE =
  /The\s+applicable\s+authority\s+is\s+not\s+verified\s+in\s+our\s+source\s+registry;?\s*(?:a\s+specific\s+citation\s+is[^.]*)?/i;

// Structured citation fields that must NEVER carry the catalog phrase.
const STRUCTURED_CITATION_FIELDS = new Set([
  "subsection", "verbatim_quote", "provision", "governing_anchor",
]);

// Customer buckets swept for entry-level fixes.
const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "deadline_table",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
];

// P4 — broadened counsel-referral detector. Sentence-level; runs on prose
// fields only (never on anchor keys).
const COUNSEL_SUBJECT_RE =
  /\b(?:your|the\s+business['’]s|the\s+organi[sz]ation['’]s)\s+(?:qualified\s+)?(?:privacy\s+officer|data\s+protection\s+officer|dpo|(?:in[-\s]?house|external|outside)?\s*(?:legal\s+)?counsel|attorneys?|lawyers?|legal\s+team)\b/i;
const DUTY_TAIL_RE =
  /\b(?:should|must|will|is\s+encouraged\s+to|is\s+advised\s+to|is\s+recommended\s+to|needs\s+to|has\s+to|ought\s+to|to)\b/i;
const COUNSEL_NEUTRAL = "Qualified counsel must review this item before operational use.";

// P5 — broadened "content of submission" detector.
const S7155_A1_TOKEN = "7155(a)(1)";
const CONTENT_ROW_RE =
  /(?:submission[-\s]?content|content\s+of\s+(?:the\s+)?submission|what\s+to\s+submit|(?:submission|filing)\s+(?:elements|requirements|format|fields|methods))/i;

// P6 — § 7001 definitional sole-anchor pattern.
const DEFINITIONAL_S7001_RE = /^11\s*CCR\s*§\s*7001(?:\([^)]+\))+\s*$/;
const DUTY_VERB_RE =
  /\b(?:must\s+(?:disclose|provide|notify|respond|confirm|deliver|honor|honour|allow|permit|conduct|document|submit)|shall\s+(?:disclose|provide|notify|respond|honor|honour|conduct|document|submit)|the\s+business\s+must|response\s+must|access\s+response|opt[-\s]?out\s+response|pre[-\s]?use\s+notice|access\s+request)\b/i;

// Anchor keys never mutated by prose walkers.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp",
]);

export interface W22TurnBDiag {
  version: string;
  strings_scanned: number;
  pinpoint_substitutions: number;
  blanket_range_rewrites: number;
  internal_note_scrubs: number;
  stamp_echo_registered: boolean;
  counsel_referral_items: number;
  submission_timing_fixes: number;
  governing_anchor_completions: number;
}

// ── P1 — registry-first substitution ────────────────────────────────────
function substitutePinpointFromKey(entry: any): boolean {
  if (!entry || typeof entry !== "object") return false;
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  if (!pk) return false;
  const cit = typeof entry.citation === "string" ? entry.citation.trim() : "";
  if (!cit || !BLANKET_RANGE_RE.test(cit)) return false;
  const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
  if (!row) return false;
  entry.citation = row.subsection;
  // If verbatim_quote is empty OR the catalog placeholder, backfill from
  // the resolved row.
  const vq = typeof entry.verbatim_quote === "string" ? entry.verbatim_quote : "";
  if (!vq.trim() || UNRESOLVED_AUTHORITY_RE.test(vq)) {
    entry.verbatim_quote = row.verbatim_quote;
  }
  // Same for a subsection field, if present.
  if (typeof entry.subsection === "string") {
    const sub = entry.subsection.trim();
    if (!sub || UNRESOLVED_AUTHORITY_RE.test(sub)) entry.subsection = row.subsection;
  }
  return true;
}

// ── P2 — scrub catalog phrase from structured fields ────────────────────
function scrubUnresolvedFromStructured(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  let n = 0;
  for (const k of Object.keys(entry)) {
    if (!STRUCTURED_CITATION_FIELDS.has(k)) continue;
    const v = entry[k];
    if (typeof v !== "string") continue;
    if (!UNRESOLVED_AUTHORITY_RE.test(v)) continue;
    // Remove the field from the customer surface; the phrase already
    // appears via the catalog at the appropriate advisory level, and a
    // structured citation field must never carry narrative filler.
    delete entry[k];
    n++;
  }
  return n;
}

// ── P4 — broadened counsel-referral detector ────────────────────────────
function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

function scrubCounselProse(text: string): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  const sents = splitSentences(text);
  let hits = 0;
  const kept: string[] = [];
  for (const s of sents) {
    // W21 B3 already covers "consult / engage / retain … counsel" verbs.
    // W22 P4 targets subject-first patterns: "Your Privacy Officer
    // should …", "The business's legal team must …".
    if (COUNSEL_SUBJECT_RE.test(s) && DUTY_TAIL_RE.test(s)) {
      hits++;
      kept.push(COUNSEL_NEUTRAL);
      continue;
    }
    kept.push(s);
  }
  return { out: kept.join(" ").replace(/\s{2,}/g, " ").trim(), hits };
}

// ── P5 — § 7155(a)(1) submission-vs-timing (broadened) ──────────────────
function guardS7155InDeadlineTable(report: any): number {
  let downs = 0;
  const dt = (report as any)?.deadline_table;
  if (!dt) return 0;
  const rows: any[] = Array.isArray(dt) ? dt : (Array.isArray(dt?.rows) ? dt.rows : []);
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const cit = typeof row.citation === "string" ? row.citation : "";
    if (!cit.includes(S7155_A1_TOKEN)) continue;
    const label = String(row.field ?? row.topic ?? row.label ?? row.row_type ?? row.type ?? "");
    if (!CONTENT_ROW_RE.test(label)) continue;
    row.citation = NEUTRAL_CITATION;
    downs++;
  }
  return downs;
}

// ── P6 — § 7001 sole-anchor on provision/governing_anchor ───────────────
function entryHasDutyVerb(entry: any): boolean {
  for (const k of Object.keys(entry)) {
    if (ANCHOR_KEYS.has(k)) continue;
    const v = entry[k];
    if (typeof v === "string" && DUTY_VERB_RE.test(v)) return true;
  }
  return false;
}

function guardGoverningAnchorS7001(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  let n = 0;
  for (const field of ["provision", "governing_anchor"] as const) {
    const v = entry[field];
    if (typeof v !== "string") continue;
    const parts = v.split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    if (!parts.every((p) => DEFINITIONAL_S7001_RE.test(p))) continue;
    if (!entryHasDutyVerb(entry)) continue;
    entry[field] = NEUTRAL_CITATION;
    n++;
  }
  return n;
}

// ── Orchestrator ────────────────────────────────────────────────────────
export function applyW22AdmtTurnB(report: any, _intake: any): W22TurnBDiag {
  const diag: W22TurnBDiag = {
    version: W22_ADMT_TURNB_STAMP,
    strings_scanned: 0,
    pinpoint_substitutions: 0,
    blanket_range_rewrites: 0,
    internal_note_scrubs: 0,
    stamp_echo_registered: false,
    counsel_referral_items: 0,
    submission_timing_fixes: 0,
    governing_anchor_completions: 0,
  };
  if (!report || typeof report !== "object") return diag;

  // Per-entry passes.
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const raw = (report as any)[bucket];
      const arr: any[] = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.rows) ? raw.rows : []);
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        // P1
        if (substitutePinpointFromKey(entry)) diag.pinpoint_substitutions++;
        // P2
        diag.internal_note_scrubs += scrubUnresolvedFromStructured(entry);
        // P6
        diag.governing_anchor_completions += guardGoverningAnchorS7001(entry);
      }
    }
  } catch { /* fail-open */ }

  // P5 — deadline_table content-row guard (broadened).
  try {
    diag.submission_timing_fixes = guardS7155InDeadlineTable(report);
  } catch { /* fail-open */ }

  // P4 — prose walk for counsel referrals across customer-visible tree.
  const visit = (node: any, inInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inInternal) continue;
          diag.strings_scanned++;
          const r = scrubCounselProse(v);
          if (r.hits > 0) {
            node[i] = r.out;
            diag.counsel_referral_items += r.hits;
          }
        } else if (v && typeof v === "object") visit(v, inInternal);
      }
      return;
    }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const child = (node as any)[k];
      const childInternal = inInternal || k === "internal" || k.startsWith("_");
      if (typeof child === "string") {
        if (childInternal) continue;
        if (ANCHOR_KEYS.has(k)) continue;
        diag.strings_scanned++;
        const r = scrubCounselProse(child);
        if (r.hits > 0) {
          (node as any)[k] = r.out;
          diag.counsel_referral_items += r.hits;
        }
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };
  try { visit(report, false); } catch { /* fail-open */ }

  // Telemetry echo under _meta.internal (whitelist-preserved).
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object") ? r._meta.internal : {};
    r._meta.internal.admt_w22b = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  BLANKET_RANGE_RE, UNRESOLVED_AUTHORITY_RE, COUNSEL_SUBJECT_RE,
  DUTY_TAIL_RE, CONTENT_ROW_RE, DEFINITIONAL_S7001_RE, DUTY_VERB_RE,
  ANCHOR_KEYS, STRUCTURED_CITATION_FIELDS, NEUTRAL_CITATION,
  substitutePinpointFromKey, scrubUnresolvedFromStructured,
  scrubCounselProse, guardS7155InDeadlineTable, guardGoverningAnchorS7001,
};
