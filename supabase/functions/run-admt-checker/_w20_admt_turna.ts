// WAVE20-FIX TURN A (cppa-admt) — targeted post-pass sanitiser.
//
// Runs AFTER _w19_admt_turna.ts (A1–A4) and BEFORE the LEAK-PREV emit gate.
// Fail-open, idempotent, customer-facing only (never mutates _meta.internal).
//
// Scope (queue item 37):
//   B1 — A2 VARIANT-TOLERANT SPLICE SCRUB. Generalise the wave-19 A2 regex
//        to tolerate interposed words (numerals, quantifiers, adjectives)
//        between "the …the applicable ADMT-subchapter provision".
//        Type case (doc e337fb5d): "the five enumerated the applicable
//        ADMT-subchapter provision categories" survived w19 because A2 only
//        matched immediate adjacency.
//   B2 — A1 KEYLESS-CALL-SITE COVERAGE. w19 A1 only re-resolves entries
//        carrying proposition_key. Extend so the catalog phrase
//        ("the applicable ADMT-subchapter provision") never ships at all:
//        (a) citation === FALLBACK on a keyless entry → downgrade to the
//            ADMT-subchapter range (registry-verified section-range level,
//            never a fabricated pinpoint);
//        (b) fallback phrase in free-text prose (any string field) →
//            rewrite to a neutral, truthful anchor ("the ADMT subchapter").
//        Never fabricates a subsection.
//   B3 — § 7150(b)(3) reconciliation is docs-only this turn (see ledger).
//        Registry admt-va-w8 is verified against the CCR text (verbatim
//        quote: "Using ADMT for a significant decision concerning a
//        consumer."). No registry edit; grader-map gap flagged for CEO
//        review in docs/pipeline-state.md.
//   B4 — EMPTY information_needed OBJECT FILTER. Drop entries in the
//        report's `information_needed` array that are structurally empty
//        (null, empty string, empty object, or object whose informative
//        fields — question/prompt/topic/field/context — are all empty).
//        Legitimate customer questions are preserved.
//
// NOTE: B2 tracks a suppression counter (`b2_keyless_fallback_rewrites`)
// that will feed the LEAK-PREV-P4-SELF-HEALING over-enforcement demotion
// loop in a subsequent turn (P4 not built here).

export const W20_ADMT_TURNA_STAMP = "w20-admt-turna@__STAMP__";

const FALLBACK = "the applicable ADMT-subchapter provision";
const FALLBACK_ESC = FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── B1: variant-tolerant splice scrub ─────────────────────────────────
// Matches "the <0-4 interposed words> the applicable ADMT-subchapter
// provision" with any adjectives, numerals, or quantifiers between the
// two determiners. Non-greedy word window keeps this deterministic and
// bounded (max 4 interposed word-tokens = covers observed variants
// including "the five enumerated ..." without over-matching normal prose).
const SPLICE_VARIANT_RE = new RegExp(
  `\\bthe\\s+(?:[A-Za-z0-9-]+\\s+){1,4}the\\s+applicable\\s+ADMT-subchapter\\s+provision\\b`,
  "gi",
);

// Also cover the numeral-tail form: "the applicable ADMT-subchapter
// provision categories" / "provisions" / "requirements" — the extra
// trailing noun is a splice artefact when it follows the fallback.
const SPLICE_TRAILING_NOUN_RE = new RegExp(
  `\\b${FALLBACK_ESC}\\s+(categories|provisions|requirements|obligations|elements)\\b`,
  "gi",
);

export function scrubSpliceVariants(s: string): { out: string; hits: number } {
  if (typeof s !== "string" || s.length === 0) return { out: s, hits: 0 };
  let hits = 0;
  let out = s.replace(SPLICE_VARIANT_RE, () => { hits++; return FALLBACK; });
  out = out.replace(SPLICE_TRAILING_NOUN_RE, () => { hits++; return FALLBACK; });
  return { out, hits };
}

// ── B2: keyless fallback rewrite ──────────────────────────────────────
// Registry-verified section-range anchor. §§ 7200–7222 is the ADMT
// subchapter (Article 11); this is factually correct at the range level
// and does NOT fabricate a subsection pinpoint.
const NEUTRAL_CITATION = "11 CCR §§ 7200–7222";
const NEUTRAL_PROSE = "the ADMT subchapter";

const FALLBACK_INLINE = new RegExp(FALLBACK_ESC, "gi");

export function rewriteKeylessFallbackOnEntry(entry: any): {
  citation_rewrites: number; prose_rewrites: number;
} {
  const diag = { citation_rewrites: 0, prose_rewrites: 0 };
  if (!entry || typeof entry !== "object") return diag;
  // Skip entries that already have a proposition_key — w19 A1 owns them.
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  if (pk) return diag;
  // Citation: exact fallback → section-range anchor.
  if (typeof entry.citation === "string") {
    const c = entry.citation.trim();
    if (c === FALLBACK) {
      entry.citation = NEUTRAL_CITATION;
      diag.citation_rewrites = 1;
    }
  }
  // Prose fields: strip fallback phrase → neutral anchor.
  for (const k of Object.keys(entry)) {
    if (k === "citation" || k === "proposition_key") continue;
    const v = entry[k];
    if (typeof v !== "string" || v.length === 0) continue;
    if (!FALLBACK_INLINE.test(v)) continue;
    const next = v.replace(FALLBACK_INLINE, NEUTRAL_PROSE);
    if (next !== v) { entry[k] = next; diag.prose_rewrites++; }
  }
  return diag;
}

// ── B4: empty information_needed filter ───────────────────────────────
const INFO_KEYS = ["question", "prompt", "topic", "field", "context", "detail", "text", "label", "note"];

function isStructurallyEmpty(item: any): boolean {
  if (item == null) return true;
  if (typeof item === "string") return item.trim().length === 0;
  if (typeof item !== "object") return false; // numbers/bools kept
  if (Array.isArray(item)) return item.every(isStructurallyEmpty);
  const keys = Object.keys(item);
  if (keys.length === 0) return true;
  // If ANY informative field carries non-empty content, keep it.
  for (const k of INFO_KEYS) {
    const v = item[k];
    if (typeof v === "string" && v.trim().length > 0) return false;
    if (Array.isArray(v) && v.some((x) => typeof x === "string" && x.trim().length > 0)) return false;
  }
  // No informative field populated → check for any non-empty string on any key.
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim().length > 0) return false;
  }
  return true;
}

export function filterEmptyInformationNeeded(report: any): { dropped: number } {
  const diag = { dropped: 0 };
  if (!report || typeof report !== "object") return diag;
  const arr = (report as any).information_needed;
  if (!Array.isArray(arr)) return diag;
  const kept: any[] = [];
  for (const item of arr) {
    if (isStructurallyEmpty(item)) { diag.dropped++; continue; }
    kept.push(item);
  }
  (report as any).information_needed = kept;
  return diag;
}

// ── Orchestrator ──────────────────────────────────────────────────────
export interface W20TurnADiag {
  version: string;
  b1_variant_splice_scrubs: number;
  b2_keyless_citation_rewrites: number;
  b2_keyless_prose_rewrites: number;
  b4_information_needed_dropped: number;
  strings_scanned: number;
}

const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
];

export function applyW20AdmtTurnA(report: any, _intake: any): W20TurnADiag {
  const diag: W20TurnADiag = {
    version: W20_ADMT_TURNA_STAMP,
    b1_variant_splice_scrubs: 0,
    b2_keyless_citation_rewrites: 0,
    b2_keyless_prose_rewrites: 0,
    b4_information_needed_dropped: 0,
    strings_scanned: 0,
  };
  if (!report || typeof report !== "object") return diag;

  // B2: per-entry keyless fallback rewrite on customer buckets.
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const arr = (report as any)[bucket];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        const b2 = rewriteKeylessFallbackOnEntry(entry);
        diag.b2_keyless_citation_rewrites += b2.citation_rewrites;
        diag.b2_keyless_prose_rewrites += b2.prose_rewrites;
      }
    }
  } catch { /* fail-open */ }

  // B1 + B2-prose (generic walk on all customer-facing strings).
  const visit = (node: any, inInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inInternal) continue;
          diag.strings_scanned++;
          const r = scrubSpliceVariants(v);
          if (r.hits > 0) { node[i] = r.out; diag.b1_variant_splice_scrubs += r.hits; }
          // B2 prose sweep on standalone strings (arrays of strings).
          if (FALLBACK_INLINE.test(node[i])) {
            const rewritten = (node[i] as string).replace(FALLBACK_INLINE, NEUTRAL_PROSE);
            if (rewritten !== node[i]) {
              node[i] = rewritten; diag.b2_keyless_prose_rewrites++;
            }
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
        diag.strings_scanned++;
        const r = scrubSpliceVariants(child);
        if (r.hits > 0) { (node as any)[k] = r.out; diag.b1_variant_splice_scrubs += r.hits; }
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };
  try { visit(report, false); } catch { /* fail-open */ }

  // B4: filter empty information_needed shells.
  try {
    const b4 = filterEmptyInformationNeeded(report);
    diag.b4_information_needed_dropped = b4.dropped;
  } catch { /* fail-open */ }

  try { (report as any)._w20_admt_turna = diag; } catch { /* noop */ }
  return diag;
}
