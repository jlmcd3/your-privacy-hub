# ITEM 364 — WAVE 1, DISPATCH 1: DPIA PROSE PROPAGATION

Date: 2026-08-04 · Product: `dpia` · Register: the Item 363 (cppa-risk) register
Status: **authored and seeded UNAPPROVED — awaiting CEO sign-off**

Prose only. No schema, deliverable, determination-logic, or structural change was
made; the structural program stays locked.

## 1. What landed

| Artifact | Path | State |
|---|---|---|
| Document plan (register order, thesis, exemplar pairs) | `library/prose/plans/dpia.plan.json` | `approved: false`, every section `pending_review` |
| Gap-atom frame set (degraded record) | `library/prose/frames/dpia.frames.json` | `approved: false`, every frame `pending_review` |
| Register lint battery | `supabase/functions/_shared/prose/register-lint.ts` | new, separate from `style-lint.ts` |
| Plan type support (`thesis`, `exemplar_pairs`) + two lint rules | `supabase/functions/_shared/prose/plan.ts` | additive |
| Register block in the DPIA prompt | `run-dpia-framework/index.ts` (`extraRules`) | 6 rules appended |
| Five curated accountability labels | `_shared/customer-messages.ts` | `dpia_prepared_by`, `dpia_approved_by_name`, `dpia_approved_by_title`, `dpia_approval_date`, `dpia_signoff_basis` |
| Tests | `tests/edge/_tests/item364-dpia-register.test.ts` | 10 passed / 0 failed |

Database rows (both `approved = false`, `library_schema_version = 2`):

- `prose_frame_sets` · dpia · `cca17711…6577`
- `prose_document_plans` · dpia · `b514b134…f01a5`

Nothing renders from either: `planRenderable()` and `frameSetRenderable()` both
return `false` until the approval columns are flipped by sign-off.

## 2. Register order of the plan

`headline` → `record` → `analysis ×3` → `duty (comparable decisions, general
conclusions)` → `ask (what the record does not yet state)` → `communicate` →
`close (sign-off)`. Two sections are new to the DPIA plan and mirror Item 363:
`corpus_analogies` and `general_conclusions`. Every outcome-stage section leads
with its determination; `lintPlan` returns zero findings.

**Thesis:** "On the record this organisation gave, the assessment states what the
processing is, what it decides, what carries the decision, and what the
organisation must still put on the record before anyone signs it."

## 3. Measured BEFORE state (real output, not a fixture)

Register lint run over the most recent live DPIA report
(`dpia_frameworks.803314a6…`, 217 narrative strings ≥25 words):

| Rule | Findings |
|---|---|
| appositive_stack | 17 |
| cadence_monotony | 14 |
| orphan_bracket | 7 |
| machine_scaffold | 4 |
| cadence_overlong | 3 |
| banned_word | 1 |
| **total** | **46** |

The seven orphan brackets are the same defect in seven places: a `[TO COMPLETE …]`
placeholder collapsed into the sentence and left its closing bracket behind.

## 4. Exemplar pairs (pinned in the plan)

**xp-dpia-1 — `section_0_overview`**

> BEFORE: "No third-party processors are identified on the current record. If processors are engaged (e.g. cloud hosting, analytics platform), a data processing agreement must be in place for each. The organisation should confirm whether the described position applies here. ]"

> AFTER: "The record names no processor. If hosting or analytics work is done by someone outside the organisation, that arrangement belongs on the record, and the assessment cannot close until it is there."

**xp-dpia-2 — `section_3_necessity_proportionality`**

> BEFORE: one 60-word chain with two stacked em-dash asides, closing on "would strengthen the necessity case and complete the analysis."

> AFTER: "Rejecting one alternative is not the test. The organisation must show that no less intrusive option would have worked. Here the record stops short: it does not say whether narrower event data, or pseudonymisation at ingest, was weighed and set aside. Name the fields kept, name the fields dropped, and say why. That is what turns a colorable case into a documented one."

**xp-dpia-3 — `section_6_conclusion`** — a bare `[TO COMPLETE — DD/MM/YYYY …]`
placeholder becomes a finding stated in the document's own voice.

All three AFTER passages lint clean under the register battery (test asserts it).

## 5. Degraded-record register / F13 exposure

Six gap atoms now exist for the accountability surfaces the structural program
added: `assessment_team`, `prepared_by`, `validation_approval`, `approval_date`,
`signoff_basis`, `interested_parties`. Each states the silence as a finding and
says what recording it would settle. All are `frames.ts` lint-clean: no citation
shape, no authority name, no legal-standard paraphrase.

## 6. Suites

- `tests/edge/_tests/item364-dpia-register.test.ts` — **10 passed / 0 failed**
- prose + labels + DPIA suites (`tests/edge/_shared/prose/`,
  `_shared/customer-messages.test.ts`, `_tests/dpia.test.ts`) —
  **143 passed / 5 failed**, all five in the known baseline inventory
  (cppa-risk plan/frame approval-state assertions ×4, FIELD_LABELS coverage ×1).
  Label coverage moved **257/377 → 262/377** with this dispatch.
- `deno check` on the three edited/added shared modules — clean.

## 7. Not done, and why

No AFTER *generation* was run. Producing one requires a live model call through
the authenticated admin flow; the register is therefore proven against the pinned
exemplars and the lint battery, not against a freshly generated document. The
first post-approval run will give the AFTER numbers to compare with the 46
findings in §3.
