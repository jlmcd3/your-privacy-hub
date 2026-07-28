# Item 244 — Content-Anchored Courier (Authoring-Only, No Wiring)

**Turn:** Item 244 Content Courier (fresh-eyes panel set)
**Date:** 2026-07-28
**Product:** cppa-risk-assessment
**Status:** CONTENT ONLY — every sentence verbatim for CEO sign-off before wiring.
**Convention:** Each item shows CURRENT (deployed at `ltp-risk-item243-completion@2026-07-28T23:46:44.223Z`) then PROPOSED. No wiring, no deploy, no ledger status change.

Wiring turn that follows CEO sign-off will additionally execute the three riders recorded at the end of this courier (C1, C3, P1). Those riders are NOT drafted here — they are engineering wire-ups over CEO-approved content.

---

## L1 — Processing Narrative section template

Composed from the operational-elements ledger fields in fixed order: collection → use → disclosure → retention → deletion. Missing fields resolve to the reserved framing, never invented facts.

### L1 CURRENT

The record does not carry a Processing Narrative section. Operational elements surface only inside `record_sufficiency` items (one per § 7152(a)(3) sub-element) and inside factor-row `weight_note`s. There is no single passage that reads the flow end-to-end.

### L1 PROPOSED (verbatim)

> **How {entity_name} processes personal information for {activity_label}.**
>
> {entity_name} collects {pi_categories_clause} from {sources_clause}. The information is used {i1_processing_purpose_clause}. {entity_name} discloses this information to {i6_vendors_clause} through {i4_disclosure_mechanisms_clause}. The record sets a retention period of {i2_retention_period_clause}, applying the criterion that {i2_retention_criteria_clause}. At the end of that period the information is {i2_deletion_clause}.
>
> Each element above is drawn from the assessment record. Where the record is silent on a sub-element, the corresponding clause reads "not stated on the record" and the item is enumerated in _Items for your review_.

**Slot resolution law (verbatim, wiring-time):**
- `{pi_categories_clause}` ← `q4_pi_categories` verbatim, joined with commas and "and"; empty → "the personal information categories listed on the record".
- `{sources_clause}` ← `i4b_sources` verbatim; empty → "the collection sources named on the record".
- `{i1_processing_purpose_clause}` ← `i1_processing_purpose` verbatim, prefixed with "to " if it does not already open with an infinitive.
- `{i6_vendors_clause}` ← `i6_vendors` verbatim; empty → "no third-party recipients stated on the record".
- `{i4_disclosure_mechanisms_clause}` ← `i4_disclosure_mechanisms` verbatim, joined; empty → "the disclosure mechanisms recorded on the assessment".
- `{i2_retention_period_clause}` ← `i2_retention_period` verbatim; empty → "not stated on the record".
- `{i2_retention_criteria_clause}` ← `i2_retention_criteria` verbatim; empty → "the retention criterion recorded on the assessment".
- `{i2_deletion_clause}` ← `i2_retention_detail` verbatim when it names a deletion method, else "returned to the retention register for the next disposal cycle".

**Placement:** Immediately after `Scope & Triggers`, before `Risk Assessment by Activity`. Composer name (wiring-time): `composeProcessingNarrative`. Template id: `T.risk.processing_narrative`.

---

## L2 — Benefit / Harm / Safeguard TRIAD rationale forms

Replaces the current "three-lists assembly" (three parallel bullet lists, one per kind) with a single TRIAD rationale form per activity that links each benefit to the harm it courts and to the safeguard that answers the harm.

### L2 CURRENT

The document renders three sibling lists in `risk_assessment_by_activity`:
- "Benefits identified on the record: …"
- "Negative impacts identified on the record: …"
- "Safeguards identified on the record: …"

Each list is populated independently from `plan.factor_table.filter((f) => f.kind === …)`. There is no textual linkage between a benefit, the harm it may cause, or the safeguard that addresses that harm.

### L2 PROPOSED (verbatim, three triad forms)

**L2.a — Firm triad (benefit ≫ harm; safeguard addresses harm).**

> {entity_name}'s record supports {benefit_label} for this activity. The record also identifies {harm_label} as the corresponding negative impact category, and documents {safeguard_label} as the safeguard that addresses it. On the § 7152(a)(6) balancing frame this triad reads as firm: the benefit is substantiated on the record, the harm is named, and the safeguard is present.

**L2.b — Hedged triad (benefit ≈ harm; safeguard partial or unverified).**

> {entity_name}'s record supports {benefit_label} for this activity and identifies {harm_label} as the corresponding negative impact category. The record documents {safeguard_label} as the safeguard, but the supporting detail is thin. On the § 7152(a)(6) balancing frame this triad reads as close: additional record support for the safeguard would move the balance toward firm.

**L2.c — Reserved triad (harm without documented safeguard).**

> {entity_name}'s record identifies {harm_label} as a negative impact category for this activity. The record does not yet document a safeguard that addresses this harm. On the § 7152(a)(6) balancing frame this triad is not yet complete; the reserved judgment is enumerated in _Items for your review_.

**Selection law (verbatim, wiring-time):**
- Pair each `benefit` factor with its declared `addresses_harm_id` (registry field, wiring-time addition to `CPPA_RISK_FACTORS`). If none, the benefit renders standalone under L2.a with `{harm_label}` = "the residual harms enumerated below".
- Firm/hedged/reserved routing uses the SAME `aggregateBalance(plan)` seam as the executive summary (LTP LAW 3(a), single-writer). Never re-derived.

---

## L3 — Less-Intrusive Alternatives line

One-sentence line drawn from `i1b_min_pi`. Reserved framing when silent — never invented, never omitted.

### L3 CURRENT

`i1b_min_pi` is captured at intake but is not read into any composed section. It contributes only indirectly to a factor row when a benefit/safeguard maps to minimization.

### L3 PROPOSED (verbatim)

- **Present:** "The record states that {entity_name} considered less-intrusive alternatives as follows: {i1b_min_pi_clause}. Under § 7152(a)(4)(B), this record is the operative statement for the balancing frame."
- **Silent:** "The record does not yet state the less-intrusive alternatives {entity_name} considered for this activity. The § 7152(a)(4)(B) analysis therefore reserves this element; qualified legal counsel should record the alternatives considered before the assessment closes."

**Placement:** Second-to-last paragraph of `Risk Assessment by Activity`, before the balance clause. Template id: `T.risk.less_intrusive_alternatives`.

---

## L4 — Epistemic-method sentence (opening)

Added to the T7 opening slot immediately after the customer-first paragraph, before the assessment-purpose clause. Explains — in one sentence — what the document IS.

### L4 CURRENT

The T7 opening moves directly from the customer paragraph (S2/S3/S4 in the customer-first order) into the assessment-purpose clause (S0/S1). Nothing in the opening tells the reader what the document is, what evidence it stands on, or what it does not do.

### L4 PROPOSED (verbatim)

> This assessment is derived solely from the record you provided and the cited regulatory text; it does not add facts, and where the record is silent it reserves the corresponding element rather than infer one.

**Placement:** Emit as slot `epistemic_method_sentence` after slot `customer_paragraph` and before slot `assessment_purpose_sentence` in `risk-opening.ts`. Order: S2 → S3 → S4 → **S4.5 (epistemic method)** → S0 → S1 → S5 → S6.

---

## L5 — Affirmations block opener

Adequately-documented items precede the gaps in the opener sentence, so the customer sees what the record HAS before what it lacks.

### L5 CURRENT

`record_sufficiency` opens with the sufficiency clause and immediately lists items in factor-table order. Adequately-documented items and gap items are interleaved.

### L5 PROPOSED (verbatim)

> The record {sufficiency_clause}. {entity_name} has adequately documented {affirmed_count_clause} of the § 7152(a) elements listed below; {gap_count_clause} of these elements remain enumerated for your review. Each element is stated once, with its § 7152(a) pinpoint, in the order the record was assessed.

**Slot resolution law (verbatim, wiring-time):**
- `{affirmed_count_clause}` ← "N" spelled out for N ≤ 12 (e.g., "seven"), digits otherwise; "no" when count is zero.
- `{gap_count_clause}` ← same numeral rule; when zero, the sentence terminates after the affirmations clause: "…of the § 7152(a) elements listed below. Each element is stated once…"
- Item ordering: affirmed items first (present or ADMT-not-applicable), then gaps (not present). Within each partition, registry order is preserved.

---

## E1 — Scope-paragraph aggregation text

Engaged trigger foregrounded, non-engaged prongs enumerated compactly on a single line.

### E1 CURRENT

`composeScope` renders one instance per § 7150(b) prong (five bullets), each stating "engaged" or "not engaged" separately. The engaged prong is not visually distinguished; the reader must parse five lines to find the trigger.

### E1 PROPOSED (verbatim)

> **Scope & Triggers.** This assessment is triggered under **§ 7150(b)({engaged_prong_number}) — {engaged_prong_label}** on the following record basis: {engaged_prong_posture_clause}. The remaining § 7150(b) applicability prongs are not engaged on the current record: {non_engaged_prongs_inline}.
>
> {additional_engaged_paragraph}

**Slot resolution law (verbatim, wiring-time):**
- Multiple engaged prongs: emit the sentence once per engaged prong; each starts with **§ 7150(b)(N) — {label}** in bold. Non-engaged enumeration is emitted ONCE, after the last engaged sentence.
- `{engaged_prong_posture_clause}` ← the verbatim § 7150(b)(N) posture clause from `submission-postures.ts` (already wired).
- `{non_engaged_prongs_inline}` ← comma-separated list of the non-engaged prongs formatted as "§ 7150(b)(N) ({label})", joined with "and" before the last item.
- `{additional_engaged_paragraph}` ← empty when only one prong is engaged.

---

## E3 — Customer-first section headers

Section headers reordered to lead with the customer's operative concern; statutory frames appear in the body, never in the header.

### E3 CURRENT (deployed order + phrasing)

1. Opening Summary
2. Executive Summary
3. Assessment Summary
4. Scope & Triggers
5. Risk Assessment by Activity
6. Priority Actions
7. Next Steps
8. Strengthen Items
9. Exception Analysis
10. Record Sufficiency
11. Items for Your Review
12. Submission Summary

### E3 PROPOSED (verbatim full set)

1. **About {entity_name} and this assessment.** _(Was: Opening Summary)_
2. **What this assessment concludes.** _(Was: Executive Summary)_
3. **Why we reached this conclusion.** _(Was: Assessment Summary)_
4. **What this assessment covers and what triggered it.** _(Was: Scope & Triggers)_
5. **How the balancing frame reads for each covered activity.** _(Was: Risk Assessment by Activity)_
6. **What {entity_name} should do next, in order of priority.** _(Was: Priority Actions)_
7. **What {entity_name} should confirm on the record.** _(Was: Next Steps)_
8. **Where {entity_name}'s record is strong and how to keep it strong.** _(Was: Strengthen Items)_
9. **Where the record admits a reserved exception.** _(Was: Exception Analysis)_
10. **How complete the record is against § 7152(a).** _(Was: Record Sufficiency)_
11. **Items for your review.** _(Unchanged — this header already reads customer-first.)_
12. **How {entity_name} should submit and retain this assessment.** _(Was: Submission Summary)_

**Statutory pinpoints move to the first sentence of each body paragraph, never the header. § references remain **{{cite:…}}-wrapped** everywhere.**

---

## E4 — Anaphora rule text

Full entity name on first mention per section, then "the company" for subsequent mentions within that section.

### E4 CURRENT

The composer resolves `{entity_name}` uniformly on every mention. Long entity names repeat verbatim throughout a section, producing a heavy read.

### E4 PROPOSED (verbatim rule)

> Within each section, the first mention of the assessed business uses the full recorded name (`{entity_name}`). Every subsequent mention within the same section uses "the company." Cross-section mentions reset to the full name; the reader always sees the full name at the top of each section.

**Wiring note (for the wiring turn, not this courier's content scope):** implement at the assembler seam via a per-section `renderEntity(mention_index)` helper. Never at the template level.

---

## P2 — Golden exemplar factor row for the prompt

Selected from the doc-23ac50b5 regression corpus (best-of-batch, run #180 Grader G=85), a factor row whose `weight_note` reads cleanly under both the coherence screen and the grounded-note law. Serves as the ONE example that Pass-1 sees for what "correct" looks like.

### P2 CURRENT

The Pass-1 derive prompt describes the factor-row shape in prose (Rules 1–9), but shows no exemplar row. Model output varies from "reference intake ledger by ID" (correct) to "quote the intake value inline" (fails coherence + grounded-note).

### P2 PROPOSED (verbatim exemplar row, embedded in prompt as an EXAMPLE ONLY — never as data):

```json
{
  "factor_id": "safe.access_control.role_based",
  "kind": "safeguard",
  "jurisdiction_tag": "cppa-ca",
  "present_in_intake": true,
  "supporting_ledger_ids": ["L.i6_vendors", "L.i4_disclosure_mechanisms"],
  "weight_note": "role-based access is documented in the disclosure-mechanisms record and the vendor list is present"
}
```

**Prompt embedding (verbatim, appended after Rule 9):**

> ### Example — a well-formed factor row
> The row below is an EXAMPLE ONLY (do not copy the field values into your output). It shows the shape a grounded, coherent factor row takes: `supporting_ledger_ids` names the ledger rows that substantiate presence, and `weight_note` names ONLY tokens that appear in those ledger rows' display labels or in the closed CONNECTIVE_LEXICON. If you cannot ground a row this way, set `present_in_intake` to `false` and let `weight_note` be `"no record evidence"`.
> ```json
> {"factor_id":"safe.access_control.role_based","kind":"safeguard","jurisdiction_tag":"cppa-ca","present_in_intake":true,"supporting_ledger_ids":["L.i6_vendors","L.i4_disclosure_mechanisms"],"weight_note":"role-based access is documented in the disclosure-mechanisms record and the vendor list is present"}
> ```

---

## P3 — Notes-destination context sentence for the prompt

One sentence appended to the Pass-1 system prompt telling the model where each `weight_note` will render, so it authors for the destination.

### P3 CURRENT

The Pass-1 system prompt describes the schema and the nine rules but never states that `weight_note` is customer-facing prose that renders inline inside `record_sufficiency` and `strengthen_items`.

### P3 PROPOSED (verbatim, append to system prompt right before "Return ONLY the JSON object"):

> ### Where your `weight_note` renders
> Every `weight_note` you author is customer-facing prose. It renders inline inside the `record_sufficiency` panel (when `present_in_intake` is true) and inside `strengthen_items` (when the factor is present but thin). The customer reads it exactly as you write it, next to the § 7152(a) pinpoint. Do not write internal reasoning, do not name yourself or the model, do not use meta-phrases ("the record indicates that we could not verify"). Write a single, tight prose clause that a customer's counsel can read out loud without editing.

---

## Riders for the wiring turn (recorded here so the CEO sees the full slate)

The three riders below are **not drafted here as content**. They are engineering wire-ups that the wiring turn will execute after CEO sign-off on this courier's content items.

- **(C1) Grader-check mirror in the e2e gate.** Mirror the grader's deterministic checks (prong-utilization class and kin) into the product e2e gate. Never ship a document that deterministically fails a known check. Wire at `pass2-assembler.ts` exit alongside `assertShippedCoherence`.
- **(C3) Determinism snapshot test.** Fixture-driven snapshot over a canonical `RenderPlan` → `RenderedDocument` reduction. Run in CI to catch composer drift.
- **(P1) Wire-schema field order.** Reorder the `factor_table` entry properties in `RENDERPLAN_WIRE_SCHEMA` and in `CPPA_RISK_FACTORS` fixtures to place `supporting_ledger_ids` immediately before `weight_note` (mirroring P2's exemplar and reducing model-drift on the token that most affects grounded-note grounding).

---

## Ledger note

Item 244 is a content-authoring turn only. No code, no ledger status change beyond recording this courier's existence. The wiring turn is HELD pending CEO sign-off on items L1–L5, E1, E3, E4, P2, P3 as drafted above.
