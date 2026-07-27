# DUAL-SMOKE-POSTFIX — Stage A.ii (Forced-degradation arm)
Date: 2026-07-27
Scope: cppa-risk single-doc smoke with `LTP_TEST_FORCE_WRITE_AROUND=unit-test-only-2026-07-27`.

## Precondition fix (from Item 179)
- Root cause of prior HELD: canonical batch inserted with nil UUID `created_by`, tripping `quality_runs_created_by_fkey`.
- Fix: seed `created_by = 02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122` (verified present in `auth.users`).
- Controller defect only; no pipeline / Engine-B code path touched.

## Launch
- Secret set: `LTP_TEST_FORCE_WRITE_AROUND=unit-test-only-2026-07-27` (workspace secret; process-wide env for edge fns).
- Canonical born-state insert: `quality_batch_runs.id = 162acf86-5d39-47e7-b707-eec1a5f2426d`
  - `tools={cppa-risk}`, `batch_size=1`, `concurrency=1`, `campaign_id=NULL`,
    `instrument_version=gc-2026-07-27-s6-eu-uk-ca-au-sg`,
    `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`,
    `started_at=2026-07-27T08:58:44.798Z`.
- Kick via `kick-wrapped-batch` with `mode_expected=enforce`, `target_fn=run-cppa-risk-assessment`.
  - §16 pre-ping PASSED: `expected=enforce`, `actual=enforce`,
    `build_stamp=ltp-risk-pre-waved-emitter-fixes@2026-07-27T06:55:00Z`.
  - Orchestrator returned `202` (`qbo-corrections-bundle-mode-assert@2026-07-27T06:10:00Z`).

## Terminal
- `status=complete`, `phase=done`, `last_error=NULL`,
  `last_heartbeat_at=2026-07-27T09:14:18.806Z` (wall ≈ 15m 34s).
- Child run: `quality_runs.id=dafa5e43-4fa2-4f5d-82ae-32ae1fa0765b`, run #152.
- Scores: Claude `70.15`, GPT `81` (within batch noise vs. clean run #151 at 69.7 / 87).

## Secret hygiene
- `LTP_TEST_FORCE_WRITE_AROUND` DELETED immediately post-terminal
  (single terminal-then-clear; no other batches launched while the env was set;
  clean arm #151 had already terminated at 08:07Z, so no cross-arm contamination).

## Chain state
- Stage A now COMPLETE (both arms terminal, secret cleared).
- Stage B (SMOKE-FIX-ROUND) unblocked per dispatch ordering; not executed this turn.
- Deep write-around section inventory (per-section registry-only vs. trajectory,
  "Items-for-your-review" disclosure, internal-vocabulary scrub) DEFERRED — the
  `quality_runs` table on this project does not surface `report_data` /
  `ltp_mode` / `ltp_write_around_reason` columns for direct SQL introspection.
  Extraction must go through the run's report artifact; recorded as follow-up
  in Stage B rather than blocking A.ii closure.

HARD STOP after this courier per dispatch.
