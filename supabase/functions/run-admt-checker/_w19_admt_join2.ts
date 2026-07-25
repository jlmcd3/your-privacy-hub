// W19-ADMT-FALLBACK-JOIN-2 (2026-07-25) — atomic terminal sanitizer for
// wave-17 fallback-join / fusion escapes and W6 insufficient-basis reword.
//
// Wave-17 evidence (campaign fd1be147):
//   • "the ADMT subchapter-subchapter obligations" — the neutral fallback
//     "the applicable ADMT-subchapter provision" was substituted into a
//     compound context ("the ADMT subchapter") and the boundary produced a
//     doubled noun: "subchapter-subchapter".
//   • "the applicable ADMT-subchapter provision–the applicable ADMT-subchapter provision"
//     — a citation RANGE ("§ X–§ Y") whose BOTH endpoints resolved to the
//     neutral fallback rendered as fallback[endash]fallback in prose and in
//     range-notation surfaces (enforcement_context.aggregate_exposure_note).
//   • The W6 authored "insufficient basis" string carried internal pipeline
//     meta-commentary ("post-W6 residual defect", "generator did not resolve
//     … re-run") into customer surfaces.
//
// Design (deterministic root-cause, fail-open, idempotent):
//   1) FALLBACK-JOIN COLLAPSE — collapse any hyphen / en-dash / em-dash /
//      space-joined repeat of the neutral fallback phrase to a SINGLE
//      fallback phrase; also collapse doubled "subchapter" head-nouns.
//   2) INSUFFICIENT-BASIS REWORD — rewrite the exact meta-commentary
//      wording (and any residual variants) into the answer-first form:
//      "More information is needed before this item can be assessed. …"
//   3) Walks every customer-facing string on the report. Skips the
//      `_meta.internal` telemetry bucket (writers put diagnostics there
//      before/after the W12-C1 strip; we must never mutate them).
//
// The module is self-contained. Callers get a diag object which the
// orchestrator stashes on `report._w19_admt_join2` so the WAVE12-C1
// metadata strip relocates it to `_meta.internal` alongside other passes.

export const W19_ADMT_JOIN2_STAMP = "w19-admt-fallbackjoin2@2026-07-25";

// ── Constants ────────────────────────────────────────────────────────────
const FALLBACK = "the applicable ADMT-subchapter provision";

// Anything between two occurrences that counts as a "join separator": one or
// more hyphens, en-dashes, em-dashes, or single spaces (never a punctuation
// boundary — a period ends a sentence and any repeat there is legitimate).
// The join width is bounded (max ~5 chars of separator) so we never collapse
// across paragraph boundaries.
const JOIN_SEP = "[\\s\\u00a0]*[-\\u2013\\u2014][\\s\\u00a0]*|\\s+(?:to|through|and|or)\\s+";
const FALLBACK_ESC = FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DOUBLED_FALLBACK_RE = new RegExp(
  `${FALLBACK_ESC}(?:${JOIN_SEP})${FALLBACK_ESC}(?:(?:${JOIN_SEP})${FALLBACK_ESC})*`,
  "g",
);

// Doubled-noun collapse produced when fallback substitution lands next to
// an existing "subchapter" head-noun. Match hyphen/space/en-dash join,
// case-insensitive on the second occurrence to catch both dashed compounds
// ("subchapter-subchapter") and repeated words ("subchapter subchapter").
const DOUBLED_SUBCHAPTER_RE = /\bsubchapter(?:[\s\u00a0]*[-\u2013\u2014][\s\u00a0]*|\s+)subchapter\b/gi;

// ── (2) Insufficient-basis reword ────────────────────────────────────────
// Exact wave-17 meta-commentary string authored by the orchestrator + a
// tolerant regex catching any residual variants (older stamps, ordering
// tweaks, whitespace drift). We rewrite in place while preserving the
// "insufficient basis" semantics on the machine-status field (which is a
// separate slot the caller does not funnel through this transform).
//
// New wording (dispatch spec — answer-first, then flow statement):
//   "More information is needed before this item can be assessed. The
//    intake did not include enough detail on [topic] to support a specific
//    finding. Provide the missing details and refresh the assessment."
//
// Where [topic] is derived from the surrounding entry (element_id / bucket)
// when available; otherwise we fall back to a neutral "this obligation".
const INSUFF_BASIS_RE =
  /insufficient basis(?:\s*[—-]\s*[^.]*)?\.?\s*(?:The generator[^.]*\.?\s*)?(?:supply the missing intake dimensions[^.]*\.?\s*)?/gi;

const INSUFF_META_TOKENS_RE = /\b(?:post-W6 residual defect|the generator did not resolve|missing intake dimensions and re-run|unresolved proposition_key)\b/gi;

export function rewriteInsufficientBasisFinding(
  s: string,
  topic?: string,
): { out: string; rewritten: number } {
  if (typeof s !== "string" || s.length === 0) return { out: s, rewritten: 0 };
  // Only rewrite strings that carry the meta-commentary — leave unrelated
  // uses of the word "insufficient" untouched.
  if (!INSUFF_META_TOKENS_RE.test(s) && !/insufficient basis\b/i.test(s)) {
    return { out: s, rewritten: 0 };
  }
  const topicPhrase = (topic && topic.trim().length > 0) ? topic.trim() : "this obligation";
  const replacement =
    `More information is needed before this item can be assessed. The intake did not include enough detail on ${topicPhrase} to support a specific finding. Provide the missing details and refresh the assessment.`;
  // Replace the whole meta-commentary span with the new wording. If the
  // regex matches nothing (defensive), we still substitute a single
  // "insufficient basis" occurrence to normalise the surface.
  let out = s.replace(INSUFF_BASIS_RE, replacement);
  if (out === s) {
    out = s.replace(/\binsufficient basis\b[^\n]*/i, replacement);
  }
  // Collapse whitespace tidy from any partial replacements.
  out = out.replace(/\s{2,}/g, " ").trim();
  return { out, rewritten: out !== s ? 1 : 0 };
}

// ── (1) Fallback-join / subchapter-fusion collapse ───────────────────────
export function collapseFallbackJoinAndFusion(
  s: string,
): { out: string; join_collapsed: number; subchapter_fused: number } {
  if (typeof s !== "string" || s.length === 0) {
    return { out: s, join_collapsed: 0, subchapter_fused: 0 };
  }
  let join_collapsed = 0;
  let subchapter_fused = 0;
  let next = s.replace(DOUBLED_FALLBACK_RE, () => {
    join_collapsed++;
    return FALLBACK;
  });
  next = next.replace(DOUBLED_SUBCHAPTER_RE, () => {
    subchapter_fused++;
    return "subchapter";
  });
  return { out: next, join_collapsed, subchapter_fused };
}

// ── Orchestrator ─────────────────────────────────────────────────────────
export interface W19Diag {
  version: string;
  strings_scanned: number;
  join_collapsed: number;
  subchapter_fused: number;
  insufficient_basis_reworded: number;
}

// Derive a plain-English topic for the reworded insufficient-basis string
// from the containing entry (element_id > proposition_key > bucket label).
const BUCKET_TOPIC: Record<string, string> = {
  notice_gaps: "the Pre-use Notice element",
  opt_out_gaps: "the opt-out element",
  access_gaps: "the access-response element",
  documentation_to_maintain: "the documentation element",
  top_3_actions: "this priority action",
};

function topicForEntry(entry: any, bucket: string): string {
  try {
    if (entry && typeof entry === "object") {
      const eid = typeof entry.element_id === "string" ? entry.element_id.trim() : "";
      if (eid) return eid.replace(/_/g, " ");
      const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
      if (pk) return pk.replace(/_/g, " ");
    }
  } catch { /* fail-open */ }
  return BUCKET_TOPIC[bucket] ?? "this obligation";
}

const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions",
];

export function applyW19AdmtJoin2(report: any): W19Diag {
  const diag: W19Diag = {
    version: W19_ADMT_JOIN2_STAMP,
    strings_scanned: 0,
    join_collapsed: 0,
    subchapter_fused: 0,
    insufficient_basis_reworded: 0,
  };
  if (!report || typeof report !== "object") return diag;

  // Per-entry insufficient-basis reword (topic derived from entry).
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const arr = (report as any)[bucket];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        const topic = topicForEntry(entry, bucket);
        for (const k of Object.keys(entry)) {
          const v = entry[k];
          if (typeof v !== "string") continue;
          const r = rewriteInsufficientBasisFinding(v, topic);
          if (r.rewritten) {
            entry[k] = r.out;
            diag.insufficient_basis_reworded += r.rewritten;
          }
        }
      }
    }
  } catch { /* fail-open */ }

  // Deep walk to collapse fallback-joins and subchapter-fusion across every
  // customer-facing string. Skip the internal telemetry bucket entirely.
  const visit = (node: any, inMetaInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inMetaInternal) continue;
          diag.strings_scanned++;
          const r = collapseFallbackJoinAndFusion(v);
          if (r.join_collapsed || r.subchapter_fused) {
            node[i] = r.out;
            diag.join_collapsed += r.join_collapsed;
            diag.subchapter_fused += r.subchapter_fused;
          }
        } else if (v && typeof v === "object") {
          visit(v, inMetaInternal);
        }
      }
      return;
    }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const child = (node as any)[k];
      const childInternal = inMetaInternal || k === "internal" || k.startsWith("_");
      if (typeof child === "string") {
        if (childInternal) continue;
        diag.strings_scanned++;
        const r = collapseFallbackJoinAndFusion(child);
        if (r.join_collapsed || r.subchapter_fused) {
          (node as any)[k] = r.out;
          diag.join_collapsed += r.join_collapsed;
          diag.subchapter_fused += r.subchapter_fused;
        }
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };

  try { visit(report, false); } catch { /* fail-open */ }
  return diag;
}
