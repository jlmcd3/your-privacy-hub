# MC-S1b — Admin Redeploy + Conflict Gate + Ops Wiring + Console Gaps

This is a large 9-task dispatch. Confirming scope and sequence before implementation because several tasks touch admin surfaces, cron gates, and a migration.

## Task-by-task plan

### Task 1 — `admin-redeploy` edge function (NEW)
Path: `supabase/functions/admin-redeploy/index.ts`. `verifyCaller(req, "admin")`. Body: `{ function_name: string, reason: string, override?: string, confirm?: string }`.
- Two-source conflict check:
  - (a) `quality_runs` where `status` NOT IN terminal set (`completed|failed|cancelled`); `quality_batch_runs` where `status` NOT IN (`completed|failed|cancelled`); `quality_loop3_batches` where `status` NOT IN terminal.
  - (b) `dpia_frameworks` where `report_data ? '_staging'` AND `report_data->'_staging'->'units'` contains any unit with status in `('pending','processing','dispatching')` — implemented via a targeted SQL filter.
- If conflicts found and `override !== "OVERRIDE-REDEPLOY"` (typed string) → return 409 with the list; log to `admin_action_log` (ok=false).
- Otherwise: call the Supabase Management API deploy endpoint for the named function (requires `SUPABASE_ACCESS_TOKEN` / project ref). If those secrets are unavailable, **fall back** to writing a `redeploy_requested` marker row (documented as deviation).
- Every path writes `admin_action_log` with `action='admin_redeploy'`, `payload={function_name, reason}`, `result={conflicts, deployed}`, `ok`.

**Assumption (deviation candidate):** If `SUPABASE_ACCESS_TOKEN` secret is not present, the function returns `deployed:false, reason:"management_token_missing"` and logs — it does not silently succeed. Will list this as a deviation and ask John to add the secret.

### Task 2 — Delete `dev-continuation-probe`
`rm -rf supabase/functions/dev-continuation-probe/`. Note in report as correction of the 07-12 record.

### Task 3 — Wire `/admin/ops` action buttons
Read `src/pages/admin/AdminOps.tsx` (assumed name — will locate). Enable the buttons rendered disabled in S1a:
- Backfill buttons → `supabase.functions.invoke` on existing backfill/enrich functions with a numeric `batchSize` input.
- Redeploy buttons → `invoke('admin-redeploy', { function_name, reason })` with reason prompt; typed override input surfaced only after 409.
- "Re-snapshot baseline" button: requires typed confirmation "RESNAP-BASELINE", writes an epoch marker row (Task 4 mechanism).
- 401-session toast: single retry after refreshing session before failing; log to `admin_action_log`.
- Log-mode labels: distinguish `single`/`batch` in the recent actions table.
- QL3 double-kickoff guard: disable button for 30s after click + server-side check for existing running batch.

### Task 4 — MC-G2 Instrument-Epoch Ledger (migration)
Single migration:
```sql
ALTER TABLE public.quality_batch_runs ADD COLUMN instrument_version text NULL;
ALTER TABLE public.quality_batch_baselines ADD COLUMN instrument_version text NULL;
```
Code:
- `_shared/grader/context.ts` → export `GRADER_CONTEXT_VERSION = "gc-2026-07-17-ff3"` with a bump-discipline comment.
- `run-quality-batch/index.ts` → stamp `instrument_version` on insert AND on start transitions.
- `/admin/quality-batch` UI:
  - Show `instrument_version` column.
  - Render an "◈ EPOCH CHANGE" divider row between consecutive batches with different versions.
  - Baselines panel: display epoch column (blank = pre-epoch).

### Task 5 — MC-G3 Paid-Run Health Panel
Read-only panel on `/admin/ops`. Three tiles:
- Paid runs pending >15 min: query `function_runs` (event/tool tagging TBD from schema; I'll read the table).
- Rescue-cron activity 7d: count `admin_action_log` OR `function_runs` where action is a known rescue cron. Will select based on what exists.
- Silent-failure counter: `function_runs` where `event='dispatch'` AND `ok=false`, last 24h.

### Task 6 — MC-G4 Manual-Entitlements Panel
On `/admin/ops` fold. Query `user_entitlements` where Stripe reference column is NULL. Join to `auth.users.email` via `admin.auth.admin.getUserById` (paginate) or use existing pattern from `admin-list-subscribers`. Red badge "manual grant — delete before real checkout testing".

### Task 7 — MC-G5 Stale-Run Cancel
On `/admin/quality-batch` rows where `status='running'` AND `heartbeat_at < now() - interval '30 min'`, show "Cancel stale run" button. Typed confirmation "CANCEL-STALE". Server route (new edge function `admin-cancel-stale-run` or extend `admin-toolbox-action`) sets `status='cancelled'`, `phase='done'`, action-logged. I'll extend `admin-toolbox-action` to keep the surface small.

### Task 8 — MC-G1 Surfacing
On the `/admin/quality-batch` batch detail view, add a "Lint Telemetry" section: query `function_runs` for `evt='post_gen_lint'` scoped to the batch's docs. Show `fallback_applied` boolean, note codes, and counts per doc.

### Task 9 — Tests + Deploy
- Unit test `admin-redeploy` conflict-gate logic (pure function extracted to `_shared/redeploy-gate.ts`).
- Unit test `run-quality-batch` epoch stamp write.
- Deploy list: `admin-redeploy` (new), `run-quality-batch`, `admin-toolbox-action` (extended).

## Conflict-gate synthetic demonstration
I'll insert one synthetic `quality_batch_runs` row (`status='running'`), call the function → expect 409 with conflict list; then update the synthetic row to `cancelled` and call again → expect deploy path (or `management_token_missing` deviation). Rows created via the insert tool, cleaned via the insert tool, both action-logged.

## Deviations I'll flag proactively
1. `admin-redeploy` requires `SUPABASE_ACCESS_TOKEN` (management API PAT). If absent, function returns a documented `management_token_missing` result — not a silent success, not a public endpoint.
2. Task 7 implemented as an action inside existing `admin-toolbox-action` rather than a new function (fewer moving parts). If John wants a dedicated function, one-line change.
3. Task 8 assumes `function_runs` carries `batch_id` in payload; if not, telemetry will filter by doc id joined through `quality_run_documents`.

## Files touched (anticipated)
- NEW `supabase/functions/admin-redeploy/index.ts`, `_shared/redeploy-gate.ts`, `_shared/redeploy-gate.test.ts`
- DELETE `supabase/functions/dev-continuation-probe/`
- EDIT `supabase/functions/_shared/grader/context.ts` (add version constant)
- EDIT `supabase/functions/run-quality-batch/index.ts` (stamp version)
- EDIT `supabase/functions/admin-toolbox-action/index.ts` (extend for stale-cancel + resnap baseline)
- EDIT `src/pages/admin/AdminOps.tsx` (or actual file name) — wire buttons, add health/entitlements panels
- EDIT `/admin/quality-batch` page — epoch column/divider, lint telemetry, stale-cancel button
- MIGRATION: two ADD COLUMN statements

## Confirm before I proceed
Two decisions I want to sanity-check before implementing:

1. **Management API for redeploy.** Real edge-function redeploy from within another edge function requires the Supabase Management API + a PAT. Is `SUPABASE_ACCESS_TOKEN` (or equivalent) intended to be added as a secret? If not, the "redeploy" is effectively a queued marker row that a human/CI acts on. Which do you want?

2. **Task 7 host.** Extend `admin-toolbox-action` (my default) vs. dedicated `admin-cancel-stale-run` function?

Once you confirm those two points I'll implement all nine tasks straight through, run the tests, apply the migration, and report.
