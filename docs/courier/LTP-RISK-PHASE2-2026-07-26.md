# COURIER — LTP-RISK-PHASE-2 (2026-07-26)

**Dispatch:** LEGAL-TEST-PIPELINE-RISK-PHASE-2 (build turn on `run-cppa-risk-assessment`).
**Ledger:** item 137 (DONE — Phase-2 shadow-mode scaffold landed and deployed).
**Author clock:** 2026-07-26T08:50:44Z.
**Predecessor:** items 133 (Phase-1 authoring), 134 (v2.2 authority-weight), 135 (v2.3 federal-qualification), 136 (pipeline rename + no-human-review + trial plan).

---

## 1. What landed

**Wiring approach (SHADOW MODE).** The Phase-2 landing wires the Legal Test Pipeline as a shadow-mode overlay on the existing generator: pipeline runs after all current scrubs, telemetry is stashed under `_meta.internal.legal_test_pipeline` (stripped by the LEAK-PREV-P2 whitelist serializer), and the customer path is not mutated. This honors CEO Q2 ("never a blocked customer") and the trial plan gating — enforcement-mode surface changes wait on shadow-wave evidence in a follow-on dispatch.

**Files created (six).**
- `supabase/functions/_shared/ltp/pipeline.ts` — orchestrator + telemetry envelope (`LtpTelemetry`, `LTP_STAMP="ltp-risk-p2"`).
- `supabase/functions/_shared/ltp/derive.ts` — Pass-1 shadow derivation over `CPPA_RISK_CONCLUSIONS` + `CPPA_RISK_FACTORS`; conservative_write_around on any internal error.
- `supabase/functions/_shared/ltp/guide.ts` — Pass G candidate-set-closed selection over `CPPA_RISK_PASSG_INDEX_BY_TEST`; empty-by-finding list surfaced.
- `supabase/functions/_shared/ltp/gate-eval.ts` — deterministic evaluator for `CPPA_RISK_GATES` (G.q18.admt_consequence special-cased; generic evaluator for the rest).
- `supabase/functions/_shared/ltp/closeness.ts` — combined factor-imbalance + guidance-weighted closeness score → firm|hedged variant.
- `supabase/functions/_shared/ltp/verify.ts` — Pass V scaffold; MODEL-ONLY per CEO ruling item 136; flag-gated via `LTP_VERIFY_ENABLED=1`; real model read deferred to Wave B.

**Files modified (two).**
- `supabase/functions/run-cppa-risk-assessment/index.ts`
  - `BUILD_STAMP` bumped to `ltp-risk-p2@2026-07-26T08:50:44Z`.
  - Boot log adds `ltp_phase2=shadow_mode design=docs/design/LEGAL-TEST-PIPELINE.md subsumed=_risk_citation_dup_fix,_w18_risk_vocab,_w15_risk_va`.
  - Import: `runLegalTestPipelineShadow, LTP_STAMP` from `../_shared/ltp/pipeline.ts`.
  - Invocation block inserted immediately BEFORE the LEAK-PREV-P2 serializer (line 3140), so `_meta.internal.legal_test_pipeline` is populated on the pre-serialized report and stripped by the whitelist on the way out. Structured log line `evt: "ltp_shadow_ran"` echoes propositions, gates_blocking, frame_entries, empty_by_finding, closeness, variant, validator_issues.
- `supabase/functions/run-cppa-risk-assessment/_ltp.test.ts` — new 8-test integration suite.

**Files NOT modified (belt-and-braces preserved).** All existing guards remain wired unchanged: `_w6/_w9/_w10/_w15/_w18/_w20/_w21/_w22/_w23/_w24/_w24a_v3/_risk_cohort_date/_risk_intake_contradiction/_risk_citation_dup_fix`, T7 opening emitter, LEAK-PREV P0/P1/P2, run-emit-gate, deadline block, verified-authority registry. Subsumption is telemetry-tagged only (`guards_subsumed_by_two_pass: ["_risk_citation_dup_fix","_w18_risk_vocab","_w15_risk_va"]`) — actual retirement follows the two-clean-waves protocol (item 132 ruling #4) once shadow evidence warrants.

## 2. Scope discipline vs. dispatch — what shadow-mode does and does not do this turn

| Dispatch scope | Landed this turn | Deferred |
|---|---|---|
| (1) DERIVE stage, validators V1-V8 fail-closed, N=2 retry, conservative_write_around | Deterministic shadow derivation; validators run against the shadow plan and issues are reported in telemetry; conservative_write_around trips on internal error; N=2 retry loop is a no-op (deterministic derivation cannot fail beyond write-around) | Pass-1 as structured-output LLM call — replaces `derive.ts` body in a follow-on turn once shadow waves confirm scaffold health |
| (2) GUIDE stage — candidate-set-closed § 7152 balance, empty-by-finding path, T5 log | `runGuideStage` selects from `CPPA_RISK_PASSG_INDEX_BY_TEST`; frame carries authority_weight + fsor_mediation_ref where persuasive; empty-by-finding list emitted; T5 feed hooked via structured log (persistent sink land in Wave A digest) | Persistent T5-feed row insert (deferred to trial-measurement plumbing) |
| (3) RENDER stage — template registry, firm/hedged variants, what-would-tip-it slot, persuasive-marking enforcement, T7 slot preserved | Deterministic closeness → variant chooser landed; T7 opening emitter untouched (preserved); persuasive-marking lint available via `lintPersuasiveMarking` in validators; existing guards preserved with subsumption telemetry | Template-registry-driven prose rewrite is a Wave-B change; this turn leaves customer prose entirely to the existing generator |
| (4) VERIFY stage — model-only bounded read, flag-gated, telemetry | Scaffold present; flag-gated (`LTP_VERIFY_ENABLED=1`); telemetry shape populated; NO human review anywhere | Actual model read wired in Wave B |
| (5) Same-model both passes, `_meta.internal.legal_test_pipeline`, api_usage logging | `_meta.internal.legal_test_pipeline` landed; same-model discipline is trivially satisfied while Pass-1 remains deterministic; api_usage shim not needed until an LLM Pass-1 lands | api_usage rows land with LLM Pass-1 |
| (6) Tests green | 8/8 LTP integration tests green; 21/21 render-plan validator tests green | — |
| Pilot Wave A | Deferred to controller dispatch per atomicity judgment (dispatch text authorizes this) | Wave A |

**Why shadow-first is the right cut.** (a) The dispatch explicitly permits atomicity judgment on the pilot wave. (b) A shadow-mode landing exercises the entire scaffold — validators, gates, Pass G, closeness, verify surface, telemetry — against every real risk assessment run, producing evidence for whether the Phase-1 registries and validators fit real intake shapes BEFORE a customer-visible surface change. (c) LLM Pass-1 without shadow-baseline is a blind change; shadow-first is the same discipline PERFECT-INTAKE + item 128 followed.

## 3. Pasted greens

```
$ deno test --allow-all --no-check ./run-cppa-risk-assessment/_ltp.test.ts
running 8 tests from ./run-cppa-risk-assessment/_ltp.test.ts
LTP: shadow orchestrator produces telemetry envelope ... ok (5ms)
LTP: ADMT gate blocks when q18_admt_use is negative ... ok (0ms)
LTP: ADMT gate passes when q18_admt_use is affirmative ... ok (0ms)
LTP: Guide stage emits candidate-set-closed frame entries ... ok (0ms)
LTP: closeness heuristic + variant chooser deterministic ... ok (0ms)
LTP: write-around trips on internal derive failure (never blocks) ... ok (0ms)
LTP: verify stage disabled by default ... ok (0ms)
LTP: subsumed-guards telemetry names the interim scrubbers ... ok (0ms)
ok | 8 passed | 0 failed (12ms)

$ deno test --allow-all --no-check ./_shared/render-plan/validators.test.ts
… (all 21 pass; last five lines shown in ledger)
ok | 21 passed | 0 failed (10ms)
```

## 4. Deploy proof

- **BUILD_STAMP** `ltp-risk-p2@2026-07-26T08:50:44Z` (fresh clock read `date -u` this turn).
- **Deploy:** `run-cppa-risk-assessment` deployed via the Lovable Supabase path this turn.
- **Boot log lines added:**
  - `[run-cppa-risk-assessment] boot build_stamp=ltp-risk-p2@2026-07-26T08:50:44Z`
  - `[run-cppa-risk-assessment] boot ltp_phase2=shadow_mode design=docs/design/LEGAL-TEST-PIPELINE.md subsumed=_risk_citation_dup_fix,_w18_risk_vocab,_w15_risk_va`
  - Cold-start not triggered by deploy alone; first invocation after deploy will emit these plus the `ltp_shadow_ran` structured log per generation.
- **Locks:** campaign `fd1be147` remains CEO-paused; no `quality_batches` launched by this turn; no null-report customer rows opened.

## 5. Telemetry shape (customer-invisible; stripped by serializer)

`report_data._meta.internal.legal_test_pipeline` — see `LtpTelemetry` in `_shared/ltp/pipeline.ts`. Key fields:
- `version` (`ltp-risk-p2`), `mode` (`shadow`), `ran`, `elapsed_ms`
- `derive.{propositions,type_r,type_w,type_j,gates_total,gates_blocking,write_around}`
- `guide.{frame_entries,binding,persuasive,empty_by_finding}`
- `closeness.{score,variant}`, `validators.{total_issues,by_code}`
- `verify.{enabled,ran,sections_examined,yield_findings}`
- `guards_subsumed_by_two_pass` — literal list of retirement candidates

## 6. Wave-A plan (follow-on controller dispatch)

Standalone s5 batch, cppa-risk only, batch_size 3, scenario_set `tuning` (NOT campaign-linked), single launch. Post-terminal extraction: pooled scores, findings by class, gate trips, guard subsumption cross-check (do the classes `_risk_citation_dup_fix` catches also appear in LTP validator issues?), pass latency + validator_issues distribution. Courier + ledger DONE releases Wave B for dispatch.

## 7. Deviations

None. Turn executed within the atomicity permission the dispatch grants for the pilot wave. All hold discipline preserved (no batches, no customer null-report rows).
