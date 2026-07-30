# ITEM 274 — VIEWER/PDF SHAPE-CONTRACT DIVERGENCE (2026-07-30)

Dispatch: CEO-reported blank "View report" at `/admin/replay-review` while the
SAME documents render fully through the PDF path. Controller framing: because
`CPPARiskReportBody` is the shipped viewer on live customer result pages, this
is a **TRACK-2 CUTOVER BLOCKER**, not an admin cosmetic. Team-unanimous wiring
fix. Frontend + tests only. No edge-function change was necessary; no harness
invocation; legacy wire/snapshot/prompts untouched.

## 1. Evidence (cited before fixing)

1. **How AdminReplayReview passed the report into the viewer.**
   `src/pages/admin/AdminReplayReview.tsx:264-267` (pre-fix):
   ```tsx
   <CPPARiskReportBody
     report={showLegacy ? legacy?.report_data ?? {} : open.assembled_report ?? {}}
     createdAt={open.created_at}
   />
   ```
   The prop name and wrapper shape were already correct — the **bare** report
   body object, not a `{report_data: …}` record. The admin page was therefore
   NOT the defect site.

2. **How the viewer dispatches.**
   `src/components/report-bodies/CPPARiskReportBody.tsx:1-6, 32-33, 52-53`
   (pre-fix) branched on exactly two discriminators:
   ```ts
   const isV3 = !!(report?.schema_version === "v3-part-a-part-b" && report?.part_a);
   const isV4 = !isV3 && isV4Report(report);
   ```
   with `isV4Report` at `src/components/cppa/RiskAssessmentReportV4.tsx:207-211`:
   ```ts
   if (typeof rd.schema_version === "string" && rd.schema_version.startsWith("v4")) return true;
   return !!(rd.assessment_summary || rd.risk_assessment_by_activity);
   ```

3. **How the PDF path detects the Track-2 shape.**
   `supabase/functions/generate-report-pdf/index.ts:1163-1171`:
   ```ts
   function isLtpRiskShape(report: any): boolean { … hasStringExec || hasNarrativeBag || hasStringOpening }
   ```
   dispatched FIRST at `index.ts:1150-1152` to `buildCPPARiskLtpHTML`
   (`index.ts:1177-1263`), which renders each section as flat narrative
   (string / string[]) via `coerceNarrativeScalar` / `coerceNarrativeList`.

4. **The live shape.** Read-only SELECT against `replay_harness_results`
   (result id `eb12abee-ed5b-4d16-a6d0-001039bfacf6`, doc
   `202cca35-3faa-4a19-9b79-d617d36dadc4`) shows:
   `schema_version = "cppa_risk_v4"`, `part_a = {}`, `executive_summary` a
   429-char STRING, `assessment_summary` a `{narrative}` bag,
   `risk_assessment_by_activity` / `priority_actions` / `next_steps` /
   `record_sufficiency` / `information_needed` / `scope_and_triggers` ARRAYS OF
   STRINGS, `submission_summary` a 1,762-char STRING, and `risk_level` an array.

## 2. Divergence — root cause

The LTP assembler stamps `schema_version = "cppa_risk_v4"` and emits sections
as **strings / string arrays**. The viewer had **no LTP discriminator at all**:
`isV4Report` matched on the stamp (and on `assessment_summary`), so LTP reports
were handed to `RiskAssessmentReportV4`, whose renderers read object fields
(`a.activity`, `a.rank`, `x.exception_name`, …) off string items and therefore
emitted headings with no content — the blank structure the CEO saw. The PDF
path never hit this because it tests `isLtpRiskShape` FIRST.

**Post-cutover blast radius (confirmed):** identical on live customer result
pages — every Track-2 report would render blank on-screen while its PDF was
complete. Legacy V3 (`part_a` populated) and true legacy-V4 (object sections)
rows are unaffected: `isLtpRiskShape` returns false for both, so their dispatch
is byte-unchanged.

## 3. Fix

(a) **Single shared discriminator.** `src/lib/cppa-risk-shape.ts` (new) mirrors
the edge contract: `isLtpRiskShape`, `coerceNarrativeScalar`,
`coerceNarrativeList`, `CPPA_RISK_HEADER_MAP` / `headerForSection`, and
`LTP_SECTION_ORDER`. Deno edge code cannot import from `src/`, so this module
is the sanctioned mirror and the parity test pins its verdicts.

(b) **Viewer branch.** `CPPARiskReportBody` now dispatches LTP FIRST
(`isLtp` → `RiskAssessmentReportLTP`), with V3/V4 retained and gated behind
`!isLtp`. `src/components/cppa/RiskAssessmentReportLTP.tsx` (new) is the
on-screen analog of `buildCPPARiskLtpHTML`: same section set, same order, same
customer-first headers, same coercion, `data-section="<key>"` on every section.

(c) **Page boundary only.** `toViewerReport()` in `AdminReplayReview.tsx`
unwraps a `{report_data: …}` record if one is handed in and otherwise passes
the bare body through. The component was not forked.

## 4. Parity test (permanent)

`src/test/cppaRiskViewerPdfParity.test.tsx`, fixture
`src/test/fixtures/cppa-risk-assembled-report.json` — the verbatim
`assembled_report` of result `eb12abee-ed5b-4d16-a6d0-001039bfacf6`. Five
assertions: the fixture is LTP-shaped under the shared discriminator AND still
carries the mis-dispatching `cppa_risk_v4` stamp; every golden-shape quota
section (`executive_summary`, `assessment_summary`, `scope_and_triggers`,
`risk_assessment_by_activity`, `priority_actions`, `next_steps`,
`record_sufficiency`, `information_needed`, `submission_summary`) renders with
>40 chars of body text beyond its header; total rendered text >5,000 chars; the
boundary adapter honors the bare-body contract; legacy V3 rows do not match the
LTP branch.

Verbatim: `✓ src/test/cppaRiskViewerPdfParity.test.tsx (5 tests) 124ms` —
`Test Files 1 passed (1) / Tests 5 passed (5)`.

## 5. Record for the R6 law

The CEO's own read of the admin review surface caught a **cutover-blocking**
defect that every automated gate missed: the golden-shape quota check, the
substance gates, and the GTM register all measure the ASSEMBLED PAYLOAD, and
the PDF exporter rendered it correctly — nothing in the harness measures the
ON-SCREEN surface. Recorded: a payload-side presence check is not evidence of a
customer-visible render, and each shipped surface needs its own presence gate.
