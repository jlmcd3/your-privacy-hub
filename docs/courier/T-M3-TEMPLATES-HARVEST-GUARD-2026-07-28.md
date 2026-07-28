# T-M3 — Templates + Harvest Subordination Wire (cppa-risk)

**Dispatch:** T-M3 (Item 218 rebuild chain, step 5 of 10).
**Date:** 2026-07-28.
**Turn kind:** Content-anchored courier + authoring + guard wire.
**Deploy:** None. Shipped surface unchanged until T-M6 cutover.
**Discipline:** Verbatim template text below; every clause is change-controlled.

---

## 1. Scope — the seven Item-222 gap-report rows

| # | key | disposition |
|---|---|---|
| 1 | `executive_summary` | Dedicated shape authored (firm / hedged / negative / insufficient). |
| 2 | `priority_actions` | Dedicated per-action shape with `deadline_basis` **owner-slot**. |
| 3 | `next_steps` | Dedicated per-step shape + materiality-tier ordering + dedup law vs `priority_actions`. |
| 4 | `record_sufficiency` | Dedicated per-record item shape (closed `RECORD_STATUS_CLAUSES` enum). |
| 5 | `inconsistency_flags` | `T.risk.review_items` + `T.risk.review_items.entry` wired; `EMPTY_ARRAY` otherwise (RISK_CUT_RULINGS retained). |
| 6 | `opening_summary` | Harvest subordination guard (`evaluateOpeningHarvest`). |
| 7 | `submission_summary` | Harvest subordination guard (`evaluateSubmissionHarvest`). |

No section resisted bounded-template expression. No dispatch to "options" mode.

---

## 2. Verbatim template text (as landed in `_shared/ltp/content/pass2-templates.ts`)

### 2.1 `T.risk.exec.firm`
> On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:each_or_this_clause}}, the benefits identified outweigh the negative impacts, subject to the safeguards described. The sufficiency of those safeguards and the decision to proceed rest with the Company and its counsel.

### 2.2 `T.risk.exec.hedged`
> On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:close_list}}, the balance between benefits and identified negative impacts is close on the present record, and reasonable assessments could differ; the considerations most likely to tip the balance are: {{plan:what_would_tip_it}}. {{plan:remaining_outcomes_clause}} The decision to proceed rests with the Company and its counsel.

### 2.3 `T.risk.exec.negative`
> On the record as documented, {{plan:activity_count_phrase}} were assessed for this Risk Assessment. For {{plan:negative_list}}, the record does not support the conclusion that the benefits outweigh the identified negative impacts; the safeguard gaps bearing on that outcome are set out below. {{plan:remaining_outcomes_clause}}

### 2.4 `T.risk.exec.insufficient`
> On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis for the {{plan:activity_singplural_clause}} assessed. The specific items needed to complete this assessment are set out under Items for your review.

### 2.5 `T.risk.priority_action`
> {{plan:action_label}} — {{plan:action_basis}} Deadline basis: {{plan:deadline_basis}} ({{cite:PINPOINT_DEADLINE}}).

`deadline_basis` is registered in `STRUCTURED_OWNER_SLOTS`. `assertStructuredSlotShape` rejects fragment values (`"We"`, `"The"`, `""`) at render time — the smoke-#11 truncation class is fixtured in `content.test.ts`.

### 2.6 `T.risk.next_step`
> {{plan:step_label}} — {{plan:step_basis}}

Ordering + dedup vs `priority_actions`:
1. `action_label` case-insensitive trimmed match against emitted `priority_action.action_label` → drop from `next_steps`.
2. Remaining steps sorted by `NEXT_STEPS_MATERIALITY_TIERS` (record-completeness > safeguard > administrative), then by first-appearance order in the factor table (stable).

### 2.7 `T.risk.record_sufficiency.item`
> {{plan:element_label}}: {{plan:element_status_clause}} ({{cite:PINPOINT}}).

`element_status_clause` is the closed `RECORD_STATUS_CLAUSES` enum:
- `"satisfies the documentation element on the present record"`
- `"does not appear in the present record"`
- `"is documented in part; the remaining element is not on the present record"`

### 2.8 `T.risk.review_items.entry`
> {{plan:review_label}}: {{plan:review_basis}}

Validator-derived only; no LLM composition. Wraps under the existing LIST-LEVEL `T.risk.review_items` template. `EMPTY_ARRAY` when validators produce no bounded content (RISK_CUT_RULINGS.mode retained).

---

## 3. Binding laws (unchanged from the plan; verified against every new template)

- **(a) Calibration.** `T.risk.exec.firm` is forbidden when any activity rendered hedged; `T.risk.exec.hedged` requires `what_would_tip_it`; firm forbidden at closeness ≥ `FIRM_VARIANT_CLOSENESS_MAX`; `T.risk.exec.insufficient` maps to the Type-J reserved-judgment path (§0 Q6).
- **(b) Token substitution only.** `PASS2_FORBIDDEN_TOKENS` scan across the new template connective tissue passes (content.test.ts).
- **(c) LIST-LEVEL contributor/PII surfaces.** No new template renders per-element loops over contributor / personnel data. Value-screen fixtures cover the new slots.
- **(d) Fill-or-omit.** Every plan-slot is whole-value; `STRUCTURED_OWNER_SLOTS` extended to `deadline_basis`; `assertStructuredSlotShape` fixtured against fragments.
- **(e) Aggregation law.** `T.risk.exec.negative` outranks `.hedged` outranks `.firm`; outcomes never averaged; materiality ordering preserved in `next_steps`.

---

## 4. Harvest subordination wire (`_shared/ltp/harvest-guard.ts`)

Two evaluators; both reject on conflict, telemeter the reason, never silently suppress.

**`evaluateOpeningHarvest` — rejection reasons observed in test:**
- `missing_artifact`
- `leak_lexicon_hit` (e.g., unresolved `{{intake:` token)
- `truncated_slot_value` (`"We"`, `"The"`, `""`)
- `intake_ref_not_in_ledger` (SUBORDINATION)
- `s0_conflicts_plan_type_r_polarity`

**`evaluateSubmissionHarvest` — rejection reasons observed in test:**
- `missing_artifact`
- `missing_schedule_marker`
- `tier_deadline_stripped`
- `customer_specific_cohort_attribution` (Item 204 § 7121(a)-law)

Both pass on the verbatim outputs of the T7 emitter and `renderCyberAuditSchedule()` respectively (harvest-guard.test.ts, 13/13 ok).

---

## 5. Test evidence (paste green)

```
running 10 tests from ./_shared/ltp/section-shards/cppa-risk.test.ts
… ok | 10 passed | 0 failed
running 18 tests from ./_shared/ltp/content/content.test.ts
… ok | 18 passed | 0 failed
running 13 tests from ./_shared/ltp/harvest-guard.test.ts
… ok | 13 passed | 0 failed

ok | 41 passed | 0 failed (330ms)
```

Round-trip + value-screen + calibration + subordination all green.

---

## 6. Gap-report status

`CPPA_RISK_TEMPLATE_GAPS` is now `[]` (empty). Every Item-222 row is closed:

| key | closure |
|---|---|
| executive_summary | T.risk.exec.{firm,hedged,negative,insufficient} |
| priority_actions | T.risk.priority_action (owner-slot deadline_basis) |
| next_steps | T.risk.next_step + NEXT_STEPS_MATERIALITY_TIERS + dedup law |
| record_sufficiency | T.risk.record_sufficiency.item + RECORD_STATUS_CLAUSES |
| inconsistency_flags | T.risk.review_items + T.risk.review_items.entry (TEMPLATE_CUT) |
| opening_summary | evaluateOpeningHarvest |
| submission_summary | evaluateSubmissionHarvest |

Registry version bumped to `cppa-risk-section-shards-2026-07-28-tm3`.

---

## 7. Not this turn

- Pass-2 wire-in that makes the shipped surface come from these templates + guards is the **T-M6** cutover. Nothing ships today.
- Stale `waveb.test.ts:79–81` `PASS1_MANIFEST.model.startsWith("google/")` assertion still queued for **T-M7 cleanup** (per Item 221).

---

**Disposition:** HARD STOP after ledger.
