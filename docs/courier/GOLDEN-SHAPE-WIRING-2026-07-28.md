# ITEM 241.3 — GOLDEN-SHAPE WIRING (cppa-risk)

**Date.** 2026-07-28. **Scope.** Wiring turn on `run-cppa-risk-assessment`. Binds the CEO-approved 241.2 content (compliance_guidance, deadline registry, CP5 §3.2 openers, golden deep-section templates) through pass-2 rendering with the five binding CEO conditions applied and the Type-J engineering rider executed. NO plan mutation; rendering-contract only.

---

## 1. CEO Binding Conditions — Wiring Disposition

| # | Condition | Wired at |
| - | --------- | -------- |
| 1 | Registry-bound pinpoints (never hand-typed) | `cppa-risk-conclusions.ts` (canonical anchors); composers read via `CPPA_RISK_CONCLUSION_INDEX[id].anchor.pinpoint` and `f.anchor.pinpoint`; ctx.__cite passes verbatim. Hand-typed pinpoints in the courier are cross-checked and overwritten by registry values at emit. |
| 2 | `j.safeguard_sufficiency` reserved_to reverts to `legal_counsel` | `cppa-risk-conclusions.ts` — retained as `legal_counsel`. |
| 3 | `r.admt.consequence_gated` keeps canonical § 7001(ddd) anchor | `cppa-risk-conclusions.ts` — anchor unchanged. |
| 4 | Deadline `deadline_basis` corpus-pin-tested before wiring | `cppa-risk-deadlines.ts` — `selectDeadlineOrFallback` degrades any failed-pin id to `d.ongoing_processing`; boot-time drift lint owned by `verifyCppaDeadlineDrift`. |
| 5 | Type-J engineering rider executes | `section-composers/cppa-risk.ts` — `DOCUMENTATION_FACTUAL_GATE_IDS` / `DOCUMENTATION_JUDGMENT_GATE_IDS` partition; `insufficientRecord` restricted to factual subset; fixture covered. |

---

## 2. Files touched

- `supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts` — `compliance_guidance` field authored on `ConclusionSpec`; populated verbatim from 241.2 §1 for all 15 rows; anchor & reserved_to bindings honored per CONDITIONS 1–3.
- `supabase/functions/_shared/legal-test/cppa-risk-deadlines.ts` **(new)** — 7 rows verbatim from 241.2 §2.4 with the one-deadline-per-action, prospective-marking, and ongoing-processing laws recorded as module-header comments; `selectDeadlineOrFallback` provides fill-or-fallback resolution (CONDITION 4).
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` — `T.risk.priority_action.golden` (four-move gap-driven), `T.risk.record_sufficiency.prose` (flowing lead-in), and 5 CP5 §3.2 section-opener templates (`scope`, `balance`, `actions`, `compliance_guidance`, `executive_summary`) authored verbatim from 241.2 §3–§4.
- `supabase/functions/_shared/ltp/slot-resolver.ts` — `SlotContext` extended with 21 new plan slots the golden templates consume; `resolveSlot` switch cases added.
- `supabase/functions/_shared/ltp/pass2-render.ts` — `REQUIRED_PLAN_SLOTS` for the 7 new templates so fill-or-omit gates the golden shape.
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts`:
  - Type-J engineering rider: `DOCUMENTATION_FACTUAL_GATE_IDS` / `DOCUMENTATION_JUDGMENT_GATE_IDS`; `insufficientRecord` restricted to factual subset.
  - `composePriorityActions` rewritten gap-driven; consumes `ConclusionSpec.compliance_guidance` and `selectDeadlineOrFallback` (one deadline per action).
  - `composeRecordSufficiency` prepends `T.risk.record_sufficiency.prose` (Golden §4.3).
  - `composeScope` prepends `T.risk.section_opener.scope` (CP5 §3.2, customer-first).
  - `SECTION_COMPOSERS_VERSION` → `ltp-section-composers-cppa-risk-2026-07-28-item241-3-wiring`.
- `supabase/functions/_shared/ltp/pass2-assembler.ts` — `PASS2_ASSEMBLER_VERSION` → `ltp-pass2-assembler-2026-07-28-item241-3-wiring`.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — `BUILD_STAMP` → `ltp-risk-item241-3-golden-shape-wiring`.

Registry / provenance / Single-Writer / CP3 shape / CP4 pinpoints / CP5 coherence — UNCHANGED.

---

## 3. Tests

`_shared/legal-test/`, `_shared/ltp/`, `_shared/report-contracts/` — **252 passed | 0 failed** under `deno test --no-check --allow-all` (6s).

Updated:
- `content/content.test.ts` — 27 → 34 template ids (7 new).
- `waveb.test.ts` — template count 27 → 34 with new-shape callouts.
- `cp4-labels-citations.test.ts`, `cp5-scope-coherence.test.ts`, `item241-1-structural.test.ts` — filter `T.risk.section_opener.*` before asserting per-prong shape (openers are additive, prong assertions unchanged).

Type-J fixture coverage retained via existing `cp5-scope-coherence.test.ts` insufficient path; docs-complete + Type-J = firm mode is now the structural default via the partition (no docs-factual gate fires → `insufficientRecord` returns false).

(Pre-existing `_shared/render-plan/validators.lia.test.ts:237` type-check gap in the LIA fixture is unrelated to this scope and unchanged.)

---

## 4. Deploy + verbatim ping

Deployed `run-cppa-risk-assessment`. Boot log (verbatim):

```
2026-07-28T21:04:54Z INFO [run-cppa-risk-assessment] boot build_stamp=ltp-risk-item241-3-golden-shape-wiring@2026-07-28T21:04:54.103Z
2026-07-28T21:04:54Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-item241-3-golden-shape-wiring@2026-07-28T21:04:54.103Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
```

---

## 5. Next

Controller wire-verifies then launches the BATCH OF THREE for the first variance-aware read.
