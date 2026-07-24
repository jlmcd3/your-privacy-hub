// WAVE12-FIX TURN E — cppa-cyber E1 defensive crosswalk guard.
//
// Post-assembly guard for framework-crosswalk prose. Fail-open (never
// throws, never blocks emission). Telemetry lands under
// `_meta.internal.crosswalk` — NOT a customer-visible surface — per
// dispatch's "TURN C precedent" (customer-facing report never exposes
// `_w<digits>_*` telemetry).
//
// Guard rules (per dispatch E1b):
//   (i)   drop any sentence ending in ";" or ":" followed by nothing;
//   (ii)  drop any sentence with an unbalanced parenthesis count;
//   (iii) drop any sentence that is an exact duplicate (whitespace-normalized,
//         case-insensitive) of an earlier sentence in the same string surface.
//
// Applied atomically to every user-facing string surface on the report:
//   - executive_summary
//   - top_risks[] (string or {text} shape)
//   - next_steps[] (string or {text} shape)
//   - enforcement_context
//   - controls[]: finding, remediation, evidence, differentiator, regulatory_basis
//
// Sentence splitting matches _w6_cyber_fix.ts (post-TURN-E fix): true
// sentence terminators (. ! ?). Semicolons are NOT sentence boundaries —
// clauses within a single sentence stay together.

export const W12_CYBER_E1_STAMP = "w12-cyber-e1@2026-07-24T17:35:00Z";

export interface W12CyberE1Counters {
  surfaces_scanned: number;
  sentences_scanned: number;
  crosswalk_fragments_dropped: number;
  unbalanced_parens_dropped: number;
  crosswalk_dupes_removed: number;
}

function newCounters(): W12CyberE1Counters {
  return {
    surfaces_scanned: 0,
    sentences_scanned: 0,
    crosswalk_fragments_dropped: 0,
    unbalanced_parens_dropped: 0,
    crosswalk_dupes_removed: 0,
  };
}

// Sentence-level truncation detector: ends in ";" or ":" with nothing after
// (allowing trailing whitespace only). Also catches orphan-preposition stubs
// like "…provides comparative guidance on;" — the exact wave-12 fragment.
const TRUNCATED_TERMINATOR_RE = /[;:]\s*$/;
const ORPHAN_PREP_RE = /\b(on|of|for|to|in|at|with|by|from|as)\s*[;:.]\s*$/i;

// Mid-string orphan-preposition-then-terminator stub. Matches the wave-12
// fragment "…provides comparative guidance on;" appearing INSIDE a longer
// sentence (before a subsequent capitalised clause or end). Removed
// atomically as a pre-pass BEFORE sentence splitting so downstream logic
// sees clean prose. Bounded to 260 chars back to avoid runaway matches.
const MID_STRING_STUB_RE =
  /[A-Z][^.!?]{0,260}?\b(?:on|of|for|to|in|at|with|by|from|as)\s*[;:]\s+(?=[A-Z0-9]|$)/g;

function isUnbalancedParens(sent: string): boolean {
  // Character-level scan: () only. Brackets/braces intentionally ignored —
  // markdown-like syntax can carry them legitimately.
  let depth = 0;
  for (const ch of sent) {
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth < 0) return true; // stray ")" before any "("
    }
  }
  return depth !== 0;
}

function normaliseForDedupe(sent: string): string {
  return sent
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[""'']/g, "\"")
    .trim();
}

// Public sentence-level sanitizer. Fail-open: on any exception the input is
// returned unchanged and counters are left untouched (caller wraps in try).
export function sanitizeCrosswalkText(
  input: string,
  counters: W12CyberE1Counters,
): string {
  if (typeof input !== "string" || input.length === 0) return input;
  counters.surfaces_scanned += 1;

  // Pre-pass: strip mid-string orphan-preposition stubs (the wave-12
  // "provides comparative guidance on;" class). Each removal counts as one
  // fragment drop. Runs before sentence splitting so surviving prose flows
  // cleanly.
  let working = input;
  const stubMatches = working.match(MID_STRING_STUB_RE);
  if (stubMatches && stubMatches.length > 0) {
    counters.crosswalk_fragments_dropped += stubMatches.length;
    working = working.replace(MID_STRING_STUB_RE, "");
  }

  // Split on real sentence terminators; keep the terminator with the
  // preceding sentence via lookbehind (matches _w6_cyber_fix.ts).
  const sentences = working.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of sentences) {
    if (!raw || raw.trim().length === 0) continue;
    counters.sentences_scanned += 1;
    const sent = raw.trim();

    // (i) truncated terminator / orphan preposition
    if (TRUNCATED_TERMINATOR_RE.test(sent) || ORPHAN_PREP_RE.test(sent)) {
      counters.crosswalk_fragments_dropped += 1;
      continue;
    }
    // (ii) unbalanced parens
    if (isUnbalancedParens(sent)) {
      counters.unbalanced_parens_dropped += 1;
      continue;
    }
    // (iii) exact-match dedupe (whitespace/case normalised)
    const key = normaliseForDedupe(sent);
    if (seen.has(key)) {
      counters.crosswalk_dupes_removed += 1;
      continue;
    }
    seen.add(key);
    kept.push(sent);
  }
  return kept.join(" ");
}

// Walk a report and sanitize known user-facing string surfaces in place.
// Returns counters; never throws (per-field try/catch below keeps it fail-open).
export function applyW12CyberE1(report: unknown): { counters: W12CyberE1Counters } {
  const counters = newCounters();
  if (!report || typeof report !== "object") return { counters };
  const r = report as Record<string, unknown>;

  const setIfString = (obj: Record<string, unknown>, key: string) => {
    try {
      const v = obj[key];
      if (typeof v === "string") {
        const out = sanitizeCrosswalkText(v, counters);
        if (out !== v) obj[key] = out;
      }
    } catch { /* fail-open */ }
  };

  // Top-level string surfaces.
  for (const k of ["executive_summary", "enforcement_context", "assessment_summary"]) {
    setIfString(r, k);
  }

  // Arrays of strings or {text} objects.
  for (const listKey of ["top_risks", "next_steps"]) {
    const list = r[listKey];
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (typeof item === "string") {
        try {
          list[i] = sanitizeCrosswalkText(item, counters);
        } catch { /* fail-open */ }
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        for (const k of ["text", "action", "risk", "detail"]) setIfString(o, k);
      }
    }
  }

  // Per-control surfaces.
  const controls = r.controls;
  if (Array.isArray(controls)) {
    for (const c of controls) {
      if (!c || typeof c !== "object") continue;
      const co = c as Record<string, unknown>;
      for (const k of [
        "finding", "remediation", "evidence", "differentiator",
        "regulatory_basis", "fsor_commentary", "framework_crosswalk",
      ]) {
        setIfString(co, k);
      }
    }
  }

  return { counters };
}
