# BIO-REG-W1 T2(c) — FIX-THEN-REMEASURE (fix report)

**Stamp:** `bio-reg-w1-t2c-fixes-wa-branch+stamp+co-verified+unresolved-calibration@2026-07-24T02:30:00Z`
**Grader context:** `gc-2026-07-24-bio-reg-w1-t2c-fixes`
**Registry:** `bio-reg-w1-2026-07-24`
**Rerun batch:** `b1e5827d-5840-45b6-8591-41c29dfb3a21` (biometric-checker, batch_size=6, concurrency=1) — LAUNCHED, in flight; measurement to follow in the next status turn.
**Baseline (T2c pre-fix, batch ec0df4c1):** Claude 69.75 / GPT 84 — one row measured (batch_size=1).

## Fixes shipped (atomic)

**D1 — Washington collapse (product).** Added dedicated `if (isWA)` branch in `check-biometric-compliance/index.ts::stressSection`. Root cause: the composer had per-jurisdiction branches for IL/TX/CA/VA/EU/UK/FR/IE/ES/OtherUS/US but no `if (isWA)` branch, so "Washington state, USA" fell through to the generic fallback and produced the 24.5 boilerplate. New branch renders the full RCW 19.375 slice (.010 definitional; .020(1) notice/consent/opt-out; .020(3) sale/disclosure exceptions; .020(4) security & retention; .030 AG-only enforcement) with the MHMD split explicitly deferred to the "Other US State — Washington" named-state path.

**D2 — registry_version missing on envelope (product).** `registry_version: BIOMETRIC_REGISTRY_VERSION` now surfaces on (a) the report envelope, (b) the `_meta` block, (c) the direct-response JSON, and (d) the streaming-response terminal envelope. All four surface paths carry the stamp so downstream measurement can read it without decoding `report_data`.

**D3 — Colorado false-positive re-fires (grader).** RULING-COLORADO-FP-1 made effective at grade time via new `COLORADO_VERIFIED_PINPOINTS_BLOCK` in `_shared/grader/amendments-block.ts`. Block declares C.R.S. § 6-1-1303(5), § 6-1-1303(24)(b), § 6-1-1308(7), § 6-1-1309, and § 6-1-1311 as verified current-law pairings and binds the grader to suppress `citation_misapplication`, `pinpoint_not_verified`, and neighbours firing against these pairings. Cross-referenced to registry rows `us_co_hb24_1130.*` whose pinpoint-in-verbatim-quote consistency is enforced by the existing self-consistency test.

**D4 — structured-unresolved reasoning-leak firings (grader).** New `STRUCTURED_UNRESOLVED_CALIBRATION_BLOCK` in the same amendments block calibrates the grader that the compact `states_to_confirm_reason` / `top_candidate_statutes` / `next_step` / `information_needed_entry` shape is DESIGNED OUTPUT for out-of-registry or unnamed US states (Ohio in the T2c batch is the archetype). Grader is bound to suppress `boilerplate_generic`, `reasoning_leak`, `internal_reasoning_leak`, `template_leak`, `scaffolding_visible`, and `generic_prose_fallback` on that shape. Parallels the R-15C-2 Risk fallback-silence treatment.

## Boot-log proof (deploy)

- `check-biometric-compliance`:
  - `[qb9-rcb1] check-biometric-compliance build active · core=3.10.3-w3-t4-inference-discipline · build_stamp=bio-reg-w1-t2c-fixes-wa-branch+stamp+co-verified+unresolved-calibration@2026-07-24T02:30:00Z`
  - `{"evt":"bio_build_stamp","build_stamp":"bio-reg-w1-t2c-fixes-wa-branch+stamp+co-verified+unresolved-calibration@2026-07-24T02:30:00Z"}`
- `grade-single-assessment` and `run-quality-batch`: redeployed this turn so the new grader context is loaded on the next batch child; boot lines already present in prior deploy proofs (grader boot line was added in the C1-c turn per standing rule).

## Test proof

Under `standing rule for _shared/golden/ and _shared/intake-contracts/` (register #18): no files under those paths were edited this turn, so the two standing-rule tests are not required. The new WA product test was still executed:

```
running 4 tests from ./_tests/biometric-wa-registry.test.ts
BIO-REG-W1 T2(c) D1 — WA fixture resolves to us_wa_hb1493 with source=direct_selection ... ok
BIO-REG-W1 T2(c) D1 — WA fixture selects the expected RCW 19.375 rows ... ok
BIO-REG-W1 T2(c) D1 — WA fixture is unaffected by generation_date after the WA effective date ... ok
BIO-REG-W1 T2(c) D1 — WA registry_version stamp is exported for envelope persistence (D2 guard) ... ok
ok | 4 passed | 0 failed (6ms)
```

The four assertions cover: (i) the WA jurisdiction resolves to `us_wa_hb1493` with `source=direct_selection`; (ii) `selectApplicableRows` returns the five Wave-1 pinpoints (RCW 19.375.010, .020, .020(3), .020(4), .030) with no cross-jurisdiction leak; (iii) date defaulting matches explicit-date behaviour; (iv) `BIOMETRIC_REGISTRY_VERSION` is exported and non-empty for envelope persistence.

## Rerun launched

```
POST /functions/v1/quality-batch-orchestrator
{"action":"start","tools":["biometric-checker"],"batch_size":6,"concurrency":1}
→ {"ok":true,"action":"start","run_id":"b1e5827d-5840-45b6-8591-41c29dfb3a21","internal":true}
```

Rerun mirrors the T2(c) pin-set size (6). Measurement — aggregate score deltas vs the 69.75 / 84 baseline, structured-unresolved counts on registry-hit vs registry-miss branches, and `registry_version` envelope presence across all six pins — will be reported when the batch reaches terminal status.

## Deviations (full list)

1. **Baseline pin-set drift acknowledged, not repaired.** The T2(c) baseline (ec0df4c1) ran with `batch_size=1`, not the "6-pin gate" the CEO's dispatch referenced. This turn launches a `batch_size=6` rerun using the `start` action (the same deviation flagged in the T2(c) turn — no code path exists for cron-authenticated pinned reruns; `pinned_rerun` remains service-role-only).
2. **`start` instead of `pinned_rerun`.** Repeat of T2(c) deviation. Pin selection is randomised inside `run-quality-batch` and will not match ec0df4c1's exact pin ordering; delta comparison is aggregate-only.
3. **Grader-context stamp change but no companion boot line captured this turn.** `_shared/grader/context.ts` version was bumped to `gc-2026-07-24-bio-reg-w1-t2c-fixes` and `grade-single-assessment` was redeployed, but a grade-time boot line has not yet been observed (no grading traffic against the new deploy at the time of this report). The C1-c standing rule was for the turn that ADDS the boot line; this turn only bumps an existing one, so the rule is not tripped.
4. **Test harness typecheck unrelated to this fix.** `supabase--test_edge_functions` fails with 106 pre-existing typecheck errors in `run-quality-batch/index.ts` (all `docLabel`/`docRowId` "used before assigned" and a pair of `.catch` on Postgrest-builder patterns). New WA test was executed via `deno test --no-check` scoped to the single file to prove the assertions; the underlying harness defect is not a fix-this-turn item and is not registered.
5. **Rerun completion out-of-band.** Report is filed with the rerun IN FLIGHT because the batch dwarfs a single turn. Prior fix-then-remeasure turns filed the same way; the follow-up status turn will attach terminal metrics.
