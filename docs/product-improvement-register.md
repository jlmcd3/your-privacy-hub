# Product Improvement Register

**Purpose:** Product-level improvements that CANNOT be solved by Product Prompt changes — structural, engine, schema, and rebuild/reformat candidates surfaced by quality testing.

**Categories:** `[SCHEMA]` `[ENGINE]` `[ARCHITECTURE]` `[HARNESS-UI]` `[PRODUCT-IDEA]`

**Maintenance:** Append-only by the quality pipeline; every ruthless review appends. Items are removed only when shipped (note the shipping turn) or CEO-rejected.

---

## 1. [ARCHITECTURE] biometric-checker — registry-driven generation redesign

**Date:** 2026-07-23

Heavily deterministic-template-driven generation; residual boilerplate/actionability ceiling and persistent Claude/GPT grader split (Δ14 in post-C1 rerun) suggest the per-state analysis may need registry-driven generation redesign rather than more template patches. Evidence pending from rerun `5aee4b99` review.

---

## 2. [SCHEMA] cppa-admt — report schema normalization ✅ SHIPPED 2026-07-23 (POST-C1-FIX-1C)

**Date opened:** 2026-07-23 · **Shipped:** POST-C1-FIX-1C (2026-07-23T23:15:00Z)
**Shipping BUILD_STAMP:** `run-admt-checker` → `post-c1-fix-1c-admt-schema-normalization@2026-07-23T23:15:00Z`
**Files:** `_shared/admt-scope-contract.ts` (new typed contract + `readAdmtScope` + `normalizeAdmtScopeShape` + `assertAdmtScopeShape`); `src/lib/admt/scope.ts` (client mirror); `_tests/admt-scope-contract.test.ts` (7 tests, drift-logging asserted). `run-admt-checker/index.ts` calls `normalizeAdmtScopeShape` at generation and `enforceScopeGateOnGaps` now reads via `readAdmtScope`. `generate-report-pdf/index.ts` and `src/pages/admt/ADMTCheckerResult.tsx` route through the contract for migration-safe display of legacy stored reports. `run-quality-batch/index.ts` grader checks (adtech, gaming, art11 gate, notice_gaps_when_inscope) route through the contract too. Prompt schema block explicitly declares "MUST live inside scope_analysis; do not emit at top level". Structured log `admt_scope_drift_detected` surfaces stored-report drift going forward. Kept item entry in-place per register policy (mark shipped, do not delete).

---

## 3. [ARCHITECTURE] run-quality-batch/index.ts — module split

**Date:** 2026-07-23

`run-quality-batch/index.ts` ~3k lines near the bundle ceiling — root cause of repeated deploy drift. Split into intake/dispatch/grading/polling modules (courier-recommended 2026-07-22).

---

## 4. [SCHEMA] top_3_actions — hard schema slots

**Date:** 2026-07-23

`top_3_actions` structured exec summary is prompt-enforced only (W3-T4 deviation 5). Hard schema slots in the four generators would make it verifiable.

---

## 5. [ENGINE] generate-ir-playbook — enforcement-bracket verifier extension

**Date:** 2026-07-23

Enforcement-bracket verifier matches amounts only. Extend to regulator + URL + decision-id per original spec (logged in post-C1 review).

---

## 6. [HARNESS-UI] LaunchGateScoreboard — gate_v2/shadow + certification flip

**Date:** 2026-07-23

`LaunchGateScoreboard` still legacy-score only; gate_v2/shadow display + certification-gate flip await CEO decision.

---

## 7. [HARNESS-UI] Coverage matrix — true increment semantics and never-hit warnings

**Date:** 2026-07-23

`hit_count` lacks true increment semantics (needs Postgres RPC); never-hit-cell digest warnings unwired (QB-P20 deviations 7/9).

---

## 8. [HARNESS-UI] regrade_frozen instrument-noise worker

**Date:** 2026-07-23

`regrade_frozen` instrument-noise worker: action queues but no worker executes; needed for grader-variance baseline. The ADMT/biometric Δ>14 disagreements make this timely.

---

## 9. [ENGINE] cppa-cyber — targetForSeverity per-status buffer arithmetic

**Date:** 2026-07-23

`cppa-cyber` renderer `targetForSeverity` per-status buffer arithmetic still uniform (QB-P24 D1).

---

## 10. [ENGINE] registration — per-jurisdiction sector obligations overlay

**Date:** 2026-07-23

Registration sector-overlay depth beyond the French HDS note: per-jurisdiction sector obligations, healthcare first.

---

## 11. [PRODUCT-IDEA] "DEEP REVIEW" paid stage-two adjudication product

**Date:** 2026-07-23

CEO concept, parked 2026-07-21. Customer answers scored adequate/revise with statute-anchored reasons before incorporation. Build only after stage-two certification completes.

---

## 12. [HARNESS-UI] Intake-page guidance batch — form-UX pass

**Date:** 2026-07-23

Implement `docs/quality-batch-learnings.md` items (provider-vs-deployer helper text, one-product-per-entry, stale-date warning, named-roles encouragement) as a single form-UX pass.

---


### 13. [ENGINE] Biometric state-statute registry — verified-pinpoint discipline (2026-07-23)
Per-state pinpoints in `check-biometric-compliance/index.ts` (CO/IN/IL/etc.) are hardcoded without per-entry verification metadata. Post-C1-Fix-2D corrected Rite Aid (2023190) and softened Indiana pinpoints to parent chapter + named-uncertainty; a durable fix carries a `verified_on` date and primary-source URL alongside each pinpoint, and a build-time check that stale entries beyond a threshold surface a warning.

### 14. [HARNESS] Extend RESUMABLE_GENERATORS to run-admt-checker (2026-07-23)
Batch 5aee4b99 doc 5 for ADMT died at 1204s with no resurrection. `run-admt-checker` should join the resumable-generator set (checkpoint after each stage; resume on watchdog re-entry) to prevent single-doc timeout losses from truncating a batch.

### 15. [ENGINE] Amendments-block source table needs a "post-cutoff case law" row type (2026-07-23)
Per CEO ruling in POST-C1-FIX-2-AMEND, verified post-training-cutoff authorities (case law) must be whitelisted in the grader amendments block, not stripped from products. The block currently composes from `dpia-jurisdiction-registry` + `admt-citation-registry` + static amendment strings; Clay v. Union Pacific was added as a dedicated block sourced from `_shared/registry/statutory-rules-registry.ts` (BIPA_CITATIONS). Durable fix: promote a first-class "post-cutoff case law" row type in the amendments-block builder so future verified rulings (e.g. Illinois Supreme Court retroactivity guidance, EU CJEU post-cutoff decisions) auto-render with docket / court / date / holding / never-deduct guidance.

### 16. [ENGINE] Indiana biometric pinpoint — primary-source verification required (2026-07-23)
Per CEO ruling on deviation D-FIX2-D-INDIANA, softening Indiana's biometric citation to the parent chapter is acknowledged as a temporary hedge, not verification. Before the next CPPA/biometric batch, the Indiana pinpoint(s) used by `check-biometric-compliance` must be pinpoint-verified against the primary source (Indiana Code Title 24, Article 4, Chapter 14 biometric-data provisions, or the current statutory home) with `verified_on` date and primary-source URL captured in the state-statute registry alongside the entry (dovetails with #13 verified-pinpoint discipline).

### 17. [SCHEMA] quality_run_documents — persist pdf_export state at doc grain (2026-07-23)
Per CEO ruling on deviation D-PDF-STATE-NOT-PERSISTED, the batch-mode ledger cannot currently report PDF export status because `quality_run_documents` has no `pdf_export_url` / `pdf_export_status` / `pdf_export_error` columns. Batch reports must fall back to inference. Durable fix: add `pdf_export_status` (enum: `pending|success|failed|skipped`), `pdf_export_url` (text nullable), `pdf_export_error` (text nullable), and `pdf_exported_at` (timestamptz) to `quality_run_documents`; wire the export path in the orchestrator/generator to write these fields; surface the aggregate in batch result queries.

### 18. [PROCESS] Golden-fixture CI enforcement — STANDING RULE (2026-07-23) ✅ SHIPPED 2026-07-24 (REGISTER-18-CLOSURE)
Per FIXTURE-LIA-3 meta-question: `_tests/golden-contract.test.ts` correctly catches nested required-always violations (verified by making it fail on the Northwind Retail intake pre-fix, then pass post-fix). The `CONTRACT_BY_TOOL` hand-mirror in the test file is complete; the `validateIntake` walker correctly evaluates nested paths. The Wave-4 leak happened because no automated CI gate ties this test to golden-fixture commits. **CEO ruling 2026-07-24: no git-hook infrastructure.** Shipped as a STANDING RULE instead: any turn that touches ANY file under `supabase/functions/_shared/golden/` or `supabase/functions/_shared/intake-contracts/` MUST run `_tests/golden-contract.test.ts` and `_tests/qbp20.test.ts` before reporting, and paste the pass output in the turn report — a golden/contract change without pasted green tests is an incomplete turn (same standing as a missing deploy stamp). The run-time pin validation remains the backstop.


### 19. [HARNESS] DPIA-STALL-1 — per-unit heartbeat + reap/resurrect interplay (2026-07-23)
Shipped in this turn. Root cause of the Wave-4 DPIA stall (batch `a71df02d`): the child `run-quality-batch` worker isolate died mid-flight; QB-P21's `pollGenerationRow` resurrection lives inside that dying isolate and therefore never ran; the DB-level `quality_runs_watchdog` fires at 3 minutes stale, well before the campaign-orchestrator's 10-minute QB-P13 resurrect window. Fix: (a) `runUnit` in `run-dpia-framework` now writes a `last_heartbeat_at` on unit start and refreshes it every 30 s via a background interval while the anthropic call is in flight — stalls are now attributable to a specific unit and the row's `updated_at` advances during long calls; (b) failure captures upstream provider status (parsed from `Anthropic <status>: <body>`) into a structured `upstream` telemetry field so the reaper's "Orphaned by runtime shutdown" is never the only signal; (c) `quality_runs_watchdog` extended from 3 min to 12 min for `tool='dpia'` only, giving pollGenerationRow's QB-P21 (~3 / 6 min swings) and orchestrator's QB-P13 (~10 min swing) full room to fire before the watchdog declares death. Non-DPIA tools remain on the 3-minute window.

## Register metadata

- **Sections:** 19
- **Created:** 2026-07-23
- **Last reviewed:** 2026-07-24 (REGISTER-18-CLOSURE — standing rule shipped)

