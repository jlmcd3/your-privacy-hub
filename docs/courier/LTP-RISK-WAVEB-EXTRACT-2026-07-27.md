# LTP-RISK-WAVE-B — POST-TERMINAL EXTRACTION

Dispatch id: LTP-RISK-WAVEB-EXTRACT-2026-07-27
Turn timestamp: 2026-07-27 ~00:25Z
Ledger item: 153

Scope: read-only monitor extraction per items 150 / 152. No code, prompt,
rubric, grader, golden, contract, fixture, sample, registry, corpus, or
instrument edits. No deploys. Campaign `fd1be147` stays paused (CEO-reserved).

## Terminal state

- `quality_batch_runs.id = fc6a8394-a265-4297-b086-805e183d2ee5`
  - `tools = {cppa-risk}`, `batch_size = 6`, `instrument = gc-2026-07-26-s5-eu-uk-ca-au-sg`
  - `status = complete`, `phase = done`
  - `started_at = 2026-07-26 23:20:10.237Z`
  - `completed_at = 2026-07-27 00:13:31.271Z` (wall time ≈ 53m 21s)
  - `last_error = NULL`, `campaign_id = NULL` (standalone)
- Child run: `quality_runs.id = e1360a41-eb79-4b13-b60f-02e016850928`
  - `run_number = 145`, `mode = <default>`, `checks_total = 162 / passed 116 / failed 46`

## 1. Pooled Claude/GPT delta vs Wave-A baseline (78.80)

| Grader              | Wave-B (#145) | Wave-A baseline | Δ       |
| ------------------- | ------------- | --------------- | ------- |
| Claude `score_overall` | **72.75**    | 78.80           | **−6.05** |
| GPT `gpt_score_overall`| **85.00**    | —               | —       |
| Pooled (Claude+GPT)/2  | **78.88**    | 78.80           | **+0.08** |

Per-doc:

| Doc | scenario_set | Claude | GPT   |
| --- | ------------ | ------ | ----- |
|  1  | tuning       | 62.05  | 85    |
|  2  | tuning       | 88.55  | 86    |
|  3  | tuning       | 68.85  | 85    |
|  4  | tuning       | 77.10  | 88    |
|  5  | holdout      | 71.05  | 83    |
|  6  | holdout      | 68.65  | 79    |

Read: pooled essentially **flat** vs Wave-A. Claude-only shows a −6pt regression
driven by doc 1 (62.05) and doc 3 (68.85). GPT holds ~85 across the batch.
Cross-grader spread on doc 1 (Δ 22.95pt) is the widest signal in the run and
sits inside the tuning subset.

## 2. Enforce-preview telemetry (`_meta.internal.legal_test_pipeline.enforce_preview`)

| Doc | `pass1_ok` | `attempts` | `write_around` | `validator_issues` | `latency_ms` |
| --- | ---------- | ---------- | -------------- | ------------------ | ------------ |
|  1  | true       | 1          | false          | 0                  | 34,127       |
|  2  | true       | 1          | false          | 0                  | 38,719       |
|  3  | true       | 1          | false          | 0                  | 53,813       |
|  4  | true       | 1          | false          | 0                  | 53,413       |
|  5  | true       | 1          | false          | 0                  | 55,423       |
|  6  | true       | 1          | false          | 0                  | 39,089       |

- **`pass1_ok` rate: 6/6 = 100%**
- **`write_around` rate: 0/6 = 0%**
- **`attempts` distribution: {1: 6}** — retry budget (N=2) never consumed
- **`latency_ms`: min 34,127 / mean 45,764 / max 55,423**
- **`validator_issues` = 0** across all docs — Pass-1 output cleared
  `validateRenderPlan` on first try every time.

Read: enforce-preview stack is stable. No fallback path exercised.

## 3. Subsumption cross-check

Named subsumed guards (per Wave-B boot log):
`_risk_citation_dup_fix, _w18_risk_vocab, _w15_risk_va`.

Downstream check surfaces:

| Guard (subsumed)          | Downstream check(s)                                | Fails |
| ------------------------- | -------------------------------------------------- | ----- |
| `_w18_risk_vocab`         | `h2_internal_vocab_ok`                             | **0** (0/6) |
| `_w15_risk_va`            | `h1_article_phrasing_ok`                           | **0** (0/6) |
| `_risk_citation_dup_fix`  | citation-duplication component of `rubric_citation_misapplied` | see §5 (5 fails — no duplicate-pinpoint evidence in sample; failures are misapplication, not dup) |

No regression attributable to the subsumed guards. `h1`/`h2` at 0/6.

## 4. Tuning-vs-holdout diagnostic (`batch_size 6 ≥ 4` → ACTIVE)

| Split   | n | Claude mean | GPT mean | `score_overall_<split>` (persisted) |
| ------- | - | ----------- | -------- | ----------------------------------- |
| tuning  | 4 | 74.14       | 86.00    | 74                                  |
| holdout | 2 | 69.85       | 81.00    | 70                                  |
| Δ (T−H) | — | +4.29       | +5.00    | +4                                  |

Read: holdout trails tuning by ~4–5pt on both graders — **no material
overfitting signal**. Deltas are inside batch-noise for n=2 holdout.

## 5. VERDICT vs §5 success criteria (`intake-drift 0 / citation-binding 0 / gate violations 0`)

| Criterion                                      | Signal                                                                                   | Result |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| **intake-drift 0**                             | No drift-specific check failure surfaced; `qc_r1_4_cohort_determinism` (4 fails) is a separate cohort-determinism guard, not mid-prose intake drift. | **PASS** |
| **citation-binding 0**                         | `rubric_citation_misapplied` **5 fails** (tuning 2/5, holdout 3/3).                     | **FAIL** |
| **gate violations 0**                          | `qc_r1_1_no_asks_on_resolved_tests` 0/6, `qc_r1_5_exception_fields_consumed` 0/6, ADMT-consequence gate not tripped in sample. | **PASS** |

**VERDICT: PARTIAL PASS (2/3).** Enforce-preview is stable and shape-clean;
overall pooled score is flat vs Wave-A; the outstanding regression class is
**citation-binding**, concentrated in holdout (3/3). Recommend citation-binding
as the next fix priority; no rollback signal. All results honour the
read-only extraction constraints.

## Failed-finding classes (context for next dispatch)

- **hallucination — `rubric_unsupported_business_claim`**: 8 fails (tuning 5, holdout 3) — largest single class.
- **citation — `rubric_citation_misapplied`**: 5 fails (§5 blocker above).
- **accuracy — cohort determinism (`qc_r1_4`)**: 4 fails (tuning 2, holdout 2, both `critical`).
- **accuracy — `qc_r1_2_spi_prong_utilization`**: 5 fails (tuning 3, holdout 2).
- **accuracy — `qc_r1_3_50pct_prong_utilization`**: 5 fails (tuning 3, holdout 2).
- **hallucination — `e6_counsel_referral`**: 4 fails (tuning 3, holdout 1).
- **hallucination — `rubric_internal_reasoning_leak`**: 3 fails (tuning 1, holdout 2).
- **analysis — `rubric_generic_boilerplate`**: 2 fails (tuning only).

Not proposing fixes in this turn per read-only scope.
