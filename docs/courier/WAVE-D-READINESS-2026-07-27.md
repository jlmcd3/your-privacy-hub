# WAVE-D READINESS COURIER — cppa-risk (2026-07-27T04:28:00Z)

**Turn:** LTP-RISK WAVE-D STEP 1 (READINESS CHECKLIST) per dispatch umsg (Wave-D Comprehensive), gated on PROCESS-RETRO-WRITEBACK ledger item 165.

**Standing:** measurement suspension explicitly LIFTED by the Wave-D dispatch for this comprehensive wave only; campaign `fd1be147` stays PAUSED; no other measurement activity outside this chain.

## VERIFIED-FACTS PREAMBLE (R6)

Every claim below is verified against the live sandbox at 2026-07-27T04:28:00Z. Sources: deployed edge function boot log (test-runner boot lines, image identical to production deploy), file content on disk, deno test exit codes, DB read of `quality_batch_runs`.

## §5 Corrections Live-Verification

### (a) Six citation-closure fixes (Wave-B2 root fixes)

| Fix | File | Stamp | Test evidence |
|---|---|---|---|
| Atomic-token truncation guard | `supabase/functions/run-cppa-risk-assessment/_risk_citation_dup_fix.ts` | `risk-citation-dup-fix@2026-07-26T06:20:00Z` | A1–A7, E1–E9 all green |
| Info-needed self-contradiction filter | `_risk_intake_contradiction.ts` | `risk-intake-contradiction-body@2026-07-26T03:31:00Z` | 12/12 tests green |
| T7 prong-map exhaustive assignment | Wave-B2 closure landed in `run-cppa-risk-assessment/index.ts` under `ltp-risk-waveb2-closure@2026-07-27T04:20:00Z` (subsumed into current build) | current | tests co-located |
| Attestation under citation-token discipline | same | current | tests co-located |
| Crosswalk band-matrix + indeterminate class | Wave-B completion (`ltp-risk-waveb-completion@2026-07-27T02:20:00Z`, subsumed) | current | 7120(b) tests green |
| Meta-string ban | vocab-scrub | `w18-risk-vocabscrub@2026-07-25T03:34:41Z` | green |

Live BUILD_STAMP echoing: `ltp-risk-waved-readiness@2026-07-27T04:28:00Z`. All prior stamps echoed in boot line 29 (`w23`, `w24`, `w24a-v3`, `t7-pilotfix`, `t7-pilotfix2`, `risk-cohort-date`, `risk-intake-contradiction`, `risk-citation-dup-fix`).

### (b) Completion-turn wiring

- **Purpose verbatim** — wired through Wave-B-completion; PII field-class rendering rule intact.
- **priority_actions template-bounded** — same completion turn; unchanged this turn.
- **inconsistency_flags validator-only** — same completion turn; unchanged.
- **PII field-class rule** — unchanged.

### (c) Enforce mode per §16

- Deployed boot log line: `[run-cppa-risk-assessment] boot ltp_mode=enforce design=docs/design/LEGAL-TEST-PIPELINE.md §16-measurement-validity-law`.
- Env at boot: `LTP_ENFORCE_ENABLED=1` echoed in boot line 24.
- Ping-time `x-ltp-mode-expected` header enforcement remains active (§16 measurement-validity law).
- `pipeline.ts::runLegalTestPipelineShadow` now hard-codes `_mode: "shadow"` (shadow-arm invariant); fleet mode selection still lives in `ltpMode()` and is reported by the enforce-arm `runPass1Llm`.

### (d) Instrument s6 frozen (hash re-verified)

- `supabase/functions/_shared/grader/context.ts` sha256: `e296d44c5cf56f3a1e8496c8295e0f0723465c409f93e79374885ca894a4bf8d` — unchanged since Wave-B.2 launch.
- `GRADER_CONTEXT_VERSION` value: `gc-2026-07-27-s6-eu-uk-ca-au-sg` — now sourced from the module import (not a string literal in a boot log).
- **Stale-log fix:** the boot log at `index.ts:23` was previously hardcoded `gc-2026-07-26-s5-eu-uk-ca-au-sg`. It now imports `GRADER_CONTEXT_VERSION` from `_shared/grader/context.ts` so drift is impossible. Confirmed live: boot line 26 now prints `grader_context_version=gc-2026-07-27-s6-eu-uk-ca-au-sg`.
- **F0 instrument_version:** the future-building `pattern_observations` insert at `index.ts:3343` was previously hardcoded `"gc-2026-07-26-s5"`. It now writes `GRADER_CONTEXT_VERSION` so F0 rows carry the live instrument version.

### (e) State machine + R1–R7 deployed

- `_shared/harness/state-machine.ts` present; conformance test 7/7 green.
- `batch-kickoff-pickup` deployed at `qbp27-state-machine-conformance@2026-07-27T04:15:00Z`; boot line confirms `state-machine conformance: ok=true legal=6 owned=3 unowned=0 missing_cancel=0` (pre-test and post-test).
- Cancel-any-pre-execution (§17): 6/6 tests green.
- Launch-state equivalence (§18): 5/5 tests green.
- Born-state law + generated-ids: enforced via batch-launch helpers (no literal UUIDs; `gen_random_uuid()` only).

### (f) Future-Building F0 emission

- `pattern_observations` insert path present and non-fatal on error (line 3347); `signature.ts` import intact.
- Instrument-version field now honors the live grader version (see (d) above).

## Type-safety fixes this turn

Three TS errors introduced by earlier re-key work were resolved deterministically (no logic change):

- `index.ts:2942-2948` — `_v3c` may be an array; spread guarded by object-typeof check for `risk_w24a` base.
- `index.ts:2981-2984` — same guard pattern applied to `_rcdC` telemetry envelope.
- `index.ts:3346-3352` — replaced `.catch()` on a PromiseLike-shaped supabase builder with a two-arg `.then(onFulfilled, onRejected)` pattern.

BUILD_STAMP bumped: `ltp-risk-waved-readiness@2026-07-27T04:28:00Z`. Deploy confirmed.

## Test verdict

`supabase--test_edge_functions run-cppa-risk-assessment` → **exit 0**, all suites green:
- `_ltp.test.ts` — 8/8 (shadow orchestrator invariant restored).
- `_w12_turnd.test.ts` — 11/11 (allowlist extended for `ltp-risk-*` stamp family).
- `_risk_citation_dup_fix.test.ts` — 19/19.
- `_risk_intake_contradiction.test.ts` — 12/12.
- `_risk_cohort_date.test.ts` — 16/16.
- `_w10_risk_b1.test.ts`, `_w15_risk_fl.test.ts`, `_w15_risk_va.test.ts`, `_w16_risk_collapse.test.ts`, `_w18_risk_collapse2.test.ts`, `_w18_risk_vocab.test.ts`, `_w19_risk_turnb.test.ts`, `_w20_risk_turnb.test.ts`, `_w24_risk_turna.test.ts`, `_w24a_v3.test.ts`, `_w6_risk_fix.test.ts`, `_w9_risk_slots.test.ts`, `qbp25_b3_pointers_test.ts` — all green.

## READINESS VERDICT

**ALL-GREEN.** STEP 2 (SMOKE per R4) is gate-cleared.

## Next step (STEP 2)

SMOKE batch launched at end of this turn: batch_size=1, tools={cppa-risk}, scenario_set='tuning', standalone s6, born-state canonical, `LTP_ENFORCE_ENABLED=1`, full §16 mode/config assertions armed at kick. Smoke result is NOT evidential for §5 (per R4); it exists solely to prove the deployed image renders one document with enforce mode + all expected stamp echoes + narrative present + zero write-around. On smoke pass, STEP 3 launches Wave D under a separate turn.
