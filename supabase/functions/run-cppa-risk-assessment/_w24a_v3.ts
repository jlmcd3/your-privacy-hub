// ─────────────────────────────────────────────────────────────────────────
// W24A-V3 (cppa-risk) — deploy turn on run-cppa-risk-assessment.
// Controller dispatch W24A-V3-TURN-2026-07-26 (five-lens TEAM-REVIEWED).
// Discharges pipeline-state item 96 queued fix for wave-27 CRITICAL
// qc_r1_4_cohort_determinism recurrence (doc 7f0de458, run 140).
//
// Upgrades v2 (risk-w24-turna-v2-2026-07-25) with:
//   (a) WALKER COVERAGE — v2 walker already reaches every non-anchor
//       string, including scope_and_triggers.scope_notes and
//       cross_tool_recommendations.*. v3 makes coverage explicit by
//       (i) fixing strings_scanned to reflect ALL strings walked, not
//       just B1-ext, and (ii) pinning walker-coverage regression tests
//       against the two subtrees flagged in item 96.
//   (b) HEDGE DETECTION — extend the resolved-cohort anchor to fire on
//       any resolved cohort date variant (April 1, 2029 / April 1, 2030
//       / 2029-04-01 / 2030-04-01) and add sentence-level excision for
//       the conditional-parenthetical variant
//       "(applicable if 2027 … — confirm cohort when 2027 revenue is
//       final)" and the "cannot be determined until 2027 … if …; if …"
//       comparator shape, both adjacent to a resolved cohort date or
//       § 7121 cite window.
//   (c) REGRESSION FIXTURES — doc 7f0de458 scope_notes + cross_tool_
//       recommendations.cybersecurity_audit_rationale strings pinned
//       verbatim in _w24a_v3.test.ts.
//   (d) DOCTRINE — same seam (runs AFTER v2 turnA and BEFORE the
//       LEAK-PREV P1 emit gate), fail-open at every helper and the
//       orchestrator, whole-sentence excision only (no partial-clause
//       splicing), omission over invention, idempotent. Telemetry
//       lands under `_meta.internal.risk_w24a` with version bumped to
//       `risk-w24-turna-v3-2026-07-26`; the LEAK-PREV-P2 serializer
//       preserves `_meta.internal` verbatim (item-32 gate).
//
// Out of scope this turn: truncated-citation "Cal. Civ. 105(d)" class
// (queued Class-A citation-audit sibling); T7 opening surfaces
// (`risk_t7_opening` module untouched — T7-PILOT-FIX-2 is separate).
// ─────────────────────────────────────────────────────────────────────────

export const W24A_V3_STAMP = "w24a-v3@2026-07-26T01:00:00Z";
export const W24A_V3_VERSION = "risk-w24-turna-v3-2026-07-26";

// Anchor keys never rewritten. Mirrors v2 ANCHOR_KEYS.
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
  "deadline", "deadline_basis",
]);

// Resolved cohort date variants (both cohorts referenced in § 7121(a)
// tiering — April 1, 2029 and April 1, 2030). v2 only recognised
// April 1, 2030; the wave-27 defect walked past the parenthetical
// variant because the anchor pattern was too narrow.
const COHORT_DATE_ALT = String.raw`(?:April\s+1,?\s+20(?:29|30)|Apr\.?\s+1,?\s+20(?:29|30)|1\s+April\s+20(?:29|30)|20(?:29|30)-04-01)`;
const COHORT_DATE_RE = new RegExp(`\\b(${COHORT_DATE_ALT})\\b`, "gi");

// Cite window: § 7121(a) (any subdivision) is the cohort cite.
const COHORT_CITE_HINT = /§\s*7121\s*\(a\)|7121\(a\)/i;

// Sentence-level hedge triggers. Detected within a single sentence
// that ALSO mentions a resolved cohort date or § 7121 cite. Whole
// sentence is excised (no partial-clause splicing).
//
// Covers item-96 patterns:
//   • "(applicable if 2027 … — confirm cohort when 2027 revenue is final)"
//   • "Whether the revenue band resolves … cannot be determined until
//      2027 … if … April 1, 2029; if under $50M, … April 1, 2030."
//   • "should be confirmed when 2027 revenue is final"
const COHORT_HEDGE_TRIGGERS_RE =
  /confirm(?:ed)?\s+cohort\s+when|cannot\s+be\s+determined\s+until|applicable\s+if\s+2027|if\s+2027\s+(?:annual\s+gross\s+)?revenue|should\s+be\s+confirmed\s+when|when\s+2027\s+revenue\s+is\s+final|the\s+cohort\s+determination\s+should\s+be\s+confirmed/i;

// Sentence splitter. Splits on end-of-sentence punctuation followed by
// whitespace. Preserves the terminal punctuation on each sentence.
function splitSentences(s: string): string[] {
  const parts: string[] = [];
  const re = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    parts.push(m[0]);
  }
  return parts.length > 0 ? parts : [s];
}

function normalizeSpacing(s: string): string {
  return s.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

// ── Counters ────────────────────────────────────────────────────────────
export interface W24aV3Counters {
  version: string;
  strings_scanned: number;
  cohort_resolved: number;
  cohort_resolved_near_cite: number;
  cohort_deadline_confirmed: number;
  cohort_hedge_sentence_excised: number;
  errors: number;
}

const emptyCounters = (): W24aV3Counters => ({
  version: W24A_V3_VERSION,
  strings_scanned: 0,
  cohort_resolved: 0,
  cohort_resolved_near_cite: 0,
  cohort_deadline_confirmed: 0,
  cohort_hedge_sentence_excised: 0,
  errors: 0,
});

// ── Per-string cohort scrub ─────────────────────────────────────────────
// Contextual mention of a cohort reference — matches the § 7121 cite,
// a resolved cohort date variant, or the standalone word "cohort".
// Broadened past v2's date-only anchor so sentences like
// "the cohort determination should be confirmed when 2027 revenue is
// final" (no date, no cite in-sentence) still qualify for excision.
const COHORT_REF_RE = /\bcohort\b/i;

function scrubString(s: string, c: W24aV3Counters): string {
  try {
    if (typeof s !== "string" || !s) return s;
    c.strings_scanned += 1;
    // Cheap gate — cohort logic only bites strings that at minimum
    // mention "cohort", a § 7121 cite, or a resolved cohort year.
    if (!COHORT_REF_RE.test(s) && !COHORT_CITE_HINT.test(s) && !/20(?:29|30)/.test(s)) {
      return s;
    }

    // Anchor detection (resolved cohort date present).
    const hasResolvedDate = COHORT_DATE_RE.test(s);
    COHORT_DATE_RE.lastIndex = 0;
    const hasCite = COHORT_CITE_HINT.test(s);
    if (hasResolvedDate) {
      c.cohort_resolved += 1;
      if (hasCite) c.cohort_resolved_near_cite += 1;
    }

    // Whole-sentence excision for hedge triggers adjacent to a cohort
    // reference (resolved date, § 7121 cite, or the word "cohort").
    if (!COHORT_HEDGE_TRIGGERS_RE.test(s)) return s;
    COHORT_HEDGE_TRIGGERS_RE.lastIndex = 0;

    const sentences = splitSentences(s);
    const kept: string[] = [];
    let excised = 0;
    for (const raw of sentences) {
      const sent = raw;
      const hasHedge = COHORT_HEDGE_TRIGGERS_RE.test(sent);
      COHORT_HEDGE_TRIGGERS_RE.lastIndex = 0;
      const hasCohortRef =
        COHORT_DATE_RE.test(sent) ||
        COHORT_CITE_HINT.test(sent) ||
        COHORT_REF_RE.test(sent);
      COHORT_DATE_RE.lastIndex = 0;
      if (hasHedge && hasCohortRef) {
        excised += 1;
        continue;
      }
      kept.push(sent);
    }
    if (excised === 0) return s;
    c.cohort_hedge_sentence_excised += excised;
    return normalizeSpacing(kept.join(" "));
  } catch {
    c.errors += 1;
    return s;
  }
}

// ── Walker ─────────────────────────────────────────────────────────────
function walk(node: unknown, c: W24aV3Counters, keyCtx?: string): unknown {
  try {
    if (node == null) return node;
    if (typeof node === "string") {
      if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
      return scrubString(node, c);
    }
    if (Array.isArray(node)) {
      return node.map((v) => walk(v, c, keyCtx));
    }
    if (typeof node === "object") {
      const src = node as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        // Reserved subtrees preserved verbatim (telemetry, internal).
        if (k.startsWith("_")) { out[k] = v; continue; }
        out[k] = walk(v, c, k);
      }
      return out;
    }
    return node;
  } catch {
    c.errors += 1;
    return node;
  }
}

// ── Defensive deadline-anchor audit ────────────────────────────────────
// Preserved from v2: confirms § 7121(a) cohort entries carry the
// deterministic deadline literal. Anchor field NEVER mutated.
function auditCohortDeadline(
  report: Record<string, unknown>,
  c: W24aV3Counters,
): void {
  try {
    const arr = (report as any).cross_tool_recommendations;
    const entries: unknown[] = Array.isArray(arr)
      ? arr
      : arr && typeof arr === "object"
        ? Object.values(arr)
        : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const cite = String(e.citation ?? "");
      if (!COHORT_CITE_HINT.test(cite)) continue;
      const dl = String(e.deadline ?? "");
      if (dl === "2030-04-01" || dl === "2029-04-01") {
        c.cohort_deadline_confirmed += 1;
      }
    }
  } catch {
    c.errors += 1;
  }
}

/**
 * Apply W24A-V3 to a risk report. Fail-open: on any error the input
 * report is returned unchanged with counters marking the error.
 */
export function applyW24aV3(
  report: Record<string, unknown>,
): { counters: W24aV3Counters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };
  try {
    const walked = walk(report, counters) as Record<string, unknown>;
    auditCohortDeadline(walked, counters);
    return { counters, report: walked };
  } catch {
    counters.errors += 1;
    return { counters, report };
  }
}
