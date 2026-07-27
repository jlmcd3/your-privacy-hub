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

---

## Addendum — A.ii Verification + 6003880f FK Root-Cause (2026-07-27T09:20Z)

### 1. Write-around document verification — run #152 (quality_runs.id=dafa5e43-4fa2-4f5d-82ae-32ae1fa0765b)

Direct SQL introspection of the 3 rendered documents in `public.quality_run_documents` (columns: `report_data jsonb`, `overall_score`, `gpt_overall_score`):

| doc | overall | gpt | ltp.telemetry.write_around | "Items for your review" | "registry-only" | "degraded" hits |
|-----|---------|-----|----------------------------|--------------------------|------------------|-----------------|
| 1   | 68.65   | 60  | **false**                  | absent (0 case-var hits) | absent           | 1 (unrelated telemetry field `degraded_count`) |
| 2   | 77.00   | 82  | **false**                  | absent                   | absent           | 1 (same telemetry field) |
| 3   | 64.60   | 81  | **false**                  | absent                   | absent           | 1 (same telemetry field) |

`report_data.ltp.composition.write_around = false` on all three documents. No write-around disclosure block, no registry-only section markers, no internal-vocabulary scrub evidence. `report_data.telemetry.mode` unset (no top-level `mode` field emitted).

**Verdict: A.ii degradation document is UNUSABLE as write-around evidence.** The `LTP_TEST_FORCE_WRITE_AROUND` env var was set on the project prior to §16 pre-ping and deleted after terminal, but the composition path did not read the hook — either the target function isolate cached the pre-set environment, the hook name mismatches the reader, or the reader is gated behind a mode branch that was not entered. Diagnosis and fix belong in Stage B (see §3 below).

**A.ii closure state:** RE-RUN REQUIRED. Single degradation smoke to be launched in Stage B after the hook read-site is corrected; do not re-launch under the current build (would reproduce the null result).

### 2. Root-cause — batch `6003880f-…` FK failure on `quality_runs_created_by_fkey`

**Symptom (Item 179):** Kickoff insert into `quality_batch_runs` (and the downstream `quality_runs` child) rejected with FK violation on `created_by → auth.users(id)` because the seed carried a nil / placeholder UUID (`00000000-…` class).

**Classification:** Kin of the **outlawed placeholder-id class** (§25 GENERATED-IDS-ONLY / §19 GUARDED-MUTATIONS). A synthetic sentinel UUID was accepted at the born-state controller path where an authenticated admin principal is required.

**Root cause:** The canonical born-state insert path (`quality-batch-orchestrator` kickoff wrapper) accepted `created_by` from the request/env without validating it against `auth.users`. The FK deferred the error to write time rather than the controller rejecting the payload at the boundary.

**Proposed guard (Stage-B, single-file):** at the born-state insert boundary, add

```ts
// _shared/harness/created-by-guard.ts (new)
export async function assertCreatedByIsRealUser(admin: SupabaseClient, createdBy: string): Promise<void> {
  if (!createdBy || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy)) {
    throw new Error(`§25 PLACEHOLDER-ID-REJECTED: created_by="${createdBy}" is not a UUID`);
  }
  if (/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(createdBy)) {
    throw new Error(`§25 PLACEHOLDER-ID-REJECTED: created_by is the nil UUID`);
  }
  const { data, error } = await admin.schema('auth').from('users').select('id').eq('id', createdBy).maybeSingle();
  if (error) throw new Error(`created_by lookup failed: ${error.message}`);
  if (!data) throw new Error(`§19 GUARDED-MUTATIONS: created_by="${createdBy}" not present in auth.users`);
}
```

Called from the born-state insert site in `quality-batch-orchestrator/index.ts` **before** the `INSERT INTO quality_batch_runs`. Fail-loud at the controller boundary, never at the FK. Test: unit — pass real admin UUID (green), pass nil UUID (throws §25), pass unknown-but-well-formed UUID (throws §19). Deploy protocol: co-shipped with Stage-B kickoff-path touches.

### 3. Companion Stage-B hook re-audit item (pre-registered)

While applying (2), Stage B must additionally re-audit the `LTP_TEST_FORCE_WRITE_AROUND` reader in the composition path: confirm (a) exact env-var name and casing at the read site, (b) that the reader is not shadowed by an earlier mode-branch return, (c) that the composed document emits `telemetry.write_around=true` and an `Items for your review` disclosure block when the hook is set. Add a fail-loud assertion in the composition path: when the hook is set and the composer does not enter the registry-only branch, throw so the smoke fails visibly instead of returning a normal-looking document.
