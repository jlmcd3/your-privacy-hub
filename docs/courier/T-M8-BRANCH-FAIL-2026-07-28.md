# T-M8 SMOKE — BRANCH FAIL (Evidence-Only Courier)

**Date:** 2026-07-28
**Dispatch:** T-M8 SMOKE BRANCH FAIL — EVIDENCE ROWS ONLY. HARD STOP AFTER.
**Ledger:** Item 229.
**Scope:** No code changes, no deploys, no grader edits, no batch inserts. Fix turn (T-M9) is separately scoped and released.

---

## 1. Controller-verified evidence (verbatim from dispatch)

- **Batch** `quality_batch_runs` `44137ef5-7ea3-4466-b893-964ae5a46cc1`: inserted 07:22:24Z (§18 shape, `batch_size=1`, `declared_count=1`, instrument `gc-2026-07-27-s6-eu-uk-ca-au-sg`); cancelled by controller 07:44:03Z; `actual_count=0`.
- **Run** `quality_runs` #165 `7cdbdf43-1f55-454c-b31f-58235b836113`: poller healthy across 4 isolates (heartbeats to 07:43:33Z), `status=building` at cancel, `error=NULL`.
- **Assessment** `cppa_assessments` `a0c184f4-e8fa-400b-9521-0355234f190f`: created 07:26:03.162Z; `updated_at` FROZEN at 07:26:03.582Z; `status=processing`; `report_data` NULL; `last_error` NULL; `retry_count=0`. ZERO worker writes for 17+ minutes; no Type-J write-around; clock contract never fired.
- **Wire discrepancy:** live `GET ?ping=1` returns `build_stamp=ltp-risk-item226-t-m6-cutover@2026-07-28T09:00:00Z` with `composition_shape` still including `harvest_legacy_generation` — T-M7 (item227) build is NOT deployed, contradicting T-M7 courier's deploy claim. The smoke ran the T-M6 bundle: first-ever live run of the T-M1 authoritative-Pass-1 + T-M6 assembler path.
- **Controller failure hypothesis (RECORDED AS HYPOTHESIS):** `pass1-llm` direct Anthropic continuation call blocked without an enforced outer abort — pre-identified hang class from T-M7 courier and T-M7.1 §7. Declared 75s cap is a budget, not an abort; isolate died silently at the platform ceiling.

---

## 2. Evidence gathered this turn

### (a) Edge-function invocation logs — `run-cppa-risk-assessment`, 07:26:00–07:45:00Z

**No log lines present for the 07:26:03Z invocation.** No `pass1_start`, no Anthropic request/response, no timeout, no exception. The retained log tail contains only a post-cancel cold-start at **07:46:44Z**:

```
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot band_realignment_t2a=LANDED grader_context_version=gc-2026-07-27-s6-eu-uk-ca-au-sg risk_opening_version=risk-opening-t7-pilotfix3@2026-07-26
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot ltp_phase=t-m1-derive-authoritative pass1_authoritative=1 subsumed=_risk_citation_dup_fix,_w18_risk_vocab,_w15_risk_va
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot vocab_scrub_stamp=w18-risk-vocabscrub@2026-07-25T03:34:41Z
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot w21_stamp=w21-risk-turna@2026-07-25T11:47:35Z
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot w23_stamp=... build_stamp=ltp-risk-item226-t-m6-cutover@2026-07-28T09:00:00Z
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot pass1_model=claude-sonnet-4-6 pass1_max_attempts=2 pass1_stamp=ltp-pass1-llm-2026-07-27-anthropic-direct
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot slots_stamp=w9-risk-slots-p1@2026-07-24T09:58:12Z
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot waveb_completion=LANDED waveb2_closure=LANDED surfaces=purpose+priority_actions+inconsistency_flags+pii_narrative+crosswalk_7120b+atomic_tokens+info_needed_contradiction
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot t7_risk_opening_pilot=SHIPPED spec=docs/design/OPENING-PARAGRAPH-DESIGN.md
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot ltp_mode=enforce composition_enforce=1 safe_finalize=safe-finalize@2026-07-27-hangfix persist_first_retry=retry-budget@2026-07-27-persistfirst design=docs/design/LEGAL-TEST-PIPELINE.md §16-measurement-validity-law
2026-07-28T07:46:44Z INFO [run-cppa-risk-assessment] boot build_stamp=ltp-risk-item226-t-m6-cutover@2026-07-28T09:00:00Z
2026-07-28T07:46:44Z LOG booted (time: 44ms)
```

**Observations:**
- No T-M7 (item227) stamp appears anywhere in retained logs — corroborates the wire discrepancy.
- The 07:26:03Z invocation produced no log lines at all in retention; the log goes silent from assessment creation until the post-cancel cold-start at 07:46:44Z.
- Consistent with (but not direct proof of) the controller's silent-isolate-death hypothesis at the platform ceiling.

### (b) Deploy-state evidence

Platform deploy history is not directly enumerable via the tools available to this evidence-only turn. Indirect evidence:

- Live `?ping=1` (controller) and post-cancel boot logs BOTH report `build_stamp=ltp-risk-item226-t-m6-cutover@2026-07-28T09:00:00Z`.
- No boot line reports the T-M7 (item227) legacy-retirement stamp; source code carries the retirement (Item 227 courier).
- The bundle deployed post-T-M7 is therefore stale (T-M6).
- No bundling error line visible in retained logs. The T-M7 courier's deploy claim is either (i) a silently-failed platform deploy or (ii) a deploy that landed a bundle reporting the T-M6 stamp.

Deploy-pipeline diagnosis is scoped to T-M9 per dispatch.

### (c) Cancelled rows' final states (from DB)

**`quality_batch_runs` `44137ef5-7ea3-4466-b893-964ae5a46cc1`:**
```
status              = cancelled
batch_size          = 1
declared_count      = 1
actual_count        = 0
instrument_version  = gc-2026-07-27-s6-eu-uk-ca-au-sg
started_at          = 2026-07-28 07:22:24.435768+00
completed_at        = 2026-07-28 07:44:03.388+00
cancel_requested    = true
last_error          = NULL
```

**`quality_runs` `7cdbdf43-1f55-454c-b31f-58235b836113`:**
```
status                    = cancelled
batch_size                = 1
mode                      = NULL
grader_context_version    = gc-2026-07-27-s6-eu-uk-ca-au-sg
started_at                = 2026-07-28 07:26:02.421+00
completed_at              = 2026-07-28 07:46:07.432+00
last_heartbeat_at         = 2026-07-28 07:46:07.371+00
cancel_requested          = true
error                     = "Cancelled by user"
```

**`cppa_assessments` `a0c184f4-e8fa-400b-9521-0355234f190f`:**
```
status       = error
retry_count  = 0
last_error   = NULL
created_at   = 2026-07-28 07:26:03.162418+00
updated_at   = 2026-07-28 07:50:01.868638+00   (reaper touch, post-cancel)
report_data  = {"error":"reaped_stuck_generation"}
```

The `reap-stuck-generations` sweeper transitioned the row from `processing` → `status=error` at ~07:50:01Z (after controller cancel at 07:44:03Z), writing the marker into `report_data.error` (not `last_error`). `retry_count` remained 0 — the worker never observed the failure to increment.

---

## 3. Disposition

**HARD STOP.** No code, no deploy this turn.

Fix turn (**T-M9**, controller-scoped, awaits separate release):
- Enforced `AbortController` per-attempt timeout raised to 120s × 2 attempts (per CEO caveat).
- Attempt-duration telemetry.
- Deploy-pipeline diagnosis (why the T-M7/item227 build did not land).
- Redeploy of the post-retirement (item227) bundle.
