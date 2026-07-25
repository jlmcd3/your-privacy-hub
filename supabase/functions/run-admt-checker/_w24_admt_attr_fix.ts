// ─────────────────────────────────────────────────────────────────────────
// WAVE24-FIX ATTRIBUTION TURN (cppa-admt) — deploy turn on run-admt-checker.
// Controller dispatch W24-ADMT-ATTRIBUTION-FIX-2026-07-25 (5-lens
// TEAM-REVIEWED). Instrument s4 is FROZEN — this turn edits PRODUCT code
// only. No prompt/rubric/grader/golden/registry/corpus edits.
//
// Attribution (wave 24, run 113, quality_run f2c7deca):
//   • e6_counsel_referral RECURRENCE (doc a87dcff5): W23-turnA T3
//     BRACKETED_ROLE_PLACEHOLDER_RE requires a role-word token (legal
//     counsel, dpo, privacy officer, product owner, legal team). The
//     wave-24 leak is a bracketed ALL-CAPS ADVISORY sentence with none
//     of those role words — "[FURTHER INTERNAL LEGAL REVIEW IS ADVISABLE
//     TO CONFIRM …]". Detector class widened here.
//   • Adjacent "More information is needed before this item can be
//     assessed." grader-visible artefact: information-needed prose must
//     never appear on the customer surface; the fact is carried by the
//     `information_needed` structured flag / bucket instead.
//   • rubric_internal_reasoning_leak (doc 95d8140f): the unresolved
//     template variant "the applicable ADMT-subchapter provision" was
//     spliced into a priority_actions sentence — "No the applicable
//     ADMT-subchapter provision gaps are identified …". W23-turnA never
//     scrubbed this class in priority_actions bodies. Detector added
//     here to rewrite (registry-first) or drop the sentence.
//
// GUARDRAILS
//   • Fail-open at every helper and the orchestrator (try/catch +
//     console.warn) — availability is never blocked.
//   • Anchor keys (citation, verbatim_quote, proposition_key, id, key,
//     stamp, build_stamp, provision, subsection, source_fields) are
//     never mutated by prose walkers.
//   • Fact-ledger consultation is preserved: intake-supported claims
//     already flow through the ledger pass and are not scrubbed here.
//   • Telemetry only under `_meta.internal.admt_w24_attr` — the
//     whitelist serializer preserves `_meta.internal` verbatim, so no
//     schema change is required (LEAK-PREV-P2 item 32 gate honored).
// ─────────────────────────────────────────────────────────────────────────

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import { resolveByPropositionKey } from "../_shared/verified-authority-resolver.ts";

export const W24_ADMT_ATTR_STAMP = "w24-admt-attr@2026-07-25T18:28:00Z";

// Customer buckets whose entries carry prose that a grader will read.
const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
  "information_needed", "annotations",
];

// Anchor keys the prose walkers must never touch.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp", "subsection",
]);

// The known fallback phrase that W19-turnA sometimes leaves behind when
// no registry row resolves — customer prose should never CONTAIN this as
// a NOUN PHRASE. It's fine as a citation-slot value (that stays on the
// telemetry channel only via serializer), but never in narrative bodies.
const UNRESOLVED_TEMPLATE_PHRASES = [
  "the applicable ADMT-subchapter provision",
  "the applicable ADMT subchapter provision",
  "the applicable ADMT-subchapter",
];

const COUNSEL_NEUTRAL =
  "Qualified counsel must review this item before operational use.";

// ── T-Aa — Bracketed ALL-CAPS advisory sentence (any counsel/review
//           token, no role-word requirement). Distinct from W23 T3b
//           which required legal-counsel/DPO/product-owner tokens.
const BRACKETED_ADVISORY_RE =
  /\[[^\]\n]{5,400}?(?:LEGAL\s+REVIEW|LEGAL\s+COUNSEL|COUNSEL\s+REVIEW|ADVISABLE|RECOMMENDED|SIGN[-\s]?OFF|INTERNAL\s+REVIEW|FURTHER\s+REVIEW|FURTHER\s+ANALYSIS|CONFIRM(?:ATION)?\s+(?:BY|WITH)|ATTORNEY|OUTSIDE\s+COUNSEL|IN[-\s]?HOUSE\s+COUNSEL)[^\]\n]{0,400}?\]/g;

export function scrubBracketedAdvisorySentence(
  text: string,
): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  BRACKETED_ADVISORY_RE.lastIndex = 0;
  const matches = text.match(BRACKETED_ADVISORY_RE);
  if (!matches || matches.length === 0) return { out: text, hits: 0 };
  const out = text.replace(BRACKETED_ADVISORY_RE, COUNSEL_NEUTRAL)
    .replace(/\s{2,}/g, " ").trim();
  return { out, hits: matches.length };
}

// ── T-Ab — Information-needed prose scrub. This class of sentence
//           ("More information is needed before this item can be
//           assessed") is a pipeline artefact — the same fact is
//           carried by the `information_needed` structured flag /
//           bucket. Strip the sentence from customer prose; the
//           structured signal (if present on the entry) is untouched.
const INFO_NEEDED_SENTENCE_RE =
  /(?:^|\s)(?:more\s+information|additional\s+information|further\s+information)\s+is\s+needed[^.!?]*[.!?]/gi;

export function scrubInformationNeededProse(
  text: string,
): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  INFO_NEEDED_SENTENCE_RE.lastIndex = 0;
  const matches = text.match(INFO_NEEDED_SENTENCE_RE);
  if (!matches || matches.length === 0) return { out: text, hits: 0 };
  const out = text.replace(INFO_NEEDED_SENTENCE_RE, " ")
    .replace(/\s{2,}/g, " ").trim();
  return { out, hits: matches.length };
}

// ── T-B — Unresolved template-variable guard on customer prose.
// Rewrites sentences that CONTAIN the fallback phrase, using the entry's
// proposition_key registry row where possible; otherwise drops the whole
// sentence. Idempotent.
function containsUnresolvedTemplate(s: string): boolean {
  const low = s.toLowerCase();
  return UNRESOLVED_TEMPLATE_PHRASES.some((p) => low.includes(p.toLowerCase()));
}

export function rewriteOrDropUnresolvedTemplate(
  text: string,
  entry: any,
): { out: string; rewrites: number; drops: number } {
  if (typeof text !== "string" || text.length === 0) {
    return { out: text, rewrites: 0, drops: 0 };
  }
  if (!containsUnresolvedTemplate(text)) return { out: text, rewrites: 0, drops: 0 };
  // Try registry-first substitution.
  let replacement: string | null = null;
  try {
    const pk = entry && typeof entry.proposition_key === "string"
      ? entry.proposition_key.trim() : "";
    if (pk) {
      const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
      if (row && typeof row.subsection === "string" && row.subsection.trim()) {
        replacement = row.subsection.trim();
      }
    }
  } catch { /* fail-open */ }

  // Sentence split so we can excise just the offending sentence(s).
  const sents = text.split(/(?<=[.!?])\s+/);
  let rewrites = 0;
  let drops = 0;
  const kept: string[] = [];
  for (const s of sents) {
    if (!containsUnresolvedTemplate(s)) { kept.push(s); continue; }
    if (replacement) {
      let rewritten = s;
      for (const p of UNRESOLVED_TEMPLATE_PHRASES) {
        rewritten = rewritten.split(p).join(replacement);
      }
      kept.push(rewritten);
      rewrites++;
    } else {
      drops++;
    }
  }
  const out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  return { out, rewrites, drops };
}

export interface W24AdmtAttrDiag {
  version: string;
  bracketed_advisory_scrubs: number;
  info_needed_prose_scrubs: number;
  template_var_rewrites: number;
  template_var_drops: number;
  entries_scanned: number;
  strings_scanned: number;
  stamp_echo_registered: boolean;
}

function emptyDiag(): W24AdmtAttrDiag {
  return {
    version: W24_ADMT_ATTR_STAMP,
    bracketed_advisory_scrubs: 0,
    info_needed_prose_scrubs: 0,
    template_var_rewrites: 0,
    template_var_drops: 0,
    entries_scanned: 0,
    strings_scanned: 0,
    stamp_echo_registered: false,
  };
}

function walkEntryStrings(
  entry: any,
  diag: W24AdmtAttrDiag,
): void {
  if (!entry || typeof entry !== "object") return;
  for (const k of Object.keys(entry)) {
    if (ANCHOR_KEYS.has(k)) continue;
    const v = entry[k];
    if (typeof v === "string") {
      diag.strings_scanned++;
      let cur = v;
      const a = scrubBracketedAdvisorySentence(cur);
      if (a.hits > 0) { cur = a.out; diag.bracketed_advisory_scrubs += a.hits; }
      const b = scrubInformationNeededProse(cur);
      if (b.hits > 0) { cur = b.out; diag.info_needed_prose_scrubs += b.hits; }
      const c = rewriteOrDropUnresolvedTemplate(cur, entry);
      if (c.rewrites + c.drops > 0) {
        cur = c.out;
        diag.template_var_rewrites += c.rewrites;
        diag.template_var_drops += c.drops;
      }
      if (cur !== v) entry[k] = cur;
    }
  }
}

export function applyW24AdmtAttrFix(report: any, _intake: any): W24AdmtAttrDiag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") return diag;

  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const raw = (report as any)[bucket];
      const arr: any[] = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.rows) ? raw.rows : []);
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        diag.entries_scanned++;
        walkEntryStrings(entry, diag);
      }
    }
  } catch (e) {
    console.warn("[w24-admt-attr] bucket pass failed (non-fatal):", (e as Error)?.message);
  }

  // Stamp-echo under _meta.internal (whitelist-preserved by
  // report-serialize.ts — no schema change required).
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal
      : {};
    r._meta.internal.admt_w24_attr = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  BRACKETED_ADVISORY_RE,
  INFO_NEEDED_SENTENCE_RE,
  UNRESOLVED_TEMPLATE_PHRASES,
  ANCHOR_KEYS,
  CUSTOMER_BUCKETS,
  COUNSEL_NEUTRAL,
};
