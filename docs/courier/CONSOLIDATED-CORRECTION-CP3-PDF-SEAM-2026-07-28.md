# CONSOLIDATED-CORRECTION-CP3 — PDF SEAM (Item 240 CP3)
Date: 2026-07-28

## Objective
Close the customer-facing seam so the assembler-shape report_data renders
non-blank in the PDF exporters, fix executive_summary array-vs-string on
every path, and eliminate the exec-summary activity-count contradiction.

## Changes
- **`supabase/functions/_shared/report-contracts/cppa-risk-shape.ts`**
  Authoritative shared shape module: `NARRATIVE_SCALAR_KEYS`,
  `coerceNarrativeScalar`, `coerceAssessmentSummary`, `coerceNarrativeList`,
  `assertExecSummaryCoherent`, `CPPA_RISK_SHAPE_VERSION`. Imported by
  assembler and both exporters — no side-drift possible.

- **`supabase/functions/_shared/ltp/pass2-assembler.ts`**
  Post-composer projection now coerces every narrative-scalar shard
  (`executive_summary`, `opening_summary`, `submission_summary`, and any
  other keys in `NARRATIVE_SCALAR_KEYS`) to a plain string, and shrinks
  `assessment_summary` to the `{ narrative }` bag. Version:
  `ltp-pass2-assembler-2026-07-28-item240-cp3-shape`.

- **`supabase/functions/_shared/ltp/section-composers/cppa-risk.ts`**
  `composeExecutive` COHERENCE INVARIANT: zero-activity or empty
  engaged-applicability cases route to the "insufficient" variant so the
  sibling sentence slots stay consistent. Fixes the run-#174
  "no activities identified… For the activities identified…" defect.

- **`supabase/functions/generate-report-pdf/index.ts`**
  New `buildCPPARiskLtpHTML` renders the assembler shape directly:
  opening paragraph, string exec summary, `assessment_summary.narrative`,
  activity paragraphs, scope, priority/next-steps lists, submission
  summary. `buildCPPARiskReportHTML` dispatches to it whenever
  `isLtpRiskShape` matches. BUILD_STAMP → `generate-report-pdf-item240-cp3`.

- **`supabase/functions/generate-cppa-suite-pdf/index.ts`**
  `renderRisk` now consumes LTP shape via `coerceNarrative`; handles
  string exec, opening summary, string-array scope/next-steps, and
  string-form domain/top-risk items.

- **`supabase/functions/run-cppa-risk-assessment/index.ts`**
  BUILD_STAMP → `ltp-risk-item240-cp3`.

## Joint Test
`_shared/report-contracts/cppa-risk-shape.test.ts` — 7 assertions cover:
scalar/array/bag coercion, empty-input drops, exec-summary coherence
detection, assembler normal path emits string exec, Type-J path emits
string exec, shape-version constant.

Result: **15 passed / 0 failed** (joint + pass2-assembler + single-writer).

## Deploy
Deployed: generate-report-pdf, generate-cppa-suite-pdf,
run-cppa-risk-assessment.

Ping verbatim (excerpt):
```
"build_stamp":  "ltp-risk-item240-cp3@2026-07-28T12:09:03.880Z"
"pass2_assembler": "ltp-pass2-assembler-2026-07-28-item240-cp3-shape"
"pass1_stamp":  "ltp-pass1-llm-item240-cp2-single-writer@2026-07-28"
```
