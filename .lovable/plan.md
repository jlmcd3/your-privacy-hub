
# quality-batch2 — Admin Stage-Two (Revision) QA

Repeatable admin surface to certify the revision path end-to-end using production prompts, without enabling revisions for customers. `REVISIONS_ENABLED` stays off; the customer refine surface is unchanged.

Assumptions (flagged, verify before code):
- `regenerate-assessment` already supports an internal-verification branch keyed on `x-internal-verification: 1` + service-role bearer, and accepts `internal_user_id` to override ownership. Both `mode:"revision"` gate checks in that file honor `isInternalVerification` today (lines 333 and 656).
- Admin gating uses the existing `AdminOnly` + `useIsAdmin` pattern (public.user_roles).
- Prod prompts are exercised end-to-end because the internal-verification branch reaches the same tool generator the customer path uses.

## Scope

### 1. New admin route + index page

`src/pages/admin/QualityBatch2.tsx` (new)
- Route: `/admin/quality-batch2`, wrapped in `AdminOnly`.
- Per-tool tab strip using the same 9 tool slugs as `QualityBatch.tsx` (single source: `SLUG_TO_TOOL_TYPE`).
- Table of candidate docs for the selected tool: id, owner, created_at, `report_data.open_items` count (`open` only), latest reviewer score if any. Query is a `SELECT id, user_id, created_at, report_data->'open_items'` on the tool's result table (from `TABLE_MAP` in `useRefineMode`), server-filtered to rows where `jsonb_array_length(open_items filtered by status='open') > 0`. A shared SQL helper avoids per-tool drift.
- Actions per row: **Open in reviewer**, **View report**, **Trigger fresh generation** (see §3).
- Add route to `App.tsx` and a card link on `src/pages/admin/AdminHub.tsx`.

### 2. Reviewer view — reuses customer components verbatim

`src/pages/admin/QualityBatch2Doc.tsx` (new)
- Route: `/admin/quality-batch2/:toolType/:assessmentId`, `AdminOnly`.
- Renders `<RefinePanel />` / underlying `<OpenItemsList />` with the exact same props the customer refine page passes. No fork of those components.
- Ownership problem: `useRefineMode` reads the row via the customer supabase client and is subject to RLS. Do NOT loosen RLS. Fix by:
  - `src/hooks/useAdminRefineMode.ts` (new): mirrors `useRefineMode` but fetches the row through a thin edge function `admin-fetch-assessment` (new) that runs under service role after `verifyCaller(req, "admin")`. Returns the same `{ intake, infoNeeded, openItems, resolveFields, lockedFields, runsRemaining, ... }` shape so the panel props are unchanged.
- Submission path: `src/lib/adminRevisionApi.ts` (new) — sibling to `revisionApi.ts`. Calls a new edge function `admin-submit-revision` (see §2a) instead of hitting `regenerate-assessment` directly from the browser, because the service-role bearer must never touch the client.
- Reviewer annotation form under the panel: score (0–100), pass/fail band, verbatim notes, reviewer id captured from `auth.uid()`, submitted_at. Writes to `quality_batch2_reviews` (§4).

#### 2a. Server proxy — new edge function

`supabase/functions/admin-submit-revision/index.ts` (new)
- `verifyCaller(req, "admin")` → 403 for non-admins.
- Body: `{ tool_type, assessment_id, answered_items }` (same shape as `revisionApi.submitRevisionAnswers`).
- Reads the row's owner `user_id` server-side.
- Invokes `regenerate-assessment` with `Authorization: Bearer <SERVICE_ROLE>`, `x-internal-verification: 1`, and body `{ mode: "revision", answered_items, internal_user_id: <owner> }`. Passes through the response.
- This is the ONLY component that touches service-role material. The `REVISIONS_ENABLED` gate in `regenerate-assessment` is already bypassed on the internal-verification branch (verified above) — no change to that file.

`supabase/functions/admin-fetch-assessment/index.ts` (new)
- `verifyCaller(req, "admin")` → 403 for non-admins.
- Body: `{ tool_type, assessment_id }` → returns the same shape `useRefineMode` reads today (intake fields per `INTAKE_READ_MAP` + `report_data`), plus the row's `user_id`. Service-role client bypasses RLS so admins can review any owner's doc.

### 3. Fresh single-doc generation from batch fixtures

`supabase/functions/admin-quality-batch2-seed/index.ts` (new)
- `verifyCaller(req, "admin")`.
- Body: `{ tool_type }`.
- Reuses the same fixture source `run-quality-batch` uses (`_shared/*fixtures*` per tool — the same ones the batch orchestrator invokes). Picks a fixture, calls the corresponding `run-*` function via `invoke-gated` under service role, records the resulting `assessment_id`.
- Row is created with `user_id` = the invoking admin, so it shows up in that admin's My Reports and stays inside RLS. Reviewer opens it via the QualityBatch2 table.

Reused, not forked: fixture files and `run-*` generators. Any drift between batch fixtures and this surface is impossible because the import path is identical.

### 4. Reviewer annotation storage

New migration adds `public.quality_batch2_reviews` — one row per (assessment_id, reviewer, submitted_at):

```
id uuid pk default gen_random_uuid()
tool_type text not null
assessment_id uuid not null
reviewer_id uuid not null references auth.users(id)
score int check (score between 0 and 100)
band text check (band in ('pass','borderline','fail'))
notes text not null
open_items_snapshot jsonb  -- captured at submit time
regen_response jsonb       -- captured from admin-submit-revision
created_at timestamptz not null default now()
```

Grants per project rule: `GRANT SELECT, INSERT ON public.quality_batch2_reviews TO authenticated; GRANT ALL ... TO service_role;` No anon grant. RLS: SELECT/INSERT allowed only for `has_role(auth.uid(),'admin')` or `'moderator'`. Index on `(tool_type, assessment_id, created_at desc)`.

### 5. Known-defect fix — i3_ca_consumer_band enum composition

Current: `CONSUMER_OPTS` (single-band volume list) is used both as the intake enum and as the `re-select` enum inside the open-item. It cannot express the Answer Table's category-composition oracle (e.g., patients + caregivers), so wave-1 i3 answers are blocked.

Fix, scoped to the ask-surface only (do NOT change intake semantics or scope-checker thresholds):

- `supabase/functions/_shared/field-enums.ts`: introduce a new key `cppa_risk_assessment:i3_ca_consumer_band_composition` whose values are the category-composition options from the oracle set. Keep the existing `cppa_risk_assessment:i3_ca_consumer_band` untouched so historical open_items still resolve.
- `supabase/functions/_shared/open-items.ts` (line 71): change the `enum_ref` for `i3_ca_consumer_band` to the new composition key AND upgrade its `input_spec.kind` from `re-select` to `structured` when the volume band is already answered, so both the volume (already stored) and the category mix (asked) can be captured. The generator's revision-mode fold already accepts `structured` values via `StructuredFieldEditor`.
- `src/components/refine/fieldEnums.ts` (line 94): mirror the new option list.
- Regression: existing `re-select` open_items already frozen on old reports keep resolving against `CONSUMER_OPTS`; only newly generated open_items adopt the composition enum. Add a fixture test under `src/lib/__tests__/` asserting both keys resolve.

### 6. Guardrails — customer path must not move

- `REVISIONS_ENABLED` / `VITE_REVISIONS_ENABLED` remain off. Nothing in this plan flips either.
- No change to `regenerate-assessment/index.ts`.
- No change to `RefinePanel.tsx` / `OpenItemsList.tsx`.
- No RLS loosened. Admin reads/writes go through service-role edge functions only.
- Customer `revisionApi.ts` unchanged; admin uses a separate `adminRevisionApi.ts`.

## Technical details

- Route wiring: `src/App.tsx` gets two new `<Route>` entries inside the existing admin block.
- Auth in edge functions: `_shared/verify-caller.ts` already provides `mode:"admin"` with `has_role` check.
- Tool-type mapping: reuse `SLUG_TO_TOOL_TYPE` from `QualityBatch.tsx` by extracting it to `src/lib/qualityBatchTools.ts` so both admin pages import it (single source of truth).
- The reviewer's per-doc view should surface, side by side: the open_items list (interactive), the currently persisted `report_data.open_items` statuses, and after a submit, the regenerated report diff link (`/report-versions/:assessmentId`).
- Analytics: fire `admin_qb2_open`, `admin_qb2_submit`, `admin_qb2_review_saved`, `admin_qb2_seed` via `trackEvent` for run-book auditing.

## File-level scope (new unless marked)

- `src/pages/admin/QualityBatch2.tsx`
- `src/pages/admin/QualityBatch2Doc.tsx`
- `src/hooks/useAdminRefineMode.ts`
- `src/lib/adminRevisionApi.ts`
- `src/lib/qualityBatchTools.ts` (extracted)
- `supabase/functions/admin-fetch-assessment/index.ts`
- `supabase/functions/admin-submit-revision/index.ts`
- `supabase/functions/admin-quality-batch2-seed/index.ts`
- Migration: `quality_batch2_reviews` table + grants + RLS
- `supabase/functions/_shared/field-enums.ts` (add composition key)
- `supabase/functions/_shared/open-items.ts` (i3 mapping + input_spec)
- `src/components/refine/fieldEnums.ts` (mirror)
- `src/App.tsx` (routes)
- `src/pages/admin/AdminHub.tsx` (card)

## Out of scope

- Enabling revisions for customers.
- Modifying `regenerate-assessment`, `RefinePanel`, `OpenItemsList`.
- Any change to scope-checker thresholds, `CONSUMER_OPTS` intake values, or historical open_items resolution.
- Bulk auto-grading — reviewer scores are human-entered.
