# HARNESS STATE MACHINE — canonical batch / run lifecycle

**Status:** STANDING LAW (PROCESS-RETRO-WRITEBACK, CEO-ordered 2026-07-27, ledger item 165).
**Precedence:** binds all future harness code (`batch-kickoff-pickup`, `quality-batch-orchestrator`, `run-quality-batch`, `delivery-sentinel`, any external launcher). Named laws in `LEGAL-TEST-PIPELINE.md` §17 (cancel-any-pre-execution) and §18 (launch-state equivalence) are subsumed by this document — they remain in force as clauses; this document is the canonical picture they describe.

**Motivation:** the night of 2026-07-27 produced seven operational incidents (bare-run wedge, isolate orphan, enforce-mode silent-off, zombie mutex, `queued/starting` stall, stale-state cancel, placeholder UUID). Root diagnosis: (i) no canonical state machine — states existed but no document said who owned each; (ii) actions executed against turn-start state instead of live state; (iii) no ops post-conditions; (iv) compounded novelty per measurement (multiple untested changes in the same batch). This document fixes (i); §19–§25 in `LEGAL-TEST-PIPELINE.md` fix (ii)–(iv).

---

## 1. Row shape and lifecycle scope

The lifecycle covers a single row in `public.quality_batch_runs` (the WRAPPER) and its adopted child `public.quality_runs` (the RUN). The wrapper is what the harness picks up, cancels, reaps, and completes. The child run is opaque to the picker; it carries scores and per-document artifacts.

Wrapper columns that participate in the state machine:

- `status` — `queued | running | complete | cancelled | failed`
- `phase` — `starting | kickoff | running_tool | done`
- `cancel_requested` — boolean (transition trigger, not a state)
- `heartbeat_at` — `timestamptz` (staleness signal)
- `started_at` / `completed_at` — clock anchors
- `last_error` — free text on failure

A **state** is the pair `(status, phase)`. States not enumerated below are illegal and must not be written by any actor.

## 2. Canonical states

| # | State (`status`, `phase`) | Legal? | Meaning |
| - | ------------------------- | ------ | ------- |
| 1 | `(running, kickoff)`      | YES    | **CANONICAL BORN STATE.** Wrapper is inserted; picker owns transition to `running/running_tool` via orchestrator invocation. |
| 2 | `(queued, starting)`      | YES (legacy shape) | External-launcher born state. Picker MUST normalize to `(running, kickoff)` on kick — see §18. |
| 3 | `(running, running_tool)` | YES    | Orchestrator has invoked the tool; child `quality_runs` row exists and is generating. Owned by orchestrator + tool. |
| 4 | `(complete, done)`        | YES    | Terminal success. Wrapper immutable except for note fields. |
| 5 | `(cancelled, done)`       | YES    | Terminal cancel. Reachable from any non-terminal state. |
| 6 | `(failed, done)`          | YES    | Terminal failure. Reachable from any non-terminal state (reap, orphan, error). |

**R1 ruling (CEO 2026-07-27):** the CANONICAL BORN STATE is `(running, kickoff)`. `(queued, starting)` remains legal as a legacy external-insert shape for compatibility; the picker MUST serve it equivalently and normalize on kick. NEW external launchers MUST insert at `(running, kickoff)` directly.

## 3. Legal transitions

```text
(running,kickoff)  ──picker.kick──▶ (running,running_tool)  ──tool.complete──▶ (complete,done)
       │                                    │                                        │
       │                                    ├─ tool.error ─────────────────────────▶ (failed,done)
       │                                    │
       │                                    └─ reap (stale heartbeat > REAP_STALE_MS) ─▶ (failed,done)
       │
       ├── cancel_requested=true ─┐
       │                          ▼
       │                    picker.cancel-any-pre-execution (§17) ─▶ (cancelled,done)
       │
(queued,starting) ──picker.normalize (§18)──▶ (running,kickoff) ──▶ … (as above)
```

Every transition is a WRITE. Every WRITE is a **guarded mutation** (R2 in `LEGAL-TEST-PIPELINE.md` §20): `UPDATE public.quality_batch_runs SET … WHERE id = $1 AND status = <expected> AND phase = <expected>`. Zero rows affected ⇒ the actor MUST record and re-read; MUST NOT proceed as if the write succeeded.

## 4. Daemon / actor ownership map

Every state has exactly one primary owner. "Owner" means: the actor responsible for driving the row out of that state on the happy path. Other actors may READ any state; only the owner may WRITE the transition out.

| State                     | Primary owner                   | Secondary (cancel/reap) |
| ------------------------- | ------------------------------- | ----------------------- |
| `(running, kickoff)`      | `batch-kickoff-pickup` (cron)   | `batch-kickoff-pickup` reap + cancel-any-pre-execution |
| `(queued, starting)`      | `batch-kickoff-pickup` (cron)   | `batch-kickoff-pickup` reap + cancel-any-pre-execution |
| `(running, running_tool)` | `quality-batch-orchestrator` + tool worker | `batch-kickoff-pickup` reap on heartbeat stall; controller cancel |
| `(complete, done)`        | *(terminal — no owner)*         | — |
| `(cancelled, done)`       | *(terminal — no owner)*         | — |
| `(failed, done)`          | *(terminal — no owner)*         | — |

**Live-row rule (R3, `LEGAL-TEST-PIPELINE.md` §21):** any actor mutating shared state MUST re-read the live row immediately before the guarded WRITE. Turn-start context is never sufficient for a mutation.

## 5. Heartbeat / reap rules

- `heartbeat_at` MUST be updated by the state's PRIMARY OWNER at least once per `PICKUP_STALE_MS / 2` while in a non-terminal state.
- Pre-execution states (`running/kickoff`, `queued/starting`) past `PICKUP_STALE_MS` (2 min) → the picker MAY re-kick.
- Any non-terminal state past `REAP_STALE_MS` (30 min) without heartbeat → the picker MUST reap to `(failed, done)` with `last_error = "reaped: heartbeat stale > REAP_STALE_MS"`.

## 6. Cancel semantics in every state

Per §17 (cancel-any-pre-execution, item 162), the cancel path MUST honour `cancel_requested=true` from EVERY non-terminal state:

| State                     | Cancel path                                                                                        | Terminal     |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| `(running, kickoff)`      | picker finalizes on sight (guarded WHERE clause on the two pre-execution shapes)                   | `(cancelled, done)` |
| `(queued, starting)`      | picker finalizes on sight (guarded WHERE clause on the two pre-execution shapes)                   | `(cancelled, done)` |
| `(running, running_tool)` | orchestrator polls `cancel_requested` between phases; child `quality_runs` marked cancelled first; wrapper transitions after | `(cancelled, done)` |
| terminal states           | ignore (idempotent no-op)                                                                          | unchanged     |

Cancel is never silent. Every honoured cancel writes a note to the wrapper and to the ledger by the actor who honoured it.

## 7. External insert rule and generated-ids (R7)

External launchers (controller `query_database`, dispatch agents, admin UI) inserting a wrapper MUST:

1. Use the CANONICAL BORN STATE `(running, kickoff)` (or the legacy `(queued, starting)`).
2. Let `id` default to `gen_random_uuid()`. NEVER type a literal UUID. See `LEGAL-TEST-PIPELINE.md` §25 (generated-id law). The motivating incident is the `a1b2c3d4-e5f6-4890-abcd-ef0123456789` placeholder from item 162.
3. Set `instrument_version`, `tools`, `batch_size`, `mode` per the launch spec; the picker MUST NOT invent these.
4. Confirm pickup within 2 pickup cycles per §23 (ops post-conditions). Missing pickup within that window is a stall, not a warm-up.

## 8. Conformance test — mandatory

Every deploy that touches `batch-kickoff-pickup`, `quality-batch-orchestrator`, or `delivery-sentinel` MUST include a conformance test asserting:

- Every state in §2 has an entry in the ownership map (§4).
- Every non-terminal state has a defined cancel path (§6).
- The picker's `KICKOFF_ELIGIBLE` set equals the set of pre-execution states in §4.
- No unserved state can exist — a state with no owner and no cancel path is a compile-time (test-time) failure.

Canonical shared module: `supabase/functions/_shared/harness/state-machine.ts`. Test: `supabase/functions/batch-kickoff-pickup/state-machine-conformance.test.ts`. Additional daemons MUST register a conformance test at deploy time.

## 9. Related design law

- `LEGAL-TEST-PIPELINE.md` §16 — measurement-validity law (enforce-mode boot assertion).
- `LEGAL-TEST-PIPELINE.md` §17 — cancel-any-pre-execution law (harness).
- `LEGAL-TEST-PIPELINE.md` §18 — launch-state equivalence law (harness).
- `LEGAL-TEST-PIPELINE.md` §19–§25 — PROCESS-RETRO clauses landed 2026-07-27 (this dispatch).
- `docs/pipeline-state.md` — operational ledger; item 165 records this document.
