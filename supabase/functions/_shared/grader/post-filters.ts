// GRADER-CAL-1 — shared post-filter helpers applied to LLM findings after
// they return from Claude / GPT and before they land in quality_check_results.
// Kept in a shared module so run-quality-batch and grade-single-assessment
// stay behaviorally identical (mirrored path invariant).

export type LlmFinding = {
  check_id: string;
  dimension?: string;
  severity?: string;
  passed?: boolean;
  evidence?: string | null;
  [k: string]: unknown;
};

// A2 — NOTE-block leak filter. rubric_internal_reasoning_leak must NEVER fire
// when the quoted evidence sits inside a "NOTE FOR LEGAL REVIEW" annotation.
// These are designed counsel-voice product output (IR-HF1 T5), not model
// self-narration. Kept case-insensitive; matches the leader with or without
// the "— <topic>" suffix.
const NOTE_BLOCK_RE = /note\s+for\s+legal\s+review/i;

// A3 — verified-authority whitelist. Additive to SHARED_GRADER_CONTEXT prose:
// if an evidence quote references any of the tokens below, drop the finding
// when its category is citation / hallucination — the corpus verifies them.
const A3_WHITELIST_TOKENS = [
  // NY S2659B (Chapter 647, signed 2024-12-21) — Notice of unauthorized
  // acquisition amendment; N.Y. Gen. Bus. Law § 899-aa.
  /\bs\.?\s*2659\s*-?\s*b\b/i,
  /\bchapter\s*647\b/i,
  /\bs2659b\b/i,
  // NY A8872A (signed Dec 2024) — companion.
  /\ba\.?\s*8872\s*-?\s*a\b/i,
  /\ba8872a\b/i,
];

// A4 — Emit-guard. Suppress "findings" the model returns that in fact affirm
// the document was correct ("This citation is correct", "the report properly
// cites", "no issue found"). These are noise, not defects.
const AFFIRMATION_RES = [
  /\bis\s+correct(ly)?\b/i,
  /\bare\s+correct(ly)?\b/i,
  /\bno\s+(issue|defect|problem)\s+(found|identified)\b/i,
  /\bproperly\s+(cites?|applies)\b/i,
  /\bcorrectly\s+(cites?|applies|frames?)\b/i,
  /\bthis\s+is\s+not\s+a\s+(defect|leak|misapplication)\b/i,
];

function evidenceOf(f: LlmFinding): string {
  const e = (f.evidence ?? "") as string;
  return typeof e === "string" ? e : String(e ?? "");
}

/**
 * GRADER-CAL-1 A2/A3/A4 filter. Drops findings that are noise per the calibration
 * rules and returns the retained list + a per-rule count for telemetry.
 */
export function applyGraderCal1Filter(
  findings: LlmFinding[],
): { kept: LlmFinding[]; dropped: { a2: number; a3: number; a4: number } } {
  const dropped = { a2: 0, a3: 0, a4: 0 };
  const kept: LlmFinding[] = [];
  for (const f of findings ?? []) {
    if (!f || typeof f !== "object") continue;
    // A4 — affirmations are never findings, regardless of `passed`.
    if (f.passed !== true) {
      const ev = evidenceOf(f);
      if (ev && AFFIRMATION_RES.some((r) => r.test(ev))) {
        dropped.a4++;
        continue;
      }
      // A2 — NOTE FOR LEGAL REVIEW blocks are not leaks.
      if (f.check_id === "rubric_internal_reasoning_leak" && NOTE_BLOCK_RE.test(ev)) {
        dropped.a2++;
        continue;
      }
      // A3 — verified-authority whitelist for citation / hallucination bands.
      const dim = (f.dimension ?? "").toString().toLowerCase();
      if ((dim === "citation" || dim === "hallucination") &&
          A3_WHITELIST_TOKENS.some((r) => r.test(ev))) {
        dropped.a3++;
        continue;
      }
    }
    kept.push(f);
  }
  return { kept, dropped };
}

/**
 * A5 — comparability helper. Recomputes overall_score under the pre-CAL-1
 * weight vector so batches that ran under gc-2026-07-17-ff3 and earlier can
 * still be compared directly to gc-2026-07-19-grader-cal-1 outputs on the
 * "same instrument" axis. The result is advisory — the canonical overall
 * stays under the new (formatting=0) weight vector.
 *
 * Pre-CAL-1 non-editorial weights:
 *   accuracy 0.30, citation 0.25, hallucination 0.20, analysis 0.15,
 *   intelligence 0.05, formatting 0.05.
 */
export function recomputeOverallPreCal1(scores: {
  accuracy?: number; citation?: number; hallucination?: number;
  analysis?: number; intelligence?: number; formatting?: number;
}): number {
  const w = { accuracy: 0.30, citation: 0.25, hallucination: 0.20, analysis: 0.15, intelligence: 0.05, formatting: 0.05 };
  return Math.round(
    (scores.accuracy ?? 60) * w.accuracy +
    (scores.citation ?? 60) * w.citation +
    (scores.hallucination ?? 60) * w.hallucination +
    (scores.analysis ?? 60) * w.analysis +
    (scores.intelligence ?? 60) * w.intelligence +
    (scores.formatting ?? 60) * w.formatting
  );
}
