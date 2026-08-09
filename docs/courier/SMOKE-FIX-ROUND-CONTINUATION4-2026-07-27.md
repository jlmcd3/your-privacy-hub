# SMOKE-FIX-ROUND CONTINUATION-4 · BLOCK-B-COMPLETE

**Date:** 2026-07-27
**Dispatch:** Stage-B CONTINUATION-4 (release read of Item 194 BLOCK-A courier)
**Ledger:** Item 195
**Disposition:** **BLOCK-B-COMPLETE — HARD STOP** at the step-8 consolidated deploy checkpoint; steps 9-12 (enforce-mode re-smoke, degradation re-smoke, full-suite paste, security appendix, Stage-B COMPLETE marker) defer to CONTINUATION-5.

---

## §1. Scope executed (steps 5-8 of Stage-B, + enforce-mode ruling)

Landed as one consolidated deploy of `run-cppa-risk-assessment` + `quality-batch-orchestrator` + `run-quality-batch`.

### 1.1 Traced A.i fixes — located by content (self-serve boundary)

- **Pin-slice at seed boundary** — `_shared/quality/seed-row.ts:20-28`.
  `buildSeedRow` now caps `opts.pins` to `batchSize` at seed time (`opts.pins.slice(0, batchSize)`). A size-1 batch with 16 pinned goldens now persists exactly 1 pinned intake; excess is dropped at the source of truth, not downstream.

- **Overshoot fix at run start** — `run-quality-batch/index.ts:1908-1918`.
  Immediately before the one-sided `intakes.length < batchSize && nextIdxSafe === 0` gate, added a symmetric arm: if `nextIdxSafe === 0 && intakes.length > batchSize`, log a `warn` with `sliced from N → M (D dropped)`, `intakes = intakes.slice(0, batchSize)`, persist. Preserves mid-run resume semantics (only fires on first invocation).

- **Cohort append-if-absent** — `_shared/ltp/cohort-append.ts` (new), wired at `run-cppa-risk-assessment/index.ts:3220-3244` after WAVE-B/B.2 completion.
  `applyCohortAppendIfAbsent(report, intake)` — idempotent, no-throw. When `classifyRevenueBand(q1_revenue).audit_cohort === "indeterminate"` (unspecified revenue OR legacy `$25M–$100M`), and the marker `/§\s*7121\(a\)\s+cohort\s+conditional/i` is absent from `submission_summary.submission_basis`, appends: `"§ 7121(a) cohort conditional — April 1, 2029 if 2027 revenue is $50M–$100M; April 1, 2030 if under $50M; the recorded revenue band does not yet resolve the cohort"`. Idempotent (already-present → no-op). Resolved bands → no-op (single-date treatment lives elsewhere).
  Telemetry: `_meta.internal.cohort_append = {build_stamp, stamp, version, appended, reason}`.

- **Lexicon extension:** No new leak surfaces appeared in dry reads — deferred as unchanged.

### 1.2 Declared/actual count migration + §16.n adoption

- **DDL applied** (per controller-supplied SQL, verbatim):
  ```
  ALTER TABLE public.quality_batch_runs
    ADD COLUMN IF NOT EXISTS declared_count integer,
    ADD COLUMN IF NOT EXISTS actual_count integer;
  ```
  With `COMMENT ON COLUMN` documenting historical NULL exemption.

- **Born-state writes** — `quality-batch-orchestrator/index.ts` — three insert sites now write `declared_count`:
  - `startRun` (L706-712): `declared_count: tools.length * batchSize`
  - `startPinnedRerunBatch` (L749-755): `declared_count: pins.length`
  - `startCampaignWave` (L848-855): `declared_count: eligible.length * batchSize`

- **Terminal-state assertion** — `markTerminalAll` (L436-465): fetches row, computes `actualCount = completeCount * batchSize` from `tool_results[i].final_status === "complete"`, patches `actual_count` alongside `completed_at`. When `status === "complete"` and `declared_count != null && declared !== actualCount`, emits `evt=count_conformance_violation` warn log with both counts + BUILD_STAMP. Historical rows (`declared_count === null`) exempt. Fail-open (compute failure never blocks terminal write).

### 1.3 Item-181 renderer wiring

- `_shared/ltp/renderer-181.ts` (new), 5 unit tests green:
  - **(a) `assertFactorLineBeforeConclusion(parts)`** — positional guard: last `factor_line`/`activity_line` index must precede first `conclusion_firm`/`conclusion_hedged`/`closing` index. Returns error string on violation, else `null`.
  - **(b) `emitAggregationNoteIfMulti(outcomeCount)`** — returns the aggregation-note text ONLY when `outcomeCount > 1`; empty string at N=1 (tautology suppressed).
  - **(c) `isBQuestionIntake(label)` + `filterInfoNeededToBQuestions(entries)`** — (B)-question predicate: label ends with `?` OR begins with a question stem (`please|describe|what|which|how|does|do you|when|why|list|is|are|can|could|would|should`). Structured determinations rejected.

  Utilities are subordinated helpers per §28 — composer/renderer callers invoke them; they never mutate customer surfaces on their own.

### 1.4 §16 COMPOSITION-ENFORCE surface (dispatch addition, closes the observe-mode silent-off)

- **`_shared/ltp/mode-assert.ts`** extended:
  - `ltpExpectedCompositionEnforce()` reads `LTP_COMPOSITION_ENFORCE_EXPECTED` (default `"1"`).
  - `ModeCheckEntry` gains `composition_enforce_expected` + `composition_enforce_actual`.
  - `pingTool` fetches `composition_enforce` from tool ping, folds into `ok` (mismatch → §16 abort with `error: "composition_enforce_mismatch"`).

- **`run-cppa-risk-assessment/index.ts` ping** (L3508-3520) now emits `composition_enforce: "1"|"0"` from `Deno.env.get("LTP_COMPOSITION_ENFORCE")`.

- **Secrets set:** `LTP_COMPOSITION_ENFORCE=1` and `LTP_COMPOSITION_ENFORCE_EXPECTED=1` — fleet declaration; observe-mode reversion now trips §16 abort at kickoff, not a silent drift.

---

## §2. Deploy + boot-prove (step 8)

- **Deploy:** `run-cppa-risk-assessment`, `quality-batch-orchestrator`, `run-quality-batch` — all deployed successfully.
- **BUILD_STAMPs (fresh-clock):**
  - `run-cppa-risk-assessment`: `ltp-risk-stage-b-blockb-cohort-r181-ceassert@2026-07-27T13:35:00Z`
  - `quality-batch-orchestrator`: `qbo-stage-b-blockb-declared-actual-count@2026-07-27T13:35:00Z`
  - `run-quality-batch`: (piggy-backed; overshoot fix + reused orchestrator BUILD_STAMP surface)
- **Ping-prove (risk):**
  ```
  GET /run-cppa-risk-assessment?ping=1 →
  {"fn":"run-cppa-risk-assessment",
   "build_stamp":"ltp-risk-stage-b-blockb-cohort-r181-ceassert@2026-07-27T13:35:00Z",
   "ltp_mode":"enforce",
   "ltp_version":"ltp-risk-p2",
   "composition_enforce":"1"}
  ```
  §16 pre-ping surface now covers mode AND composition_enforce.

---

## §3. Tests (partial — new modules only; full-suite deferred to CONTINUATION-5 step 10)

- **Ran (`--no-check`) — 9/9 green:**
  - `_shared/ltp/renderer-181.test.ts` — 5/5 ✔ (order, aggregation N=0/1/2, (B)-predicate, filter)
  - `_shared/ltp/cohort-append.test.ts` — 4/4 ✔ (append on indeterminate, idempotency, band-resolved no-op, fail-open on missing summary)
- **Isolated `deno check`:** `renderer-181.ts`, `cohort-append.ts`, `seed-row.ts`, `mode-assert.ts` — all clean.
- **Pre-existing typecheck errors** (unchanged from Block-A run, unrelated to this block):
  `summary-compose.ts:267` `activity_singplural_clause` SlotContext mismatch;
  `cppa-risk-factors.ts` `guidance_refs` widening — both predate this dispatch; will be surfaced in the full-suite paste in CONTINUATION-5 step 10.

---

## §4. Files touched (complete inventory this block)

- `supabase/functions/_shared/quality/seed-row.ts` (pin-slice cap)
- `supabase/functions/run-quality-batch/index.ts` (overshoot slice arm)
- `supabase/functions/_shared/ltp/cohort-append.ts` (NEW)
- `supabase/functions/_shared/ltp/cohort-append.test.ts` (NEW)
- `supabase/functions/_shared/ltp/renderer-181.ts` (NEW)
- `supabase/functions/_shared/ltp/renderer-181.test.ts` (NEW)
- `supabase/functions/_shared/ltp/mode-assert.ts` (composition_enforce assertion)
- `supabase/functions/run-cppa-risk-assessment/index.ts` (cohort-append wiring, ping surface, BUILD_STAMP)
- `supabase/functions/quality-batch-orchestrator/index.ts` (declared/actual count, BUILD_STAMP)
- Migration: `quality_batch_runs.declared_count`, `quality_batch_runs.actual_count`

Secrets set: `LTP_COMPOSITION_ENFORCE=1`, `LTP_COMPOSITION_ENFORCE_EXPECTED=1`.

---

## §5. Deferred to CONTINUATION-5 (steps 9-12)

Explicitly out of scope this turn, per dispatch checkpoint clause ("Permitted checkpoints: after the step-8 deploy (BLOCK-B-COMPLETE) or after the re-smoke"):

9.  **Enforce-mode live re-smoke** — batch_size=1 canonical run with real admin `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`, verifying guards throw correctly without breaking real composition (customer boundary stays fail-open).
9b. **Degradation re-smoke** — set `LTP_TEST_FORCE_WRITE_AROUND` → boot-prove → one wrapped run → verify `write_around=true`, registry-only sections, disclosure, zero internal vocabulary, hook-audit pass → unset → boot-prove.
10. Full `deno test` suite green paste.
11. Security-panel appendix (titles + severity only).
12. Stage-B COMPLETE marker in ledger.

---

## §6. Clean-arm counter (§22.1)

Unchanged. **0/3 for `cppa-risk`.** Opens at Stage-C re-smoke, per courier §5 in Item 189.

---

## §7. Disposition

**BLOCK-B-COMPLETE. HARD STOP** at the step-8 consolidated deploy checkpoint. Stages C/D remain gated on Stage-B COMPLETE. Awaiting CEO read + CONTINUATION-5 release.
