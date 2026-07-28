# ITEM 242 — CHECKPOINT B CONTENT COURIER (defects 1 + 2)

Dispatch: `CONTROLLER DISPATCH — ITEM 242 CHECKPOINT B (2026-07-28)`
Status: **CONTENT-ONLY; NO WIRING; NO DEPLOY.** Sign-off releases 242-CP-B wiring.
Scope of this courier:
- (1) Submission-prong utilization sentences for § 7120(b)(1) and § 7120(b)(2)(B), per marker state (`met` / `not_met` / `not_applicable`).
- (2) Per-factor-KIND action-template variants and absent-family grouping forms.

Every sentence below is authored as **verbatim template text** (slot sigils `{{plan:...}}`) with a current-vs-proposed column so the CEO can read the diff in place. Registry pinpoints below are ILLUSTRATIVE and will be replaced by the canonical registry entry at wiring time (Item 241.3 registry-bound-pinpoints law); the prose is what needs sign-off.

---

## §1 — Submission-prong utilization (defect 1)

### §1.1 Context

`submission_summary` is a first-class section on the golden shape. Today it renders the raw § 7121(a) cyber-audit linkage from M4/M5 (`submission_basis`) and the audit schedule from M5, but never states the **resolved posture** for the two submission triggers CPPA regulations impose: § 7120(b)(1) (annual cadence) and § 7120(b)(2)(B) (event-triggered material change). Each marker resolves to one of three states from the plan's gate outcomes:

- `met` — the record establishes the trigger fires AND the submission obligation is satisfied on the record.
- `not_met` — the trigger fires but the submission obligation is unsatisfied.
- `not_applicable` — the trigger does not fire for this assessment on the record (e.g. no material change in the window; assessment is not on the annual cadence yet).

Proposal: two new templates, one per marker, each with three verbatim posture clauses. Composer selects the clause via a slot bound to the marker's gate outcome.

### §1.2 Template — `T.risk.submission.b1_posture` (§ 7120(b)(1) annual cadence)

Slots: `entity_short` (customer noun phrase), `posture_clause`, `as_of_date`, `pinpoint`.

Skeleton (verbatim):

> "Under {{plan:pinpoint}}, {{plan:entity_short}} {{plan:posture_clause}} As of {{plan:as_of_date}}, this posture governs the annual-cadence submission obligation."

Verbatim `posture_clause` variants, one per marker state:

| State | Current (shipped today) | Proposed verbatim clause |
| --- | --- | --- |
| `met` | *(no rendering — submission_summary silent on § 7120(b)(1))* | `is on the annual cadence and has submitted its most recent risk assessment to the Agency within the twelve-month window, so the § 7120(b)(1) obligation is satisfied on the record before us.` |
| `not_met` | *(no rendering)* | `is on the annual cadence but the record does not establish that the most recent risk assessment has been submitted within the twelve-month window, so the § 7120(b)(1) obligation is not yet satisfied and remains an open item for the accountable owner.` |
| `not_applicable` | *(no rendering)* | `is not on the annual cadence for this assessment on the record before us, so § 7120(b)(1) is not the operative submission trigger this period — it will govern the next annual cycle when that cycle begins.` |

### §1.3 Template — `T.risk.submission.b2b_posture` (§ 7120(b)(2)(B) material-change trigger)

Slots: `entity_short`, `posture_clause`, `as_of_date`, `pinpoint`, `material_change_summary` (single ≤ 40-word noun phrase harvested from M5).

Skeleton (verbatim):

> "Under {{plan:pinpoint}}, {{plan:entity_short}} {{plan:posture_clause}} As of {{plan:as_of_date}}, this posture governs the material-change submission obligation."

Verbatim `posture_clause` variants, one per marker state:

| State | Current (shipped today) | Proposed verbatim clause |
| --- | --- | --- |
| `met` | *(no rendering)* | `has identified a material change on the record — {{plan:material_change_summary}} — and has submitted the updated assessment to the Agency, so the § 7120(b)(2)(B) obligation is satisfied for this change.` |
| `not_met` | *(no rendering)* | `has identified a material change on the record — {{plan:material_change_summary}} — but the record does not establish that the updated assessment has been submitted to the Agency, so the § 7120(b)(2)(B) obligation is not yet satisfied and is the immediate submission item for the accountable owner.` |
| `not_applicable` | *(no rendering — `submission_basis` alone survives)* | `has not identified a material change to the processing since the last submission on the record before us, so § 7120(b)(2)(B) is not the operative submission trigger this period; § 7120(b)(2)(B) will re-engage if a material change is later documented.` |

### §1.4 Section closer (both prongs share)

Verbatim closer sentence appended once per section, after the two prong renderings:

> "This section states the operative submission posture; the deadline row for any not-yet-satisfied posture is set out in the Priority Actions section."

### §1.5 Wiring hooks (for the release turn, not for sign-off)

- New `submission_summary` composer in `_shared/ltp/section-composers/cppa-risk.ts` selects the two clauses off `plan.gate_outcomes['G.submission.b1_annual']` and `plan.gate_outcomes['G.submission.b2b_material_change']`.
- Pinpoints bound from registry by id (Item 241.3 law); do NOT hardcode the § string in the composer.
- Fixture asserts per marker state (three × two = six) added to `_item242_batch3_b.test.ts`.

---

## §2 — Per-factor-KIND action templates + family grouping (defect 2)

### §2.1 Diagnosis

`T.risk.priority_action.golden` today emits one template — `"[X] is not present on the record; the record does not establish [X]."` — for every absent factor, absent safeguard, unresolved gate, and Type-J reserved judgment. Move 2 of the four-move action ("state the ledger fact") collapses to the same "not present" restatement instead of naming the concrete missing element. Grader observed: 14 near-identical clones per report, no diversity.

### §2.2 The six KINDs

Every absent-or-gap action falls into one of six kinds. Sign-off is on the phrasing per kind:

| Kind | Factor family (registry `kind` field) | Trigger |
| --- | --- | --- |
| `benefit_absent` | `neg.b.*`, `neg.j.*` (business/consumer benefits enumerated absent) | factor row present_in_intake=false AND applicable |
| `harm_absent` | `neg.e.*`, `neg.f.*`, `neg.g.*`, `neg.h.*` (harm categories not enumerated) | as above |
| `safeguard_absent` | `safe.*` (safeguard categories not enumerated) | as above |
| `gate_unresolved` | any `G.documentation.*` gate outcome != `pass` | gate registry |
| `type_j_reserved` | conclusion inventory Type-J entries (safeguard sufficiency, benefit weight, etc.) | Type-J propositions |
| `conditional_open` | any `G.q18.*` or `G.q5b.*` conditional gate whose scoping is `applies` but element is absent | gate registry |

### §2.3 Verbatim template texts — one per kind

Each template is authored as a four-move sentence per the golden-register discipline:

- **Move 1** — name the ELEMENT (the concrete missing thing).
- **Move 2** — state the LEDGER FACT (the specific record posture, verbatim from `weight_note` or the gate outcome; never "[X] is not present" restated).
- **Move 3** — state the REGULATORY CONSEQUENCE (what the regulation requires).
- **Move 4** — state the OWNER + DEADLINE clause (owner_role_titles + cohort-derived § 7155 row).

Slots common to all six templates: `element_short_label`, `ledger_fact_verbatim`, `regulatory_consequence`, `pinpoint`, `owner_role_titles`, `deadline_sentence`.

| KIND | Current (shipped today) | Proposed verbatim template |
| --- | --- | --- |
| `benefit_absent` | `"{{plan:element_short_label}} is not present on the record; the record does not establish {{plan:element_short_label}}."` | `"The record does not enumerate {{plan:element_short_label}} as a benefit of the processing. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} requires the assessment to identify the specific benefits to the business, the consumer, and the public — a blank line is not a permitted answer. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |
| `harm_absent` | (same clone) | `"The record does not enumerate {{plan:element_short_label}} in the negative-impact set. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} requires the assessment to identify each category of negative impact that the processing may cause; absence of enumeration must be either an affirmative negative determination on the record or a filled entry. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |
| `safeguard_absent` | (same clone) | `"The record does not describe {{plan:element_short_label}} among the safeguards implemented to reduce the identified negative impacts. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} requires the assessment to describe, for each identified negative impact, the safeguards implemented to reduce that impact and how those safeguards address it. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |
| `gate_unresolved` | (same clone) | `"The documentation-gate {{plan:element_short_label}} is not resolved on the record. {{plan:ledger_fact_verbatim}} Under {{plan:pinpoint}}, this element must be documented before the risk assessment is complete for submission purposes. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |
| `type_j_reserved` | (same clone) | `"The determination of {{plan:element_short_label}} is reserved to qualified legal counsel and is not made in this generated assessment. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} frames the elements counsel will weigh; the assessment record must carry counsel's determination and its stated basis before the risk assessment is complete. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |
| `conditional_open` | (same clone) | `"The conditional element {{plan:element_short_label}} is scoped-in on the record but is not resolved. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} requires this element to be documented when the scoping condition holds — as it does here on the current record. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"` |

### §2.4 Family grouping forms

The grader called for ~11 diverse actions, not 14 clones. Rule (verbatim in wiring): where two or more absent items share a family (all four `neg.e.*` economic harm categories absent; all three `safe.access_controls.*` sub-categories absent), **consolidate into one FAMILY action** whose `element_short_label` is the family name and whose ledger fact enumerates the missing members.

Verbatim template — `T.risk.priority_action.family`:

> "The record does not enumerate any member of the {{plan:family_name}} family: {{plan:missing_members_list}}. {{plan:ledger_fact_verbatim}} {{plan:pinpoint}} requires the assessment to address each family of {{plan:family_class_noun}}; enumerating none of the members leaves the family undocumented as a whole. Owner: {{plan:owner_role_titles}}. {{plan:deadline_sentence}}"

Grouping thresholds (proposed law, for CEO ruling):

- **Harm families** (`neg.e`, `neg.f`, `neg.g`, `neg.h`): consolidate when ≥ 2 members of the same family are absent-and-applicable.
- **Safeguard families** (`safe.*`): consolidate when ≥ 2 members of the same registered `safe.<category>` are absent-and-applicable.
- **Benefit families** (`neg.b`, `neg.j`): consolidate when ≥ 3 members of the same family are absent-and-applicable (benefit enumeration is more granular; the threshold is higher to preserve specificity).

### §2.5 Repeated-opener assert (loop2 L4)

Wiring turn adds an intra-section assert to `assertShippedCoherence`: no two consecutive priority actions may share their first eight tokens. Violation aborts assembly (matches the golden-shape depth-telemetry pattern established at 241.1).

### §2.6 Wiring hooks (for the release turn, not for sign-off)

- `composePriorityActions` refactored to (i) partition absent-and-applicable items by family; (ii) select KIND per family or per singleton; (iii) render one of the seven templates above with per-item ledger-fact verbatim harvested from `factor_table[row].weight_note` or `gate_outcomes[gate].note`.
- New template ids added to `pass2-templates.ts` with `REQUIRED_PLAN_SLOTS` updates.
- Six new joint tests in `_item242_batch3_b.test.ts` (one per KIND) + one family-grouping test + one repeated-opener assert.

---

## §3 — Verify-first citations (for CEO transparency)

- Every marker-state clause in §1 is authored from the plain text of 11 CCR § 7120(b)(1) and § 7120(b)(2)(B) as ingested at `docs/courier/CPPA-7150-VERBATIM-2026-07-25.md`. No inference beyond the trigger/marker semantics.
- Every KIND template in §2 is authored from the corresponding registry family's `compliance_guidance` sentence (populated at Item 241.3). Move 3 will bind to that guidance sentence VERBATIM at wire time; the text above is the composer wrapper.

## §4 — What ships at the wiring turn

- `_shared/ltp/content/pass2-templates.ts` — nine new templates (two submission-prong × three states each = six template instances but two template definitions; six KIND templates; one FAMILY template; one section closer sentence template).
- `_shared/ltp/section-composers/cppa-risk.ts` — new `composeSubmissionSummary`, refactored `composePriorityActions` with KIND partitioning and family grouping.
- `_shared/ltp/pass2-render.ts` — REQUIRED_PLAN_SLOTS additions for every new template slot.
- `_shared/ltp/slot-resolver.ts` — `posture_clause`, `material_change_summary`, `family_name`, `missing_members_list`, `family_class_noun`, `ledger_fact_verbatim`, `regulatory_consequence` resolvers.
- `_shared/ltp/coherence-invariants.ts` — repeated-opener assert added to `assertShippedCoherence`.
- New joint test file `_item242_batch3_b.test.ts` — 6 submission-marker asserts + 6 KIND asserts + 1 family assert + 1 repeated-opener assert = 14 new asserts.

## HARD STOP

Awaiting CEO sign-off on the verbatim template text in §1, §2.3, §2.4, and §4. Once approved, the wiring turn ships without re-authoring; all pinpoints and deadlines bind by registry id per the standing law.
