# T-M9.6 — RUN #170 FIVE FIXES (Item 236) — 2026-07-28

## Basis
Run #170 was the first real Pass-2 document shipped (C=56.6/G=78); build
was not accepted per CEO checklist line 7. CEO dispatched five fixes plus
LAW 2 tightening.

## Fixes

### (a) T7 OPENING HARVEST WIRE
`run-cppa-risk-assessment/index.ts` now passes the T7
`buildRiskOpening` output into `assembleReport({ opening_summary })`.
Harvest guard (`_shared/ltp/harvest-guard.ts`) accepts prefixed sources
(`registry:`, `cppa_authorities:`, `provision_texts:`, `runtime:`) and
validates CSV `intake:<field,field>` against `plan.intake_ledger`.

### (b) VARIANT SELECTION LAW
`_shared/ltp/closeness.ts::chooseVariant` inverted per CEO ruling:
`closeness ≥ FIRM_VARIANT_CLOSENESS_MAX (0.6)` → hedged (surface
what_would_tip_it); below → firm. `assessment_summary` and
`risk_assessment_by_activity` composers select via
`chooseVariant(closeness)`; flat-certainty guard retained as backstop.

### (c) DETERMINISTIC COMPOSERS + LAW 2 TIGHTENING
`_shared/ltp/section-shards/cppa-risk.ts`:
- `schema_version`, `document_metadata`, `attestation_block`,
  `disclaimer`, `framework_disclaimer`, `accuracy_caveat`,
  `enforcement_context` → `always`, with real literal projections.
- `part_a`, `part_b`, `gating` → `empty-by-design` (V3 legacy).
- `enforcement_precedents`, `enforcement_meta` → `empty-by-design`.

`_shared/ltp/e2e-document.test.ts` — LAW 2 tightened: any `always`
section that omits FAILS the gate. Reclassify honestly.

### (d) EXEC-SUMMARY PROJECTIONS
`section-composers/cppa-risk.ts::activityLabelForProp` returns
`humanize(conclusion_id)` — never a raw intake answer value.
Singular/plural clause resolves through
`SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[n===1?0:1]`.

### (e) WA_ORIGIN TELEMETRY
`_origin` typed `… | null`; on pass1-ok it is `null`. The "unknown"
sentinel is retired at the emission site.

## Tests
```
running 10 tests from ./_shared/ltp/e2e-document.test.ts
LAW 2 (i–iv), structural completeness ......................... ok
ITEM 236 / LAW 2 TIGHTENED (no always-section omits) .......... ok
ITEM 236 fix (b) — balance-template chooseVariant routing ..... ok
ITEM 236 fix (b) — chooseVariant contract 0.6 → hedged ........ ok
ITEM 236 fix (c) — always-boilerplate emitted with content .... ok
ITEM 236 fix (d) — activity_label never raw intake answer ..... ok
10 passed | 0 failed
```
Full `_shared/ltp/` suite: 218 passed | 2 failed. Both failures
(`value-screen version stamp`, `waveb gateway missing key`) predate
Item 236 and are out of scope.

## Deploy
`BUILD_STAMP` bumped to
`ltp-risk-item236-t-m9.6-run170-fixes@2026-07-28T10:13:52.305Z`.
Ping adds `run170_fixes: "item236-2026-07-28"`.

## Ping (verbatim)
```
{"fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-item236-t-m9.6-run170-fixes@2026-07-28T10:13:52.305Z","ltp_mode":"enforce","ltp_version":"ltp-risk-p2","composition_enforce":"1","persist_first_retry":"retry-budget@2026-07-27-persistfirst","report_completion_gate":"final-status-and-report-data@2026-07-27-smoke-latency-rootcause","post_lint_llm_budget_ms":300000,"post_lint_llm_call_timeout_ms":120000,"post_lint_pass1_timeout_ms":240000,"pass1_timeout_enforced":"abort-controller","safe_finalize":"safe-finalize@2026-07-28-item217-repair-outside-guard","pass1_authoritative":"1","pass1_model":"claude-sonnet-4-6","pass1_max_attempts":2,"pass1_stamp":"ltp-pass1-llm-item234-valid-plan-ships@2026-07-28","pass2_assembler":"ltp-pass2-assembler-2026-07-28-item235-fill-or-omit","composition_shape":{"version":"cppa-risk-shape@2026-07-28-tm7-retirement","product":"cppa-risk-assessment","final_documents_per_assessment":1,"llm_calls_per_document":[{"stage":"pass1_derive","role":"authoritative RenderPlan derive","model_role":"pass1_derive"}],"intermediate_artifacts":["render_plan (authoritative)","assembler_output (shipped body; harvests are deterministic)"],"note":"CEO ruling 2026-07-28: undeclared drift aborts; declared shape is the conformance target."},"ltp_laws_1_3":"item235b-2026-07-28","run170_fixes":"item236-2026-07-28"}
```

## Disposition
READY-FOR-CONTROLLER-WIRE-VERIFY-AND-RELAUNCH. HARD STOP.
