# ITEM 255 — REPLAY HARNESS ENDPOINT (Stage B(2)) — 2026-07-29

**Status:** BUILT + DEPLOYED (function only). NO harness invocation this
turn. Controller invokes personally after wire verification.

## Files

- Migration: `public.replay_harness_jobs`, `public.replay_harness_results`
  (both service-role-locked; RLS enabled; anon/authenticated REVOKEd).
- New function: `supabase/functions/replay-cppa-risk-harness/index.ts`.
- Reuses (import-only, unmodified): `_shared/ltp/pass1-llm.ts`,
  `_shared/ltp/pass2-assembler.ts`, `_shared/ltp/replay/{providers,
  substance-gates, side-by-side, presence-band, types}.ts`.
- Untouched: `supabase/functions/run-cppa-risk-assessment/`,
  `supabase/_rebuild-snapshot-item244/`, all other `_shared` modules,
  the grader.

## Design (team-unanimous, four-lens)

**Launch authorization = SINGLE-USE JOB ROW (capability pattern).** The
controller INSERTs a row into `replay_harness_jobs` (status=`queued`) via
`query_database`. The function ONLY runs when `GET ?run=1&job=<uuid>`
names an EXISTING row with `status='queued'`, and atomically flips it to
`'running'` via `UPDATE ... WHERE id=$1 AND status='queued' RETURNING`. If
0 rows return, the request is rejected (prevents replay/double-fire). The
row is marked `'done'` on success, `'error'` on any top-level throw. The
random job UUID is the capability. No shared secrets in repo or URL.
Unauthenticated calls without a valid queued job id do nothing.

- **CS lens:** single-use capability token; atomic CAS; fail-closed on
  env gate and on unknown job ids; top-level `try`/`catch` guarantees the
  job row is always terminated. Per-doc failures append
  `harness_error:<msg>` to that doc's `hard_failures` and CONTINUE the
  batch (fail-loud, never silent). Hard cap: `MAX_DOC_IDS = 50` per job.
- **Privacy-law lens:** archived intake data never leaves the DB —
  fetched by service role from `quality_archive.quality_run_documents_20260728`
  and processed in place. Results rows carry metrics + assembled report
  JSON in a service-role-locked table. No new customer surface, no PII
  copied into any user-visible table.
- **Prompt-engineering lens:** consumes `runPass1Llm` and
  `PASS1_MANIFEST` untouched. The harness measures the contract, it does
  NOT modify it. Any future prompt change is a separate A/B experiment
  per SPEC §3.7/§7.3.
- **Prose lens:** N/A — no customer prose authored.

## Fail-closed env gate

The function requires **both**:
- `LTP_ENFORCE_ENABLED=1` (Pass-1 enforcement gate — otherwise
  `runPass1Llm` would silently degrade). On absence, the job is marked
  `error` with `harness_error:enforce_disabled` and the request returns
  HTTP 412.
- `ANTHROPIC_API_KEY` present. On absence, job marked `error` with
  `harness_error:anthropic_api_key_missing` and HTTP 412 returned.

## Pass-1 usage passthrough — verify-first read

`_shared/anthropic-call.ts` **does** expose full per-call Anthropic
usage on `AnthropicCallResult`: `inputTokens`, `outputTokens`,
`cacheReadTokens`, `cacheCreationTokens`, `stitchedChars`, plus
attempt-level continuation metadata
(`_shared/anthropic-call.ts` — see `interface AnthropicCallResult` block
around lines 68–86; comment: "RC-A A7 — full usage exposed for callers
that want it inline.").

However, **`_shared/ltp/pass1-llm.ts` does NOT surface these fields up
to `Pass1Telemetry`** (see the `Pass1Telemetry` interface at
`_shared/ltp/pass1-llm.ts:86–105` — fields cover `attempts`,
`latency_ms`, `write_around`, `validator_issues`,
`attempts_detail`, `pass1_coherence_rewrites`, `grounded_note*`, but
NOT token usage). Wiring a passthrough would edit `pass1-llm.ts`, which
is out of scope this turn.

**Recorded behavior:** `pass1_usage` on each results row carries
attempt-level timing only:
```
{ attempts, latency_ms, per_attempt_timeout_ms, attempts_detail,
  write_around, validator_issues, grounded_note,
  note: "token_usage_not_surfaced_by_runPass1Llm_2026-07-29" }
```

FUTURE optional passthrough (courier this back before Stage C ramp):
extend `Pass1Telemetry` with an optional `anthropic_usage` field and
have `runPass1Llm` propagate the `AnthropicCallResult` usage keys per
attempt.

## Endpoint contract

- `GET ?ping=1` — safe metadata only:
  `{ ok, harness_build_stamp, pass1_manifest, mined_presence_band,
    env_anthropic_key_present:bool, env_ltp_enforce_enabled:bool }`.
  Env booleans never echo the secret VALUES.
- `GET ?run=1&job=<uuid>` — the CAS + batch flow above. Response:
  `{ ok, job_id, docs_processed, per_doc[{doc_id, hard_failure_count}],
     harness_build_stamp }`.

## Per-doc pipeline

```
loadArchivedDoc(doc_id)   -> quality_archive.quality_run_documents_20260728
                              (tool='cppa-risk')
  -> modelProvider(intake) -> runPass1Llm
  -> assembleReport(plan, {}, { exitMode: "observe" })
  -> evaluateSubstance(plan, assembled, defaultSubstanceGateConfig())
  -> compareDoc(perDoc, legacy_report_data)  [when present]
  -> INSERT replay_harness_results row
     { per_doc_result, side_by_side, pass1_usage, assembled_report }
```

Unknown / missing archive ids do NOT abort the job — they land as
`harness_error:archive_row_not_found` (or `archive_select:<msg>`) in the
per-doc result. Batch continues.

## Migration (DDL summary)

- `public.replay_harness_jobs`: id, doc_ids text[], status
  (queued|running|done|error, default queued), notes, timestamps
  (created_at/started_at/finished_at), error.
- `public.replay_harness_results`: id, job_id (FK → jobs, ON DELETE
  CASCADE), doc_id, per_doc_result jsonb, side_by_side jsonb,
  pass1_usage jsonb, assembled_report jsonb, created_at.
- `REVOKE ALL FROM anon, authenticated;` on both tables; `GRANT ALL TO
  service_role;` RLS ENABLED with a single `FOR ALL TO service_role`
  policy per table. Index `idx_replay_harness_results_job(job_id)`.

## Deploy record

- Function deployed: `replay-cppa-risk-harness` (explicit deploy call).
- Deploy confirmed by platform tooling: `"Successfully deployed edge
  functions: replay-cppa-risk-harness"` (2026-07-29T14:52Z).
- URL:
  `https://tvksbtrelpzhbyeutzgp.functions.supabase.co/replay-cppa-risk-harness`
- Build stamp exported: `replay-cppa-risk-harness-2026-07-29-item255`.
- NO other function deployed this turn. `run-cppa-risk-assessment` NOT
  touched.

## Non-invocation attestation

- Controller did NOT call `?ping=1` and did NOT call `?run=1` this turn.
- No harness job row was INSERTed.
- No Pass-1 call was made. `modelProvider` (which wraps `runPass1Llm`)
  was imported but not invoked.
- No `replay_harness_results` row exists.

The controller invokes personally after wire verification per dispatch.

---

## ITEM 256 addendum — archive access via narrow SECURITY DEFINER RPC (2026-07-29T14:58Z)

### Evidence (controller-verified, job `43683e59-4902-4a92-8f24-544daf53d3e7`)

Ramp-1 run failed fail-loud with per-doc
`harness_error:archive_select:Invalid schema: quality_archive`. PostgREST
does not expose the `quality_archive` schema (INTENTIONAL — archive
isolation from the app's exposed API surface). The `.schema("quality_archive")`
call in `loadArchivedDoc` can never work. Exposing the schema is REJECTED.
`per_doc_result` recorded the error, 0 LLM calls, $0 spent, job marked
`done`, legacy wire untouched.

### Team-unanimous fix — four-lens record

- **CS lens**: single-purpose RPC. No generic SQL surface. One row shape,
  one filter (`tool = 'cppa-risk'`), one input (`p_doc_id uuid`).
- **Privacy lens**: archive isolation preserved — the `quality_archive`
  schema stays unexposed at the API layer; only the one shape reachable
  via the RPC is available, and only to `service_role`.
- **Prompt lens**: n/a — no prompt changes.
- **Prose lens**: n/a — no customer prose.

### Migration (verbatim)

```sql
CREATE OR REPLACE FUNCTION public.replay_harness_fetch_doc(p_doc_id uuid)
RETURNS TABLE (id uuid, intake_data jsonb, report_data jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = quality_archive, public
AS $$
  SELECT id, intake_data, report_data
  FROM quality_archive.quality_run_documents_20260728
  WHERE id = p_doc_id AND tool = 'cppa-risk'
$$;

REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.replay_harness_fetch_doc(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replay_harness_fetch_doc(uuid) TO service_role;
```

### Function edit

`supabase/functions/replay-cppa-risk-harness/index.ts::loadArchivedDoc`
now calls `sb.rpc("replay_harness_fetch_doc", { p_doc_id: docId })` and
maps the returned rows: empty → `"archive_row_not_found"`; error →
`"archive_rpc:<msg>"`. No other function changes.

`HARNESS_BUILD_STAMP` bumped to
`replay-cppa-risk-harness-2026-07-29-item256`.

### Deploy record

- Explicit deploy of ONLY `replay-cppa-risk-harness`:
  `Successfully deployed edge functions: replay-cppa-risk-harness`
  (2026-07-29T14:58Z).
- No other function deployed. `run-cppa-risk-assessment`, the
  `_rebuild-snapshot-item244/` snapshot, and `_shared/` modules untouched.

### Non-invocation attestation (ramp-1 failure + this turn)

- Ramp-1 attempt (`43683e59-…`): 0 LLM calls, $0 spent. All per-doc
  results failed at `loadArchivedDoc` before `modelProvider` was reached.
- This turn: controller did NOT call `?ping=1` or `?run=1`. No new job
  row was INSERTed. Controller re-runs personally after wire verification.

---

## ITEM 260 ADDENDUM — background-task + reaper adoption (2026-07-29)

### Evidence basis (ITEM 259 read-only report)

Ramp-1 attempt 4 (job `c159a22b-b288-4633-a7d3-94319ec455fc`, started
2026-07-29T16:07:21Z) died silently: status stuck `running`, ZERO
`replay_harness_results` rows, no `finished_at`, for 8m54s until the
controller reaped it manually (`controller_reap:isolate_presumed_dead`).

Verbatim log line — the one Pass-1 call that DID complete server-side:

```
2026-07-29T16:08:58Z INFO [ltp-pass1-derive] stage=callAnthropic model=claude-sonnet-4-6 elapsed=96278ms stop=end_turn output_tokens=7888 input_tokens=13528 cache_read=0 cache_creation=0 chars=24572
```

Last recorded activity 16:10:41Z (three bare `shutdown` logs), ~199s after
start. No boot events, no platform kill reason surfaced, and the harness's
top-level `catch` never ran — death occurred outside JS control flow.
Attempt 3 (job `a5c209d1`, pre-Item-258) completed in 1m39.8s under the same
invocation pattern. `supabase/config.toml` declares no function-specific
wall-clock/CPU/memory limits for the harness; it runs on platform defaults.

Legacy comparison: `run-cppa-risk-assessment/index.ts:3921–3953` returns
`202 {accepted:true}` immediately and processes the pipeline inside an
unawaited async IIFE registered with `EdgeRuntime.waitUntil`. The harness had
no such mechanism — it held the request open across the whole doc loop.

Spend-attribution finding: `api_usage` rows produced by harness runs were
labelled `run-cppa-risk-assessment`, because `callPass1Model` hard-coded that
`callerName`.

### Fix

1. **Background pattern.** After the atomic CAS and the fail-closed env gates,
   the entire doc loop + finalize now runs in an unawaited async IIFE
   registered with `(globalThis as any).EdgeRuntime?.waitUntil(...)`; the
   request returns `202 {accepted, job_id, docs, harness_build_stamp}`
   immediately. All error paths inside the background task still write the job
   row (unchanged behavior); the two former `return json(...)` terminals became
   `console.log`/`console.error` since they are no longer on a request path.
   Where `waitUntil` is unavailable (local/dev), the task is awaited inline and
   the same 202 shape is returned with `background:"inline"`. The chosen path is
   appended (never clobbered) to `replay_harness_jobs.notes` as
   `[bg:waitUntil]` or `[bg:inline]` — no new columns.
2. **Reaper (opportunistic).** At the TOP of every request (ping AND run),
   before any other work, one idempotent UPDATE sets
   `status='error', finished_at=now(), error='reaper:stale_running_over_15m'`
   for any row with `status='running' AND started_at < now() - 15 minutes`.
3. **Unchanged.** Env-gate order, CAS semantics, `MAX_DOC_IDS=50` cap, per-doc
   fail-loud continue, results-row shape.
4. **Spend attribution.** `runPass1Llm` accepts optional
   `opts.callerName`, threaded into `callPass1Model` →
   `callAnthropicWithContinuation`. Default remains
   `"run-cppa-risk-assessment"`, so the legacy bundle's behavior is
   byte-identical. `modelProvider` accepts optional
   `{ callerName }` and the harness passes `"replay-cppa-risk-harness"`.
   A compile-time assertion keeps `modelProvider` assignable to
   `Pass1Provider`.

### Lens record

CS-led: a proven, in-repo platform pattern ported verbatim in shape from the
legacy wire. Privacy / prompt / prose lenses: n/a — no content, no prompt, no
template, no grader changes.

### Stamps

- `HARNESS_BUILD_STAMP` → `replay-cppa-risk-harness-2026-07-29-item260`
- `PASS1_LLM_STAMP` → `ltp-pass1-llm-item260-caller-attribution@2026-07-29`
