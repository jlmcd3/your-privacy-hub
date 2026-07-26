# LTP-RISK-WAVE-B BUILD — HELD (2026-07-26)

**Dispatch:** LTP-RISK-WAVE-B (enforcement-mode build + go/no-go measurement).
**Status:** **HELD-AWAITING-CONTENT-ANCHORED-INPUTS**. No code, prompt, deploy, or measurement batch launched this turn.

## Diagnosis

Part 1 requires replacing `supabase/functions/_shared/ltp/derive.ts` with a structured-output model call producing `RenderPlan v1`. Per the standing rule "Product prompts and canonicals are change-controlled; edits arrive only as content-anchored couriers via John," the following inputs must arrive verbatim before the enforce-mode landing:

1. **Pass-1 system + user prompt** (the derive prompt the model executes).
2. **Structured-output schema** the gateway enforces on the response (the JSON-schema projection of `RenderPlan v1` — the existing TS `schema.ts` types are the type-level shape, not the wire schema).
3. **Pass-2 template set** for the Type W balancing section and every surface retained after the item-136 surface-audit (audit itself needs the CEO/controller retention decision list — the design doc names the default is CUT unless defended, but the defended list is not supplied).
4. **Pass V read prompt** (bounded close-call Type W + persuasive-material read).

None of the four are present in the dispatch. Fabricating them here would violate change-control and would silently define the customer-facing legal reasoning surface — the exact risk the two-pass architecture was authored to eliminate.

Part 2 (measurement batch, `batch_size 6`, `scenario_set='tuning'`, standalone `s5`) is explicitly gated on Part 1 landed + deployed, so it is transitively HELD.

## What is already in place (no changes this turn)

- `supabase/functions/_shared/ltp/{derive,guide,verify,closeness,pipeline,gate-eval}.ts` — shadow-mode scaffold from item 137.
- `supabase/functions/_shared/render-plan/schema.ts` + validators V1–V8 (v2.3 authority-domain + federal qualification).
- `supabase/functions/_shared/factors/cppa-risk-factors.ts` + `legal-test/cppa-risk-conclusions.ts` registries.
- `_ltp.test.ts` integration tests — green from item 137.
- `LTP_VERIFY_ENABLED` flag path — currently `undefined` → disabled.
- F0 signature emission continues from item 139.
- `run-cppa-risk-assessment` BUILD_STAMP unchanged from `ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`.

## Release condition

Controller / CEO courier delivering, at minimum, items (1) and (2) above (Pass-1 prompt + wire schema). Items (3) and (4) may follow in a sibling courier before deploy, but the derive replacement itself cannot land without (1) and (2). On release, this HELD marker converts to a build turn and Part 2 proceeds as specified.

## Zero-side-effect boundary

Edits this turn: (a) this courier, (b) ledger item 143 + header restamp. No code, prompt, rubric, grader, golden, contract, fixture, sample, registry, corpus, instrument, or threshold edits; no migration; no deploy; no batch launch; campaign `fd1be147` remains CEO-paused.
