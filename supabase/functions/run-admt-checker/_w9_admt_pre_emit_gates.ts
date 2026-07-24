// ADMT-FIX-W9 — Pre-emit deterministic gates for cppa-admt.
//
// Runs as the LAST mutation pass before the terminal complete_write. Mirrors
// the deterministic grader predicates for h6_admt_governing_anchor,
// e6_counsel_referral, and rubric_internal_reasoning_leak so the model's
// residual defects are structurally removed at generation time rather than
// only measured after the fact.
//
// Grader-neutrality: NO grader file is imported or referenced from here —
// the regexes are re-authored locally against the same policy anchors
// (CPPA-HF4 B1, GRADER-CAL-3/4 carve-outs, W3-T5, CV1-ALL). The check IDs
// under _shared/grader/ remain the sole measurement surface.
//
// Wave-10 attribution for each gate:
//   G1 (h6): flat at 3 across waves 9/10 — untouched by prior scrubbers.
//   G2 (e6): rose 2→3 — W6 stripper missed sentences outside the narrow
//            body-text bucket set; this walker covers every prose field.
//   G3 (rubric_internal_reasoning_leak): new class, claude_only ×2 —
//            FSOR-bracket echoes and normalizer-token leaks slipping past
//            the W6 internal-block regex.
//   G4 (invented-section): remaining agree instance after Turn 2 —
//            model still emits § 72xx tokens outside the 7200–7222 span.
//
// Contract: mutates report in place; returns counters.

export const W9_ADMT_PRE_EMIT_STAMP = "w9-admt-preemit@2026-07-24T12:30:00Z";

export interface W9PreEmitCounters {
  stamp: string;
  fields_scanned: number;
  sentences_scanned: number;
  g1_h6_rewrites: number;
  g2_e6_strips: number;
  g3_reasoning_leak_strips: number;
  g4_invented_section_rewrites: number;
  fields_mutated: number;
}

// ── Predicates ──────────────────────────────────────────────────────────

// G1: § 7001 sole-anchor for an ADMT action-duty sentence.
const G1_DUTY_VERB_RE =
  /\b(?:must\s+(?:disclose|provide|notify|respond|confirm|deliver|honor|honour|allow|permit)|shall\s+(?:disclose|provide|notify|respond|honor|honour)|the\s+business\s+must|response\s+must|access\s+response|opt[-\s]?out\s+response|pre[-\s]?use\s+notice|access\s+request)\b/i;
const G1_S7001_RE = /\bs?§?\s*7001(?:\([a-z0-9]+\))*/i;
const G1_OPERATIVE_ANCHOR_RE = /\bs?§?\s*72(?:00|2[012])(?:\([a-z0-9]+\))*/i;
// Fallback to append when the operative anchor is missing.
const G1_APPEND = " (see 11 CCR §§ 7220–7222)";

// G2: body-text counsel referral.
const G2_COUNSEL_REF_RE =
  /\b(?:(?:consult|engage|retain|escalate\s+to|refer\s+to|coordinate\s+with|review\s+with|obtain\s+(?:sign[-\s]?off|advice|guidance)\s+from|seek\s+(?:advice|guidance|legal\s+advice)\s+(?:from|on)|have)\s+(?:the\s+business['’]s\s+)?(?:qualified\s+)?(?:outside|external|in[-\s]?house|your\s+privacy|your\s+legal|independent)?\s*(?:legal\s+)?(?:counsel|attorneys?|lawyers?|legal\s+team)|(?:the\s+business|the\s+organi[sz]ation)\s+should\s+consult\s+(?:its\s+)?(?:attorneys?|counsel)|have\s+counsel\s+confirm)\b/i;
// Sanctioned ownership disclaimer language (GRADER-CAL-3 T2 carve-out) —
// preserved verbatim; if the sentence carries this, do not strip.
const G2_OWNERSHIP_DISCLAIMER_RE = /must\s+review,?\s+complete,?\s+and\s+own\b/i;

// G3: internal-reasoning leaks — FSOR bracket echo, normalizer keys,
// review-note headers, hedging deliberation cues, AI meta-phrasing.
const G3_LEAK_RES: RegExp[] = [
  /\[Agency\s+position\s+[—–-]\s+FSOR:/i,
  /_normalized_intake\b/i,
  /\bNOTE\s+FOR\s+LEGAL\s+REVIEW\b/i,
  /\bfurther\s+internal\s+investigation\s+is\s+advisable\b/i,
  /\bfurther\s+analysis\s+is\s+warranted\b/i,
  /\bfurther\s+review\s+may\s+be\s+appropriate\b/i,
  /\bthe\s+drafter\s+recommends\s+further\s+inquiry\b/i,
  /\badditional\s+consideration\s+is\s+needed\b/i,
  /\bas\s+an\s+AI\s+(?:language\s+)?model\b/i,
  /<\/?(?:thinking|scratchpad|reasoning|internal)\b[^>]*>/i,
];

// G4: § 72xx sections outside the ADMT-subchapter span (7200–7222).
// The Turn 2 slot enforcer already covered the top-3 pattern; wave-10
// showed one surviving agree instance where § 7223 / § 7250 / § 7195
// appeared as a citation token. Replace inline with the subchapter
// fallback; the walk-anchor guard around structured `citation` fields is
// unaffected (those go through the resolver).
const G4_INVENTED_SECTION_RE =
  /(?:11\s*CCR\s*)?§+\s*(71[6-9][0-9]|72(?:2[3-9]|[3-9]\d))(?:\s*\([a-z0-9]+\))*/gi;
const G4_REPLACEMENT = "11 CCR §§ 7220–7222";

// ── Sentence splitter ───────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

// ── Field walker ────────────────────────────────────────────────────────

const RESERVED_KEYS = new Set([
  "citation", "citations", "citation_ids", "citation_lints",
  "field_ids", "source_fields", "element_id",
  "intake_field_1", "intake_field_2", "canonical_fields",
  "_drafting_record", "_normalized_intake",
  "_w6_admt_fix", "_w9_admt_wire", "_w9_admt_slots", "_w9_admt_regen",
  "_w9_admt_pre_emit", "_meta", "proposition_key", "check_type",
  "check_id", "dimension", "severity", "passed", "evidence",
  "verbatim_quote", "subsection", "governing_anchor",
]);

function applyGates(text: string, c: W9PreEmitCounters): string {
  if (!text) return text;
  let mutated = false;

  // G4 first — token-level rewrite is context-free.
  const g4Matches = text.match(G4_INVENTED_SECTION_RE);
  if (g4Matches && g4Matches.length > 0) {
    text = text.replace(G4_INVENTED_SECTION_RE, G4_REPLACEMENT);
    c.g4_invented_section_rewrites += g4Matches.length;
    mutated = true;
  }

  // Sentence-level passes.
  const sentences = splitSentences(text);
  c.sentences_scanned += sentences.length;
  const kept: string[] = [];
  for (const s of sentences) {
    // G3 — hard strip on any leak marker.
    if (G3_LEAK_RES.some((re) => re.test(s))) {
      c.g3_reasoning_leak_strips++;
      mutated = true;
      continue;
    }
    // G2 — body-text counsel referral (respect ownership carve-out).
    if (G2_COUNSEL_REF_RE.test(s) && !G2_OWNERSHIP_DISCLAIMER_RE.test(s)) {
      c.g2_e6_strips++;
      mutated = true;
      continue;
    }
    // G1 — sole-§7001 duty sentence: append operative-anchor fallback.
    if (G1_S7001_RE.test(s) && G1_DUTY_VERB_RE.test(s) && !G1_OPERATIVE_ANCHOR_RE.test(s)) {
      const trimmed = s.replace(/[.!?]+\s*$/, "");
      const punct = s.slice(trimmed.length) || ".";
      kept.push(`${trimmed}${G1_APPEND}${punct}`);
      c.g1_h6_rewrites++;
      mutated = true;
      continue;
    }
    kept.push(s);
  }
  const out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  if (mutated) c.fields_mutated++;
  return out;
}

function walk(node: unknown, c: W9PreEmitCounters, key?: string): unknown {
  if (node == null) return node;
  if (key && RESERVED_KEYS.has(key)) return node;
  if (typeof node === "string") {
    c.fields_scanned++;
    return applyGates(node, c);
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = walk(node[i], c);
    return node;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      (node as Record<string, unknown>)[k] = walk(v, c, k);
    }
    return node;
  }
  return node;
}

export function applyW9AdmtPreEmitGates(report: unknown): W9PreEmitCounters {
  const c: W9PreEmitCounters = {
    stamp: W9_ADMT_PRE_EMIT_STAMP,
    fields_scanned: 0,
    sentences_scanned: 0,
    g1_h6_rewrites: 0,
    g2_e6_strips: 0,
    g3_reasoning_leak_strips: 0,
    g4_invented_section_rewrites: 0,
    fields_mutated: 0,
  };
  if (report && typeof report === "object") walk(report, c);
  return c;
}

// Exposed for unit tests.
export const _internals = {
  applyGates,
  splitSentences,
  G1_DUTY_VERB_RE,
  G1_S7001_RE,
  G1_OPERATIVE_ANCHOR_RE,
  G2_COUNSEL_REF_RE,
  G2_OWNERSHIP_DISCLAIMER_RE,
  G3_LEAK_RES,
  G4_INVENTED_SECTION_RE,
};
