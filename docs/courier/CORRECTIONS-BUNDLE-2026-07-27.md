# CORRECTIONS-BUNDLE — 2026-07-27

Dispatch: CORRECTIONS-BUNDLE (gated on STATE-AUDIT item 171). Single deploy;
no enforcement-state change, no Engine-A/switch removal, no batch launch.

## (a) PASS1_MODEL — **HOLD** (constraint named)

`_shared/ltp/pass1-llm.ts` `PASS1_MODEL` **not changed** this turn.

- **CEO Q3 same-model ruling** requires Pass-1 to use the generator's own
  model — currently `claude-sonnet-4-6`, invoked in
  `run-cppa-risk-assessment/index.ts:874` via `callAnthropicWithContinuation`
  (direct Anthropic API).
- **Constraint:** the Lovable AI Gateway's chat allowlist (probed at
  `https://ai.gateway.lovable.dev/v1/chat/completions` this turn) contains no
  Anthropic models. A probe with `model="anthropic/claude-sonnet-4-6"`
  returned **HTTP 400 unknown model**; the returned allowlist enumerates
  `google/gemini-*` and `openai/gpt-*` families only.
- Per dispatch: "if the gateway cannot serve that model, HOLD naming the exact
  constraint — do NOT substitute any other model." Status recorded; no
  substitution made. `PASS1_MODEL` remains `google/gemini-3.6-flash` pending
  either (i) Anthropic addition to the gateway allowlist or (ii) explicit CEO
  substitution ruling.

## (b) §16 measurement-validity — wired into every launch path

New shared helper: `supabase/functions/_shared/ltp/mode-assert.ts`
- `LTP_MANAGED_TOOL_TO_FN = { "cppa-risk": "run-cppa-risk-assessment" }`.
- `ltpExpectedMode()` reads env `LTP_MODE_EXPECTED` (default `"enforce"`).
- `assertLtpModeForTools(tools)` GETs each managed tool's `?ping=1`, compares
  reported `ltp_mode` to expected, returns structured `{ ok, checks[] }`.
  NEVER throws — callers must abort on `!result.ok`.

Wired into (three deploys this turn):

1. **`batch-kickoff-pickup`** (BUILD_STAMP
   `qbp28-corrections-bundle-mode-assert@2026-07-27T06:10:00Z`) — kick branch
   now (i) reads `tools` off the row (added to the pickup SELECT),
   (ii) calls `assertLtpModeForTools(tools)` BEFORE `invokeGated`, (iii) on
   mismatch marks the row `status='failed'/phase='done'` with a
   `[kickoff-pickup: §16 mode-assert abort tool=… checks=…]` note in
   `last_error`, logs the check payload, returns HTTP 409. Row-durable per R5.

2. **`quality-batch-orchestrator`** (BUILD_STAMP
   `qbo-corrections-bundle-mode-assert@2026-07-27T06:10:00Z`) — three insert
   paths guarded pre-insert:
   - `startRun(userId, tools, …)` returns `{ ok:false, status:409 }` on mismatch.
   - `startPinnedRerunBatch(tool, …)` same.
   - `startCampaignWave(campaign)` logs `Wave aborted (§16): ltp_mode_mismatch …`
     to `quality_campaigns.progress_log` and returns `{ started:false,
     reason:'ltp_mode_mismatch:<tool>' }`.

3. **`kick-perfect-intake`** (BUILD_STAMP
   `kick-perfect-intake-mode-assert@2026-07-27T06:10:00Z`) — resolves
   `quality_runs.tool` via REST, calls `assertLtpModeForTools([tool])` before
   invoking `run-quality-batch`, returns HTTP 409 on mismatch. All responses
   now carry `mode_check` and `build_stamp`.

Reference implementation preserved in `kick-wrapped-batch/index.ts` (unchanged
this turn); the new shared helper matches its logic and is now the single
source of truth.

## (c) Test-only forced-degradation hook

`_shared/ltp/pass1-llm.ts` — `runPass1Llm` now short-circuits to
`writeAroundPlan(input, "test_only_forced_degradation")` iff env
`LTP_TEST_FORCE_WRITE_AROUND === "unit-test-only-2026-07-27"`. The magic
token is deliberately long and dated; a stray `"1"` or `"true"` cannot trip
it. Production requests NEVER set this env var.

New test: `_shared/ltp/pass1-llm.test.ts` — two Deno tests:
1. Sets the magic token → asserts `telemetry.write_around=true` and
   `telemetry.error === "test_only_forced_degradation"`.
2. Iterates `["1","true","yes",""]` values → asserts the sentinel
   `test_only_forced_degradation` is NEVER returned. Property proved.

## Test suite (full paste)

```
$ cd supabase/functions && deno test --allow-env --allow-net \
    _shared/ltp/pass1-llm.test.ts _shared/ltp/waveb.test.ts \
    run-cppa-risk-assessment/_ltp.test.ts

running 8 tests from ./run-cppa-risk-assessment/_ltp.test.ts
LTP: shadow orchestrator produces telemetry envelope ... ok (2ms)
LTP: ADMT gate blocks when q18_admt_use is negative ... ok (0ms)
LTP: ADMT gate passes when q18_admt_use is affirmative ... ok (0ms)
LTP: Guide stage emits candidate-set-closed frame entries ... ok (0ms)
LTP: closeness heuristic + variant chooser deterministic ... ok (0ms)
LTP: write-around trips on internal derive failure (never blocks) ... ok
LTP: verify stage disabled by default ... ok (0ms)
LTP: subsumed-guards telemetry names the interim scrubbers ... ok (0ms)
running 2 tests from ./_shared/ltp/pass1-llm.test.ts
pass1-llm: forced-degradation hook trips ONLY on magic token ... ok (4ms)
pass1-llm: forced-degradation hook does NOT trip on '1' or empty ... ok (0ms)
running 10 tests from ./_shared/ltp/waveb.test.ts
pass1-llm: write-around when LTP_ENFORCE_ENABLED is not set ... ok (1ms)
pass1-llm: write-around fallback preserves customer path on gateway missing key ... ok (1ms)
pass2-render: forbidden-token check catches § injection via slot ... ok (0ms)
pass2-render: emits_nothing template renders empty ... ok (0ms)
pass2-render: unknown template returns error ... ok (0ms)
calibration assert: firm variant forbidden at high closeness ... ok (0ms)
slot-resolver: token-list buckets fall through to sentinel on empty plan ... ok (0ms)
slot-resolver: unknown slot returns empty ... ok (0ms)
pass1 manifest exposes model + prompt version ... ok (0ms)
all 16 templates enumerated ... ok (0ms)

ok | 20 passed | 0 failed (212ms)
```

## Deploy protocol

- Fresh-clock BUILD_STAMPs (three separate stamps, all `2026-07-27T06:10:00Z`).
- Deployed via `supabase--deploy_edge_functions`:
  `batch-kickoff-pickup`, `quality-batch-orchestrator`, `kick-perfect-intake` —
  **all three reported "Successfully deployed"** in a single dispatch call.
- No enforcement-state change (`LTP_ENFORCE_ENABLED` untouched).
- No batch launch this turn.
- Campaign `fd1be147` remains PAUSED.

## Not touched

- `run-cppa-risk-assessment` (no code change; enforcement-state unchanged).
- Engine-A / switch removal — untouched.
- Instrument / rubric / golden / corpus / contract — untouched.
- Run #147 remains SEALED per item 166; Run #149 remains NON-EVIDENTIAL per
  item 169; item 168 verdict remains RETRACTED.
