# PROCESS-RETRO-WRITEBACK — cross-reference courier

**Dispatch id:** PROCESS-RETRO-2026-07-27
**Turn timestamp:** 2026-07-27 ~04:15Z
**Ledger item:** 165

## VERIFIED-FACTS preamble (per §24 / R6, landed this turn)

Read against live state at 2026-07-27T04:12–04:16Z:

- `supabase/functions/batch-kickoff-pickup/index.ts` — read; contains `KICKOFF_ELIGIBLE`, `isKickoffEligible`, BUILD_STAMP `qbp26-launch-state-equivalence@2026-07-27T03:30:00Z` (bumped this turn to `qbp27-state-machine-conformance@2026-07-27T04:15:00Z`).
- `supabase/functions/batch-kickoff-pickup/{cancel-any-pre-execution,launch-state-equivalence}.test.ts` — read; used as pattern reference.
- `docs/design/LEGAL-TEST-PIPELINE.md` — read (§16–§18 anchors); this turn appends §19–§25.
- `docs/pipeline-state.md` — read tail through item 164 (Wave-C digest); this turn appends item 165.
- `supabase--test_edge_functions` — new conformance test file runs 6/6 green (2 shape tests + 4 ownership tests + verifyStateMachine boot-line print `ok=true legal=6 owned=3 unowned=0 missing_cancel=0`).
- `supabase--deploy_edge_functions(["batch-kickoff-pickup"])` — success this turn.

Turn clock (`date -u`): 2026-07-27T04:15Z.

No unverified assumptions ship in this courier.

## Root diagnosis (recorded)

The night's seven operational incidents share four structural causes:

1. **No canonical harness state machine.** States existed but no document said who owned each. `(queued, starting)` was a legal insert shape but no daemon served it.
2. **Actions executing against stale state.** Ops instructions were issued on turn-start context and executed without re-reading the live row.
3. **No ops post-conditions.** Launches, cancels, and env flips did not verify their own outcome in-turn; silent failures accumulated for minutes to hours.
4. **Compounded novelty per measurement.** A measurement wave carried multiple untested changes; when it failed, root-causing had to disentangle several variables at once.

## Standing law landed this turn

| Clause | Fix                                              | Location                                                                         |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| R1     | Canonical state machine                          | `docs/design/HARNESS-STATE-MACHINE.md` (new); `LEGAL-TEST-PIPELINE.md` §19       |
| R2     | Guarded mutations (compare-and-act)              | `LEGAL-TEST-PIPELINE.md` §20                                                     |
| R3     | State-ownership map + live-row rule              | `LEGAL-TEST-PIPELINE.md` §21                                                     |
| R4     | Smoke-before-measure (batch_size=1 gate)         | `LEGAL-TEST-PIPELINE.md` §22                                                     |
| R5     | Ops post-conditions (verify in-turn)             | `LEGAL-TEST-PIPELINE.md` §23                                                     |
| R6     | Controller courier discipline (VERIFIED-FACTS)   | `LEGAL-TEST-PIPELINE.md` §24                                                     |
| R7     | Generated-ids only (no literal UUIDs)            | `LEGAL-TEST-PIPELINE.md` §25                                                     |

## Harness code landed this turn (one harness turn per dispatch)

- `supabase/functions/_shared/harness/state-machine.ts` — NEW. Canonical `LEGAL_STATES`, `TERMINAL_STATES`, `PRE_EXECUTION_STATES`, `OWNERSHIP`, `CANCEL_OWNERSHIP`, `REAP_OWNERSHIP` maps + `verifyStateMachine()` + `assertStateMachineConformance()`. Single source of truth per R1.
- `supabase/functions/batch-kickoff-pickup/state-machine-conformance.test.ts` — NEW. Six tests: every non-terminal state has a primary owner; every terminal state has null owner; every non-terminal state has a cancel path (§17); every non-terminal state has a reap owner; picker `KICKOFF_ELIGIBLE` ≡ canonical `PRE_EXECUTION_STATES` (§18); `isKickoffEligible()` serves every canonical pre-execution state. All 6 pass.
- `supabase/functions/batch-kickoff-pickup/index.ts` — imports `assertStateMachineConformance` + `verifyStateMachine`; prints boot-line conformance summary; asserts at import. BUILD_STAMP bumped to `qbp27-state-machine-conformance@2026-07-27T04:15:00Z`. Deployed.
- Boot-line proof (from test run): `[batch-kickoff-pickup] state-machine conformance: ok=true legal=6 owned=3 unowned=0 missing_cancel=0`.

Orchestrator and delivery-sentinel filters are consistent with the canonical map as-is (they operate on `running/running_tool` and terminal states only); no filter re-key required this turn. Per §19, any future edit to those functions MUST include its own conformance test; that obligation is now standing.

## Incident → clause cross-reference

Each of the seven incidents from 2026-07-26/27 mapped to the clause that prevents its recurrence:

| # | Incident                                                                                   | Structural cause    | Prevented by |
| - | ------------------------------------------------------------------------------------------ | ------------------- | ------------ |
| 1 | **Bare-run wedge** (Wave-B run `d8d42997` orphaned by runtime shutdown; no wrapper)         | No canonical state machine (bare runs not part of the map); no post-conditions | R1 (state machine), R4 (smoke), R5 (post-conditions: launch → pickup within 2 cycles) — bare launches now forbidden by §152 batch-wrap rule; runs entering the map are wrapper-adopted only |
| 2 | **Isolate orphan** (run marked "Orphaned by runtime shutdown — rerun to continue")          | No canonical reap owner; stale-heartbeat detection incomplete | R1 (reap ownership in `HARNESS-STATE-MACHINE.md` §5); R5 (post-condition: heartbeat advance in-turn) |
| 3 | **Enforce-mode silent-off** (Wave-B.2 ran with `mode='shadow'` despite env vars)            | Compounded novelty + no boot-line assertion | R4 (smoke-before-measure catches config drift on 1 doc); §16 already landed the fail-loud fix; R5 (post-condition: env flip → boot-line echo) |
| 4 | **Zombie mutex** (`9c1e3a8f` held single-launch mutex in `queued/starting` forever)         | Unserved state; no cancel path for `queued/starting` | R1 (state machine — no unserved states can exist); §17 (cancel-any-pre-execution) + conformance test enforces cancel-path presence for every non-terminal state |
| 5 | **`queued/starting` stall** (Wave-C `2a3c07a2` stalled >30 min, 0 docs)                     | Same as #4 — unserved state | R1 + §18 (launch-state equivalence); conformance test asserts `KICKOFF_ELIGIBLE ≡ PRE_EXECUTION_STATES` |
| 6 | **Stale-state cancel** (item 162 cancelled `2a3c07a2` at 03:16:49Z, 15s after it had already gone `running_tool`) | Action executed against turn-start state; no compare-and-act guard | R2 (guarded mutations: UPDATE … WHERE status/phase = expected); R3 (live-row rule: re-read immediately before WRITE); R5 (post-condition: cancel → terminal, read back in-turn) |
| 7 | **Placeholder UUID** (`a1b2c3d4-e5f6-4890-abcd-ef0123456789` typed by hand)                 | No generated-id enforcement | R7 (generated-ids only; DB-level `DEFAULT gen_random_uuid()` on launch-inserted tables) |

## Deploy log (this turn)

- `batch-kickoff-pickup` — deployed `qbp27-state-machine-conformance@2026-07-27T04:15:00Z`. `deploy_edge_functions(["batch-kickoff-pickup"])` returned success.
- Conformance tests: 6/6 pass in-project. Boot-line printed on every pre-test setup.
- No other function touched this turn (deploy per protocol: minimal blast radius; §22 smoke-before-measure applies to any subsequent measurement wave).

## Constraints honoured

- Docs-first authoring; one harness turn (`batch-kickoff-pickup` only).
- No measurement batches launched this turn (per dispatch).
- No instrument/rubric/golden/corpus/contract changes.
- Campaign `fd1be147` stays PAUSED (CEO-reserved).
- No literal UUIDs used in this turn's inserts or examples that would land in production tables (courier prose references the historical `a1b2c3d4…` value strictly as an incident citation, not as data to be inserted).

## Prior-item back-references

- Item 152 — batch-wrap requirement (prevents incident #1 class).
- Item 155 — `s5→s6` re-key (relevant to R4 smoke gate).
- Item 157 — Wave-B2 closure fixes.
- Item 159 — enforce-mode regression fix + §16 (prevents incident #3 class).
- Item 160 — Run-146 refinement (evidential-positive subset).
- Item 162 — §17 cancel-any-pre-execution (prevents incident #4 class).
- Item 163 — §18 launch-state equivalence (prevents incident #5 class).
- Item 164 — Wave-C digest + hygiene flag (motivates incident #7 fix).

## Next dispatch expectations (informational, non-binding)

Per §22 (smoke-before-measure), the next measurement wave (Wave-D or a retry of any prior wave under a code change) MUST be preceded by a `batch_size=1` smoke batch that carries the full §16 enforce-mode assertions. Per §24, the launch dispatch that authorizes it MUST open with a VERIFIED-FACTS preamble.
