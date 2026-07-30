# ITEM 271 — ACCEPTANCE-40 CAMPAIGN RECORD + CEO REVIEW SURFACE

**Date:** 2026-07-30
**Turn class:** ledger + courier + ONE new admin-only frontend page + minimal read-access plumbing.
**Not touched:** customer-facing pages/flows, legacy wire, snapshot, prompts, screens, composers, GTM register/grader.
**Harness invocations this turn:** NONE.

---

## PART 1 — ACCEPTANCE-40 CAMPAIGN RECORD (controller-verified)

CEO-directed 40-doc stratified acceptance sample. Directive quotes: *"215 is too many. Let's cut that down to 40"* / *"Agreed. Fire them and report."* / *"re-run the 23 docs and report"*.

**Composition:** exemplar `43c17b1c` + 24 ramp-3 moderns + 10 ramp-2 docs + 5 coverage picks
(`d6e01c44` sparse-record, `4606aad4` + `69bae66c` Healthcare ADMT-in-evaluation, `d1d70f39` SPI-negative, `f0a00f2e` exception-heavy).

**FINAL RESULT — all 40 on build item-269 simultaneously:**
**21 release / 19 release_with_logged_defects / 0 block / 0 write-arounds / 0 unclassified**
(jobs LIKE `'Acceptance-40%'` [15 docs: 11/4/0] + `'Acceptance-40 final%'` [23 docs: 8/15/0] + the 2 fossil-rule reruns [2 release]).

Logged defects are all non-material (golden_shape depth + band advisories) per the CEO-ratified register `gtm-materiality-v1.1`.

**Claim of record:** "100% of the 40-document CEO-directed stratified acceptance sample is GTM-shippable on engine build item-269, zero material defects, zero unclassified."

**Sampling bound:** ≤~7.5% undetected systematic defect rate at 95% confidence; 175 archive docs remain available.
**Spend:** ≈ $25 cumulative.

**Remaining before acceptance:** band recalibration (Issue 9) from the full dataset; legacy test-failure cleanup (`content.test.ts` / `value-screen.test.ts` / `waveb.test.ts`, pre-existing); full e2e suite; CEO side-by-side read (this Item's review surface); acceptance decision.

---

## PART 2 — CEO REVIEW SURFACE

### VERIFY-FIRST citations

| Question | Precedent | Citation |
| --- | --- | --- |
| How do existing `/admin` pages authorize? | Route wrapped in `<ProtectedRoute><AdminOnly fallback={<NotFound />}>…</AdminOnly></ProtectedRoute>` with a lazy `Suspense` body | `src/App.tsx:628-639` (`/admin/quality-loop2`), `src/App.tsx:651-662` (`/admin/quality-batch`) |
| What does `AdminOnly` check? | `useIsAdmin()` → `public.user_roles` role in (`admin`,`moderator`) | `src/components/AdminOnly.tsx:17-22`, `src/hooks/useIsAdmin.ts:20-28` |
| How do admin pages READ admin data? | Direct PostgREST reads via the authenticated client, authorized by an admin RLS policy on the table | `src/pages/admin/QualityLoop2.tsx:64` (`supabase.from("quality_loop2_runs")…`); DB precedent policies "Admin quality_loop2_runs" / "Admin quality_batch_runs" — `FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))` |
| Where does the shipped PDF rendering of `report_data` live? | `generate-report-pdf` → `buildCPPARiskReportHTML(record.report_data, record)` → LTP renderer via the §5 shared shape-contract | `supabase/functions/generate-report-pdf/index.ts:2599` (dispatch), `:1146-1161` (`buildCPPARiskReportHTML`), `:1163-1171` (`isLtpRiskShape`), imports of `_shared/report-contracts/cppa-risk-shape.ts` at `:9-13` |
| Where does the shipped on-screen viewer live? | `CPPARiskReportBody` → `RiskAssessmentReportV4` / `V3` — the same renderer the live result page and samples use | `src/components/report-bodies/CPPARiskReportBody.tsx:1-6, 55-56` |

### BUILD

**New page:** `src/pages/admin/AdminReplayReview.tsx`, routed at **`/admin/replay-review`** (`src/App.tsx`, new `<Route>` immediately after `/admin/quality-loop2`, identical `ProtectedRoute` + `AdminOnly` + `Suspense` wrapping — the precedent pattern, unchanged).

1. **Listing.** Reads `replay_harness_jobs` (filtered to notes starting `Acceptance-40` or `Ramp step 1, attempt 9`) joined in-client to `replay_harness_results`, deduped to the latest result per `doc_id`. Columns: doc id, entity, sector, GTM verdict (+ material / unclassified defects surfaced in red when present), logged defects, presence rate.
2. **View report.** Renders `assembled_report` through the EXISTING `CPPARiskReportBody` viewer — unchanged component, no fork.
3. **Download PDF.** Calls the EXISTING `generate-report-pdf` function with `{ mode: "replay_harness", result_id }`. That branch renders through the SAME `buildCPPARiskReportHTML` + `generatePDF` + `assessment-reports` signed-URL path customers get; no separate renderer exists or was written. The branch is admin-gated (`has_role(auth.uid(),'admin')`), read-only, and returns 403 for every non-admin caller. All customer request shapes are byte-unchanged (the branch is entered only on the new explicit `mode`). `BUILD_STAMP` → `generate-report-pdf-item271-replay-review@2026-07-30T06:30:00Z`; deployed 2026-07-30T06:20Z.
4. **Side-by-side aid.** When the archive row carries legacy `report_data`, a **View legacy / View rebuilt** toggle renders the archived body through the same viewer for direct comparison.

### ACCESS PLUMBING (SELECT-only; service-role lock preserved)

Migration (2026-07-30):

- `GRANT SELECT ON public.replay_harness_jobs, public.replay_harness_results TO authenticated;` — SELECT only. No INSERT / UPDATE / DELETE grants of any kind; existing `service_role` `GRANT ALL` and the `*_service_role_only` policies are untouched.
- `CREATE POLICY "Admin read harness jobs" / "Admin read harness results" … FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'))` — mirrors the `quality_loop2_runs` precedent, narrowed from `FOR ALL` to `FOR SELECT`.
- `public.admin_replay_fetch_legacy_doc(uuid)` — SECURITY DEFINER, `STABLE`, `SET search_path = quality_archive, public`, mirrors `public.replay_harness_fetch_doc` (`supabase/migrations/20260729145734_*.sql:1-15`) but adds an in-body `has_role(auth.uid(),'admin')` gate that raises `forbidden` otherwise. Returns `id, entity_name, sector, intake_data, report_data` from `quality_archive.quality_run_documents_20260728` where `tool='cppa-risk'`. `REVOKE ALL FROM PUBLIC, anon`; `GRANT EXECUTE TO authenticated, service_role`. Read-only.

---

## PART 3 — FOUR-LENS RECORD

- **CS:** reuse of the shipped viewer and the shipped PDF exporter guarantees the CEO reads exactly what customers receive — no review-only rendering path exists to diverge from production.
- **Privacy-law / privacy:** admin-only surface, SELECT-only plumbing, no customer path or record altered; archive access stays behind a SECURITY DEFINER function with an explicit admin check; no data leaves the admin session.
- **Prompt:** n/a — no prompt touched.
- **Prose:** n/a — no customer-facing text authored; all rendered prose comes from already-generated artifacts.

**NOTE — page URL:** `/admin/replay-review` (published: `https://enduserprivacy.com/admin/replay-review`). Authorization: `ProtectedRoute` + `AdminOnly` (`user_roles` admin/moderator) on the route, admin RLS (`has_role(auth.uid(),'admin')`) on the data, admin gate inside the PDF branch and the archive RPC.

**Verification this turn:** `tsgo --noEmit -p tsconfig.app.json` → clean (0 errors). No harness invocation; no changes to composers, registers, prompts, legacy wire or snapshot.
