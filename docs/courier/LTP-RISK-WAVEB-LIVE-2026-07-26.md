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

---

## Addendum — 2026-07-26T22:11:00Z: run unwedged via SERVICE_ROLE kick

**Symptom.** Wave-B measurement run `d8d42997-8601-4984-9a37-34c3230cba17` sat at `status='pending'`, `next_doc_index=0`, heartbeat unchanged since 21:49:03Z.

**Root cause.** Bare `quality_runs` row without a paired `quality_batch_runs`. `batch-kickoff-pickup` reads `quality_batch_runs` only, so standalone runs are never picked up.

**Action.** One SERVICE_ROLE internal-resume kick via existing `kick-perfect-intake` (already `run_id`-parameterized — no redeploy). Upstream `202 {"resumed":"d8d42997..."}`.

**Verification.** Row transitioned `pending → generating`; heartbeat advanced across six 20s polls (22:08:56 → 22:10:36). No re-kick.

**Prevention (Wave-C onward).** Recommend wrapping standalone measurement runs in a `quality_batch_runs` row at launch time so existing pickup/sentinel infrastructure serves them — smaller change than a permanent kicker. `kick-perfect-intake` remains available as a one-shot rescue tool.

Ledger item: 151.

---

## Addendum — WAVE-B RELAUNCH, BATCH-WRAPPED (2026-07-26T23:20:10Z)

**Supersession.** Bare run `quality_runs.id=d8d42997-8601-4984-9a37-34c3230cba17` (item 151 unwedge) failed with `Orphaned by runtime shutdown — rerun to continue.`, 0 docs, 0 scores. Marked SUPERSEDED. Not a duplicate-launch violation — the relaunch replaces a 0-yield failure.

**Relaunch.** Inserted `quality_batch_runs.id=fc6a8394-a265-4297-b086-805e183d2ee5`:
- tools `{cppa-risk}`, batch_size `6`, instrument `gc-2026-07-26-s5-eu-uk-ca-au-sg`
- `campaign_id=NULL` (standalone), `status='running'`, `phase='kickoff'`
- Standard admin insert path; `batch-kickoff-pickup` serves the row; orchestrator self-chains per doc; delivery sentinel reaps.
- Visible on `/admin/quality-batch`.

**Root cause (bare-run failure mode).** Bare `quality_runs` rows run inside a single Deno isolate with no self-chain and no sentinel coverage. Enforce-mode adds per-doc Pass-1 LLM calls (with N=2 retry budget), extending isolate wall-time past runtime-shutdown horizons. The isolate dies mid-run; orphan-reaper flips status to `failed` with `Orphaned by runtime shutdown`. Yield: zero docs.

**Standing rule (promoted NOW).** All measurement runs — tuning, holdout, pilot, one-off — MUST be launched wrapped in a `quality_batch_runs` row. `kick-perfect-intake` is retired for multi-doc runs; it remains a single-doc rescue tool only. Item-151's Wave-C-onward guidance is superseded by this immediate standing rule.

**Post-terminal.** Monitor extracts per existing Wave-B extraction spec.
