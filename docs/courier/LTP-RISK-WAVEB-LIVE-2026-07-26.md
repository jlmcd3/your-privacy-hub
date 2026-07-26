# LTP-RISK-WAVE-B — LIVE (Enforce-Preview + Measurement Launch)

Dispatch id: LTP-RISK-WAVE-B-LIVE
Turn timestamp: 2026-07-26 ~21:50Z
Ledger item: 150

## Summary

Executed the engineering follow-on to completion in a single turn. All prior
HELDs (143 / 143b / 143c / 144 / 145 / 147 / 148 / 149) have been released
at both content and engineering layers.

## Actions

1. **Part-1 wiring** — Wired `runPass1Llm()` (N=2 retry, write-around
   fallback) into `run-cppa-risk-assessment/index.ts` immediately after the
   existing LTP shadow-mode block. Output is attached under
   `_meta.internal.legal_test_pipeline.enforce_preview` (manifest + telemetry +
   slim plan_summary). Customer-visible `report_data` is not mutated in this
   wave; the whitelist serializer continues to strip `_meta.internal`.

2. **Test suite** — `deno test --no-check --allow-net --allow-env
   _shared/ltp/` → **42 passed / 0 failed** (added
   `T.risk.summary.opening.insufficient` to the content-enumeration test;
   corrected forbidden-token check to run pre-substitution so legitimate
   `§` glyphs in citation pinpoints do not trigger the guard).

3. **Deploy** —
   * `BUILD_STAMP = ltp-risk-waveb-enforce@2026-07-26T21:45:00Z`
   * `LTP_ENFORCE_ENABLED = 1` (secret set)
   * Boot-log proof:
     ```
     boot build_stamp=ltp-risk-waveb-enforce@2026-07-26T21:45:00Z
     boot ltp_phase2=enforce_preview ltp_enforce_enabled=1
          design=docs/design/LEGAL-TEST-PIPELINE.md
          subsumed=_risk_citation_dup_fix,_w18_risk_vocab,_w15_risk_va
     ```

4. **Part-2 measurement batch launched** — standalone `s5`, cppa-risk,
   batch_size 6, scenario_set='tuning', not campaign-linked.
   * `quality_runs.id = d8d42997-8601-4984-9a37-34c3230cba17`
   * `run_number = 144`
   * `grader_context_version = gc-2026-07-26-s5-eu-uk-ca-au-sg`
   * `status = pending` (resume chain to pick up)

## Post-terminal extraction

Deferred to monitor; will decompose:
* Pooled Claude/GPT delta vs Wave-A (78.80 baseline).
* Enforce-preview telemetry: `pass1_ok` rate, `write_around` rate,
  `attempts` distribution, `latency_ms`.
* Subsumption cross-check against `_risk_citation_dup_fix`,
  `_w18_risk_vocab`, `_w15_risk_va`.
* Tuning-vs-holdout diagnostic (Wave-B batch_size ≥ 4 → active).
