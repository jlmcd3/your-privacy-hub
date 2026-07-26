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

---

## APPEND 2026-07-26T18:00:30Z — SURFACE MAP LANDED + SERIALIZER CUTS APPLIED (item 143c)

Content-anchored SURFACE-MAP COURIER released item 143b HELD-B for surface bindings and CUT execution.

Landed VERBATIM:
- `supabase/functions/_shared/ltp/content/risk-surface-map.ts` — `RISK_SURFACE_BINDINGS`, `RISK_CUT_RULINGS`, `RISK_PASSV_INVOCATION_MAP`. Template→path bindings for every top-level and per-activity surface listed in the courier; Pass-V invocation bounded to hedged-or-close balance, hedged-summary, and persuasive-marked (impossible today).

Serializer cuts applied at LEAK-PREV-P2 whitelist (`_shared/report-schemas/cppa-risk.ts`, bumped `rs-w1-2026-07-26-ltp-waveb`):
- `cross_tool_recommendations` removed from `topLevel` (CUT).
- `scope_and_triggers` given `objects` allow-list = `["triggered_activities_detail"]`; `scope_notes` pruned (CUT).
- `inconsistency_flags` NAME retained in `topLevel` + `entries` per TEMPLATE_CUT (content restricted to T.risk.review_items).

Renderer-tolerance audit (same-turn requirement):
- `RiskAssessmentReportV4.tsx` — all three keys guarded (`|| []`, `|| {}`, `&&`).
- `generate-report-pdf/index.ts` — `Array.isArray()` / `|| {}` / conditional guards.
- `RefinePanel.tsx` — comment-only reference.
Conclusion: cuts safe at serializer; no `_meta.internal` deprecation fallback used.

Typecheck: `deno check` clean on both edited files.

Still HELD-C (Part-1 wiring) and GATED (Part-2 measurement) pending a courier delivering: LLM Pass-1 adapter site inside `pipeline.ts` (model routing, N=2 retry, structured-output binding, `conservative_write_around` contract); per-activity balance integration test corpus proving `activity_ref` propagation; assessment_summary variant-calibration post-render assert cases; Pass-V bounded-read implementation inside `verify.ts`; deploy-turn locks + boot-log target.

`BUILD_STAMP` unchanged: `ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`. No deploy; no batch launch; campaign `fd1be147` remains CEO-paused.

---

## APPEND 2026-07-26T18:51:41Z — PART-1 MAX-BUILDABLE-SUBSET LANDED; VALID CONTENT HELD-D on assessment_summary (items 144 + 145)

Under the controller ruling closing the content set and clarifying the build mandate, the maximum buildable engineering subset has landed as ISOLATED modules (no import edge from `run-cppa-risk-assessment/index.ts` or `pipeline.ts`). Enforcement-mode activation and the Part-2 measurement batch are HELD-D on a specific missing CONTENT item.

### Files landed (item 144)

| File | Purpose |
|---|---|
| `supabase/functions/_shared/ltp/pass1-llm.ts` | LLM Pass-1 adapter, N=2 retry, `LTP_ENFORCE_ENABLED` guard, write-around fallback, `google/gemini-3.6-flash`, prompt `pass1-derive-2026-07-26`. |
| `supabase/functions/_shared/ltp/slot-resolver.ts` | Deterministic plan_slot resolution (benefit/negative/safeguard tokens, balance-direction clause, tipping factors, open questions). |
| `supabase/functions/_shared/ltp/pass2-render.ts` | Token substitution for `{{cite:...}}` / `{{plan:...}}` / `{{intake:...}}`; forbidden-token guard; `max_chars`; leaked-slot regex; `assertCalibrationMatch` at `FIRM_VARIANT_CLOSENESS_MAX`; `emits_nothing` honored. |
| `supabase/functions/_shared/ltp/waveb.test.ts` | 10 Deno tests covering write-around (both paths), forbidden-token, `emits_nothing`, unknown-template, calibration violation, slot-resolver fallthrough, manifest exposure, template-count enumeration. |

### Test evidence

`deno check _shared/ltp/pass1-llm.ts _shared/ltp/pass2-render.ts _shared/ltp/slot-resolver.ts _shared/ltp/waveb.test.ts` → clean.

### Isolation

No edits to `derive.ts`, `pipeline.ts`, `verify.ts`, `guide.ts`, `closeness.ts`, `run-cppa-risk-assessment/index.ts`, `_shared/report-schemas/cppa-risk.ts` (already at `rs-w1-2026-07-26-ltp-waveb`), rubric, grader-context, grader, goldens, contracts, fixtures, samples, registries, corpus, instrument, thresholds. No migration; no deploy; `BUILD_STAMP` unchanged (`ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`).

### VALID CONTENT HELD-D (item 145): `assessment_summary` composition prose

Per the controller ruling — HELDs are valid only when naming missing customer-facing legal-reasoning content — the following prevents Part-1 index-wiring + Part-2 batch launch:

1. **Opening sentence template.** `assessment_summary` needs an answer-first opening sentence that summarizes the assessment as a whole. Neither `T.risk.balance.*` nor `T.risk.closing.reserved` opens the paragraph — both are body-only.
2. **Connective tissue.** The composition rule joining the chosen balance template to `T.risk.closing.reserved` (paragraph split vs. inline connector) is undefined.
3. **Multi-activity aggregation rule.** When `risk_assessment_by_activity[]` has N>1 activities, the aggregation from per-activity balance renderings into the single `assessment_summary` slot is undefined.

Authoring any of (1)–(3) would author customer-visible legal-reasoning prose. The wired modules are ready to activate on receipt of an `assessment_summary` composition courier in a single deploy+batch-launch turn.

### Standing rule recorded

A HELD on any future LTP build turn is valid ONLY if it names a specific missing content item (prompt / template / rendering rule / legal classification). Engineering questions must be resolved conservatively within the delivered content and documented in the courier; if two engineering options both respect the content, pick the one that changes less and note the alternative.

Campaign `fd1be147` remains CEO-paused. No deploy. No batch launch.
