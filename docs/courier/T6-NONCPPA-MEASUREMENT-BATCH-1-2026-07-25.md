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
