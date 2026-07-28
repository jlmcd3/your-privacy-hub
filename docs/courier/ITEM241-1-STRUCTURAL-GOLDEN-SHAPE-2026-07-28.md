# ITEM 241.1 — STRUCTURAL FIXES + GOLDEN-SHAPE TELEMETRY (COURIER)

**Date.** 2026-07-28
**Scope.** cppa-risk. Authoring + deploy turn. Structural E1/E2 blockers cleared; Q1/Q2 golden-shape depth telemetry landed as observe-mode at assembler exit. No plan mutations; rendering-contract only.

---

## 1. FIXES

### E1 — Scope engaged-lead + resolver gap (slot fill-or-omit dropped scope shards)
- `supabase/functions/_shared/ltp/slot-resolver.ts`: added `prong_subject` to `SlotContext` and to the `resolveSlot` switch. Root cause: composer supplied `prong_subject` via ctx but the resolver had no case, so `fill-or-omit` dropped scope templates on required-slot check.
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` (`composeScope`): engaged prongs sort to the lead via bucketed stable sort; within each bucket registry order is preserved.

### E2 — Insufficiency predicate keyed exclusively on documentation gates
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` (`insufficientRecord`): now returns true iff any `G.documentation.*` gate is non-pass. Legacy `factor_table.length === 0` heuristic retired — it produced "coherently insufficient" contradictions when documentation gates were green but factor authorship trailed.
- `aggregateBalance` consumes the same predicate so exec/balance modes cannot re-split at the assembler exit.

### Q1/Q2 — Golden-shape depth telemetry (observe-mode)
- `supabase/functions/_shared/ltp/golden-shape-quotas.ts` (new): per-section quotas keyed to the top-50 legacy corpus (chars / items / avg_chars_per_item). Pure evaluator; no report mutation.
- `supabase/functions/_shared/ltp/pass2-assembler.ts`: wires `evaluateGoldenShape(report)` into `telemetry.exit_checks.golden_shape`. Version bumped to `pass2-assembler@2026-07-28-item241-1-structural`.
- `docs/design/GOLDEN-SHAPE-cppa-risk.md`: spec mirror.

---

## 2. TESTS

`supabase/functions/_shared/legal-test/item241-1-structural.test.ts` — 5/5 green.

Related suites re-run under `--no-check` scope: `_shared/legal-test/**`, `_shared/ltp/pass2-assembler.test.ts`, `_shared/ltp/e2e-document.test.ts`, `_shared/report-contracts/**` → **43 passed | 0 failed**.

(Deno `--check` type error on `_shared/render-plan/validators.lia.test.ts:237` — `guidance_refs` fixture rows missing `authority_weight` — is pre-existing and unrelated to this scope; the 241.1 code compiles clean and all 241.1 tests pass. Flag for a subsequent hygiene turn.)

---

## 3. DEPLOY + VERBATIM PING

- BUILD_STAMP bumped in `supabase/functions/run-cppa-risk-assessment/index.ts` (line 23) to `ltp-risk-item241-1-structural-golden-shape`.
- Deployed `run-cppa-risk-assessment`.
- Boot log (verbatim):

```
2026-07-28T20:26:08Z INFO [run-cppa-risk-assessment] boot build_stamp=ltp-risk-item241-1-structural-golden-shape@2026-07-28T20:26:08.905Z
2026-07-28T20:26:08Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-item241-1-structural-golden-shape@2026-07-28T20:26:08.905Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
```

---

## 4. NEXT

- 241.2 — Registry authoring courier (per-row `compliance_guidance` + statutory deadline registry content, verbatim in a follow-on courier for CEO review).
- 241.3 — Wiring turn (bind registry content through pass-2 templates; flip golden-shape telemetry from observe to advisory once quotas stabilise).
