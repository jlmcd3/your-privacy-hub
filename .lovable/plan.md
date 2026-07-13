
# RC-B — Revision Contract core

Pre-flight: 0 in-flight runs (function_runs last 30 min). Revision gate stays OFF throughout. No generator prompt semantics change beyond the additions below; stamps bumped on every touched generator.

Scope is large enough that I'll ship in 3 commits so external verification can start on the foundation while the UI lands. All three are frontend + edge-function changes plus one migration.

## Commit 1 — Data spine (B1 open_items + B5 provision store + B2 transport keys)

**Migration**
- `provision_texts` table: `key text pk`, `citation text`, `verbatim_excerpt text`, `plain_requirements jsonb`, `jurisdiction text`, `status text check in ('pending','approved') default 'pending'`, `last_verified_at timestamptz`, `approved_by uuid`, timestamps. GRANT: `select` to anon+authenticated (read is public — citation-only render), `all` to service_role. RLS on; policy: everyone can read; only admins (via `has_role`) can write via edge function (no direct client mutation policy).
- No `open_items` column added — it lives inside existing `report_data jsonb` under a new `open_items` key.

**Shared modules**
- `supabase/functions/_shared/open-items.ts` — pure module:
  - `buildOpenItems(informationNeeded, toolType) → OpenItem[]` — filters out `enhancement` class, generates stable slug ids (`toolPrefix-fieldSlug-provisionSlug-idx`), maps `class`, `target`, `provision_key`, `input_spec` (per-tool small dispatch by field name → structured/re-select/bounded-narrative/boolean+evidence, default bounded-narrative 1200).
  - `freezeOpenItemsOnFirstRun(report_data, informationNeeded, toolType, isRegeneration)` — writes `report_data.open_items` iff `!isRegeneration && !report_data.open_items` (idempotent).
  - `updateOpenItemStatuses(open_items, item_verdicts)` — mutates `status: 'open' | 'resolved' | 'not_resolved'` and appends per-item `resolutions: [{ at, verdict, reason }]`. Never adds/removes.
  - `CREDIT_FIRST_PHRASING` helper: prepends "Your inputs established … but …" reshape from raw dimensions text (deterministic template, no LLM).
- `supabase/functions/_shared/provision-store.ts`:
  - `resolveProvisionForRender(supabase, provision_key)` → `{ status, excerpt?, citation?, pendingInserted?: true }`. On unknown key: inserts pending row (upsert on conflict do nothing) and returns pending notice payload.
  - `seedProvisionRegistry()` — script exported for admin-triggered backfill; picks keys from `gdpr-registry.ts`, `admt-citation-registry.ts`, `statutoryPatterns` and (best-effort) CPPA § cites from `prompt-core.ts`. Idempotent upserts, empty excerpt, status=pending.

**Generators (all 9)**
- After the existing normalize/insufficient-info step, call `freezeOpenItemsOnFirstRun(...)` before persisting `report_data`. Bump `PROMPT_VERSION` stamps.
- Registration-assessment: skipped for open_items (no revision path) — but stamp bumped only if touched.

## Commit 2 — Scoped delta engine (B3) + advisory notes (B4) + errata already in place

**`regenerate-assessment/index.ts`**
- Add `mode: "revision"` (default when gate flips on; gate remains OFF, so this is code-only until enabled). Payload: `{ answered_items: [{ item_id, value, evidence? }] }`.
- Reject any `edited_fields` on revision path (open items ARE the editable surface).
- Load stored `report_data` → pass to generator invocation as `revision_context: { first_draft, answered_items, open_items }`. Adds a shared header `X-Revision-Mode: 1` in the internal invoke body (no HTTP header — it's in `body`).
- After generator returns `patch: { changed_paths, item_verdicts, advisory_notes }`, apply via `mergePreservingFail(stored, patch, changed_paths)`:
  - Deep-clone stored; write only `changed_paths` (dot/bracket path parser). Untouched paths byte-identical — verified by SHA256 pre/post over redacted paths.
  - Advisory guard: cap per tool (registry), require `fact_ref ∈ intake keys ∪ answered_items ids`, strip others, push `lint_warnings`.
  - Update `open_items` statuses.
- Version snapshot fires FIRST (already wired by RC-A A2 `snapshotPriorReport`).

**New shared module `_shared/revision-patch.ts`**
- `applyPatch(stored, patch, changed_paths) → { next, hashDiff }`.
- `guardAdvisoryNotes(notes, { cap, allowedFactRefs }) → { keep, stripped }`.
- `ADVISORY_CAPS: Record<toolType, number>` per spec (5/3/0).

**Shared prompt rule**
- Append to every generator prompt (only when `revision_context` present): "REVISION SCOPE …" block: emit `patch` JSON, do not restate untouched sections, item verdicts required, advisory notes must carry `fact_ref` and obey cap X. This is a conditional prompt segment (guarded by `if (isRevision)`), so first-run output shape is preserved.

**DPIA unit subset**
- In `run-dpia-framework/index.ts`, when `revision_context` present: compute `unitsToRerun` = union of units whose section paths intersect `open_items.target.path` for answered items, plus U5. Uses existing self-invocation bootstrap with `subset_units` param.

**QC check**
- `_shared/deterministic-checks.ts`: add `checkAdvisoryGrounding(report_data)` — fails if any `advisory_notes[].fact_ref` is missing/unknown. Wired into the per-tool QC gate.

## Commit 3 — UI + admin + supplemental_context removal (B2 UI, B6, B5 admin)

**Refine surface**
- `src/components/refine/RefinePanel.tsx`: on revision path (isRefine && open_items present), render `<OpenItemsList>` only — hide autoEditableFromIntake fields.
- New `src/components/refine/OpenItemsList.tsx`: iterates `open_items` (status=open first), each dispatches by `input_spec.kind`:
  - `re-select` → intake enum options via `fieldEnums`
  - `structured` → `StructuredFieldEditor`
  - `bounded-narrative` → Textarea maxLength
  - `boolean+evidence` → radio + short text
  - Provision panel: calls `/functions/v1/get-provision-text?key=` (new tiny read-only edge fn) — approved shows excerpt; pending shows citation + "provision text pending verification."
- Progress header "Resolved X of Y" driven by statuses (client-only display; server is truth).
- Advisory notes collapsed section (accordion, muted).
- Remove `supplemental_context` textarea and `supplementalContext` payload. Guard registration keys stay in `insufficient-info-guard.ts` (comment: intentional).

**Answer transport**
- `useRegenerate.ts`: on revision, send `{ answered_items }` (not `edited_fields`). Keep legacy `supplemental_responses` path only for gate-off/legacy sessions? — No: revision path is the new transport; remove supplemental_context. `supplemental_responses` remains as the WS6 rail carrying `{ item_id, ask, response }` per B2.

**Admin**
- New route `/admin/provisions` (`src/pages/admin/AdminProvisions.tsx`): list, filter by status, approve (excerpt + plain_requirements editor), seed backfill button. Writes via new `manage-provision` edge function (admin-only, action-logged).
- Registered in `AdminHub.tsx`.

**New edge functions**
- `get-provision-text` — public read (verify_jwt=false), 1 SELECT.
- `manage-provision` — admin write; auth + `has_role('admin')`; action logs to `admin_action_log`.

## Verification

For each commit I run the checks and report inline:

1. **Fixture harness (Commit 2 landed)**: pick one CPPA-risk fixture; simulate two answered_items across two revisions with the gate temporarily set in-process (test-only wrapper). Assert: ids stable across runs, count monotone non-increasing (via status flips, never removal), statuses update, `report_versions` rows +2. Untouched-path hash equality shown.
2. **Advisory guard unit test**: over-cap dropped, ungrounded stripped, QC fails; grounded passes with `fact_ref`.
3. **Provision closed-set**: approved key round-trip; unknown key → pending notice + auto-insert (SELECT count before/after).
4. **D8 sweep**: `rg -n "gap|AI-generated"` on new strings; disclaimer intact.
5. Pre-deploy in-flight recheck; gate OFF confirmed (`echo "$REVISIONS_ENABLED"` in edge env — not set).
6. Prompt-version stamps recorded per generator touched.

## Non-goals / deviations (flagged, not shipped)

- **Registration-assessment**: no open_items/revision surface (out of the 9 revisable tools per RC-A scope). No stamp bump.
- **Nested-path errata**: still top-level only (deferred to Courier 3 per RC-A comment).
- Revision gate remains OFF; no user-visible behavior change until CEO flips it.

Ready to execute on approval. I'll pause between commits for external verification, per the courier's "External verification gates RC-C1" clause.
