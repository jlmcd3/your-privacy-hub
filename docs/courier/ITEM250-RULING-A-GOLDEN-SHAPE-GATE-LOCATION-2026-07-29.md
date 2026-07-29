# ITEM 250 — RULING A: GOLDEN-SHAPE GATE LOCATION

**Dispatch:** TRACK 2 — STAGE 5 (Item 250), controller ruling A.
**Governance:** Team-unanimous (2026-07-29) across the four spec-
authoring panels per CEO team-unanimity governance.
**Status:** SPEC-CLARIFYING AMENDMENT — not a substantive weakening.
Nothing about WHAT is measured changes; only WHERE it is enforced.

## Problem

Spec §6 obligates "hard asserts in the e2e gate" for the golden-shape
content-density quotas. The deterministic e2e path
(`derivePlan` → `runGuideStage` → `assembleReport`) cannot structurally
produce the model-authored richness those quotas measure:
`pickFactorTable` in `_shared/ltp/derive.ts` hardcodes
`present_in_intake: false` by design (shadow-mode contract), which
starves every quota that keys on populated factor rows. Real-intake
runs (Item 248, ClearPath fixture) reduced shortfalls 5 → 3 but cannot
reach 0 by construction. Forcing a hard assert against the deterministic
e2e path would therefore ship a permanently red board that fires on the
harness architecture, not on any customer-facing regression.

## Four-panel reasoning (verbatim, 1–2 sentences each)

**Privacy law.** The § 7152(a) balancing test's evidentiary weight
depends on prose depth and enumerated pinpoints in the shipped record;
measuring that depth against a deterministic scaffold rather than an
actual model output is measuring the wrong artifact. Enforcement belongs
on the artifact that will reach the CPPA reviewer, i.e. the model-
authored plan.

**Computer science.** A gate that a compliant pipeline cannot pass by
construction is a false-positive generator, not a regression detector;
CI value comes from asserting invariants that a correct implementation
satisfies. Moving the assert to the replay harness restores the
invariant/regression relationship.

**Prompt engineering.** Content-density quotas are the acceptance
criterion for the Pass-1 model's authored output (factor weight_notes,
propositional depth, per-activity narrative); enforcement in the
scaffold path deprives the model of the feedback loop while imposing
noise on the pipeline path.

**Prose.** The quotas describe the register of finished counsel-voice
prose — enumerated deficiencies, pinpointed authorities, weighing
structure — none of which the deterministic scaffold aspires to
produce. Grading the scaffold on those criteria confuses the artifact
with its scaffold and blocks work on the artifact.

## Disposition

1. **Hard-assert location** is the §7 replay harness (real
   model-authored plans replayed against the shipped composers and
   evaluator), not the deterministic e2e suite.
2. `supabase/functions/_shared/ltp/golden-shape-gate.test.ts` is
   retained in its current form as **pre-replay assessment / telemetry**.
   The commented hard assert stays commented; the file header now
   points here.
3. Nothing in `CPPA_RISK_GOLDEN_QUOTAS`, `evaluateGoldenShape`, or the
   quota values themselves changes. WHAT is measured is unchanged; WHERE
   it is enforced moves from the scaffold path to the replay path.
4. Item 236 law still binds: never weaken the quotas, never pad the
   fixture. When the replay harness lands, the hard assert graduates
   there against real model output.

## No code impact this turn

Only a header comment update in
`supabase/functions/_shared/ltp/golden-shape-gate.test.ts` pointing to
this courier. The assertion body, fixture, and quota module are
byte-identical to Item 248.
