# SPEC-WRITEBACK — WAVE-B2 → Design Law (2026-07-27)

**Class:** Docs-only design-law amendment (CEO-directed feedback-loop closure).
**Ledger:** item 158 (this turn). Follows item 157 (Wave-B.2 citation closure landed + deployed).
**Scope:** No code, no deploys, no instrument changes. s6 frozen. Campaign fd1be147 remains CEO-paused. Wave-C batch `9c1e3a8f-5b2d-4e7c-9a4b-8f2d1e5c7b3a` unaffected.

## Purpose

The six Wave-B2 citation defects were fixed at their root layers in item 157. This turn writes their **generalized clauses** into the standing design law so every future dispatch — for risk, lia, and all Stage-2/3 products — inherits them by compilation. This closes the standing improvement loop:

> **defect → root fix → generalized clause in design law → inherited by all future dispatches.**

The loop itself is now standing process law (LTP-PIPELINE §15).

## CEO ruling recorded

"Spec-writeback ordered as standing practice: every defect class closure includes its design-law generalization in the same or next turn — dispatches compile from the law, so the law is where learning lives."

## Files amended (docs-only)

### `docs/design/LEGAL-TEST-PIPELINE.md`

- **§4.1 Rendering contract** — added clause **(6) Atomic-token invariant**: substituted token spans `{{cite:…}}`, `{{intake:…}}`, `{{plan:…}}` (and successors) are atomic; no truncation, wrapping, max-chars clamp, formatting op, or downstream scrubber may split their interior; truncation ops MUST operate on token boundaries or reject and re-render; partial/garbled substituted span = HARD REJECT.
- **§4.1 Rendering contract** — added clause **(7) No-self-contradiction invariant**: a rendered report may never REQUEST information (via `information_needed`, `record_sufficiency`, or any product-analog surface) that the same report already STATES; deterministic product-agnostic post-render cross-check.
- **NEW §12 Emitter law** — deterministic statutory-threshold / enumeration emitters ship in the same turn with an exhaustive input-domain matrix test derived from corpus verbatim text; output vocabulary MUST include an `indeterminate` class rendered honestly; silent decisive output on straddling inputs = defect.
- **NEW §13 Surface-map ownership law** — closed owner vocabulary `{pipeline-template | deterministic-emitter | legacy-frozen}`; `unchanged` / `unmapped` retired; every `legacy-frozen` surface requires a same-turn citation-token audit + recorded retirement/migration target (motivating case: attestation_block § 7156(a)).
- **NEW §14 Fix-shape law** — pipeline-product fixes are specified at the most upstream layer the defect permits (authoring-time law > structural invariant > NEVER a new downstream scrubber); new string-surgery scrubbers are a **FORBIDDEN FIX SHAPE** for pipeline products; bounded transitional-scrubber exception requires same-turn design-law writeback + recorded retirement wave.
- **NEW §15 Standing improvement-loop law** — codifies the loop as process law; writeback occurs in the same turn as the root fix or the immediately following docs-only turn; late writeback = process defect.

### `docs/design/LEGAL-TEST.md`

- Q1 Type-R infrastructure gains the **statutory-enumeration resolution-map clause**: trigger→prong, band→cohort, band→prong, count→cohort, threshold→outcome are registry artifacts (not rendering-time computations) and ship in the same authoring turn with an exhaustive assignment test against the corpus verbatim enumeration; silent misresolution = HARD REJECT.

## Defect → new-clause traceability

| # | Wave-B2 defect (item 157 evidence) | Root layer fixed in item 157 | Generalized clause (this turn) |
|---|---|---|---|
| 1 | Token-substitution truncation — garbled `140(d)(1)(A)…` fragment in a priority action | Substitution/clamp interaction hardened; sentence-drop belt-and-braces guard in `waveb2-closure.ts` | **LTP-PIPELINE §4.1(6)** — atomic-token invariant, product-agnostic |
| 2 | `information_needed` self-contradiction (requests pinpoints already stated in the report) | Deterministic post-render filter `filterSelfContradictoryInformationNeeded` | **LTP-PIPELINE §4.1(7)** — no-self-contradiction invariant, product-agnostic |
| 3 | T7 opening emitter trigger-map — sensitive-location intake resolved to wrong § 7150(b) prong | Prong assignments verified against `ccpa-7150-pin.ts` verbatim; exhaustive prong-assignment regression test | **LEGAL-TEST Q1 addendum** — statutory-enumeration resolution maps are registry artifacts with exhaustive corpus-verbatim assignment tests at authoring time |
| 4 | `attestation_block` cited unverified § 7156(a) (left old-path by surface map) | Re-anchored to registry-verified § 7157(b)(5) + § 7157(c) in `_w9_risk_slots.ts`; validator updated | **LTP-PIPELINE §13** — surface-map ownership law; `legacy-frozen` requires same-turn citation-token audit + retirement/migration target (**motivating case** cited in the clause) |
| 5 | Cyber crosswalk asserted `§ 7120(b)(2)(A) met` on straddling revenue band (`$25M to under $50M` × 250K+) | `computeProngOutcomes` tightened to emit `indeterminate` on straddling bands | **LTP-PIPELINE §12** — emitter law; exhaustive input-domain matrix test + mandatory `indeterminate` class |
| 6 | Fix-shape drift — pattern of accreting downstream string-surgery scrubbers to address root defects | Item 157 shipped fixes upstream where possible; residual guards flagged transitional | **LTP-PIPELINE §14** — fix-shape law; new downstream string-surgery scrubbers FORBIDDEN for pipeline products; bounded transitional-scrubber exception |

Plus the meta-clause covering all six:

| — | Feedback-loop closure discipline (this dispatch's motivating principle) | — | **LTP-PIPELINE §15** — standing improvement-loop law: every defect-class closure writes its generalized clause into design law in the same or next turn |

## Inheritance

All future dispatches — pending LIA turns, IR-Band-Realignment (item 114), Two-Pass rollouts to Stage-2/3 products, and every subsequent product build — compile from the amended `LEGAL-TEST-PIPELINE.md` + `LEGAL-TEST.md` and inherit clauses §4.1(6), §4.1(7), §12, §13, §14, §15, and the LEGAL-TEST Q1 resolution-map clause **without additional per-product carrier language**. Product-specific dispatches may reference these clauses by section number; they do not need to restate them.

## Status

LANDED (docs-only). Design law amended, ledger item 158 recorded, courier committed. No code, no deploys, no instrument changes.
