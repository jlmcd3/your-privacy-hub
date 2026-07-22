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

// A2 (COUNSEL-VOICE-1 retarget) — advisory-formula leak filter.
// rubric_internal_reasoning_leak must NEVER fire when the quoted evidence
// contains one of the two canonical advisory closes ("further clarification
// is advisable." / "further internal investigation is advisable."). These
// are designed drafting-voice product output surfaced to the reader by the
// generator itself, not model self-narration.
//
// GRADER-CAL-2 Task 5 — LEGACY_NOTE_BLOCK_RE removed from the drop path.
// Current generator prompts prohibit "NOTE FOR LEGAL REVIEW" outright
// (COUNSEL-VOICE-1 recast; see generate-dpa ANNOTATIONS_INSTRUCTIONS
// "NEVER emit"), so post-filter-dropping leak findings that quote that
// heading masks a real defect on new runs. The LLM rubric line for
// rubric_internal_reasoning_leak can still surface such evidence.
const ADVISORY_FORMULA_RE = /further (?:clarification|internal investigation) is advisable\./i;

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

// QB-P2 R-15C-2 — bracketed placeholder fill-in markers ("[TO BE COMPLETED …]",
// "[TO BE ASSESSED …]", "[TO COMPLETE …]") are anti-fabrication scaffolding per
// SHARED_GRADER_CONTEXT / GRADER-CAL-1 A4. Prompt-level rubric enforcement has
// proven insufficient (run 75 dpa-generator: rubric_actionability fired on
// placeholders despite the rule being in the rubric prompt since 2026-07-15).
// Drop any LLM rubric finding whose evidence quotes one of these markers.
const R15C2_PLACEHOLDER_RE = /\[TO\s+(?:BE\s+COMPLETED|BE\s+ASSESSED|COMPLETE)\b/i;

// R-15C-2 companion — DPA professional-defaults markers ("(default — confirm)",
// "(default -- confirm)", "(default - confirm)") are MANDATED DPA drafting
// output per POST-DPA-FIX-1 T4(a) exception enumeration (TLS 1.2+, AES-256,
// annual BC/DR test, quarterly vuln scans, 30-day sub-processor objection
// window, 30-day Art. 35 assistance, quarterly access reviews, 24-hour
// deprovisioning). Drop any LLM rubric finding whose evidence quotes one.
const DPA_DEFAULTS_MARKER_RE = /\(\s*default\s*[—\-–]{1,2}\s*confirm\s*\)/i;

// A4 — Emit-guard. Suppress "findings" the model returns that in fact affirm
// the document was correct ("This citation is correct", "the report properly
// cites", "no issue found"). These are noise, not defects.
// GRADER-CAL-2 Task 4 — added self-exonerating patterns observed in the
// d1159f96 rubric_internal_reasoning_leak evidence ("...remains within the
// 'the record' whitelist. No clear leak beyond whitelisted formul[ae]").
const AFFIRMATION_RES = [
  /\bis\s+correct(ly)?\b/i,
  /\bare\s+correct(ly)?\b/i,
  /\bno\s+(issue|defect|problem)\s+(found|identified)\b/i,
  /\bproperly\s+(cites?|applies)\b/i,
  /\bcorrectly\s+(cites?|applies|frames?)\b/i,
  /\bthis\s+is\s+not\s+a\s+(defect|leak|misapplication)\b/i,
  // GRADER-CAL-2 Task 4 additions.
  /\bno\s+clear\s+(leak|violation|defect)\b/i,
  /\bremains?\s+within\s+the\b[^.]{0,60}\bwhitelist/i,
  /\bno\s+leak\s+(found|identified)\b/i,
  // QB-P5 Item 3 — rubric_actionability inversion. run 88 cppa-cyber:
  // Claude returned passed=false with evidence "Recommendations such as
  // ... are actionable." (an affirmation of the check being satisfied).
  // Broaden the affirmation guard to cover the actionability rubric line
  // in both directions ("are actionable", "is actionable", "recommendations
  // ... are actionable", "provides actionable guidance", "meets the
  // actionability threshold").
  /\b(?:is|are|were|remain(?:s)?)\s+actionable\b/i,
  /\bprovides?\s+(?:clear\s+)?actionable\b/i,
  /\bmeets?\s+the\s+actionability\b/i,
  /\brecommendations?\b[^.]{0,120}\bare\s+actionable\b/i,
];


function evidenceOf(f: LlmFinding): string {
  const e = (f.evidence ?? "") as string;
  return typeof e === "string" ? e : String(e ?? "");
}

/**
 * GRADER-CAL-1 A2/A3/A4 filter. Drops findings that are noise per the calibration
 * rules and returns the retained list + a per-rule count for telemetry.
 *
 * QB-P14 item 4 — also returns `suppressed`: the first 300 chars of each
 * dropped finding's evidence, keyed by the rule (a2/a3/a4/r15c2) and check_id,
 * so suppressions are auditable in the batch progress log / campaign digest.
 */
export type SuppressedFinding = {
  rule: "a2" | "a3" | "a4" | "r15c2";
  check_id: string;
  evidence: string; // first 300 chars
};

export function applyGraderCal1Filter(
  findings: LlmFinding[],
): {
  kept: LlmFinding[];
  dropped: { a2: number; a3: number; a4: number; r15c2: number };
  suppressed: SuppressedFinding[];
} {
  const dropped = { a2: 0, a3: 0, a4: 0, r15c2: 0 };
  const suppressed: SuppressedFinding[] = [];
  const kept: LlmFinding[] = [];
  const record = (rule: SuppressedFinding["rule"], f: LlmFinding) => {
    suppressed.push({
      rule,
      check_id: typeof f.check_id === "string" ? f.check_id : String(f.check_id ?? "unknown"),
      evidence: evidenceOf(f).slice(0, 300),
    });
  };
  for (const f of findings ?? []) {
    if (!f || typeof f !== "object") continue;
    // A4 — affirmations are never findings, regardless of `passed`.
    if (f.passed !== true) {
      const ev = evidenceOf(f);
      if (ev && AFFIRMATION_RES.some((r) => r.test(ev))) {
        dropped.a4++; record("a4", f);
        continue;
      }
      if (
        f.check_id === "rubric_internal_reasoning_leak" &&
        ADVISORY_FORMULA_RE.test(ev)
      ) {
        dropped.a2++; record("a2", f);
        continue;
      }
      const dim = (f.dimension ?? "").toString().toLowerCase();
      if ((dim === "citation" || dim === "hallucination") &&
          A3_WHITELIST_TOKENS.some((r) => r.test(ev))) {
        dropped.a3++; record("a3", f);
        continue;
      }
      if (typeof f.check_id === "string" && f.check_id.startsWith("rubric_") &&
          R15C2_PLACEHOLDER_RE.test(ev)) {
        console.log(`[grader-postfilter] R-15C-2 drop: ${f.check_id} evidence matched placeholder marker`);
        dropped.r15c2++; record("r15c2", f);
        continue;
      }
    }
    kept.push(f);
  }
  return { kept, dropped, suppressed };
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
