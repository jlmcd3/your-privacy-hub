## Goal

A new admin-only page at **`/admin/tests-realworld`** that exercises the **real** generation pipeline subscribers use — same edge functions, same DB tables, same PDF renderer — using canned fixtures, with per-tool view/download/delete and a global wipe.

## What gets built

### 1. Route + page
- `src/pages/admin/TestsRealWorld.tsx` — admin-gated via `<AdminOnly>`, registered in `App.tsx` at `/admin/tests-realworld`.
- Same checkbox grid pattern as `TestsDashboard`, grouped by Assessments / Documents / CPPA / Notices / Other.
- Top bar: `Run selected (n)` and `Delete all generated` buttons.
- Below the grid: one results card per tool showing every artifact the harness has produced for that tool (newest first), with `View`, `Download PDF`, `Delete` per row, mirroring the My Workspace row affordance.

### 2. Fixtures (code, version-controlled)
- `src/data/test-fixtures/index.ts` — registry mapping tool id → fixture + runner.
- One file per tool with a fully populated payload mirroring what the production intake form posts: `lia.ts`, `dpia.ts`, `governance.ts`, `biometric.ts`, `dpa.ts` (+ us/dual/canada variants), `ir-playbook.ts` (+ us), `ropa.ts`, `us-notice.ts`, `eu-notice.ts`, `cppa-scope.ts`, `cppa-risk.ts`, `cppa-cyber.ts`, `registration.ts`, `brief.ts`.
- Each fixture is a typed object the runner passes straight to the same edge function the subscriber flow invokes.

### 3. Runner (frontend)
- `src/lib/testsRealWorld/runner.ts` — for each selected tool: invoke the production edge function with the fixture, await the inserted row id, register it in the harness ledger (see #4), then refresh the per-tool artifact list.
- Stripe is bypassed entirely — the runner calls generation functions directly. RoPA / Notices / subscription-only tools work because the admin already has access; for premium-gated tools the runner relies on the admin's existing role rather than mutating `is_premium`.

### 4. Harness ledger (single new table, no per-tool schema changes)
- `harness_artifacts (id, run_id, admin_user_id, tool_type, target_table, target_id, created_at)`.
- RLS: admins read/write their own rows; `service_role` all.
- Every generation registers a row here; delete-all reads this ledger and removes the linked rows from the underlying tool table + ledger row. This keeps real subscriber data untouched even though the admin's own `user_id` owns the generated rows.

### 5. View / PDF / Delete
- `View` opens the existing subscriber result route (e.g. `/lia/result/:id`) in a new tab — same React page real users see.
- `Download PDF` reuses `PDFDownloadButton` + `generate-report-pdf` (no new edge function).
- `Delete` calls existing `adminDelete` where supported (`ropa_session`, `us_notice_document`, `eu_notice_document`, `registration_document`); for the rest a small `harness-delete` edge function deletes by `(target_table, target_id)` after verifying the row is in `harness_artifacts` for the caller.

### 6. Delete-all
- Iterates the caller's `harness_artifacts` rows, deletes each, then deletes the ledger rows. Scope is strictly tag-limited — never touches anything the harness did not create.

## Technical notes (skip if non-technical)

- No edge functions are forked or re-implemented. The runner uses the same `supabase.functions.invoke(...)` names the production tool pages use.
- Tools that produce multiple rows per run (e.g. EU notice = one row per framework; RoPA = session + version) get one ledger entry per persisted row so deletion is complete.
- Tools that today bypass Stripe for `is_pro` (IR Playbook, Biometric) work unchanged; subscription-only tools (RoPA, US/EU Notice) work because the admin has the role. No mutation of `profiles` is needed for the answered "Bypass Stripe" path.
- New migration:
  - `harness_artifacts` table + GRANTs + RLS (admins manage own rows, service_role all).
- New edge function: `harness-delete` (service-role delete by table + id, gated on ledger membership and admin role).
- Existing `/admin/tests-output` (smoke harness) stays — this is the production-path companion, not a replacement.

## Out of scope (explicit)
- No Stripe checkout simulation.
- No UI fixture editor (fixtures are code only, per your answer).
- No automated assertions / pass-fail scoring — this is a render-and-eyeball harness, not a CI suite.

## Deliverable order
1. Migration: `harness_artifacts` + RLS + GRANTs.
2. Edge function: `harness-delete`.
3. Fixtures (one file per tool).
4. Runner + ledger client helper.
5. `TestsRealWorld.tsx` page + route.
6. Manual smoke: run one tool of each family, confirm view + PDF + delete + delete-all.
