# Product Improvement Register

**Purpose:** Product-level improvements that CANNOT be solved by Product Prompt changes — structural, engine, schema, and rebuild/reformat candidates surfaced by quality testing.

**Categories:** `[SCHEMA]` `[ENGINE]` `[ARCHITECTURE]` `[HARNESS-UI]` `[PRODUCT-IDEA]`

**Maintenance:** Append-only by the quality pipeline; every ruthless review appends. Items are removed only when shipped (note the shipping turn) or CEO-rejected.

---

## 1. [ARCHITECTURE] biometric-checker — registry-driven generation redesign

**Date:** 2026-07-23

Heavily deterministic-template-driven generation; residual boilerplate/actionability ceiling and persistent Claude/GPT grader split (Δ14 in post-C1 rerun) suggest the per-state analysis may need registry-driven generation redesign rather than more template patches. Evidence pending from rerun `5aee4b99` review.

---

## 2. [SCHEMA] cppa-admt — report schema normalization

**Date:** 2026-07-23

Report schema inconsistencies (top-level vs `scope_analysis` nesting) caused the silent scope-gate bug (POST-C1-FIX-1A). A schema-normalization pass with a typed contract would prevent the class.

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

## Register metadata

- **Sections:** 12
- **Created:** 2026-07-23
- **Last reviewed:** 2026-07-23
