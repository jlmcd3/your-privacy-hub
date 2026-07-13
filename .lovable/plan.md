
# Courier RC-A — Foundations for the Revision Contract program

Six-courier program; this is #1. Ships the safety scaffolding OFF, plus mechanical fixes. External verification runs against a fresh clone before Courier 2 fires.

## Pre-flight (before any deploy)
- Query `quality_runs`/`long_running_jobs` for in-flight runs. If any are active, HALT, report status, and wait. Report the check either way.

## A1. Global revision gate
- Approach: env-read constant `REVISIONS_ENABLED` (default `"false"`), read once at module load.
  - Server: `supabase/functions/_shared/revision-gate.ts` exports `REVISIONS_ENABLED`. `regenerate-assessment` returns `409 { error: "revisions_disabled", message: "…" }` when `mode !== "errata"` and gate is off.
  - Client: `src/lib/revisionGate.ts` exports `REVISIONS_ENABLED = import.meta.env.VITE_REVISIONS_ENABLED === "true"`. All 9 tool refine-mode entry points (`RefinePanel` mount site + any "Refine" CTAs) hide when false; refine URL param shows a "Revisions temporarily disabled" notice instead of the panel.
- Report which mechanism was used and how to flip it.

## A2. Version history
- Migration:
  ```
  CREATE TABLE public.report_versions (
    id uuid pk default gen_random_uuid(),
    tool_type text not null,
    assessment_id uuid not null,
    version_n int not null,
    report_data jsonb not null,
    open_items_snapshot jsonb,
    created_at timestamptz default now(),
    unique(tool_type, assessment_id, version_n)
  );
  GRANT SELECT ON public.report_versions TO authenticated;
  GRANT ALL ON public.report_versions TO service_role;
  ENABLE RLS; policies: owner-read via join to source table's user_id (per-tool_type CASE, or an `owner_user_id` denormalized column populated at insert — simpler; go with denormalized). Admin-only delete via has_role.
  ```
- Shared helper `supabase/functions/_shared/report-versions.ts` → `snapshotPriorReport(supabase, {toolType, assessmentId, userId})`: reads current `report_data` from `TABLE_MAP` row; if non-null, inserts as `version_n = COALESCE(MAX,0)+1`. Called from all 9 generators (immediately before overwriting `report_data`) AND from `regenerate-assessment` (before status flip to processing).
- My Reports UI: per-assessment expandable "Versions (N)" list → opens read-only report view at `/reports/:tool/:id/versions/:n`.

## A3. Errata channel
- `regenerate-assessment` accepts `{ mode: "errata", corrections: [{ field_path, new_value }] }`.
- Hard rejects (400): any `field_path` (dot-path) whose root token is in `LOCKED_FIELDS_MAP[tool_type]` OR in identity set `{entity_name, subject_anchor, company_name, organization_name, system_name, sector, q3_sector, significant_decision_domain}`.
- No generator invoke. Snapshots prior report (A2). Patches intake (dedicated column or `intake_data`). For each correction: walks `report_data` and replaces the OLD verbatim value with new. If any target derived-only field lacked a verbatim hit AND the correction was accepted, sets response `needs_revision: true` with per-field breakdown.
- Meter untouched. `write-action-log` entry with action `errata_applied`.

## A4. §7121 cohort M-test binding
- `cppa-test-states.ts` M6 exists but "straddles $50M" phrasing was emitted by the generator on a `$25M–$50M` (RESOLVED) run — meaning the test wasn't consumed/bound. Two fixes:
  1. Confirm M6 fires for the resolved-band case (it does per code) and add it to the BINDING deterministic-check gate used by the generator so `report_data` cannot ship revenue-band cohort language contradicting `band.audit_cohort`. Add lint rule scanning report prose for the regex `/straddles? the \$50M line/i` and rejecting when `band.audit_cohort !== "indeterminate"`.
  2. Rename/renumber only if a free M-slot is required; else annotate.
- Bump `PROMPT_CORE_VERSION`/tool build tag on `run-cppa-risk-assessment`.

## A5. Revenue single truth
- Migration: `UPDATE cppa_assessments SET intake_data = jsonb_set(intake_data, '{q1_revenue}', to_jsonb(map), true)` where `q1_revenue` absent and `org_context.annual_revenue_threshold` present, using the mapping in the courier.
- Remove reads/emits of `org_context.annual_revenue_threshold` from: `run-cppa-risk-assessment/index.ts`, `CPPARiskAssessment.tsx`, `CPPAEvalHarness.tsx`, `generate-stress-fixtures/index.ts`, `stress/fixtures.ts`, `sampleFixtures.ts`. Leave column, add `// DEPRECATED (RC-A) — read q1_revenue instead` at each old touch-point.

## A6. Locked-field ask guard (stopgap)
- `insufficient-info-guard.ts`: filter `information_needed[]` entries whose `field` (first dot-segment) resolves into `LOCKED_FIELDS_MAP[tool_type]` or identity set from A3. Push a `lint_warnings` entry `{code:"locked_ask_stripped", field}`.

## A7. Spend metering
- `anthropic-call.ts`: parse `usage.input_tokens`, `usage.cache_read_input_tokens`, `usage.cache_creation_input_tokens` on both first call and continuation legs; sum across legs; return alongside output_tokens.
- Migration: `api_usage { function_name, product, model, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, duration_ms, source_row_id }`; admin-read-only RLS (`has_role admin`).
- `anthropic-call` fire-and-forget insert after each call (try/catch swallow).
- `/admin/spend` route + admin tile: daily totals by product (SQL group-by), plus per-run drill-down keyed on `source_row_id`.

## Verification (report each)
1. Regenerate a harness cppa-risk row → row appears in `report_versions` with prior report.
2. Errata: locked/identity `field_path` → 400; verbatim value → applied + snapshot + log; derived-only field → `needs_revision:true`; meter unchanged.
3. `$25M–$50M` fixture: TEST-STATES shows M6 RESOLVED with `cohort=2030-04-01`; lint blocks straddle phrasing.
4. Migration row-count report; grep clean for `annual_revenue_threshold` outside deprecation comments.
5. `api_usage` rows for one dpia run with nonzero `input_tokens`.
6. All 9 tool pages: refine CTA hidden; direct `?refine=…` shows disabled notice; `regenerate-assessment` (non-errata) returns 409; errata still works.

## Non-goals for this courier
- Structural fix to "what is a locked field" (Courier 2).
- Migrating other generators to `anthropic-call.ts` (their parsers untouched).
- Any status flips or destructive schema changes.

Confirm before I execute; scope is large enough that a mid-course direction change would waste a lot of work.
