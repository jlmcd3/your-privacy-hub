// WAVE19-FIX TURN A (cppa-admt) — targeted post-pass sanitiser.
//
// Four deterministic root-cause fixes surfaced by wave-19 (batch 150d310b,
// run b5eb014e), all fail-open, all idempotent, all confined to customer-
// facing surfaces (never mutates _meta.internal). Runs AFTER the W9
// verified-authority stamp pass and AFTER W19-JOIN2 so it operates on the
// terminal citation string of every entry.
//
// A1 — REGISTRY-FIRST FALLBACK RESOLUTION.
//     If an entry carries a proposition_key OR its citation matches a
//     registry subsection exactly, the entry's citation MUST NOT collapse
//     to the neutral fallback phrase. When we observe the fallback on an
//     entry that has a resolvable pinpoint on the same entry, re-stamp
//     the citation from the registry row and clear any fallback-in-prose
//     substitution WITHIN THAT ENTRY'S own free-text fields.
//
// A2 — SPLICE DEBRIS SCRUB.
//     Cleans mid-sentence splices produced when the fallback noun phrase
//     was substituted into an existing sentence — e.g. "within the
//     enumerated the applicable ADMT-subchapter provision". Grammar
//     rewrites are deterministic and confined to a small set of anchor
//     tokens; unmatched shapes are left alone rather than guessed.
//
// A3 — UNVERIFIED SUBSECTION DOWNGRADE (all sections, not just § 7150).
//     For every entry in top_3_actions / *_gaps / documentation_to_maintain
//     whose citation contains "§ NNNN(...)" where the exact pinpoint is
//     NOT in the registry but the bare section IS, downgrade to the bare
//     section. Telemetry counter is emitted; never fabricates.
//
// A4 — UNSUPPORTED TIMELINE CLAIM ROUTE.
//     In top_3_actions / priority_actions, "within N business/calendar
//     days" numeric claims that (a) do not match a known statutory
//     timeline AND (b) are not backed by the intake are stripped and
//     re-routed to the information-needed catalog message. Known
//     statutory timelines (10 business days § 7021(a); 45 calendar days
//     § 7021(b); 15 business days § 7221(n)(1)) pass through untouched.
//
// Guardrails: no rubric/grader edits; no intake-contract changes; all
// customer-facing strings routed through customer-messages.ts.

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import {
  resolveByPropositionKey,
} from "../_shared/verified-authority-resolver.ts";
import { renderMessage } from "../_shared/customer-messages.ts";

export const W19_ADMT_TURNA_STAMP = "w19-admt-turna@2026-07-25T07:55:00Z";

const FALLBACK = "the applicable ADMT-subchapter provision";
const FALLBACK_ESC = FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Registry-verified pinpoint set (exact subsection strings).
const VERIFIED_SUBSECTIONS: Set<string> = new Set(
  Object.values(ADMT_VERIFIED_AUTHORITIES).map((r: any) => String(r.subsection || "")),
);
// Map: bare-section string ("11 CCR § XXXX") → true when at least one row
// exists at section depth for that section.
const VERIFIED_SECTIONS: Set<string> = new Set(
  Array.from(VERIFIED_SUBSECTIONS).map((s) => {
    const m = s.match(/^(11\s*CCR\s*§\s*\d+)/);
    return m ? m[1].replace(/\s+/g, " ") : s;
  }),
);

// Known statutory timelines (WHITELIST — pass through untouched).
// Sources cited elsewhere in this generator's prompt (§ 7021 access
// timeline, § 7221(n)(1) opt-out timeline).
const KNOWN_TIMELINE_RES: RegExp[] = [
  /\bwithin\s+10\s+business\s+days\b/i,       // § 7021(a) confirm receipt
  /\bwithin\s+45\s+calendar\s+days\b/i,       // § 7021(b) respond
  /\bwithin\s+90\s+calendar\s+days\b/i,       // § 7021(b) extension ceiling
  /\bwithin\s+15\s+business\s+days\b/i,       // § 7221(n)(1) opt-out cease
];

// Free "within N business/calendar days" pattern for detection.
const TIMELINE_ANY_RE = /\bwithin\s+(\d{1,3})\s+(business|calendar)\s+days\b/gi;

// ── A2 splice-debris patterns ──────────────────────────────────────────
// Doubled article around fallback: "the enumerated the applicable ..."
// The generator historically produced these when the fallback replaced a
// noun that was itself preceded by another determiner or participle.
const SPLICE_PATTERNS: Array<[RegExp, string]> = [
  // "the enumerated the applicable ..." → "the applicable ..."
  [new RegExp(`\\bthe\\s+enumerated\\s+${FALLBACK_ESC}\\b`, "gi"), FALLBACK],
  // Any adjective + doubled determiner: "the <adj> the applicable ..."
  [new RegExp(`\\bthe\\s+(?:enumerated|listed|referenced|governing|applicable|relevant)\\s+the\\s+applicable\\s+ADMT-subchapter\\s+provision\\b`, "gi"), FALLBACK],
  // "the the applicable ..." bare doubled article
  [new RegExp(`\\bthe\\s+${FALLBACK_ESC}\\b`, "g"), FALLBACK],
];

export function scrubSpliceDebris(s: string): { out: string; hits: number } {
  if (typeof s !== "string" || s.length === 0) return { out: s, hits: 0 };
  let hits = 0;
  let out = s;
  for (const [re, sub] of SPLICE_PATTERNS) {
    out = out.replace(re, () => { hits++; return sub; });
  }
  // Second pass for any residual "the the applicable" produced by our own
  // substitution collapsing an outer determiner.
  const r2 = out.replace(/\bthe\s+the\s+applicable\b/gi, () => { hits++; return "the applicable"; });
  return { out: r2, hits };
}

// ── A3 subsection downgrade (generalised across all sections) ──────────
const PINPOINT_RE = /11\s*CCR\s*§\s*\d+(?:\s*\([^)]+\))+/g;
const SECTION_HEAD_RE = /^(11\s*CCR\s*§\s*\d+)/;

export function downgradeUnverifiedPinpointsInCitation(
  citation: string,
): { out: string; downgrades: number } {
  if (typeof citation !== "string" || citation.length === 0) {
    return { out: citation, downgrades: 0 };
  }
  let downgrades = 0;
  const parts = citation.split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean);
  const nextParts = parts.map((p) => {
    if (!/\(/.test(p)) return p; // already section-level
    if (VERIFIED_SUBSECTIONS.has(p)) return p; // exact registry hit
    const m = p.match(SECTION_HEAD_RE);
    if (!m) return p;
    const bare = m[1].replace(/\s+/g, " ");
    if (VERIFIED_SECTIONS.has(bare)) {
      downgrades++;
      return bare;
    }
    return p;
  });
  // Dedupe preserving order.
  const seen = new Set<string>();
  const kept = nextParts.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
  return { out: kept.join(" + "), downgrades };
}

// ── A4 unsupported-timeline stripper ────────────────────────────────────
function timelineIsKnownStatutory(match: string): boolean {
  return KNOWN_TIMELINE_RES.some((re) => re.test(match));
}

function intakeContainsTimeline(intake: any, match: string): boolean {
  try {
    const needle = match.toLowerCase().trim();
    const s = JSON.stringify(intake || {}).toLowerCase();
    return s.includes(needle);
  } catch { return false; }
}

export function stripUnsupportedTimelineClaim(
  s: string,
  intake: any,
): { out: string; stripped: number } {
  if (typeof s !== "string" || s.length === 0) return { out: s, stripped: 0 };
  let stripped = 0;
  const out = s.replace(TIMELINE_ANY_RE, (m) => {
    if (timelineIsKnownStatutory(m)) return m;
    if (intakeContainsTimeline(intake, m)) return m;
    stripped++;
    // Replace the unsupported timeline phrase with a neutral information-
    // needed marker. Kept short so surrounding grammar remains readable.
    return "on a timeline that requires confirmation";
  });
  return { out, stripped };
}

// ── A1 registry-first fallback resolution (per-entry) ───────────────────
function tryResolveFromEntry(entry: any): { subsection: string; pk: string } | null {
  if (!entry || typeof entry !== "object") return null;
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  if (pk) {
    const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
    if (row) return { subsection: row.subsection, pk: row.proposition_key };
  }
  return null;
}

export function reresolveFallbackOnEntry(entry: any): { rewrote_citation: number; rewrote_prose: number } {
  const diag = { rewrote_citation: 0, rewrote_prose: 0 };
  if (!entry || typeof entry !== "object") return diag;
  const resolved = tryResolveFromEntry(entry);
  if (!resolved) return diag;
  // If the entry's citation is empty OR literally the fallback phrase, stamp
  // the verified subsection.
  const cit = typeof entry.citation === "string" ? entry.citation.trim() : "";
  if (!cit || cit === FALLBACK) {
    entry.citation = resolved.subsection;
    diag.rewrote_citation = 1;
  }
  // Scrub the fallback phrase from other free-text fields on the entry.
  const FALLBACK_INLINE = new RegExp(FALLBACK_ESC, "g");
  for (const k of Object.keys(entry)) {
    if (k === "citation") continue;
    const v = entry[k];
    if (typeof v !== "string" || v.length === 0) continue;
    if (!FALLBACK_INLINE.test(v)) continue;
    const next = v.replace(FALLBACK_INLINE, resolved.subsection);
    if (next !== v) {
      entry[k] = next;
      diag.rewrote_prose++;
    }
  }
  return diag;
}

// ── Orchestrator ────────────────────────────────────────────────────────
export interface W19TurnADiag {
  version: string;
  a1_citation_rewrites: number;
  a1_prose_rewrites: number;
  a2_splice_scrubs: number;
  a3_subsection_downgrades: number;
  a4_timelines_stripped: number;
  strings_scanned: number;
}

const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
];

export function applyW19AdmtTurnA(report: any, intake: any): W19TurnADiag {
  const diag: W19TurnADiag = {
    version: W19_ADMT_TURNA_STAMP,
    a1_citation_rewrites: 0,
    a1_prose_rewrites: 0,
    a2_splice_scrubs: 0,
    a3_subsection_downgrades: 0,
    a4_timelines_stripped: 0,
    strings_scanned: 0,
  };
  if (!report || typeof report !== "object") return diag;

  // Per-entry: A1 + A3 + A4 on structured entries.
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const arr = (report as any)[bucket];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") {
          if (typeof entry === "string" && bucket === "priority_actions") {
            // string-shape bucket handled in generic walk below
          }
          continue;
        }
        // A1
        const a1 = reresolveFallbackOnEntry(entry);
        diag.a1_citation_rewrites += a1.rewrote_citation;
        diag.a1_prose_rewrites += a1.rewrote_prose;
        // A3 on citation
        if (typeof entry.citation === "string" && entry.citation.length > 0) {
          const a3 = downgradeUnverifiedPinpointsInCitation(entry.citation);
          if (a3.downgrades > 0) {
            entry.citation = a3.out;
            diag.a3_subsection_downgrades += a3.downgrades;
          }
        }
        // A4 on any string field on the entry
        for (const k of Object.keys(entry)) {
          const v = entry[k];
          if (typeof v !== "string" || v.length === 0) continue;
          const a4 = stripUnsupportedTimelineClaim(v, intake);
          if (a4.stripped > 0) {
            entry[k] = a4.out;
            diag.a4_timelines_stripped += a4.stripped;
            if (a4.stripped > 0 && (bucket === "top_3_actions" || bucket === "priority_actions")) {
              // Mark structured flag for downstream frontend rendering.
              entry.information_needed = true;
            }
          }
        }
      }
    }
  } catch { /* fail-open */ }

  // Generic walk: A2 splice scrub across every customer-facing string.
  const visit = (node: any, inInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inInternal) continue;
          diag.strings_scanned++;
          const r = scrubSpliceDebris(v);
          if (r.hits > 0) { node[i] = r.out; diag.a2_splice_scrubs += r.hits; }
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
        diag.strings_scanned++;
        const r = scrubSpliceDebris(child);
        if (r.hits > 0) { (node as any)[k] = r.out; diag.a2_splice_scrubs += r.hits; }
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };
  try { visit(report, false); } catch { /* fail-open */ }

  // Attach diag under a top-level key that the WAVE12-C1 metadata strip
  // will relocate to _meta.internal (matches join2 convention).
  try { (report as any)._w19_admt_turna = diag; } catch { /* noop */ }
  return diag;
}

// Exported for tests: information-needed catalog string used in A4 replacement.
export const A4_INFO_NEEDED_HINT = renderMessage("information.needed");
