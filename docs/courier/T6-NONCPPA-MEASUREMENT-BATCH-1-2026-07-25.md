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
