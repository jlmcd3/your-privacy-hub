# PROGRAM REDIRECTION — Complete LTP migration so Pass-2 IS the shipped surface (2026-07-28)

**Ledger:** Item 218. Accounting + plan turn only; no code, no deploy.

## CEO ruling (verbatim)

> "We have wasted time trying to correct something that we had agreed to REMOVE. ... We need to build the revised product NOW and that is what we should be testing."

## Effective immediately

1. Legacy-body smoke-fix chain **TERMINATED**. Smoke #12 (`cec002f3-6d10-438a-ba32-5e56043b83fd`) may complete but triggers no follow-up work.
2. Batch-of-3 production run **CANCELLED**.
3. New objective: complete the **LEGAL TEST PIPELINE migration for cppa-risk** so Pass-2 section-sharded rendering IS the shipped surface, per `docs/design/LEGAL-TEST-PIPELINE.md` (DESIGN COMPLETE-v2.3). §22.1 clean-arm counter is superseded.

## (a) Migration accounting vs design requirements

**BUILT for cppa-risk:**
- R/W/J conclusion inventory (`_shared/legal-test/cppa-risk-conclusions.ts`)
- Factor registry with `guidance_refs[]` (`_shared/factors/cppa-risk-factors.ts`)
- RenderPlan schema + `weighing_frame[]` + validators (`_shared/render-plan/`) — v1/v2/v2.1/v2.2/v2.3 tiers
- Derive stage (`derive.ts`) + gate evaluator (`gate-eval.ts`)
- Pass G / Guide stage (`guide.ts`, `closeness.ts`)
- Pass-1 LLM enforce-arm (`pass1-llm.ts`) with N=2 retry, 75s cap, write-around
- Pass-2 renderer engine (`pass2-render.ts` + 19 templates)
- Pass V stub (`verify.ts`, disabled)
- Jurisdiction-tag scoping + `FORBIDDEN_COMPARATIVE_TOKENS`
- Shadow orchestrator (`pipeline.ts` `runLegalTestPipelineShadow`)

**NOT BUILT:**
- Pass-1 RenderPlan as authoritative artifact (currently telemetered on `_meta.internal` only)
- Pass-2 section-sharded assembler wired as the shipped body
- Section-shard template coverage for the full report surface (only 19 templates authored; ~20+ report-schema sections need coverage)
- Legacy scrub-pass retirement (~15 modules under `_shared/ltp/` still serve the legacy body)

**Wave A/B/C recap:** Wave A shipped corpus/deadline registries; Wave B shipped everything EXCEPT the authoritative wire (inventories, factor registries, Guide, closeness, forbidden tokens, structured-slot asserts); Wave C hardened the LEGACY body (persist-first, clock contract, composition-finalize, value-screen, hook-audit, shipped-surface-guard). Wave C is precisely the work the CEO's redirection identifies as time spent on the surface we agreed to remove.

## (b) What remains

1. **Pass-1 as authoritative:** run derive unconditionally for cppa-risk; persist RenderPlan; validators gate; write-around emits Type J body instead of falling through to legacy composer.
2. **Pass-2 section-sharded assembler:** new module `_shared/ltp/pass2-assembler.ts` walks a `section-shards/cppa-risk.ts` registry (report-schema key → template set + RenderPlan projection) and returns the report-shape object.
3. **Legacy retirement:**
   - **Die with legacy body:** `summary-compose.ts`, `waveb-completion.ts`, `waveb2-closure.ts`, `cohort-append.ts`, `info-needed-normalize.ts`, `renderer-181.ts`, `surface-write-guard.ts`, `_risk_citation_dup_fix`, legacy composer call in `run-cppa-risk-assessment/index.ts`.
   - **Survive as validators on Pass-2 output:** `composition-finalize.ts` (repurposed to assembler exit), safe-finalize/persist-first, `value-screen.ts` shipped arm, shipped-surface-guard, `mode-assert.ts`, `retry-budget.ts` clock contract, `composition-hook-audit.ts`.
   - **Migrate as pure functions into assembler:** `cyber-audit-schedule.ts`, `risk-level-map.ts`, `slot-resolver.ts`.
4. **Guards attach to new body:** clock contract (15-min wall-clock now bounds Derive+Guide+Render+Verify); shipped-surface-guard bindings regenerated from section-shard registry; shipped-value-screen only (pre-serializer arm retires); §2.5 post-render hard reject (flat-certainty on close balance) wired at assembler exit.

## (c) Cutover plan — 8–10 turns to first Pass-2-shipped document

| Turn | Deliverable |
|---|---|
| T-M1 | Derive-as-authoritative wire in `run-cppa-risk-assessment/index.ts`; validators gate; write-around telemetered. |
| T-M2 | Section-shard registry `_shared/ltp/section-shards/cppa-risk.ts` + gap report. |
| T-M3 | Templates for high-volume sections (`risk_assessment_by_activity`, `top_risks`, `priority_actions`, `next_steps`, `assessment_summary`, `scope_and_triggers`) with firm+hedged variants + `what_would_tip_it` slot on hedged + Type J counsel-voice. |
| T-M4 | Templates for remaining sections (`strengthen_items`, `inconsistency_flags`, `exception_analysis`, `record_sufficiency`, `citation_ledger`, `fsor_commentary`, `attestation_block`, `scope_confirmation`, `document_metadata`, disclaimers). |
| T-M5 | Pass-2 assembler `_shared/ltp/pass2-assembler.ts` walks registry, produces full report object from a fixture RenderPlan; tests. |
| T-M6 | Wire assembler as shipped body; delete legacy composer call; attach all surviving guards; deploy candidate; §16 ping. |
| T-M7 | Delete "die-with-legacy" modules; update `SUBSUMED_GUARDS`; prune unused schema surfaces if any. |
| T-M8 | First Pass-2-shipped controlled smoke (single-document, Wave-D fixture); evidence + courier. |
| T-M9 | Contingent: patch turn on any gaps surfaced in T-M8. |
| T-M10 | Wave-D shape, Engine-B-led batch of 6 (already CEO pre-authorized), scored — acceptance baseline against the revised product. |

**Existing verifiers reused unchanged:** Deno unit suites (`pass2-render`, `renderer-181`, `composition-finalize`, `value-screen`, `surface-write-guard`, `validators`, `validators.lia`, `waveb`, etc.); `quality_batch_runs` / `quality_runs` / `quality_run_documents` batch harness; §16 ping-prove endpoint; grader instruments `gc-2026-07-26-s6` (report schema preserved).

**Single riskiest item:** **T-M3+T-M4 template authoring coverage.** 20+ semantically dense sections must each become bounded templates (firm+hedged where Type-W engages) driven only by RenderPlan slots. Under-authored → blank shipping; over-constrained → stiff prose. Scope discovery here most likely to force a re-plan; recommend an interim checkpoint after T-M4 before assembler cutover.

## (d) Design-doc blockers

**None.** `LEGAL-TEST-PIPELINE.md` is DESIGN COMPLETE-v2.3; §0 open questions answered; all v1/v2/v2.1/v2.2/v2.3 build-blocking prerequisites for cppa-risk are satisfied. Item 137 already landed Phase-2 shadow. T-M1 can begin immediately on controller/CEO plan approval.

## Disposition

**HARD STOP for CEO/controller review of the plan before build turns begin.**
