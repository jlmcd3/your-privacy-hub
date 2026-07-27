# LTP-RISK-WAVE-C — POST-TERMINAL EXTRACTION

Dispatch id: LTP-RISK-WAVEC-EXTRACT-2026-07-27
Turn timestamp: 2026-07-27 ~04:07Z
Ledger item: 164

Scope: read-only monitor extraction per items 150 / 162 / 163. No code,
prompt, rubric, grader, golden, contract, fixture, sample, registry, corpus,
or instrument edits. No deploys. Campaign `fd1be147` stays paused
(CEO-reserved). No new batch launches.

## Terminal state

- `quality_batch_runs.id = a1b2c3d4-e5f6-4890-abcd-ef0123456789`
  - `tools = {cppa-risk}`, `batch_size = 6`, `instrument = gc-2026-07-27-s6-eu-uk-ca-au-sg`, `mode = enforce`
  - `status = complete`, `phase = done`
  - `started_at = 2026-07-27 03:16:48.805Z`
  - `completed_at = 2026-07-27 03:55:03.574Z` (wall time ≈ 38m 15s)
  - `last_error = NULL`, `campaign_id = NULL` (standalone; fd1be147 stays PAUSED)
- Child run: `quality_runs.id = 3d8a7017-f456-46d2-9fd0-5540087891cc`
  - `run_number = 148`, `checks_total = 158 / passed 118 / failed 40`
  - `score_overall = 71.15`, `score_overall_tuning = 71`, `score_overall_holdout = 73`
  - `gpt_score_overall = 88`
  - **Observation (non-blocking):** run `grader_context_version` recorded as
    `gc-2026-07-26-s5-eu-uk-ca-au-sg` while the batch `instrument_version`
    is `gc-2026-07-27-s6-eu-uk-ca-au-sg`. Reporting the batch value per the
    launch spec; flagging the surface for a follow-up harness-labeling
    check (does not change any score; grader inputs are identical between
    s5 and s6 for the re-keyed SPI-prong checks per item 155).

## 1. Pooled Claude/GPT delta vs prior evidential waves

| Grader                | Wave-C (#148) | Wave-B (#145) | Wave-A baseline | Δ vs B    |
| --------------------- | ------------- | ------------- | --------------- | --------- |
| Claude `score_overall`  | **71.13**    | 72.75         | 78.80           | **−1.62** |
| GPT `gpt_score_overall` | **87.17**    | 85.00         | —               | **+2.17** |
| Pooled (Claude+GPT)/2   | **79.15**    | 78.88         | 78.80           | **+0.27** |

Per-doc:

| Doc | scenario_set | Claude | GPT |
| --- | ------------ | ------ | --- |
|  1  | tuning       | 69.15  | 85  |
|  2  | tuning       | 73.95  | 93  |
|  3  | tuning       | 63.70  | 84  |
|  4  | tuning       | 75.30  | 87  |
|  5  | holdout      | 65.15  | 86  |
|  6  | holdout      | 79.55  | 88  |

Read: pooled essentially **flat +0.27** vs Wave-B; Claude −1.62 offset by
GPT +2.17. Cross-grader spread remains widest on doc 3 (Δ 20.30pt, tuning)
and doc 5 (Δ 20.85pt, holdout). Doc 6 (holdout) 79.55/88 is the strongest
document in the run and the only Claude-side score to clear 75. No document
regressed critically vs Wave-B; per-doc Claude range 63.70–79.55 vs Wave-B
62.05–88.55.

## 2. Enforce-preview telemetry (`_meta.internal.legal_test_pipeline.enforce_preview`)

| Doc | `pass1_ok` | `attempts` | `write_around` | `validator_issues` | `latency_ms` |
| --- | ---------- | ---------- | -------------- | ------------------ | ------------ |
|  1  | true       | 1          | false          | 0                  | 36,067       |
|  2  | true       | 1          | false          | 0                  | 38,649       |
|  3  | true       | 1          | false          | 0                  | 53,967       |
|  4  | true       | 1          | false          | 0                  | 39,307       |
|  5  | true       | 1          | false          | 0                  | 45,551       |
|  6  | true       | 1          | false          | 0                  | 35,321       |

- **`pass1_ok` rate: 6/6 = 100%**
- **`write_around` rate: 0/6 = 0%**
- **`attempts` distribution: {1: 6}** — retry budget (N=2) never consumed
- **`latency_ms`: min 35,321 / mean 41,477 / max 53,967**
- **`validator_issues` = 0** across all docs — Pass-1 output cleared
  `validateRenderPlan` on first try every time.
- Manifest stable: `stamp = ltp-pass1-llm-2026-07-26`,
  `prompt_version = pass1-derive-2026-07-26`,
  `model = google/gemini-3.6-flash`, `plan_version = v1`,
  `propositions ∈ {14,15}`, `gate_outcomes ∈ {11,12}`.

Read: enforce-preview stack is stable across three consecutive evidential
waves (A/B/C). Fallback path still never exercised in production.
**Enforce-mode boot-log assertion (item 159 §16) held for the full batch.**

## 3. Tuning-vs-holdout diagnostic (`batch_size 6 ≥ 4` → ACTIVE)

| Split   | n | Claude mean | GPT mean | `score_overall_<split>` (persisted) |
| ------- | - | ----------- | -------- | ----------------------------------- |
| tuning  | 4 | 70.53       | 87.25    | 71                                  |
| holdout | 2 | 72.35       | 87.00    | 73                                  |
| Δ (T−H) | — | −1.83       | +0.25    | −2                                  |

Read: **holdout ≥ tuning on Claude (+1.83pt) and ≈parity on GPT**. This
inverts the Wave-B holdout-trails-tuning pattern (Wave-B Δ was +4.29 Claude
/ +5.00 GPT). No material overfitting signal; if anything, the tuning
subset now carries the weaker docs (docs 1 & 3). Deltas are inside
batch-noise for n=2 holdout.

## 4. VERDICT vs §5 success criteria (`intake-drift 0 / citation-binding 0 / gate violations 0`)

| Criterion              | Signal                                                                                                                                    | Result   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **intake-drift 0**     | No mid-prose intake-value drift check failure surfaced. `qc_r1_4_cohort_determinism` (5 fails, critical) is cohort-date determinism, not the mid-prose intake-drift class per Wave-B/B.2 convention. | **PASS** |
| **citation-binding 0** | `rubric_citation_misapplied` **7 fails** (tuning 4/16, holdout 3/8). Regression class persists after Wave-B2 closure fixes.               | **FAIL** |
| **gate violations 0**  | No `qc_r1_1_no_asks_on_resolved_tests`, `qc_r1_5_exception_fields_consumed`, or ADMT-consequence gate failures in the check table.        | **PASS** |

**VERDICT: PARTIAL PASS (2/3).** Same shape as Wave-B / Wave-B.2:
enforce-preview stable, pooled score flat, the outstanding regression
class is **citation-binding**. Wave-C shows citation-binding fails
increased vs Wave-B (7 vs 5) despite the Wave-B2-closure deploy — the
newly failing evidence spans both tuning and holdout, so the closure fix
handled a subset of the observed patterns but did not eliminate the
class. Recommend citation-binding remain the next fix priority; no
rollback signal from Wave-C's pooled score movement.

## 5. Failed-finding classes (context for next dispatch)

- **hallucination — `rubric_unsupported_business_claim`**: **12 fails** (tuning 7, holdout 5) — largest single class; up from 8 (Wave-B).
- **citation — `rubric_citation_misapplied`**: 7 fails (tuning 4, holdout 3) — §5 blocker; up from 5 (Wave-B), 6 (Wave-B.2).
- **intelligence — `rubric_actionability`**: 7 fails (tuning 4, holdout 3) — medium.
- **analysis — `rubric_generic_boilerplate`**: 6 fails (tuning 4, holdout 2) — medium (gpt_only category); up from 2 (Wave-B).
- **accuracy — `qc_r1_4_cohort_determinism`**: 5 fails (tuning 4, holdout 1) — critical (deterministic).
- **hallucination — `rubric_internal_reasoning_leak`**: 3 fails (tuning 3, holdout 0) — high.

Not proposing fixes in this turn per read-only scope.

## 6. Extraction constraints honoured

- `supabase--read_query` only (no direct Supabase console access).
- No instrument, rubric, golden, corpus, contract, or code edits.
- No deploys.
- No campaign resume — `fd1be147` remains PAUSED (CEO-reserved).
- No new batch launches (single-launch rule).
