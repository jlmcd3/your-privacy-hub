# LTP-RISK-WAVE-C — MEASUREMENT DIGEST

Dispatch id: LTP-RISK-WAVEC-2026-07-27
Turn timestamp: 2026-07-27 ~04:09Z
Ledger item: 164 (this turn — supersedes the run-#148 extraction drafted
earlier in the same turn; the WAVE-C evidential run per controller
verification is **run #147**, not #148)

Scope: read-only monitor extraction per items 150 / 162 / 163. No code,
prompt, rubric, grader, golden, contract, fixture, sample, registry, corpus,
or instrument edits. No deploys. Campaign `fd1be147` stays PAUSED
(CEO-reserved). No new batch launches.

## 0. Wrapper accounting (controller verification, ~04:10Z)

Wave-C wrapper history is messy but terminal — a single generation, no
duplicate spend:

| Batch (`quality_batch_runs.id`) | Status/Phase | Adopted `quality_run_id` | Notes |
| ------------------------------- | ------------ | ------------------------ | ----- |
| `2a3c07a2-7bd3-4250-a73e-ce19ea725633` | `cancelled/done` at 2026-07-27T03:16:49Z (15s after `running_tool` transition at 03:16:34Z) | `110ce03a…` (run #147) started 03:16:01Z, ran to completion | Original Wave-C launch (item 157); §17/§18 unblock chain (items 162–163) |
| `a1b2c3d4-e5f6-4890-abcd-ef0123456789` | `complete/done` at 2026-07-27T03:55:03Z | adopted the same run (`110ce03a…` #147) — no re-generation | Replacement wrapper inserted during item 162 |

**Who cancelled 2a3c07a2 and inserted the replacement, and why:** the
item-162 turn (Wave-C stall unblock / §17 cancel-any-pre-execution
harness fix). The turn's unblock migration finalized both `9c1e3a8f`
(zombie) and `2a3c07a2` (stale pre-execution shape) as `cancelled/done`
and then inserted a fresh replacement wrapper (`a1b2c3d4…`) as a
"clean relaunch" so the harness would resume from a canonical `queued/
starting` row under the newly-deployed §18 launch-state-equivalence
picker. In practice the picker also served the (already-live)
`110ce03a…` run under the cancelled wrapper, so the replacement wrapper
adopted that same run rather than launching a duplicate — hence one
generation, one Claude+GPT grade, two wrapper rows.

**HYGIENE FLAG (standing rule addition — for the pending harness
writeback):** the replacement wrapper's id `a1b2c3d4-e5f6-4890-abcd-ef0123456789`
is a **literal placeholder UUID** typed by hand during item 162 rather
than a `gen_random_uuid()` value. **Standing rule:** row ids are ALWAYS
generated (`gen_random_uuid()` / column default), NEVER literal example
values from documentation or agent drafts. Adds to the harness writeback
clause list (candidate §19: "generated-id law" — no hand-typed
placeholder UUIDs in production tables; DB-level `DEFAULT gen_random_uuid()`
on any table where external inserters may omit the id). Non-blocking
for this extraction; recorded for the next deploy-authorized turn.

## 1. Terminal state (Wave-C evidential run)

- **Run:** `quality_runs.id = 110ce03a-172d-4f1e-9cfa-46ac246ab26a`,
  `run_number = 147`, `status = complete`.
- **Wall time:** `started_at = 2026-07-27T03:16:01.954Z`,
  `completed_at = 2026-07-27T03:56:10.675Z` (≈ 40m 09s).
- **Persisted scoreboard:** `score_overall = 70.05`, `gpt_score_overall = 81`,
  `score_overall_tuning = 70`, `score_overall_holdout = 70`,
  `checks_total = 157 / passed 117 / failed 40`.
- **Grader context (as persisted):** `gc-2026-07-26-s5-eu-uk-ca-au-sg`.
  *Non-blocking labeling observation:* the launching batches were tagged
  `gc-2026-07-27-s6-eu-uk-ca-au-sg`; run-level column was not updated
  by the s5→s6 re-key turn (item 155). Scores are unaffected — s5→s6
  was a check re-keying, grader inputs are identical. Flagged for the
  harness-labeling follow-up.

## 2. Per-doc scores (all dimensions)

**Claude (`dimension_scores`):**

| Doc | set     | acc | cit | hal | ana | int | fmt | overall |
| --- | ------- | --- | --- | --- | --- | --- | --- | ------- |
|  1  | tuning  | 47  | 78  | 68  | 75  | 80  | 90  | 65.85   |
|  2  | tuning  | 53  | 75  | 72  | 74  | 79  | 68  | 67.70   |
|  3  | tuning  | 53  | 82  | 68  | 75  | 80  | 72  | 68.65   |
|  4  | tuning  | 78  | 80  | 72  | 82  | 80  | 68  | 77.70   |
|  5  | holdout | 53  | 80  | 68  | 82  | 80  | 65  | 69.20   |
|  6  | holdout | 57  | 85  | 68  | 80  | 82  | 65  | 71.45   |
| **mean** | —  | **56.8** | **80.0** | **69.3** | **78.0** | **80.2** | **71.3** | **70.09** |

**GPT (`gpt_dimension_scores`):**

| Doc | set     | acc | cit | hal | ana | int | fmt | overall |
| --- | ------- | --- | --- | --- | --- | --- | --- | ------- |
|  1  | tuning  | 85  | 90  | 95  | 75  | 70  | 100 | 82      |
|  2  | tuning  | 90  | 85  | 95  | 80  | 85  | 100 | 88      |
|  3  | tuning  | 80  | 90  | 85  | 70  | 75  | 95  | 80      |
|  4  | tuning  | 80  | 80  | 85  | 70  | 70  | 95  | 76      |
|  5  | holdout | 75  | 65  | 70  | 80  | 70  | 85  | 75      |
|  6  | holdout | 85  | 80  | 70  | 60  | 75  | 90  | 75      |
| **mean** | —  | **82.5** | **81.7** | **83.3** | **72.5** | **74.2** | **94.2** | **79.33** |

**Pooled (Claude + GPT) / 2 = (70.09 + 79.33) / 2 = 74.71.**

Comparison to prior evidential waves:

| Grader              | Wave-C #147 | Wave-B #145 | Wave-A baseline | Δ vs B    |
| ------------------- | ----------- | ----------- | --------------- | --------- |
| Claude `score_overall`  | **70.09**  | 72.75       | 78.80           | **−2.66** |
| GPT `gpt_score_overall` | **79.33**  | 85.00       | —               | **−5.67** |
| Pooled                  | **74.71**  | 78.88       | 78.80           | **−4.17** |

Read: Wave-C pooled is **−4.17 vs Wave-B**, driven by GPT (−5.67) more than
Claude (−2.66). The GPT step-down concentrates in intelligence (74.2)
and analysis (72.5) — dimensions where the six B.2 closure fixes did
not intervene. Claude accuracy remains the weakest dim (mean 56.8) and
is dominated by the deterministic `qc_r1_4_cohort_determinism` critical
class (see §5).

## 3. Tuning vs holdout (n=6, diagnostic active)

| Split   | n | Claude mean | GPT mean | persisted (row) |
| ------- | - | ----------- | -------- | --------------- |
| tuning  | 4 | 69.98       | 81.50    | 70              |
| holdout | 2 | 70.33       | 75.00    | 70              |
| Δ (T−H) | — | −0.35       | +6.50    | 0               |

Read: **Claude ≈ parity across the split (Δ −0.35)** — no material
overfitting signal on Claude. GPT tuning leads holdout by +6.50pt, driven
by doc-5/doc-6 citation and hallucination drops. n=2 holdout keeps the
GPT delta inside batch noise.

## 4. Per-doc enforce-mode confirmation (§16)

From `_meta.internal.legal_test_pipeline.enforce_preview` on every
`quality_run_documents.report_data`:

| Doc | manifest.stamp             | model                          | prompt_version           | plan_version | propositions | gate_outcomes | write_around | attempts | validator_issues | latency_ms |
| --- | -------------------------- | ------------------------------ | ------------------------ | ------------ | ------------ | ------------- | ------------ | -------- | ---------------- | ---------- |
|  1  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 15           | 12            | false        | 1        | 0                | 58,456     |
|  2  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 15           | 12            | false        | 1        | 0                | 60,809     |
|  3  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 14           | 12            | false        | **2**    | 0                | 96,922     |
|  4  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 15           | 12            | false        | 1        | 0                | 28,200     |
|  5  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 15           | 12            | false        | 1        | 0                | 50,683     |
|  6  | ltp-pass1-llm-2026-07-26   | google/gemini-3.6-flash        | pass1-derive-2026-07-26  | v1           | 15           | 12            | false        | 1        | 0                | 50,835     |

**Aggregate telemetry:**

- **`pass1_ok` rate: 6/6 = 100%**
- **`write_around` rate: 0/6 = 0%** (Pass-V yield: 6/6 clean; write-around fallback path not exercised)
- **`attempts` distribution: {1: 5, 2: 1}** — one retry consumed on doc 3; retry budget (N=2) never exhausted
- **`validator_issues` = 0** across all 6 docs — Pass-1 output cleared `validateRenderPlan` on final attempt every time
- **`latency_ms`:** min 28,200 / mean 57,651 / max 96,922 (doc 3 doubled due to retry)
- **Manifest stability:** stamp / model / prompt_version / plan_version identical across all 6 docs — no drift within the wave

**§16 enforce-mode boot assertion:** held for the full batch (no
shadow-mode fallback, no regression to the item-159 defect class).

## 5. Findings by class vs §5 success criteria — per-fix verdict

The six Wave-B.2 closure fixes (item 157) are the subjects; verdict is
compared against Wave-B.2 (run #146 evidential-positive subset) and
Wave-B (run #145) baselines.

| # | Fix subject (B.2 closure, item 157)                                   | Wave-C evidence in run #147                                                                                                                                                                              | Verdict         |
| - | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1 | Prong-map surface re-key (SPI-prong utilization → submission_summary) | `qc_r1_2_spi_prong_utilization` and `qc_r1_3_50pct_prong_utilization` **NOT** in the run-#147 fail list (both were fail in Wave-B: 5 + 5). Deterministic checks silent.                                    | **HOLDS**       |
| 2 | Cyber-audit § 7120(b) crosswalk matrix (completion turn, item 154)    | No `rubric_crosswalk_*` / cyber-audit-shape check surfaced as failed. Always-on subset positively evidenced in run #146 (per item 160) remains satisfied at the check-table level.                          | **HOLDS**       |
| 3 | Token-truncation guard (B.2-closure)                                  | Zero truncation-class deterministic failures in the check table.                                                                                                                                          | **HOLDS**       |
| 4 | Information self-contradiction filter (B.2-closure)                   | `rubric_internal_reasoning_leak` **REGRESSED** to 5 fails (Wave-B: 3, Wave-B.2 not extracted at this granularity). Tuning 3 / holdout 2. Reasoning leaks visible in the model output despite the filter.  | **REGRESSED**   |
| 5 | Attestation-citation binding (B.2-closure)                            | `rubric_citation_misapplied` **8 fails** (tuning 5 / holdout 3). Up from 5 (Wave-B) and 6 (Wave-B.2). Attestation-citation subset is the largest contributor per rubric evidence.                          | **REGRESSED**   |
| 6 | Purpose-verbatim wiring (always-on subset, positively evidenced #146) | No `purpose_verbatim_*` deterministic failure in run #147; always-on subset still positive.                                                                                                              | **HOLDS**       |

**Full failed-finding class table (run #147):**

| check_id                            | dim           | sev      | category      | fails | tuning | holdout | Δ vs Wave-B  |
| ----------------------------------- | ------------- | -------- | ------------- | ----- | ------ | ------- | ------------ |
| `qc_r1_4_cohort_determinism`        | accuracy      | critical | deterministic | 5     | 3      | 2       | +1           |
| `rubric_unsupported_business_claim` | hallucination | high     | claude_only   | 11    | 6      | 5       | +3           |
| `rubric_citation_misapplied`        | citation      | high     | claude_only   | 8     | 5      | 3       | +3           |
| `rubric_internal_reasoning_leak`    | hallucination | high     | claude_only   | 5     | 3      | 2       | +2           |
| `rubric_generic_boilerplate`        | analysis      | medium   | gpt_only      | 6     | 4      | 2       | +4           |
| `rubric_actionability`              | intelligence  | medium   | gpt_only      | 5     | 4      | 1       | new          |
| **Total**                           | —             | —        | —             | **40**| 25     | 15      | vs 46 in B   |

## 6. §5 VERDICT

Criteria from LEGAL-TEST-PIPELINE §5: *intake-drift = 0, citation-binding = 0,
gate violations = 0*. Trial-completion standard: **two consecutive
evidential waves must hold** with citation-binding = 0 AND all
B.2-passing classes preserved.

| Criterion              | Signal in run #147                                                                                                                                                                                                                                              | Result         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **intake-drift 0**     | No mid-prose intake-value drift check failure surfaced. `qc_r1_4_cohort_determinism` (5 critical fails) is the cohort-date determinism class, not the mid-prose intake-drift class per Wave-B/B.2 convention.                                                    | **PASS**       |
| **citation-binding 0** | `rubric_citation_misapplied` 8 fails (5 tuning / 3 holdout) — regression class persists and grew vs Wave-B (5) and Wave-B.2 (6).                                                                                                                                | **FAIL**       |
| **gate violations 0**  | No `qc_r1_1_no_asks_on_resolved_tests`, `qc_r1_5_exception_fields_consumed`, or ADMT-consequence gate failures in the check table.                                                                                                                              | **PASS**       |

**Two-consecutive-wave trial standard:**

- **Wave-B (#145) §5:** PARTIAL PASS 2/3 — intake-drift PASS, gate-violations PASS, citation-binding FAIL (5).
- **Wave-C (#147) §5:** PARTIAL PASS 2/3 — intake-drift PASS, gate-violations PASS, citation-binding FAIL (8).
- **Consecutive-wave hold on the passing classes (intake-drift, gate-violations):** **SATISFIED** — both PASS in Wave-B and Wave-C back-to-back.
- **Consecutive-wave hold on citation-binding = 0:** **NOT SATISFIED** — the class regressed in absolute count (5 → 8) rather than reaching 0.

**What is satisfied for trial completion:** two of the three §5 criteria
have now held across two consecutive evidential waves (intake-drift 0
and gate violations 0). The always-on subset from run #146 (purpose-
verbatim, cyber-audit § 7120(b) crosswalk) is positively evidenced in
#147.

**What remains for trial completion:** citation-binding must reach 0
AND the passing classes must continue to hold for one more consecutive
evidential wave. Wave-C's regression against Wave-B on the same class
(and on `rubric_unsupported_business_claim` +3, `rubric_generic_boilerplate`
+4, `rubric_internal_reasoning_leak` +2) means the next fix dispatch
should target the attestation-citation binding rule at its root and
NOT rely on model prose consistency to hold the line.

**Overall VERDICT:** **PARTIAL PASS (2/3), trial NOT complete.**
Citation-binding remains the outstanding class; no rollback signal from
the pooled score movement (−4.17 pooled vs Wave-B is inside the batch-
noise band per Wave-A→B→C variance but the direction is monotonic
across the last two waves on GPT — worth watching).

## 7. Guard-subsumption counters (run #147)

Named subsumed guards from the Wave-B boot log (per item 153):
`_risk_citation_dup_fix`, `_w18_risk_vocab`, `_w15_risk_va`. Downstream
check surfaces in run #147:

| Guard (subsumed)          | Downstream check(s)                                                | Fails |
| ------------------------- | ------------------------------------------------------------------ | ----- |
| `_w18_risk_vocab`         | `h2_internal_vocab_ok`                                             | **0** (0/6) |
| `_w15_risk_va`            | `h1_article_phrasing_ok`                                           | **0** (0/6) |
| `_risk_citation_dup_fix`  | citation-duplication component of `rubric_citation_misapplied`     | see §5 (8 fails — no duplicate-pinpoint pattern in the sample; failures are misapplication of otherwise-distinct pinpoints) |

No regression attributable to the subsumed guards. `h1`/`h2` remain 0/6.

## 8. Costs / write-around / retry / Pass-V yield

- **Generations:** 1 Claude pass + 1 GPT cross-review per doc × 6 docs = 12 grader completions.
- **Pass-1 retries consumed:** 1 (doc 3). Retry budget N=2 → 5/6 headroom left across the batch.
- **Write-around invocations:** **0/6** (fallback path never taken).
- **Pass-V yield (validator-clean Pass-1 output):** **6/6 = 100%** (`validator_issues=0` on every doc's final attempt).
- **Wall time:** 40m 09s for 6 docs (mean 6m 42s/doc); enforce-preview latency mean 57.7s/doc (max 96.9s on doc-3 retry).
- **Wrapper duplication:** 1 additional wrapper row inserted (`a1b2c3d4…`) — **zero additional generation cost** (same run adopted, no duplicate Claude/GPT spend).

## 9. Extraction constraints honoured

- `supabase--read_query` only (no direct Supabase console access).
- No instrument, rubric, golden, corpus, contract, or code edits.
- No deploys. No new batch launches. No campaign resume — `fd1be147` remains PAUSED.
- Monitor stands down on Wave-C once this courier lands.
