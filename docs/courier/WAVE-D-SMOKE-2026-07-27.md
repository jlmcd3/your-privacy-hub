# WAVE-D STEP 2 — SMOKE EXTRACTION (monitor tick, 2026-07-27T04:59:55Z)

**Batch:** `quality_batch_runs.id = e1cd0e3e-6525-4d28-9d18-814b2a94bf9c`
**Spec:** tools={cppa-risk}, batch_size=1, instrument_version=`gc-2026-07-27-s6-eu-uk-ca-au-sg`, concurrency=1.
**Terminal:** status=`complete` / phase=`done` at `2026-07-27T04:46:31.205Z`; `last_error=NULL`.
**Backing quality_run:** `00d3eb37-1454-4440-acbf-3397f650a457` (run #149), status=`complete`, checks 55/73 passed, 18 failed; score_overall=67.15, gpt_score_overall=85.
**Documents emitted:** 3 (doc 1/2/3 all `status=complete`, `scenario_set=tuning`).

## Evidentiality (R4)

**NOT evidential for §5.** Smoke exists solely to prove the deployed image renders documents with enforce mode + expected stamp echoes + narrative present + zero write-around. Scores above are reported only for completeness and MUST NOT be used to advance/retreat any trial verdict. Wave B.2 and the pending Wave D are the §5-evidential reads.

## VERIFIED-FACTS PREAMBLE (R6)

Every check below is against the live batch/run/document rows read from the sandbox DB at 2026-07-27T04:59:55Z.

## STEP 2 criteria (per ledger item 167)

| Criterion | Result | Evidence |
|---|---|---|
| Single doc terminal | **PASS** | 3 tuning docs all `status=complete`; batch phase=done |
| Expected stamp echoes | **PASS** | `_meta.internal.risk_va.build_stamp = "ltp-risk-waved-readiness@2026-07-27T04:28:00Z"` (readiness stamp echoed live); prior wave stamps also present (`w10-risk-b1`, `w20-risk-turnb`, `w21-risk-turna`, `w22-risk-turna`, `w23-risk-turnb`, etc.) |
| Enforce mode | **PASS** | Shadow orchestrator emits `mode:"shadow"` per invariant; fleet enforce path proven by `_meta.internal.legal_test_pipeline.enforce_preview.telemetry = { ran:true, ok:true, attempts:1, latency_ms:30983, write_around:false, validator_issues:0 }` — Pass-1 LLM enforce arm executed successfully. Boot log at deploy already confirmed `ltp_mode=enforce`. |
| Narrative present | **PASS** | `submission_summary` present on doc 1 (694 chars); doc emits full section set: `opening_summary`, `priority_actions`, `strengthen_items`, `attestation_block`, `assessment_summary`, `exception_analysis`, `information_needed`, `record_sufficiency`, `scope_and_triggers`, `submission_summary`, `enforcement_context`, `inconsistency_flags`, `risk_assessment_by_activity`, `risk_register`, `document_metadata`. |
| Zero write-around | **PASS** | shadow: `derive.write_around=false`; enforce_preview: `telemetry.write_around=false`, `plan_summary.write_around=false`; `conservative_write_around` not triggered on either arm. |

## Pipeline telemetry (doc 1, representative)

```
{ ran:true, mode:"shadow", version:"ltp-risk-p2",
  derive: { propositions:15, type_r:11, type_w:1, type_j:3, gates_total:12, gates_blocking:4, write_around:false },
  guide:  { frame_entries:11, binding:11, persuasive:0, empty_by_finding:[] },
  closeness: { score:0.4, variant:"hedged" },
  validators: { total_issues:2, by_code:{ V2_CITE_MISS:1, V7_W_PROP_NO_FRAME:1 } },
  verify: { enabled:false, ran:false, ... },
  enforce_preview: {
    manifest: { model:"google/gemini-3.6-flash", stamp:"ltp-pass1-llm-2026-07-26",
                max_attempts:2, prompt_version:"pass1-derive-2026-07-26" },
    telemetry: { ran:true, ok:true, attempts:1, latency_ms:30983,
                 write_around:false, validator_issues:0 },
    plan_summary: { plan_version:"v1", propositions:15, gate_outcomes:12, write_around:false }
  },
  guards_subsumed_by_two_pass: ["_risk_citation_dup_fix","_w18_risk_vocab","_w15_risk_va"]
}
```

Validator issues (`V2_CITE_MISS`, `V7_W_PROP_NO_FRAME`) are informational validator counts, not blocking; enforce arm still returned `ok:true` with zero unhandled validator issues.

## SMOKE VERDICT

**PASS.** Deployed image emits well-formed documents in enforce mode with all expected stamp echoes, narrative content, and zero write-around. STEP 3 gate is clear.

## Next step

STEP 3 (Wave D comprehensive measurement — batch-wrapped, batch_size=6, standalone s6, tools={cppa-risk}, tuning) launches under its **own** turn per single-launch discipline. Not launched here.

## Standing

Campaign `fd1be147` remains PAUSED (CEO-reserved). No other measurement activity. Run #147 remains SEALED per CEO order (item 166). Run #149 (this smoke) is NON-EVIDENTIAL for §5 per R4.
