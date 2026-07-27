# SMOKE #5 — BRANCH FAIL (evidence-only)
Date: 2026-07-27
Batch: `9d00f044-516c-4065-89c4-92f8ade816d8` (inserted 17:33:41Z, §18 shape, `batch_size=1`, `declared_count=1`)
Build on the wire: `ltp-risk-item204-rulings-executed@2026-07-27T17:20:00Z`
Ruling per controller message: **BRANCH FAIL — STOP with evidence rows only, no fixes invented, HARD STOP.**

## Evidence rows

### function/quality run
- `quality_runs.id = 0da70146-2451-4318-b19c-adf20864d24c`
- `tool = cppa-risk`
- `started_at = 2026-07-27 17:36:02.380+00`
- `completed_at = 2026-07-27 17:42:18.294+00`
- `status = complete`
- `error = NULL`
- `score_overall = 78` (Claude), `gpt_score_overall = 82`
- `checks_total = 25`, `checks_passed = 20`, `checks_failed = 5`
- `quality_run_documents.id = 074e823f-…` **[correction: this turn's doc row is `87e5e111-2725-4bcb-91e6-0e93256b5c37`, `source_row_id = 0e741ae0-…`, `status = complete`, `has_report = true`, `overall_score = 78`, `gpt_overall_score = 78`]**

### assessment
- `cppa_assessments.id = 0e741ae0-a488-4d73-ab2b-a67bbac8c938`
- `status = complete`
- `created_at = 2026-07-27 17:36:03.079+00`
- `updated_at − created_at = 00:05:25.19` (E2E = **5 m 25 s**, well inside 15 min clock contract)
- `retry_count = 0`; `last_error = NULL`; `report_data IS NOT NULL`

### composition_finalize telemetry (`_meta.internal.composition_finalize`)
```
build_stamp:            ltp-risk-item204-rulings-executed@2026-07-27T17:20:00Z
version:                composition-finalize@2026-07-27
safe_version:           safe-finalize@2026-07-27-hangfix
mode:                   enforce
elapsed_ms:             3
budget_ms:              15000
budget_exceeded:        false
errored:                true
error_kind:             ValueScreenError
error_message:          [value-screen] 1 hit(s): truncated-slot-value:We
enforce_violation:      true
```

**Failing criterion:** BRANCH-PASS §(2) requires `errored=false`, `enforce_violation=false`, value-screen hits = 0. Observed: `errored=true`, `enforce_violation=true`, 1 hit of kind `truncated-slot-value` with match `"We"` — the new Item-204 structural guard fired on a slot whose entire trimmed value equals `"We"`. Exact JSON path of the offending slot: **not enumerable from telemetry**; `ValueScreenError` records `kind + ":" + match` in the summary but the per-hit `path`/`context` fields are not persisted on `_meta.internal.composition_finalize` in this build.

### cyber-audit schedule telemetry (`_meta.internal.cyber_audit_schedule`)
```
stamp:       cyber-audit-schedule@2026-07-27T-item204
version:     cyber-audit-schedule-v1-phase-in-2026-07-27
build_stamp: ltp-risk-item204-rulings-executed@2026-07-27T17:20:00Z
emitted:     true
reason:      emitted
```
`submission_summary.cybersecurity_audit_schedule` contains the full three-tier § 7121(a) phase-in text with the reserved-to-customer closing. **Defect-B fix proven on the wire** (informational — the smoke still fails on criterion 2).

### cohort-append telemetry (`_meta.internal.cohort_append`)
```
appended:    false
reason:      band_resolved
```

### information_needed rows (`report_data.information_needed`, length = 3)
1. `id = info_scope_and_triggers_scope_notes_0`, `topic = scope_and_triggers_scope_notes`
2. `id = info_inconsistency_flags_0_description_1`, `topic = inconsistency_flags_0_description`
3. `id = info_priority_actions_4_action_2`, `topic = priority_actions_4_action`

All 3 rows carry `id` + `topic` (Item-204 info-needed-normalize fix proven). No `annual_gross_revenue_2028` ask anywhere (Defect-B ask retirement proven).

### emit_gate residual (`_meta.internal.emit_gate`)
```
degraded_count: 1
finding:        unterminated_sentence at $.risk_assessment_by_activity[0].benefits_outweigh_risks_conclusion
                evidence: "Colorable argument — benefits appear to outweigh risks; completing the named items would allow this to be recorded as established"
```
(Composer-side; already on the Stage-C candidate list per Item 204.)

## Disposition
- Clock contract: **HELD** (5 m 25 s « 15 min).
- Item-203 invocation-status semantics: **HELD** (`quality_runs.status = complete`, `error = NULL`).
- Defect-B fix: **PROVEN** (schedule emitted; no cohort assertion; no revenue ask).
- Info-needed normalizer: **PROVEN** (3/3 rows have `id` + `topic`).
- Defect-A fix: **REGRESSION** (enforce-mode ValueScreenError on `truncated-slot-value:We`). The new structural guard is catching a slot whose entire value is the bare token `"We"` — the exact A.i #178 class it was designed to catch — but the composer is still emitting such a slot, so the graded surface fails BRANCH-PASS §(2).

**§22.1 clean-arm counter (cppa-risk): unchanged, 0/3 (Stage-C accounting only).**
**Smoke #5 non-evidential. HARD STOP for controller review.** No fix invented this turn.
