# CONSOLIDATED-CORRECTION-CP2 — SINGLE-WRITER CORE (Item 240 CP2)

Date: 2026-07-28
Dispatch: CEO Item 240 Checkpoint 2
Scope: cppa-risk LTP Pass-1 sequencing + adapter authorship + shipped-shape

## Root Cause (verified against code)

Run #173 evidence: both Pass-1 attempts rejected with
`V7_W_PROP_NO_FRAME` at
`propositions.prop.w.balance.risks_vs_benefits.weighing_frame_ref`;
`wa_origin=pass1_validator_reject` (working as built).

Verified against code:

- `supabase/functions/_shared/ltp/pass1-llm.ts` (prior build): after
  `JSON.parse(jsonText)`, immediately called
  `validateRenderPlan(candidate, WEIGHING_TESTS)`. Guide stage
  (`runGuideStage`) was NOT invoked here — it only ran later in the
  cppa-risk edge function AFTER Pass-1 returned.
- `supabase/functions/_shared/render-plan/validators.ts` V7 requires
  every Type-W proposition to carry a `weighing_frame_ref` that
  resolves against `plan.weighing_frame`.
- `supabase/functions/_shared/ltp/content/pass1-derive-prompt.ts` prior
  system prompt Rule 4 covered only `factor_table`; the model was never
  instructed to author `weighing_frame`.

Therefore: V7 demanded a field neither the model nor the adapter had
produced by the time it ran. Passing runs #169–171 survived only when
the model spontaneously fabricated frame entries. This is exactly the
Item 239 S1 (sequencing) + S2 (ambiguous authorship) class.

## (A) Single-Writer Core — new order of operations in `runPass1Llm`

Landed in `supabase/functions/_shared/ltp/pass1-llm.ts` via
`applySingleWriterInjection(parsed, input)`:

1. Parse model output.
2. Adapter INJECTS deterministic fields from the same functions used by
   the shadow derive path (single source of truth in `derive.ts`):
   - `plan_version`, `product`, `build_stamp`, `jurisdiction_tag`
   - `intake_ledger` via `pickLedger(input.intake)` over the full
     `LEDGER_KEYS` contract
   - `citation_bindings` via `pickCitationBindings()` (registry-seeded)
   - `gate_outcomes` via `evaluateCppaRiskGates(input.intake)`
   - `factor_table` scaffold via `pickFactorTable()`, with the model
     permitted to overlay ONLY `present_in_intake` (boolean) and
     `weight_note` (≤ 240 chars) keyed by `factor_id`
   - `propositions` skeleton keyed by `CPPA_RISK_CONCLUSIONS`, with
     model-authored `polarity` preserved for Type R when valid;
     `intake_ledger_refs` and `citation_binding_refs` are adapter-derived
   - `conservative_write_around` forced to `{triggered:false}` (T-M9.4
     VALID PLAN INVARIANT retained)
3. Adapter runs `runGuideStage(seed)` to populate `weighing_frame`.
4. Adapter BINDS `weighing_frame_ref` on every engaged Type-W
   proposition using the first frame entry whose `test_id` matches the
   conclusion's `weighing_test_id`.
5. §0 empty-by-finding contract: Type-W propositions whose Guide slice
   yields no candidates are converted to `epistemic_type: "J"` so V7
   does not reject the plan for something Guide cannot produce.
6. THEN `validateRenderPlan(plan, WEIGHING_TESTS)`.

Guide precedes validation by construction; any model authorship of
adapter-owned fields is telemetered as drift and discarded, never
shipped.

## Revised Prompt (verbatim — content-anchored change)

Landed at `supabase/functions/_shared/ltp/content/pass1-derive-prompt.ts`
(`PASS1_DERIVE_PROMPT_VERSION = "pass1-derive-2026-07-28-item240-cp2"`):

```
You are the derivation engine for a CCPA Risk Assessment (11 CCR §§ 7150-7157). You DERIVE; you never write prose. Output EXACTLY one JSON object conforming to the provided response schema (RenderPlan v1). Rules, in priority order:
1. SOURCES. You may use ONLY: the customer intake payload; the conclusion inventory; the factor registry; the gate registry — all provided below. Nothing else exists.
2. SINGLE-WRITER LAW. The adapter OWNS these fields deterministically and OVERWRITES whatever you emit for them: intake_ledger, citation_bindings, gate_outcomes, weighing_frame, plan_version, product, build_stamp, jurisdiction_tag, conservative_write_around. Return empty arrays [] for the list-typed fields and stub objects/strings for the scalar fields; your values there are ignored. Author only what this rule does not enumerate.
3. PROPOSITIONS. Propose only proposition ids present in the conclusion inventory. For every Type R proposition, set polarity strictly per its gate's deterministic rule over the intake — if a required intake value is absent, set polarity "not_applicable"; NEVER guess. Type W propositions carry no polarity; Type J propositions render as reserved decisions. Set intake_ledger_refs and citation_binding_refs to empty arrays [] — the adapter will rebind them against its derived ledger and bindings after the fact.
4. THE BALANCE (factor_table). Populate factor_table with one row per applicable factor from the factor registry: intake_ledger_refs [] (adapter rebinds), guidance_refs from the registry row, and a weight_note ≤ 240 chars stating the factual basis ONLY (no conclusions, no law). Omit a factor ONLY if its registry row marks it optional and no intake fact bears on it; mandatory factors with no supporting intake get weight_note "no record evidence" — never invented support. Set present_in_intake truthfully.
5. CITATIONS. You never output a citation string, a § character, or a law name. Only pinpoint_ref keys from the registries (in citation_binding_refs of a proposition, though the adapter overwrites those too).
6. NO PROSE. No property outside weight_note/note fields may contain a sentence. Note fields: ≤ 240 chars, at most one period.
```

## (E) Shipped-Shape Contract — `executive_summary` string on both sides

Prior state:
- `pass2-assembler.ts` `buildTypeJWriteAroundBody` emitted
  `executive_summary: [disclosure]` (array).
- PDF exporters (`generate-report-pdf/index.ts`,
  `generate-cppa-suite-pdf/index.ts`) rendered
  `report.executive_summary` through `text()` / `escHtml()` / `esc()`
  scalar helpers — an array would toString to a comma-joined blob.

Fix landed on the correct side (assembler): Type-J
`executive_summary` is now a plain string `disclosure`. The PDF
exporters are unchanged (they expect a string; contract is now
respected by the single writer).

## (D) Fossils

Verified this turn: `POST_LINT_LLM_BUDGET_MS`,
`POST_LINT_LLM_MAX_CALL_MS`, `POST_LINT_LLM_CALL_TIMEOUT_MS` are still
imported by `run-cppa-risk-assessment/index.ts` and referenced in
`retry-budget.ts` + `retry-budget.branch-correction.test.ts`. NOT
fossils; no retirement this turn. Full fossil pass deferred to a
follow-up dispatch with an explicit preservation table.

## (F) Joint Tests

New file: `supabase/functions/_shared/ltp/pass1-llm-single-writer.test.ts`.

1. Mocked model output that OMITS `weighing_frame` produces a
   validator-clean plan with Guide-populated frame and resolvable
   `weighing_frame_ref` on every Type-W proposition on the shipped plan.
2. Adapter overwrites model-authored junk for `intake_ledger`,
   `citation_bindings`, `gate_outcomes`, and preserves the VALID PLAN
   INVARIANT for `conservative_write_around`.

Empty-by-finding invariant is guarded by construction: any Type-W prop
whose Guide slice is empty is converted to Type-J before validation, so
V7 cannot reject the plan for a missing frame.

## Stamps

- `PASS1_LLM_STAMP = "ltp-pass1-llm-item240-cp2-single-writer@2026-07-28"`
- `PASS1_DERIVE_PROMPT_VERSION = "pass1-derive-2026-07-28-item240-cp2"`

## Deploy

Pending controller wire-verification.
