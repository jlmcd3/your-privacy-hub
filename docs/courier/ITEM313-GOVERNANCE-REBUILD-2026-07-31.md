# ITEM 313 — CHAPTER 9 REBUILD: governance

**Date:** 2026-07-31
**Dispatch:** CONTROLLER — ITEM 313. Authority: CEO directive 2026-07-31 (overnight autonomous-continuation instruction).
**Scope:** engine turn on the governance generator. NO deploy, NO harness invocation, NO ingestion.
**Own turn.** Item 312 (ir-playbook) is COMPLETE and verified; nothing from it was repeated.

---

## 0. Corpus check (confirmed, not assumed)

Chapter 9 (E)(6) asserted Arts. 5, 24, 30, 37, 38, 39 are present and complete in `gdpr_articles(eu,·)`. Confirmed independently by length/tail query before any code was written:

| Row | Chars | Tail |
| --- | --- | --- |
| `eu / 5` | 1,977 | "...and be able to demonstrate compliance with, paragraph 1 ('accountability')." |
| `eu / 24` | 861 | "...adherence to approved codes of conduct ... may be used as an element by which to demonstrate compliance with the obligations of the controller." |
| `eu / 30` | 2,907 | "...the processing includes special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10." |
| `eu / 37` | 1,989 | "...The data protection officer may be a staff member of the controller or processor, or fulfil the tasks on the basis of a service contract." |
| `eu / 38` | 1,390 | "...Data subjects may contact the data protection officer with regard to all issues related to processing of their personal data and to the exercise of their rights under this Regulation." |
| `eu / 39` | 1,278 | "...The data protection officer shall in the performance of his or her tasks have due regard to the risk associated with processing operations..." |

No ingestion required and none performed. The six rows were pinned verbatim into `src/registry/__tests__/__fixtures__/governance-corpus-snapshot.ts`; every quote the engine emits is an exact substring of that snapshot, enforced by test.

---

## 1. THE HEADLINE MOVE — before / after (the real behavior change)

This is the part of the dispatch that is not additive. Stated precisely.

**BEFORE.** The governance report's top-level conclusion was `overall_readiness_rating` — one of `Initial` / `Developing` / `Defined` / `Managed` / `Optimized` — accompanied by `readiness_rationale`, whose text defined its own severity scale inline ("Critical = no controls in place; High = controls materially incomplete..."). Nothing in the GDPR corpus authorizes those tiers. `GovernanceAssessmentResult.tsx` rendered the tier as the executive-summary hero.

**AFTER.**

- The headline is `accountability_determination` — the Art. 5(2) / Art. 24(1) question: *can this controller demonstrate compliance, and are its measures appropriate to its risk.* It carries `verdict`, `citation` (Art. 5(2), Art. 24(1)), the verbatim standard, the record facts relied on, the application, and the reasoning. Its verdict is composed from the six deliverables below, not from a tier.
- `overall_readiness_rating` and `readiness_rationale` are **deleted from the report top level** by the builder's attach pass.
- The tier is **re-emitted, demoted**, at `maturity_tier_readability_aid`: `{ tier, label, statutory_basis: "none", disclaimer, superseded_by: "accountability_determination" }`. The `statutory_basis: "none"` field is not decoration — it is asserted by pin test and rendered on the face of the viewer.
- `GovernanceAssessmentResult.tsx` promotes the accountability determination into the executive summary and renders the tier below it as an explicitly-labelled non-statutory readability aid.

**What stayed.** Domain-level severity scoring, the per-domain findings, and everything else in the existing report shape are untouched. The tier value itself is still computed by the existing upstream logic — it is not recomputed, only relocated and relabelled. No domain finding was deleted.

---

## 2. The six deliverables

All in `supabase/functions/_shared/ltp/governance-deliverables/` (`types.ts`, `elements.ts`, `build.ts`). Pure functions, single-writer, fail-open attach, REUSE LAW against the Art. 5/24/30/37-39 rows verbatim. Every finding is `standard → record fact → application → verdict`; where the record cannot support a conclusion the finding degrades to a named `record_insufficient` with an `information_needed` string that says exactly what is missing. Nothing is fabricated.

1. **`accountability_determination`** (headline, §1 above).
2. **`demonstrability_findings[]`** — Op. 2, previously absent entirely. Eight accountability duties, each mapped in `elements.ts` to (a) the artifact that would evidence it to a supervisory authority and (b) the intake key that shows whether that artifact exists. Output names the artifact whether or not it is present, so a negative finding is still actionable.
3. **`art30_element_findings[]`** — Art. 30(1)(a)–(g) walked verbatim, element by element, in order. Deterministic lookup, not model narration, per Chapter 9 (D).
4. **`art30_exemption_determination`** — the Art. 30(5) <250-persons exemption, naming all three defeating conditions verbatim (likely risk to rights and freedoms; not-occasional processing; special-category data under Art. 9(1)) and applying the rule that **any one** defeats it. Above 250 the determination short-circuits and says so rather than walking conditions that cannot matter.
5. **`dpo_determination`** — three sub-findings, not a boolean: designation trigger (Art. 37(1)(a)-(c) tested, not the appointment recorded as a fact), position and independence (Art. 38), task coverage (Art. 39). An informal privacy lead does not satisfy a mandatory designation, and the builder says so.
6. **`risk_calibration_finding`** (Op. 1) — measures argued appropriate or not to *this* controller's nature, scope, context and purposes, using Art. 24(1)'s own named factors. Absent any one of the four, it degrades rather than generalising.
7. **`review_and_update_finding`** (Op. 5) — reasoned from review cadence and last-review date. Art. 24(1)'s second sentence is held distinct from the appropriateness clause; the standard string is the sentence alone.

Supporting registry: `supabase/functions/_shared/registry/governance-accountability-authorities.ts` — 33 rows anchored to the six articles, each pin-tested as an exact corpus substring.

---

## 3. Intake extension

Contract checked first; nothing already collected elsewhere on the form was duplicated. Added to `intake-contracts/governance-assessment.ts` and surfaced in `src/pages/GovernanceAssessment.tsx` Step 4 (Q16b–g):

- `measures_review_cadence` (enum) and `measures_last_review_date` — Op. 5 is unanswerable without both.
- `processing_nature`, `processing_scope`, `processing_context`, `processing_purposes` — Art. 24(1)'s named risk factors, as first-class fields rather than inferred.

Draft-restore and intake-build paths updated. `report-schemas/governance.ts` allow-lists the new top-level keys plus the demoted aid.

---

## 4. Fixture unblock and tests (same turn)

- `_shared/golden/governance.ts` — `gov-perfect-record`, a specific non-generic case (not a placeholder record) supplying all six new fields at "Perfect Data" standard.
- `src/registry/__tests__/governance-deliverables.test.ts` — **25/25 passing**. Corpus pins by exact substring and by length; anchor-key resolution; analysis-shape pins; degradation pins (blank record → every finding `record_insufficient`); Art. 30(1) ordering; Art. 30(5) any-one-defeats; DPO three-sub-finding shape and the informal-lead case; Op. 1/Op. 5 degradation and distinctness; DEMOTION LAW (tier removed from top level, re-emitted with `statutory_basis: "none"`); and a guard tracing `validateIntake` against the actual contract for the golden case and the cadence enum.
- Deno contract suites: `golden-contract` passes; `contract-surface-audit / golden fixtures validate` passes. Governance has zero violations in `intake-contracts.test.ts`.

---

## 5. Build Issues

1. **Pre-existing, not caused here.** `contract-surface-audit` and `intake-contracts` fail on **cppa-risk** fixtures only (`cppa-risk-rcC1-*`, `cppa_risk:us`, `cppa_risk:us-supplemental` — `a2_necessity_set`, `a4_benefit_*`, `a5_harm_pathways`, `a9_approver_*` empty). This is Item 305 residue: Item 306 unblocked the `base` golden fixture but not the pinned contract-scenario or sample-report fixtures. Out of this dispatch's scope; flagged for a follow-on.
2. **Art. 38 position/independence structurally degrades** on the current form — no intake field captures the DPO reporting line or conflict-of-interest posture. The finding names exactly that gap rather than assuming independence.
3. **The tier is relocated, not retired.** The upstream computation that produces it still runs. If the CEO wants it gone entirely rather than demoted, that is a separate deletion turn.
4. **Viewer parity is partial.** The executive summary was overhauled; the six deliverables are emitted, allow-listed and persisted, but the report body does not yet render `demonstrability_findings[]`, `art30_element_findings[]` or the DPO sub-findings in full. Same limit Item 312 recorded for ir-playbook.
5. **No genuine four-team split.** Every judgment call above was unanimous; nothing carried on a non-unanimous vote.

---

## 6. Honest limits

Measurability restored; **no measurement taken** — deploy and harness invocation are forbidden by the dispatch. Chapter 9's UK/non-UK GDPR variant split is explicitly out of scope and was not attempted.

---

**Disposition:** COMPLETE — awaiting controller verification. Not deployed. **This closes out the Chapter 1 / 3 / 6 / 7 / 8 / 9 queue.**
