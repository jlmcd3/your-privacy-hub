# LTP-RISK WAVE-B.2 — POST-TERMINAL EXTRACTION

Dispatch id: LTP-RISK-WAVEB2-EXTRACT-2026-07-27
Turn timestamp: 2026-07-27 ~01:15Z (monitor tick)
Ledger item: 156

Scope: read-only monitor extraction per items 150 / 152 / 155. No code, prompt,
rubric, grader, golden, contract, fixture, sample, registry, corpus, or
instrument edits. No deploys. No new launches. Campaign `fd1be147` stays
paused (CEO-reserved).

## Terminal state

- `quality_batch_runs.id = 127a6714-1062-427e-8f94-484ca9241006`
  - `tools = {cppa-risk}`, `batch_size = 6`, `concurrency = 1`
  - `instrument_version = gc-2026-07-27-s6-eu-uk-ca-au-sg`
  - `status = complete`, `phase = done`, `campaign_id = NULL`
  - `started_at = 2026-07-27 00:32:17.251Z`
  - `completed_at = 2026-07-27 01:07:20.194Z` (wall ≈ 35m 03s)
  - `last_error = NULL`
- Child run: `quality_runs.id = 248fe42c-a37d-4b57-b222-a03cccc16f2d`
  - `run_number = 146`, `checks_total = 156 / passed 119 / failed 37`
  - `score_overall = 72.35` (Claude), `gpt_score_overall = 85`
  - `score_overall_tuning = 73`, `score_overall_holdout = 71`

## 1. Pooled Claude/GPT delta vs Wave-B (78.88) / Wave-A (78.80)

| Grader                 | Wave-B.2 (#146) | Wave-B (#145) | Wave-A | Δ vs B  | Δ vs A  |
| ---------------------- | --------------- | ------------- | ------ | ------- | ------- |
| Claude `score_overall` | **72.35**       | 72.75         | 78.80  | −0.40   | −6.45   |
| GPT `gpt_score_overall`| **85.00**       | 85.00         | —      | 0.00    | —       |
| Pooled (Claude+GPT)/2  | **78.68**       | 78.88         | 78.80  | **−0.20** | **−0.12** |

Per-doc:

| Doc | scenario_set | Claude | GPT |
| --- | ------------ | ------ | --- |
|  1  | tuning       | 64.05  | 89  |
|  2  | tuning       | 72.55  | 86  |
|  3  | tuning       | 72.45  | 85  |
|  4  | tuning       | 82.80  | 92  |
|  5  | holdout      | 72.00  | 80  |
|  6  | holdout      | 69.15  | 74  |

Read: pooled **flat** vs Wave-B and Wave-A (Δ within ±0.2pt of both baselines).
Claude −0.40 vs Wave-B is inside batch noise. Doc-1 (64.05) is the widest
Claude low; doc-6 the GPT low. No batch-level regression signal.

## 2. Tuning-vs-holdout split (n=6, split ACTIVE)

| Split   | n | Claude mean | GPT mean | `score_overall_<split>` (persisted) |
| ------- | - | ----------- | -------- | ----------------------------------- |
| tuning  | 4 | 72.96       | 88.00    | 73                                  |
| holdout | 2 | 70.58       | 77.00    | 71                                  |
| Δ (T−H) | — | +2.38       | +11.00   | +2                                  |

Claude holdout trails tuning by ~2.4pt — **no material overfitting** on the
Claude channel. GPT holdout trails by 11pt driven entirely by doc 6 (74),
inside n=2 noise but flagged for the next monitor cycle.

## 3. Enforce-mode confirmation across ALL mapped surfaces (per-doc)

`_meta.internal.legal_test_pipeline.enforce_preview.telemetry`:

| Doc | `ok` | `attempts` | `write_around` | `validator_issues` | `latency_ms` | plan gates |
| --- | ---- | ---------- | -------------- | ------------------ | ------------ | ---------- |
|  1  | true | 1          | false          | 0                  | 35,085       | 12         |
|  2  | true | 1          | false          | 0                  | 36,567       | 12         |
|  3  | true | 1          | false          | 0                  | 50,506       | 12         |
|  4  | true | 1          | false          | 0                  | 64,874       | 12         |
|  5  | true | 1          | false          | 0                  | 44,135       | 11         |
|  6  | true | 1          | false          | 0                  | 55,103       | 12         |

- `pass1_ok` rate: **6/6 = 100%**
- `write_around` rate: **0/6 = 0%**
- `attempts` distribution: **{1: 6}** — retry budget (N=2) never consumed
- `latency_ms`: min 35,085 / mean 47,712 / max 64,874
- `validator_issues` = **0** across all docs — Pass-1 output cleared
  `validateRenderPlan` on first try every time
- All 15 propositions rendered per doc; all model = `google/gemini-3.6-flash`,
  prompt = `pass1-derive-2026-07-26`

`_meta.internal.waveb_completion` (item-154 completion pass, per-doc counters):

| Doc | meta_strings | dup_connect | incons_dropped | pii_hits | purpose_rewr | prongs_added | PII assert errors |
| --- | -----------: | ----------: | -------------: | -------: | -----------: | -----------: | ----------------: |
|  1  | 5            | 0           | 0              | 16       | 1            | 3            | 0                 |
|  2  | 2            | 0           | 2              | 21       | 2            | 3            | 0                 |
|  3  | 4            | 0           | 1              | 15       | 1            | 3            | 0                 |
|  4  | 15           | 0           | 3              | 27       | 1            | 3            | 0                 |
|  5  | 24           | 0           | 1              | 39       | 2            | 3            | 0                 |
|  6  | 13           | 0           | 3              | 47       | 1            | 3            | 0                 |

- `pii_narrative_assertion_errors`: **0/6** across every doc — item-154 (b)
  standing content rule VALIDATED live at scale.
- `submission_basis_prongs_added`: **3/3 on every doc** — item-154 (c) cyber-audit
  crosswalk emitter (§ 7120(b)(1) / (2)(A) / (2)(B)) landed on every render.
- `purpose_activities_rewritten`: ≥1 on every doc — intake verbatim enforced.
- `inconsistency_flags_dropped`: 10 across batch — TEMPLATE_CUT enforced at
  render, not just serializer.
- `meta_strings_scrubbed`: 63 across batch — first-person/meta ban applied
  across ALL surfaces via the walker.
- `dup_connectives_scrubbed`: 0/6 — the "on the record on the current record"
  class is not reappearing (either LLM no longer emits it, or the earlier
  slot-level fix already removed the source; regression guard remains armed).

## 4. VERDICT vs §5 success criteria

| Criterion              | Signal                                                                                              | Result |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| **intake-drift 0**     | `purpose_activities_rewritten` ≥1 per doc; no drift-specific check failure surfaced (`h1_article_phrasing_ok`, `h2_internal_vocab_ok` both 0/6). | **PASS** |
| **citation-binding 0** | `rubric_citation_misapplied` **6 fails** (tuning 4 / holdout 2) — carried from Wave-B (was 5); still the outstanding class. | **FAIL** |
| **gate violations 0**  | `qc_r1_1_no_asks_on_resolved_tests` 0/6, `qc_r1_5_exception_fields_consumed` 0/6, ADMT-consequence gate not tripped in sample. | **PASS** |

**VERDICT: PARTIAL PASS (2/3).** Pooled score flat vs both Wave-A and Wave-B;
enforce-preview 100% clean; item-154 completion pass (PII, purpose, crosswalk,
meta-string ban, TEMPLATE_CUT) validated on all six live docs; s6 re-keyed
checks (`qc_r1_2` / `qc_r1_3`) resolved (both zero-fail this run — the item-155
scan-window fix + crosswalk emitter combination closed the family). Outstanding
regression class remains **citation-binding** (`rubric_citation_misapplied`,
6 fails). No rollback signal.

## 5. Failed-finding classes (context, not proposals)

| Class                              | Dimension     | Severity | Fails | Tuning | Holdout |
| ---------------------------------- | ------------- | -------- | ----: | -----: | ------: |
| `qc_r1_4_cohort_determinism`       | accuracy      | critical | 5     | 3      | 2       |
| `rubric_unsupported_business_claim`| hallucination | high     | 10    | 8      | 2       |
| `rubric_citation_misapplied`       | citation      | high     | 6     | 4      | 2       |
| `rubric_internal_reasoning_leak`   | hallucination | high     | 4     | 3      | 1       |
| `rubric_generic_boilerplate`       | analysis      | medium   | 6     | 4      | 2       |
| `rubric_actionability`             | intelligence  | medium   | 6     | 4      | 2       |

Family movement vs Wave-B (#145 → #146):
- `qc_r1_4_cohort_determinism` 4 → 5 (**wiring defect persists** per item 155 —
  `run-cppa-risk-assessment/_w9_risk_slots.ts` still renders "April 1, 2028"
  for resolved 2029/2030 cohorts; recorded for a future deploy-guarded
  generator turn; not re-keyed around, integrity directive preserved).
- `qc_r1_2_spi_prong_utilization` 5 → **0** (RESOLVED — item-155 s6 re-key +
  item-154 crosswalk emitter).
- `qc_r1_3_50pct_prong_utilization` 5 → **0** (RESOLVED — same combination).
- `rubric_unsupported_business_claim` 8 → 10 (largest class; unchanged root).
- `rubric_citation_misapplied` 5 → 6 (§5 blocker).
- `e6_counsel_referral` 4 → 0 (item-154 PII fix removed the trigger; e6
  remains VALIDATED and unchanged per item 155).
- `rubric_internal_reasoning_leak` 3 → 4.
- `rubric_generic_boilerplate` 2 → 6 (new increase; watch next cycle).
- `rubric_actionability` — 6 (new visibility in this run's failing set).

Not proposing fixes this turn per read-only scope. No new batch launches.
No instrument or rubric changes. Campaign `fd1be147` remains CEO-paused.
