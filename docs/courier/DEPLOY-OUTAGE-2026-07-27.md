# DEPLOY-OUTAGE — 2026-07-27

## Summary
At ~10:19Z, a large fraction of edge functions began returning HTTP 404
`{"code":"NOT_FOUND_FUNCTION_BLOB","message":"Requested function was not found"}`
to every invocation, including all cron-driven calls. The harness's autonomic
layer (`batch-kickoff-pickup`, `improvement-cycle-watchdog`, `ql2-watchdog`,
`reap-stuck-generations`, `delivery-sentinel`, ingestion + brief cron jobs) was
fully blind: `cron.job_run_details` shows ticks firing normally, but
`net._http_response` records 404 blob-not-found on every call. `function_runs`
recorded zero rows in the interval.

## Inventory (11:03Z probe)

Alive at outage detection:
- `run-cppa-risk-assessment` → HTTP 200, ping surface intact:
  `build_stamp=ltp-risk-smokehang-persistfirst-retry@2026-07-27T15:05:00Z`,
  `ltp_mode=enforce`, `composition_enforce=1`,
  `persist_first_retry=retry-budget@2026-07-27-persistfirst`,
  `safe_finalize=safe-finalize@2026-07-27-hangfix`.
  (Persist-first deploy from prior turn confirmed live post-outage — not a
  casualty.)
- `quality-batch-orchestrator`, `run-quality-batch` → 405 on OPTIONS (alive,
  reject non-POST).
- A few utility functions (`fetch-updates`, `fetch-court-filings`,
  `backfill-ai-summaries`) → 200.

NOT_FOUND_FUNCTION_BLOB (35 functions):
`batch-kickoff-pickup`, `delivery-sentinel`, `improvement-cycle-watchdog`,
`reap-stuck-generations`, `ql2-watchdog`, `cron-generate-briefs`,
`send-weekly-brief`, `send-renewal-reminders`, `monitor-jurisdictions`,
`schedule-registration-renewals`, `cppa-check-source-updates`,
`send-cppa-drift-reminders`, `regulator-ingestion-orchestrator`,
`corpus-enrichment-orchestrator`, `per-regulator-ingestion`,
`track3-discovery-orchestrator`, `track3-extract-orchestrator`,
`fetch-newsapi`, `fetch-congress-bills`, `fetch-federal-register`,
`fetch-sec-breaches`, `ingest-gdprhub`, `ingest-cms-tracker`,
`ingest-gov-enforcement`, `enrich-enforcement`, `enrich-legacy-corpus`,
`translate-articles`, `translate-weekly-brief`,
`generate-sample-brief-translations`, `backfill-enrichment`,
`backfill-fsor-summaries`, `batch-fetch-primary-sources`, `process-li-updates`,
`classify-quality-findings`, `run-registration-assessment`.

## Redeploy
All 35 redeployed in a single batch via the platform deploy tool.
Post-deploy OPTIONS sweep of the harness-critical set returned 200 across
the board:

```
200 batch-kickoff-pickup
200 delivery-sentinel
200 improvement-cycle-watchdog
200 reap-stuck-generations
200 ql2-watchdog
200 quality-batch-orchestrator
200 run-cppa-risk-assessment
```

`run-cppa-risk-assessment` ping re-verified post-recovery — build stamp and
surface (`persist_first_retry`, `composition_enforce=1`, `ltp_mode=enforce`)
unchanged from the pre-outage echo. Persist-first deploy from the previous
turn is intact.

## Root-cause note
Platform-side blob-resolution incident, not a partial deploy on our side.
Evidence: (a) the affected set spans functions we have not touched in weeks
(ingestion, translation, brief cron) alongside recently-deployed ones —
inconsistent with any single deploy action; (b) `run-cppa-risk-assessment`,
the function most recently deployed (persist-first retry, 15:05:00Z stamp)
was NOT affected — the opposite of what a partial-deploy race would predict;
(c) the failure mode `NOT_FOUND_FUNCTION_BLOB` is the platform's blob-store
lookup failure surface, not a user-code error. The redeploy resolved it
because it forced a fresh blob write; the underlying trigger was upstream of
our code. Classification: **platform incident**, mitigated by redeploy.

## DB-side recovery verification
Controller-inserted smoke batch `cd1cb716-73f5-40d9-8341-e2e939e40da0`
(queued 10:58:31Z, `declared_count=1`, tool `cppa-risk`, admin `created_by
02bc7cd6-…`) was still within its 30-min reap window at recovery.

At 11:10Z (one `*/2` cron tick after redeploy):
```
id=cd1cb716-…  status=running  phase=running_tool  last_heartbeat_at=2026-07-27 11:09:57Z
```
Batch transitioned `queued → running` on the natural cron cadence — no manual
kick. State machine served it as designed. Harness autonomic layer verified
back on the wire.

## Chain state
Precedes and gates CONTINUATION-6. Stage-B CONTINUATION-5 steps 9/9b/10/11/12
remain owed to controller once the wrapped smoke `cd1cb716` reaches terminal.
