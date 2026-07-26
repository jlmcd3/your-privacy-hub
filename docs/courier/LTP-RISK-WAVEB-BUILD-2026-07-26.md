# LTP-RISK-WAVE-B BUILD — CONTENT LANDING (2026-07-26)

**Dispatch.** LTP-RISK-WAVE-B (enforcement-mode build + go/no-go measurement).
**Status.** **PART-1 CONTENT LANDED (files a-d); PART-1 WIRING HELD-B; PART-2 MEASUREMENT GATED-ON-WIRING.** Item 143 hold converted to a bounded content landing turn.

## What landed this turn (files, verbatim + tests)

| Courier item | File | Notes |
|---|---|---|
| (a) Pass-1 derive prompt | `supabase/functions/_shared/ltp/content/pass1-derive-prompt.ts` | System + user-template exports, `PASS1_DERIVE_PROMPT_VERSION=pass1-derive-2026-07-26`. VERBATIM. |
| (b) Wire schema | `supabase/functions/_shared/ltp/content/renderplan-wire-schema.ts` | Mechanical projection of `_shared/render-plan/schema.ts`: `additionalProperties:false` everywhere, closed enums, `required` = every non-optional field, 240-char cap on note fields. Round-trip check `planKeysProjected()` exported. |
| (c) Pass-2 templates + surface-audit rulings | `supabase/functions/_shared/ltp/content/pass2-templates.ts` | 10 templates VERBATIM; `SURFACE_AUDIT_RULINGS`: `scope_notes=CUT`, `cross_tool_recommendations=CUT`, `inconsistency_flags=TEMPLATE_CUT`; forbidden tokens; `BALANCE_DIRECTION_CLAUSES` (2-element closed enum); `FIRM_VARIANT_CLOSENESS_MAX=0.6`. |
| (d) Pass-V verify prompt | `supabase/functions/_shared/ltp/content/passv-verify-prompt.ts` | System export VERBATIM. `PASSV_VERIFY_PROMPT_VERSION=passv-verify-2026-07-26`. |
| tests | `supabase/functions/_shared/ltp/content/content.test.ts` | 11 Deno tests: prompt content invariants, template id set, ADMT-suppression `emits_nothing`, surface rulings, forbidden-token presence, closed enum shape, closeness threshold, wire-schema top-level requireds cover every canonical field, wire-schema **round-trip against `derivePlan()` output** (no extra keys / no missing requireds), enum-list well-formedness. All new tests type-check clean and pass. |

## Pre-existing type error unchanged

`supabase/functions/_shared/render-plan/validators.lia.test.ts:237` reports a `readonly GuidanceRef[]` incompatibility on `authority_weight`. This error pre-dates this turn (landed under item 138 LTP-LIA-PHASE1) and is untouched by any file this turn edits. Per scope discipline it is left for the LIA-Phase-2 wiring turn.

## What is HELD-B (Part-1 wiring, not landed this turn)

The four content courier files supply prompts, wire schema, templates, and surface rulings. They do **not** supply the surface-mapping wiring — i.e. which `report_data` field or path each rendered template writes into, and how each template's output composes with (or replaces) the current generator's `findings[]`, `risk_register[]`, `executive_summary`, and the templated `inconsistency_flags` "Items for your review" list. Without that mapping, replacing `derive.ts` with an LLM structured-output call and running Pass-2 template substitution end-to-end would silently re-define the customer-facing legal-reasoning surface — the exact class the two-pass architecture exists to eliminate.

Required for release from HELD-B, minimum:
1. **Surface map** (courier): for each of the 10 templates, the `report_data` path(s) it writes into, the composition rule with existing generator output on that path, and the emit-order relative to `scrubReportVocab`, W6/W9/W10/W20-W24, cohort-date, intake-contradiction, and citation-dup-fix scrubbers.
2. **CUT execution point**: the courier says `scope_notes` and `cross_tool_recommendations` are CUT. State whether the CUT happens at (a) the generator template (model no longer asked to emit), (b) the whitelist serializer (dropped at write), or (c) both. This turn does not execute the CUT because it is customer-visible and its execution site is ambiguous under the received text.
3. **Pass-V bind**: which specific rendered sections Pass V is invoked on (the courier says "close-call Type W + persuasive-material sections" — the mapping to concrete `report_data` paths is needed).

## What is GATED (Part-2 measurement)

Part-2 (standalone `s5` batch, `cppa-risk` only, `batch_size 6`, `scenario_set='tuning'`, single launch, not campaign-linked) is explicitly gated on Part-1 landed + deployed. With Part-1 wiring HELD-B, Part-2 does not launch this turn. Post-terminal extraction, tuning/holdout split, and the Wave-C verdict all wait for the wiring turn's deploy.

## Zero-side-effect boundary

Edits: (a) 4 new files under `_shared/ltp/content/`, (b) 1 new test file, (c) this courier, (d) ledger item 143b + header restamp. **No** edits to: `derive.ts`, `pipeline.ts`, `verify.ts`, `guide.ts`, `closeness.ts`, `run-cppa-risk-assessment/index.ts`, rubric, grader-context, grader, goldens, contracts, fixtures, samples, registries, corpus, instrument, thresholds. **No** migration; **no** deploy (`BUILD_STAMP` unchanged: `ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`); **no** batch launch; campaign `fd1be147` remains CEO-paused.

## Test evidence

```
Check supabase/functions/_shared/ltp/content/content.test.ts   → typecheck clean (this turn)
```
Type-check failure elsewhere in the tree is `validators.lia.test.ts:237` (pre-existing, unrelated to this turn's files).
