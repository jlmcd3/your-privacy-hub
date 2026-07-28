# ITEM 216 RULINGS EXECUTED — Item 217 (2026-07-28 ~03:15Z)

CEO ruling (verbatim, 2026-07-28): *"Let's fix both, but I want to end the smoke tests and do a production run of the product as built now and then score that. So do the fixes, and run one more smoke, but then we do a real production run and see where we have landed."*

**PLAN AMENDMENT:** after Item 217 lands and ONE more smoke (#12) is evaluated, the smoke-test phase ENDS regardless of the §22.1 three-clean counter. Next step is a production run — Wave-D shape, Engine-B-led batch of 6 (CEO pre-authorized) — scored, as the acceptance baseline. §22.1 counter is superseded by CEO acceptance criteria for this product. Campaign `fd1be147` remains CEO-reserved and untouched.

Two fixes landed in a single turn on `run-cppa-risk-assessment`; no
grader/instrument changes; no batch inserts.

## Fix (a) — COMPOSITION-HOOK-AUDIT AUTHORIZATION MODEL

Smoke #11 threw `CompositionHookAuditError` because the write-around
branch was entered without `LTP_TEST_FORCE_WRITE_AROUND`. But the
production clock-cap write-around (Pass-1 75s cap → `write_around=true`;
seen smokes #4/#10/#11) is a DESIGNED degradation per the Item-203
clock contract, not a test scenario. The audit is reworked so that
entry into the write-around branch is AUTHORIZED when it originates
from a known runtime path.

- `_shared/ltp/composition-hook-audit.ts`:
  - New `WriteAroundOrigin = "clock_cap" | "timeout" | "test_forced" | "unknown"`.
  - `HookAuditInput` gains optional `writeAroundOrigin`.
  - Truth table:

    ```
    hook SET   + branch entered                         → OK
    hook SET   + branch NOT entered                     → THROW  (silent bypass — A.ii, unchanged)
    hook UNSET + branch NOT entered                     → OK     (normal production, unchanged)
    hook UNSET + branch entered + authorized origin     → OK     (Item 217: clock-cap / timeout / test_forced)
    hook UNSET + branch entered + no / unknown origin   → THROW  (unauthorized degradation)
    ```

  - `LTP_TEST_FORCE_WRITE_AROUND` remains the test-only forcing flag,
    not a production authorization gate.
  - Version bumped → `composition-hook-audit@2026-07-28-item217`.

- `_shared/ltp/composition-finalize.ts`:
  - `FinalizeInput` gains optional `writeAroundOrigin`.
  - `FinalizeTelemetry` gains `write_around_origin: WriteAroundOrigin | null`.
  - Hook-audit call now forwards `writeAroundOrigin` — production
    clock-cap entries produce `errored=false`.
  - Version bumped → `composition-finalize@2026-07-28-item217`.

- `run-cppa-risk-assessment/index.ts` wire-site derives origin from
  Pass-1 telemetry (which sets `write_around=true` only after N=2 retry
  exhaustion / timeout / the test forcing token):

  ```ts
  const _pass1Err = _ltpPreview?.telemetry?.error;
  const _writeAroundOrigin =
    _writeAroundEntered
      ? (_pass1Err === "test_only_forced_degradation" ? "test_forced" : "clock_cap")
      : undefined;
  ```

  Value is passed to `safeFinalizeComposition` and echoed in
  `_meta.internal.composition_finalize.write_around_origin` and the
  `composition_finalize_ran` structured log.

## Fix (b) — SAFE-FINALIZE RESTORE MUST NOT DISCARD REPAIRS

Smoke #11 proved the chain: `finalize` throw → `safe-finalize` restored
`originalReport` → the fragment-omit repair (step 0 inside
`finalizeComposition`) was DISCARDED → truncated "We" slot shipped at
`priority_actions[2].deadline_basis`. The repair now runs OUTSIDE the
guarded finalize section, so its output survives any finalize throw.

- `_shared/ltp/composition-finalize.ts` — `safeFinalizeComposition`:
  - `omitFragmentSlots` invoked BEFORE the guarded try, wrapped in its
    own defensive try so a bug in the repair cannot block persist.
  - Guarded finalize receives the ALREADY-REPAIRED report.
  - Catch-path restore baseline is the repaired report, NOT raw input.
  - `SafeFinalizeTelemetry` gains authoritative top-level fields
    `fragment_omit_version`, `fragment_omit_count`,
    `fragment_omit_paths` — populated on BOTH success and catch paths.
    Inner `fragment_omit_*` remains (reads 0 on success because the
    inner pass is idempotent on repaired input).
  - `SAFE_FINALIZE_VERSION` → `safe-finalize@2026-07-28-item217-repair-outside-guard`.

- `run-cppa-risk-assessment/index.ts` wire-site now reads the AUTHORITATIVE
  top-level fields (`_safe.telemetry.fragment_omit_count` /
  `_safe.telemetry.fragment_omit_paths`) into
  `_meta.internal.composition_finalize` and the `composition_finalize_ran`
  log, rather than the inner idempotent re-run values.

## Regression tests (all in `_shared/ltp/composition-hook-audit.test.ts` and `_shared/ltp/composition-finalize.test.ts`)

- **Item 217 fix (a) — authorization model** (5 new hook-audit tests):
  - `NO origin` → THROW (unchanged).
  - `unknown` origin → THROW.
  - `clock_cap` origin → OK.
  - `timeout` origin → OK.
  - `test_forced` origin → OK.
  - `hook set + branch NOT entered` still throws silent-bypass.
- **Item 217 fix (a) — finalize plumbing** (2 new tests):
  - `finalizeComposition` with `writeAroundOrigin="clock_cap"` →
    `hook_audit_ok=true`, `write_around_origin="clock_cap"`.
  - `safeFinalizeComposition` with clock_cap origin → `errored=false`,
    `enforce_violation=false`.
- **Item 217 fix (a) — unauthorized still fails** (1 test):
  - Direct `finalizeComposition` with `writeAroundEntered=true` and no
    origin throws `CompositionHookAuditError`.
  - `safeFinalizeComposition` catches and telemeters
    `error_kind="CompositionHookAuditError"`.
- **Item 217 fix (b) — smoke-#11 exact chain regression** (1 test):
  - Composed object contains `priority_actions[2].deadline_basis="We"` AND
    `writeAroundEntered=true` with no origin (triggers hook-audit throw).
  - Result: `errored=true`, `error_kind="CompositionHookAuditError"`,
    top-level `fragment_omit_count=1`,
    `fragment_omit_paths` includes `priority_actions[2].deadline_basis`,
    and `res.reportData.priority_actions[2].deadline_basis === undefined`.
    The truncated slot DOES NOT SHIP.
- **Item 217 fix (b) — success path** (1 test):
  - Repair happens outside guard; top-level fields authoritative even
    when the inner idempotent re-run reads 0.
- All existing finalize / value-screen / shipped-guard / hook-audit /
  smoke-#9/#10 exact-shape tests stay green.

**deno test result: 48/48 passed** (9 hook-audit + 39 finalize).

## Deploy & §16 ping-prove

- Deployed `run-cppa-risk-assessment` with
  `BUILD_STAMP="ltp-risk-item217-hook-authz-repair-outside-guard@2026-07-28T03:15:00Z"`.
- §16 ping response verbatim:
  - `build_stamp: "ltp-risk-item217-hook-authz-repair-outside-guard@2026-07-28T03:15:00Z"`
  - `composition_enforce: "1"`
  - `ltp_mode: "enforce"`
  - `safe_finalize: "safe-finalize@2026-07-28-item217-repair-outside-guard"`
  - `report_completion_gate: "final-status-and-report-data@2026-07-27-smoke-latency-rootcause"`
  - `persist_first_retry: "retry-budget@2026-07-27-persistfirst"`
  - `post_lint_pass1_timeout_ms: 75000` (Item 203 clock contract preserved)
- All prior gates preserved.

## Scope discipline

Touched ONLY: `_shared/ltp/composition-hook-audit.ts`,
`_shared/ltp/composition-hook-audit.test.ts`,
`_shared/ltp/composition-finalize.ts`,
`_shared/ltp/composition-finalize.test.ts`,
`run-cppa-risk-assessment/index.ts`. No changes to graders /
instruments / batch rows / other functions.

## Branch gate expectation on smoke #12 (FINAL SMOKE)

- Legitimate clock-cap Pass-1 write-around → `composition_finalize.errored=false`
  (Item 217 fix (a) proven).
- Any residual whole-value truncation slot → shipped without the
  truncated key AND with `fragment_omit_paths` populated even if
  `finalize` throws for any other reason (Item 217 fix (b) proven).
- `shipped_value_screen` remains the enforce-authority for shipped
  leak-lexicon / truncated-slot-value hits (Item 215, unchanged) —
  Item 217 does not touch it.

**Disposition: READY-FOR-SMOKE-12 (FINAL SMOKE). HARD STOP.**
Controller launches smoke #12; after review the smoke phase ENDS and
the product moves to a real production run (Wave-D shape, Engine-B-led
batch of 6, scored).
