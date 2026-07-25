# T6-DUPLICATE-LAUNCH-INCIDENT — Courier Report

**Dispatch:** `T6-DUPLICATE-LAUNCH-INCIDENT`
**Stamp:** 2026-07-25T21:34:50Z (sandbox clock re-read immediately before write)
**Scope confinement:** this file + `docs/pipeline-state.md` (ledger append + header restamp). ZERO code/prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits. NO deploys.

---

## 1. Incident timeline (from `quality_batch_runs`, verified via `query_database`)

| Event | Batch id | Tools | started_at | completed_at | Terminal status |
| --- | --- | --- | --- | --- | --- |
| T6 measurement of record (split A) | `072eef66-7480-4d33-af19-2e3330050da3` | dpia, dpa-generator | 20:12:51.868Z | 20:30:37.196Z | complete |
| T6 measurement of record (split B) | `6f90f7b8-447a-4902-993d-af53265fdb91` | lia, governance, ir-playbook | 20:12:51.821Z | 20:35:34.586Z | complete |
| Duplicate #1 (surviving longest) | `f2ac3a26-6e01-4c07-8235-df54c0000d91` | 5-tool | 21:16:01.046Z | 21:33:17.615Z | cancelled (cancel_requested=t) |
| Duplicate #2 | `b6d4cc45-1bb4-42ca-8325-6ddcc94b2175` | 5-tool | 21:17:00.634Z | 21:19:28.285Z | cancelled |
| Duplicate #3 | `25cd1c47-35bd-4e0d-a59d-5612772f741e` | 5-tool | 21:18:00.946Z | 21:19:25.240Z | cancelled |

**T6 measurement of record = the 20:12 pair.** Both rows are terminal with `tool_results` present; digest already extracted at 20:39Z (see `docs/courier/T6-NONCPPA-MEASUREMENT-BATCH-1-2026-07-25.md` §8 and ledger item 81 — per-tool scores, dim breakdowns, stamp-echo verification, and per-tool fix backlogs are all on record). No re-extraction required this turn.

**Two-batch split deviation (20:12 pair)** — recorded in the T6 courier §3: the non-campaign `startRun` path in `quality-batch-orchestrator` accepts a single `batch_size` per `quality_batch_runs` row (per-tool sizing lives only on campaign `tool_state`). To preserve per-tool comparability with Jul-24 baselines (dpia/dpa=3, lia/gov/ir=2) without instantiating a campaign row, the dispatch was split into two parallel batches under one dispatch id. Instrument, launch window, and wave posture were identical.

## 2. Duplicate spend ruled

Three duplicate 5-tool batches were inserted a minute apart (21:16:01 / 21:17:00 / 21:18:00Z — retry-loop signature on the launch path). `batch-kickoff-pickup` logs across that window show `noop` then `single_flight_skip` — the cron did NOT create them. Two (`b6d4cc45`, `25cd1c47`) were cancelled ~21:19Z by automatic dedup (actor to be identified from `quality_batch_log` if recorded). Surviving duplicate `f2ac3a26` had `cancel_requested=true` set by controller at ~21:36Z via `query_database` and reached terminal state `cancelled` at 21:33:17.615Z. All three duplicates are terminal. Duplicate spend is bounded: two duplicates lived ~2.5 min each, one lived ~17 min before cancel propagation; no duplicate produced a competing `tool_results` write that would corrupt the T6 measurement of record.

## 3. Root-cause hypothesis

Launch-path retry without an idempotency guard: the launcher re-inserted a fresh `quality_batch_runs` row whenever the kickoff row didn't advance within its wait window. Three inserts at exact 60s spacing is the classic `pg_cron` 1-minute-minimum retry signature on a non-idempotent launch handler.

## 4. Prevention recommendation (RECOMMEND ONLY — no schema change this turn)

Add an idempotency key to non-campaign batch insertion. Two shapes are viable; a follow-up harness turn should select one:

- **Unique partial index** on `(tools::text, started_at::date)` for non-campaign batches within a short window; a duplicate insert within the window raises a constraint violation the launcher can treat as "already started, adopt existing row".
- **Launch-request dedup token** — dispatch generates a UUID, launcher stores it on the row and short-circuits any subsequent insert carrying the same token.

Either shape closes this class of retry-loop duplication without changing the current cron gate.

## 5. Wave-26 path clearance

Verified 21:34:50Z: no non-terminal `quality_batch_runs` rows. All five 21:xx duplicates are `cancelled`; the 20:12 pair is `complete`. Wave-26 launch window (~22:00Z, ~25 min clear) is unobstructed.

## 6. Guardrails observed

- Docs-only; writes limited to this file and `docs/pipeline-state.md`.
- No code, no deploys, no edge-function/rubric/grader/golden/registry/fixture/corpus edits.
- Stamp re-read from sandbox clock immediately before write (21:34:50Z).
- No re-extraction of the T6 digest — the 20:39Z extraction (item 81 + T6 courier §8) stands.
