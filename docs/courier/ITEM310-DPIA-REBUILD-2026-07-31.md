# ITEM 310 — CHAPTER 6 REBUILD: dpia

**Stamp:** 2026-07-31T10:42Z
**Authority:** CEO directive 2026-07-31 (overnight autonomous-continuation instruction), controller dispatch ITEM 310.
**Scope:** engine turn on the dpia generator + fixture unblock in the same turn. **NO deploy, NO harness invocation, NO corpus ingestion.**

---

## 1. What was blocking

Chapter 6 of `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md` found four defects, of which only Op. 1 (Art. 35(3) trigger screening) was already PERFORMING:

| Op | Statutory duty | State before this item |
|----|----------------|------------------------|
| 1 | Art. 35(3) trigger screening | **PERFORMS** — preserved untouched |
| 2 | Art. 35(7)(b) necessity | **RECITED.** `completion_guidance` told the customer precisely which comparison to run and then asked *them* to run it. Load-bearing defect. |
| 3 | Art. 35(7)(b) proportionality | **OMITTED.** Merged into necessity, despite the product's own `guidance_note` treating them as distinct tests. |
| 4 | Art. 35(7)(c) risk assessment | **RECITED.** No per-risk likelihood/severity/residual. |
| 5 | Art. 35(7)(d) measures + Art. 36 | **RECITED,** and prior consultation was never determined at all. |

The record could not support Op. 2 even if the engine had tried: the intake never collected **the alternatives actually considered and rejected**. The fix is to collect the answer, not to prompt for it more loudly.

## 2. What was built

New pure-builder module `supabase/functions/_shared/ltp/dpia-deliverables/` — same architecture as Items 305/306 (cppa-risk) and 308/309 (cppa-admt): pure functions, no I/O, no clock, no env.

- **`types.ts`** — `NecessityFinding`, `ProportionalityFinding`, `RiskRegisterEntry`, `Art36Consultation`. Every field a scalar, string, or array of these records. No nested free-form bags.
- **`elements.ts`** — `DPIA_RISK_SPECS` (eight risks with deterministic triggers off intake shape) and `ANCHOR_KEYS` mapping each deliverable to its verified-authority row.
- **`build.ts`** — `buildNecessityFindings`, `buildProportionality`, `buildRiskRegister`, `buildArt36Consultation`, and the `buildDpiaDeliverables` envelope.

Wired into `run-dpia-framework/index.ts` at assembly (single-writer over the four report fields), with telemetry at `_meta.internal.dpia_deliverables`. The four keys were added to `DPIA_REPORT_SCHEMA.topLevel` — without that, the P2 whitelist serializer silently drops them, which is the wave-21 telemetry-gap lesson applied at authoring time rather than after a lost measurement.

### Op. 2 — necessity, PERFORMED

`buildNecessityFindings` runs the least-intrusive-means test over `alternatives_considered[]`:

- No alternative recorded → `undetermined_on_the_record` + `record_insufficient` with a *named* `information_needed`. Never a verdict.
- Alternative recorded but no rejection reason → same. A listed alternative is not a comparison.
- Rejection reason that turns only on usefulness, speed or cost → `less_intrusive_alternative_available`. Convenience does not establish necessity, and the engine now says so rather than accepting the controller's conclusion.
- Rejection reason that turns on the purpose not being achieved → `least_intrusive_means_supported`.

### Op. 3 — proportionality, SPLIT OUT

`buildProportionality` is its own deliverable with its own verdict field. It requires the record to argue **both directions** — a benefit-only record is `undetermined_on_the_record`, never proportionate. Both directions argued with no safeguard on the record yields `disproportionate_on_the_record`.

### Op. 4 — risk register

Only triggered risks emit. Each entry carries likelihood, severity and a residual band computed from inherent severity against recorded safeguard coverage. A record with no safeguards degrades every entry with a risk-specific `information_needed` naming that risk — not one generic sentence repeated eight times.

### Op. 5 — Art. 36, REASONED from Op. 4

`buildArt36Consultation` reads the residual bands out of the register rather than re-deriving risk. Any `high` residual → `consultation_required`, naming the driving risk ids. An empty register → `undetermined_on_the_record`; the engine will not say "not required" from silence.

## 3. REUSE LAW

Three registry rows were added to `dpia-verified-authorities.ts` from corpus already promoted in Item 300 — verbatim excerpts, not retyped: `consultation_of_data_subjects_35_9` (Art. 35(9)), `prior_consultation_art_36` (Art. 36(1)), `prior_consultation_materials_art_36_3` (Art. 36(3)). Both `prior_consultation_art_36` and `consultation_of_data_subjects_35_9` were removed from `DPIA_UNANCHORED_PROPOSITIONS` — they are anchored now, and leaving them on the write-around list would have let unanchored prose keep shipping.

The pin test asserts byte-identity between every emitted `authority_verbatim` and its registry row, so a paraphrase at any future edit fails the build rather than shipping.

## 4. SEPARATION GUARD

Item 308's mechanical-relocation pattern applied to the Art. 36 determination. `splitExposure` moves enforcement-exposure sentences (fines, Art. 83, penalties) out of the obligation finding and into a separate exposure note, counting repairs. An obligation finding that argues from the size of the fine is arguing from consequence rather than from the statute; the guard keeps the two surfaces apart mechanically instead of relying on prompt discipline.

## 5. Intake extension

`alternatives_considered` (structured: `processing_operation` / `alternative` / `rejection_reason`) added to `intake-contracts/dpia-framework.ts` and surfaced in `src/pages/DPIAFramework.tsx` as a repeater beneath the Art. 35(7)(b) narrative, with the empty-state consequence stated plainly. Art. 35(9) data-subject-views status (`data_subjects_views_sought`) and DPO advice (`dpo_advice`, Art. 35(2)) already existed on the contract and the form and are now **read by the builder** rather than only rendered.

## 6. Fixture unblock (Item 309 discipline, same turn)

`dpia-perfect-record` appended to `supabase/functions/_shared/golden/dpia.ts`: an occupational-health absence-triage record supplying every new field with specific content — two alternatives, each rejected on purpose-defeat grounds rather than convenience; DPO advice naming the two changes made before finalisation; works-council views with the concern actually raised. It exercises the ANALYSED path end to end. The three existing cases keep their degraded and adversarial postures untouched.

## 7. Verification

`src/registry/__tests__/dpia-deliverables.test.ts` — **19/19 passing**, typecheck clean. The fixture guard calls the same `validateIntake(dpiaFrameworkContract, …)` predicate `run-quality-batch` evaluates at run start, over every golden case — the actual predicate, not a proxy.

## 8. Four-team judgment calls

- **Necessity / proportionality boundary.** Necessity asks whether a less intrusive route reaches the *same* purpose (a comparison against alternatives). Proportionality asks whether the benefit justifies the impact *given that no less intrusive route exists* (a weighing, not a comparison). Unanimous under the four-team lens; it matches the product's own `guidance_note` split and keeps each deliverable answerable from a different part of the record.
- **Art. 36 structure.** Reasoned *from* the register rather than re-derived, so the determination cannot contradict the risk table printed above it in the same document. Unanimous.
- **No split calls to record.**

## 9. Honest limits

Measurability is restored; **no measurement was taken** — harness invocation is forbidden by the dispatch, so the ANALYSED path's quality is unscored. Not deployed. Op. 1 was preserved as-is and was not re-verified in this turn.
