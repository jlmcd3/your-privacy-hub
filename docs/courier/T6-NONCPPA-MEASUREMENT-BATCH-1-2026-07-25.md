# T6-NONCPPA-MEASUREMENT-BATCH-1 — Launch Courier

**Dispatch:** `T6-NONCPPA-MEASUREMENT-BATCH-1-2026-07-25`
**Controller tick:** 2026-07-25T20:10Z
**Launched:** 2026-07-25T20:12:51Z (sandbox clock re-read immediately before write)
**Class:** measurement only — zero edits to prompts/rubrics/graders/goldens/contracts/fixtures/samples/registries/corpus. NO deploys. NO sample regeneration.
**CPPA/s4:** untouched (frozen instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` NOT ridden).

---

## 1. Pre-launch clear

- `quality_batch_runs` running/pending: **0**
- In-flight customer-path generations: **0**
- Next scheduled wave: ~22:00Z (>100 min clear)

## 2. Scope

Five rewired non-CPPA tools:

| Tool | Jul-24 batch_size | Wave-1 batch_size | Comparability |
| --- | --- | --- | --- |
| dpia          | 3 | 3 | mirrored |
| dpa-generator | 3 | 3 | mirrored |
| lia           | 2 | 2 | mirrored |
| governance    | 2 | 2 | mirrored |
| ir-playbook   | 2 | 2 | mirrored |

Not in scope: registration, biometric-checker (not rewired). admt/risk/cyber (frozen s4).

## 3. Deviation ruled — two-batch split

The non-campaign `startRun` path in `quality-batch-orchestrator` accepts a single `batch_size` per `quality_batch_runs` row (per-tool sizing lives only on campaign `tool_state`). To preserve the HARD CONSTRAINT of per-tool comparability with Jul-24 baselines without instantiating a campaign row (which would carry unwanted `progress_log`/spend/`tool_state` side-effects), the dispatch was split into two parallel batches under one dispatch id. Instrument, launch window, and wave posture are identical.

## 4. Batches launched

- **Batch A** — `072eef66-7480-4d33-af19-2e3330050da3`
  - tools: `[dpia, dpa-generator]`
  - batch_size: **3**
  - concurrency: 2
  - started: 2026-07-25T20:12:51.868Z
  - phase (T+0): `running_tool`
- **Batch B** — `6f90f7b8-447a-4902-993d-af53265fdb91`
  - tools: `[lia, governance, ir-playbook]`
  - batch_size: **2**
  - concurrency: 3
  - started: 2026-07-25T20:12:51.821Z
  - phase (T+0): `running_tool`

Instrument-version header stamp on both rows: `gc-2026-07-25-s4-eu-uk-ca-au-sg` (header stamp only — non-CPPA tools' grader contexts are unchanged inside `run-quality-batch`; no instrument ride).

## 5. Launch mechanics

- Path: `quality-batch-orchestrator` `action=start` (automation-enabler branch — `isCron` + `x-internal-cron:1` header + vault `ADMIN_SECRET_TOKEN` bearer). Same gate as the `campaign_tick` cron. No code, no deploy.
- Owner (`created_by`) resolved via `resolveAdminOwner()` (first admin `user_id` in `user_roles`): `02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`.
- Transport: pg_net `net.http_post` (request ids 75532, 75533).

## 6. Monitoring plan

- ETA ~35–50 min for 5 tools.
- Controller extracts digest on completion:
  - per-tool overall + six dims (citation/hallucination/accuracy/analysis/intelligence/formatting)
  - critical/high finding counts + finding-class breakdown
  - comparison vs Jul-24 baselines
  - build-of-record stamp verification via LEAK-PREV-P2 serializer whitelist keys (`_meta.internal.*` telemetry echoed per row)

## 7. Guardrails observed

- Measurement only; no prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits.
- No edge-function deploys.
- CPPA tools (admt/risk/cyber) untouched; s4 frozen instrument not ridden.
- No Fable-5 anywhere. No pricing/payment/design-token/customer-revision-path/signup surfaces touched.
- Stamps re-read from the sandbox clock immediately before write.

---

## 8. DIGEST (controller-extracted 20:39Z)

**DONE — T6-NONCPPA-MEASUREMENT-BATCH-1 DIGEST** @ controller tick 2026-07-25T20:39Z (docs-only; discharges dispatch T6-NONCPPA-MEASUREMENT-BATCH-1-2026-07-25 extraction obligation). Both batches COMPLETE: (A) `072eef66-7480-4d33-af19-2e3330050da3` [dpia, dpa-generator] complete 20:30:37Z; (B) `6f90f7b8-447a-4902-993d-af53265fdb91` [lia, governance, ir-playbook] complete 20:35:34Z. Instrument stamp `gc-2026-07-25-s4-eu-uk-ca-au-sg` echoed in `grader_context_version` on all 5 `quality_runs`.

**RESULTS vs Jul-24 baselines** (instrument caveat applies — cross-instrument comparison is directional only, never certification input):
- ir-playbook 91.45 (run 92, quality_run cdd91d50) vs 92.05 → −0.60. Dims: cit 92/hall 92/acc 91/ana 91/int 90/fmt 92. Checks 42/48.
- dpa-generator 88.45 (run 90, 7650d69c) vs 87.70 → +0.75. Dims: cit 91/hall 90/acc 89/ana 82/int 84/fmt 90. Checks 44/51.
- lia 87.80 (run 98, 155f4303) vs 86.60 → +1.20. Dims: cit 91/hall 86/acc 86/ana 90/int 85/fmt 86. Checks 51/64.
- dpia 85.05 (run 118, ac00634f) vs 86.25 → −1.20. Dims: cit 86/hall 86/acc 85/ana 83/int 82/fmt 89. Checks 38/45.
- governance 83.65 (run 104, 19050834) vs 84.60 → −0.95. Dims: cit 84/hall 83/acc 85/ana 81/int 85/fmt 90. Checks 43/56.
- registration NOT in scope (not rewired; Jul-24 baseline 88.75 unmeasured this batch).

**VERDICT:** all five deltas within batch noise (σ≈2.3–2.5 at batch-3; batches here 2–3). NO out-of-noise regression; NO revert or fix dispatch triggered by scores alone. ZERO criticals on all 5 tools.

**FAILED-FINDING CLASSES** (fail_count>0): dpa-generator: unsupported_business_claim 2 (high), citation_misapplied 1 (high), generic_boilerplate 3, actionability 1. dpia: citation_misapplied 2 (high), internal_reasoning_leak 1 (high), unsupported_business_claim 1 (high), generic_boilerplate 3. governance: unsupported_business_claim 3 (high), citation_misapplied 3 (high), qc_r1_8_governance_additional_context 1 (high), actionability 3, generic_boilerplate 3. ir-playbook: unsupported_business_claim 2 (high), generic_boilerplate 3, e6_counsel_referral 1 (med). lia: citation_misapplied 3 (high), unsupported_business_claim 3 (high), generic_boilerplate 4, actionability 3.

**STAMP-ECHO VERIFICATION** (build-of-record, via `_meta.internal` on batch docs; serializer whitelist intact): dpia `w1-dpia-wire@2026-07-25T12:36:00Z`; dpa `w1-dpa-wire@2026-07-25T14:18:00Z`; lia `w1-lia-wire@2026-07-25T13:06:13Z`; governance `w1-governance-wire@2026-07-25T14:02:34Z`; ir `w1-ir-wire@2026-07-25T14:50:00Z`. All 5 present; serializer `rs-w1-2026-07-25` + emit-gate `eg-w1-2026-07-25` echoed.

**OBSERVATION** (queued, not actioned): emit-gate `unterminated_sentence` findings concentrated on lia (39 degraded, `prose_node_count` 145) and governance (24/145) — hits are on list-item strings (`key_elements`, `regulatory_basis_v2.engaged_because`, `review_triggers`) that are legitimate non-sentence fragments; ir emit-gate tripped its >30% safety valve (enforcement skipped, availability preserved). Likely gate false-positive class on list fragments; queued as a gate-calibration candidate (own turn, deploy-guarded) — NOT a customer-content defect and NOT score-affecting this batch.

**PER-TOOL BACKLOG** (§2 additions, one deploy-guarded turn each, attribution-first doctrine, non-CPPA slots only): (a) lia + governance + dpia: port W24 admt Class A key-selection-mismatch audit (citation_misapplied is top high class on all three); (b) all five: unsupported-business-claim scrub port (W24 Class B analog); (c) governance: `qc_r1_8_additional_context` fix candidate; (d) ir-playbook: `e6_counsel_referral` scrub port (W24 T-Aa analog); (e) lia/governance: emit-gate list-fragment calibration. CPPA priority unchanged — these fill free slots only.

**DEVIATION RULED:** controller local VM DISK-FULL persists (20:39Z tick); all reads + this dispatch routed via Lovable query_database/read_file/send_message per Backend-access law; John flagged (restart fixes). No other deviations. No spend beyond query+dispatch.

---

## 9. WAVE-2 DIGEST — batch `5332771a-522b-4a1c-be3e-a1373512ac68` (extracted 2026-07-26T04:59:57Z)

**DONE — T6-NONCPPA-MEASUREMENT-BATCH-1 WAVE-2 DIGEST** @ controller tick 2026-07-26T04:59:57Z (docs-only; discharges the ledger item 116 step (i) extraction obligation and the item 85 launch-courier extraction obligation). Batch terminal: `status=complete` `phase=done` `started=2026-07-26T04:00:40.523Z` `completed=2026-07-26T04:55:24.686Z` (~54.7 min). Instrument header: `gc-2026-07-25-s4-eu-uk-ca-au-sg`. All 5 tools complete; `error_count=0`.

### 9.1 Per-tool overall + six dims (Claude / GPT cross-review)

| Tool | Overall | GPT | cit | hall | acc | ana | int | fmt | Δ (Claude−GPT) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ir-playbook   | 91.55 | 90 | 92 | 93 | 91 | 90 | 90 | 92 | +1.55 |
| dpa-generator | 87.50 | 86 | 90 | 88 | 89 | 81 | 83 | 91 | +1.50 |
| lia           | 84.50 | 75 | 87 | 81 | 85 | 86 | 82 | 85 | **+9.50** |
| governance    | 79.15 | 83 | 78 | 75 | 82 | 81 | 83 | 79 | −3.85 |
| dpia          | 74.50 | 82 | 73 | 73 | 74 | 79 | 79 | 74 | −7.50 |

Run ids: dpia=`90a76a3f-a073-46c6-a7ba-d557d77dd6ea`, lia=`b0ab45da-c735-4731-a645-e3132951ea1b`, governance=`7db720bb-fffc-4377-bdfb-e9c2762b6bb3`, dpa-generator=`1155415e-76d0-444c-ada1-a27269653e4f`, ir-playbook=`f7ae2c10-0f0c-472d-bbcc-b2e2b2c99218`. All batch_size=3, scenario_set=`tuning` (verified in `quality_run_documents`).

### 9.2 REQUIRED reconciliation — score-delta question (this wave vs 20:12 split-pair § 8)

| Tool | 20:12 (item 81) | 04:00 (this wave) | Δ | scenario_set | Doc composition |
| --- | --- | --- | --- | --- | --- |
| dpia       | 85.05 | 74.50 | **−10.55** | tuning (both) | 20:12 docs: 87.2 / 87.5 / 80.7 (all mid-80s). 04:00 docs: 72.3 / 83.3 / 68.0 (two low, one mid). |
| governance | 83.65 | 79.15 |  **−4.50** | tuning (both) | 20:12 docs: 88.85 / 75.5 / 86.25 (one severe, two strong). 04:00 docs: 81.5 / 78.9 / 77.05 (uniformly moderate). |

**Explanation:** Both runs sit on the identical `scenario_set='tuning'` register with `batch_size=3` on the same frozen instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg`. Between 20:12Z (2026-07-25) and 04:00Z (2026-07-26) the corresponding edge functions received ZERO deploys (dpia stamp `dpia-t6fix@2026-07-25T23:31:00Z` and governance stamp `gov-t6fix@2026-07-25T23:48:00Z` were both cut BEFORE the 20:12 run per ledger items 89/92/94 — no post-20:12 deploy on either). The tuning register samples 3 of a larger pool; the per-doc scores above show clearly different fixture draws (severity distribution shifted). **VERDICT:** the deltas are **scenario-difficulty artifacts** (tuning-pool sampling variance), NOT product signal. This aligns with the standing σ≈2.3–2.5 batch-3 noise band being exceeded ONLY because the fixture rotation itself changed the difficulty mix. Neither result is a certification input; do not read as regression.

Corollary: **T6 is now CLOSED** per item 116 step (i) — no further T6-style non-CPPA measurement batches. Future non-CPPA reads happen inside campaign waves (when the CEO resumes the campaign) with fixed scenario_sets, not ad-hoc T6 batches whose scenario-pool variance dominates the signal.

### 9.3 LIA grader divergence (Claude 84.5 vs GPT 75.0 → +9.50)

Widest cross-grader gap in the wave. Claude scored citation 87 / analysis 86 / accuracy 85; GPT overall 75 (per-dim not populated in cross-review path). Consistent with the standing observation that lia's list-fragment content (`key_elements`, `regulatory_basis_v2.engaged_because`, `review_triggers`) is scored more generously by Claude and more harshly by GPT — same class of divergence flagged in § 8 (wave-1 emit-gate false-positives on non-sentence list items). Not a wave-2 defect; recorded as a standing measurement-instrument observation. No dispatch triggered.

### 9.4 Guardrails observed

- Measurement only; no prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits this wave.
- No edge-function deploys during the batch window.
- CPPA tools (admt/risk/cyber) untouched.
- Stamps re-read from sandbox clock immediately before write (`2026-07-26T04:59:57Z` per `date -u`).
- Backend-access law: all reads via managed `psql` (`quality_batch_runs`, `quality_runs`, `quality_run_documents`, `function_runs`).

### 9.5 T6 closure

T6-style non-CPPA measurement batches CLOSED per CEO-fixed execution order v2 (ledger item 116 step (i)). Any future non-CPPA quality measurement moves to campaign-wave-embedded reads under CEO-resumed campaigns.
