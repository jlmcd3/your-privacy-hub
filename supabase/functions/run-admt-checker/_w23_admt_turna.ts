// ─────────────────────────────────────────────────────────────────────────
// WAVE23-FIX TURN A (cppa-admt) — deploy turn on run-admt-checker.
// Controller dispatch WAVE23-ADMT-TURNA-2026-07-25 (TEAM-REVIEWED, 5-lens).
//
// Closes six T1b/wave-23 admt findings enumerated in ledger item 70:
//   T1 — fallback-density / B2 registry-first coverage at emit-time on
//        opt_out_gaps citations that ship with EMPTY (or whitespace-only)
//        citation strings. Registry-first substitution via proposition_key;
//        never invented. Unresolvable → citation field removed from the
//        customer surface (telemetry only under _meta.internal.admt_w23a).
//   T2 — serializer stamp-echo key registration (`_meta.internal.admt_w23a`).
//        The whitelist serializer preserves _meta.internal verbatim; the
//        registration here closes the wave-21 telemetry gap by ensuring the
//        w23-turn-a stamp echo attaches through the emit pipeline.
//   T3 — e6_counsel_referral TEMPLATE-BODY class per FINDING A pinpoints
//        (doc 4ec201ce). Adds two detectors W22 P4 does NOT cover:
//          (a) bare-article subject: "The Privacy Officer must revise …",
//              "The Data Protection Officer should confirm …",
//              "The DPO must …" (no possessive prefix required).
//          (b) bracketed placeholder inside template bodies:
//              "[LEGAL COUNSEL / PRODUCT OWNER]",
//              "[PRIVACY OFFICER]", "[DPO]", etc.
//        Both are neutralised to the same customer-safe close as W22.
//   T4 — opt_out_gaps EMPTY-CITATION guard (see T1). Runs BEFORE the
//        LEAK-PREV emit gate so the customer surface never carries an
//        empty citation string.
//   T5 — § 7155(a)(1) submission-vs-timing broadened one more step —
//        catches "content of submission" phrasing in any customer bucket
//        (not just deadline_table rows), downgrading a bare § 7155(a)(1)
//        citation to the neutral range when the finding body describes
//        submission ELEMENTS/CONTENT/FORMAT rather than a timing duty.
//   T6 — h6_admt_governing_anchor chain-form defect: extends the W22 P6
//        sole-anchor duty guard to catch § 7001 subdivisions joined by
//        "+", ",", ";", "&", "and" in ANY citation-like field (per PF6 T1
//        rule that § 7001 subdivisions are never chained anywhere in the
//        document).
//
// GUARDRAILS: fail-open at every helper and the orchestrator; anchor keys
// (`field`, `source_fields`, `citation`, `verbatim_quote`, `provision`,
// `proposition_key`, `id`, `key`, `stamp`, `build_stamp`) are never
// mutated by prose walkers; verbatim/registry-stamped citations are
// untouched; telemetry only under `_meta.internal.admt_w23a`.
// ─────────────────────────────────────────────────────────────────────────

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import { resolveByPropositionKey } from "../_shared/verified-authority-resolver.ts";

export const W23_ADMT_TURNA_STAMP = "w23-admt-turna@2026-07-25T16:42:27Z";

// Buckets whose entries are subject to citation-shape guards.
const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
];

// Neutral range used only for downgrade of misapplied timing citations.
const NEUTRAL_RANGE = "11 CCR §§ 7200–7222";

// ── T3 — expanded counsel-referral detectors ────────────────────────────
// Subject-first, bare-article variant (W22 P4 required a possessive; the
// FINDING A pinpoints all use a bare "The Privacy Officer" subject).
const BARE_COUNSEL_SUBJECT_RE =
  /\bThe\s+(?:qualified\s+)?(?:privacy\s+officer|data\s+protection\s+officer|dpo|(?:in[-\s]?house|external|outside)\s+counsel|legal\s+team|legal\s+department)\b/i;
const BARE_COUNSEL_DUTY_RE =
  /\b(?:should|must|will|is\s+encouraged\s+to|is\s+advised\s+to|is\s+recommended\s+to|needs\s+to|has\s+to|ought\s+to|to)\b/i;

// Bracketed placeholder such as "[LEGAL COUNSEL / PRODUCT OWNER]".
const BRACKETED_ROLE_PLACEHOLDER_RE =
  /\[[^\]\n]{0,80}?(?:legal\s+counsel|privacy\s+officer|data\s+protection\s+officer|\bdpo\b|product\s+owner|legal\s+team)[^\]\n]{0,80}?\]/gi;

const COUNSEL_NEUTRAL = "Qualified counsel must review this item before operational use.";
const PLACEHOLDER_NEUTRAL = "qualified counsel";

// Anchor keys the prose walker must never touch.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp",
]);

// ── T5 — submission-content phrasing detector ───────────────────────────
const S7155_A1_TOKEN = "7155(a)(1)";
const SUBMISSION_CONTENT_RE =
  /(?:content\s+of\s+(?:the\s+)?submission|submission\s+(?:elements|requirements|format|fields|methods|content)|what\s+to\s+submit)/i;

// ── T6 — § 7001 chained-subdivision detector ────────────────────────────
// Matches "§ 7001(x) [+|,|;|&|and] § 7001(y)" style chains anywhere in a
// citation-like field. Standalone § 7001 pinpoints are left alone.
const S7001_CHAIN_RE =
  /(?:11\s*CCR\s*§+\s*)?7001\s*\([^)]+\)(?:\s*\([^)]+\))*\s*(?:\+|,|;|&|and)\s*(?:11\s*CCR\s*§+\s*)?7001\s*\([^)]+\)(?:\s*\([^)]+\))*/i;
const CITATIONISH_FIELDS = new Set([
  "citation", "citations", "provision", "governing_anchor",
  "regulatory_citation", "subsection", "statutory_basis",
]);

// ── T1/T4 — empty-citation detector on opt_out_gaps ─────────────────────
function isEmptyCitationValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v !== "string") return false;
  return v.trim().length === 0;
}

export interface W23TurnADiag {
  version: string;
  t1_opt_out_citations_stamped: number;
  t1_opt_out_citations_dropped: number;
  t3_counsel_subject_scrubs: number;
  t3_bracketed_placeholder_scrubs: number;
  t5_submission_content_downgrades: number;
  t6_s7001_chain_downgrades: number;
  stamp_echo_registered: boolean;
  strings_scanned: number;
  entries_scanned: number;
}

// ── T3a — bare-article subject counsel-referral scrub ───────────────────
function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

export function scrubBareCounselSubject(text: string): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  const sents = splitSentences(text);
  let hits = 0;
  const kept: string[] = [];
  for (const s of sents) {
    if (BARE_COUNSEL_SUBJECT_RE.test(s) && BARE_COUNSEL_DUTY_RE.test(s)) {
      hits++;
      kept.push(COUNSEL_NEUTRAL);
      continue;
    }
    kept.push(s);
  }
  return { out: kept.join(" ").replace(/\s{2,}/g, " ").trim(), hits };
}

// ── T3b — bracketed placeholder scrub ───────────────────────────────────
export function scrubBracketedRolePlaceholder(text: string): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  BRACKETED_ROLE_PLACEHOLDER_RE.lastIndex = 0;
  const matches = text.match(BRACKETED_ROLE_PLACEHOLDER_RE);
  if (!matches || matches.length === 0) return { out: text, hits: 0 };
  const out = text.replace(BRACKETED_ROLE_PLACEHOLDER_RE, PLACEHOLDER_NEUTRAL)
    .replace(/\s{2,}/g, " ").trim();
  return { out, hits: matches.length };
}

// ── T1/T4 — opt_out_gaps empty-citation resolver ────────────────────────
export function resolveOrDropEmptyCitation(
  entry: any,
): { stamped: number; dropped: number } {
  if (!entry || typeof entry !== "object") return { stamped: 0, dropped: 0 };
  if (!("citation" in entry)) return { stamped: 0, dropped: 0 };
  if (!isEmptyCitationValue(entry.citation)) return { stamped: 0, dropped: 0 };
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  if (pk) {
    const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
    if (row) {
      entry.citation = row.subsection;
      const vq = typeof entry.verbatim_quote === "string" ? entry.verbatim_quote : "";
      if (!vq.trim()) entry.verbatim_quote = row.verbatim_quote;
      if (typeof entry.subsection === "string" && !entry.subsection.trim()) {
        entry.subsection = row.subsection;
      }
      return { stamped: 1, dropped: 0 };
    }
  }
  // Unresolvable — REMOVE the field so the customer surface never renders
  // an empty citation. Telemetry aggregated at orchestrator level.
  delete entry.citation;
  return { stamped: 0, dropped: 1 };
}

// ── T5 — § 7155(a)(1) submission-content downgrade ──────────────────────
export function downgradeS7155InEntry(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  const cit = typeof entry.citation === "string" ? entry.citation : "";
  if (!cit.includes(S7155_A1_TOKEN)) return 0;
  // Look for submission-content phrasing anywhere in the entry's prose.
  let contentSignal = false;
  for (const k of Object.keys(entry)) {
    if (ANCHOR_KEYS.has(k)) continue;
    const v = entry[k];
    if (typeof v === "string" && SUBMISSION_CONTENT_RE.test(v)) {
      contentSignal = true;
      break;
    }
  }
  if (!contentSignal) return 0;
  entry.citation = NEUTRAL_RANGE;
  return 1;
}

// ── T6 — § 7001 chained-subdivision downgrade ───────────────────────────
export function downgradeS7001ChainInEntry(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  let n = 0;
  for (const k of Object.keys(entry)) {
    if (!CITATIONISH_FIELDS.has(k)) continue;
    const v = entry[k];
    if (typeof v !== "string") continue;
    if (!S7001_CHAIN_RE.test(v)) continue;
    // Downgrade the chained field to the neutral range; the specific
    // definitional subdivisions may reappear in narrative prose per
    // PF6 T1 rule, but never chained in a citation slot.
    entry[k] = NEUTRAL_RANGE;
    n++;
  }
  return n;
}

// ── Orchestrator ────────────────────────────────────────────────────────
export function applyW23AdmtTurnA(report: any, _intake: any): W23TurnADiag {
  const diag: W23TurnADiag = {
    version: W23_ADMT_TURNA_STAMP,
    t1_opt_out_citations_stamped: 0,
    t1_opt_out_citations_dropped: 0,
    t3_counsel_subject_scrubs: 0,
    t3_bracketed_placeholder_scrubs: 0,
    t5_submission_content_downgrades: 0,
    t6_s7001_chain_downgrades: 0,
    stamp_echo_registered: false,
    strings_scanned: 0,
    entries_scanned: 0,
  };
  if (!report || typeof report !== "object") return diag;

  // Per-entry passes (T1/T4 + T5 + T6).
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const raw = (report as any)[bucket];
      const arr: any[] = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.rows) ? raw.rows : []);
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        diag.entries_scanned++;
        if (bucket === "opt_out_gaps") {
          const r = resolveOrDropEmptyCitation(entry);
          diag.t1_opt_out_citations_stamped += r.stamped;
          diag.t1_opt_out_citations_dropped += r.dropped;
        }
        diag.t5_submission_content_downgrades += downgradeS7155InEntry(entry);
        diag.t6_s7001_chain_downgrades += downgradeS7001ChainInEntry(entry);
      }
    }
  } catch { /* fail-open */ }

  // T3 — prose walk for counsel referrals (bare subject + bracketed
  // placeholder) across every customer-visible string.
  const visit = (node: any, inInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inInternal) continue;
          diag.strings_scanned++;
          let cur = v;
          const a = scrubBareCounselSubject(cur);
          if (a.hits > 0) {
            cur = a.out;
            diag.t3_counsel_subject_scrubs += a.hits;
          }
          const b = scrubBracketedRolePlaceholder(cur);
          if (b.hits > 0) {
            cur = b.out;
            diag.t3_bracketed_placeholder_scrubs += b.hits;
          }
          if (cur !== v) node[i] = cur;
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
        let cur = child;
        const a = scrubBareCounselSubject(cur);
        if (a.hits > 0) {
          cur = a.out;
          diag.t3_counsel_subject_scrubs += a.hits;
        }
        const b = scrubBracketedRolePlaceholder(cur);
        if (b.hits > 0) {
          cur = b.out;
          diag.t3_bracketed_placeholder_scrubs += b.hits;
        }
        if (cur !== child) (node as any)[k] = cur;
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };
  try { visit(report, false); } catch { /* fail-open */ }

  // Stamp-echo registration under _meta.internal (whitelist-preserved by
  // report-serialize.ts — `_meta.internal` is passed through verbatim).
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal
      : {};
    r._meta.internal.admt_w23a = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  BARE_COUNSEL_SUBJECT_RE,
  BARE_COUNSEL_DUTY_RE,
  BRACKETED_ROLE_PLACEHOLDER_RE,
  SUBMISSION_CONTENT_RE,
  S7001_CHAIN_RE,
  CITATIONISH_FIELDS,
  ANCHOR_KEYS,
  NEUTRAL_RANGE,
  COUNSEL_NEUTRAL,
  PLACEHOLDER_NEUTRAL,
};
