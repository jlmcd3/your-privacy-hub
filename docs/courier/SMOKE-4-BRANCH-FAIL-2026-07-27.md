# SMOKE #4 — BRANCH FAIL (2026-07-27)

**Batch:** `08499e5f-5930-443e-bb37-adab6eb891cf` (§18 shape, `batch_size=1`, `declared_count=1`, `created_by=02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`)
**Quality run:** `8aa1bcf5-9e04-4161-bcd7-cfdfbbb1a3cc` (run #156)
**Assessment:** `f3a989e7-d89c-47f4-b3d6-2eb2b5dd780b`
**Build stamp on wire:** `ltp-risk-smoke-latency-rootcause@2026-07-27T16:25:46Z`
**Clean-arm counter (§22.1):** unchanged **0/3 for `cppa-risk`**; smokes #153–#155 non-evidential; smoke #4 non-evidential (branch-fail).

## Terminal evidence (from DB, no theory)

- Batch: `queued` 16:39:19Z → picked-up 16:42:18Z → `status=complete` 16:48:16Z; `tool_results[0]`: `{tool:"cppa-risk", final_status:"complete", quality_run_id:"8aa1bcf5…", score_overall:71.55, gpt_score_overall:87, error:null}`.
- `function_runs` for `source_row_id=f3a989e7…`:
  - `run-cppa-risk-assessment` `success` 16:42:03.273Z → 16:47:22.236Z, `duration_ms=318963` (5 m 19 s), `error_message=NULL`.
  - `run-cppa-risk-assessment` `success` 16:46:06.636Z → 16:46:06.636Z, `duration_ms=0` (idempotent secondary invoke).
- `cppa_assessments.f3a989e7…`: `status=complete`, `report_data IS NOT NULL`, `updated_at=16:47:22.021Z` (matches invocation finalize within ~215 ms).
- Intake: `q1_revenue="$25M to under $50M"`, `q2_consumers="250,000 to under 1,000,000"`, `q18_admt_use="No"`.

## Pass criteria — result

| Criterion | Verdict | Evidence |
|---|---|---|
| Clock contract < 15 min E2E | **PASS** | 5 m 19 s |
| `function_runs.status='success'` when doc persisted | **PASS** | Item-203 semantics honored |
| Report-completion gate (no `report_data` before `terminal_complete`) | **PASS** | `updated_at` == invocation `finished_at` ±215 ms |
| `cohort_append` telemetry present | **PASS** | `reason: "band_resolved"`, `appended:false` |
| **Value-screen hits = 0** | **FAIL** | See Defect A |
| **Resolved-band cohort rendered on graded surface** | **FAIL** | See Defect B |

## Defect A — `composition_finalize` enforce-mode violation (persist-first backstop absorbed it)

`_meta.internal.composition_finalize`:

```json
{
  "mode": "enforce",
  "errored": true,
  "enforce_violation": true,
  "error_kind": "ValueScreenError",
  "error_message": "[value-screen] 4 hit(s): leak-lexicon:We  | leak-lexicon:We  | leak-lexicon:We  | leak-lexicon:We ",
  "version": "composition-finalize@2026-07-27",
  "safe_version": "safe-finalize@2026-07-27-hangfix",
  "budget_ms": 15000,
  "elapsed_ms": 3,
  "budget_exceeded": false
}
```

`LEAK_LEXICON` (`_shared/ltp/value-screen.ts`) contains the bare substring **`"We "`** (seeded from A.i #178 owner-slot leak fragment). Applied as a case-insensitive substring match against any non-`{{cite:…}}` string in `report_data`, it fires on any normal English prose containing the word "We " (four such nodes on this doc). The safe-finalize backstop kept the pre-final composed document (as designed), and the doc shipped — but `composition_enforce=1` is producing a violation on every run against legitimate prose, which makes enforce-mode unreliable in production. No content fix invented in this turn.

## Defect B — resolved-band cohort routed to `information_needed`, not rendered on graded surface

Directive requires: resolved band `$25M to under $50M` → **April 1, 2030** on the graded surface.

Actual graded surface (`submission_summary`):

```json
{
  "business_name": "Meridian SaaS Inc.",
  "submission_deadline": "April 1, 2028",
  "compliance_deadline": "December 31, 2027",
  "statutory_framework": "Cal. Code Regs. tit. 11, §§ 7150–7157",
  "triggered_subsections": ["§ 7150(b)(4)"],
  "submission_basis": "triggered subsections: § 7150(b)(4); cybersecurity-audit linkage — § 7120(b)(1) (50%-from-sale/share prong) not met on the record; cybersecurity-audit linkage — § 7120(b)(2)(A) (consumer-volume + revenue prong) indeterminate on the record; cybersecurity-audit linkage — § 7120(b)(2)(B) (sensitive-PI volume prong) not applicable on the record"
}
```

The cybersecurity-audit § 7121(a) cohort is not rendered anywhere on the graded surface. Instead the tool routed it into `information_needed[3]`:

```json
{"id":"info_cyber_audit_7121a3_revenue",
 "topic":"cybersecurity_audit_deadline_cohort",
 "source_fields":["annual_gross_revenue_2028"]}
```

`_meta.internal.risk_w21a` records `a2_cohort_skipped_reason: "no_revenue_signal_under_50m"` — the composer classified the intake as insufficient to resolve the 2027-based cohort and deferred, contradicting the directive that the resolved band render 2030 on the graded surface.

**Neither enumerated branch of the conditional chain applies verbatim**: the deferral routed to `information_needed` (a graded surface), not to `cross_tool_recommendations` (the CUT branch that triggers the resolved-band redirect). No fix invented pending controller ruling.

## Non-evidential residuals (recorded, not fixed)

- `emit_gate.findings` (3 degraded): doubled-token `"the the"` at `$.scope_and_triggers.scope_notes` and `$.inconsistency_flags[0].description`; unterminated-sentence at `$.risk_assessment_by_activity[0].benefits_outweigh_risks_conclusion`. Composer-side.
- `information_needed[0..2]`: three rows missing `id`/`topic`; only `dimensions`/`enables`/`provision`/`source_fields` populated. Composer-side.
- `legal_test_pipeline.enforce_preview.telemetry`: Pass-1 LLM aborted at 75 000 ms (`generation_timeout_330s`), `write_around=true`. Clock-cap fired as designed.

## Disposition

**HARD STOP for controller review.** Two graded-surface defects (Defect A: enforce-mode value-screen false-positive on `"We "` lexicon; Defect B: resolved-band cohort not rendered on graded surface) — neither maps to the enumerated PASS or CUT-redirect branch. No fix invented; awaiting CEO decision.
