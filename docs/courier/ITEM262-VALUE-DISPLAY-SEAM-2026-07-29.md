# ITEM 262 — VALUE/DISPLAY SEAM + LABEL-RESIDUE ASSERT + DEADLINE GLUE

**Date.** 2026-07-29T23:57Z.
**Track.** TRACK 2 / Stage B(2) — Issue 6.
**Team.** Unanimous (wiring turn; **no registry content values changed**).
**Scope touched.** `_shared/ltp/section-composers/cppa-risk.ts`, `_shared/ltp/replay/substance-gates.ts`, new `_shared/ltp/item262-value-seam.test.ts`, this courier, ledger, EXPLICIT redeploy of ONLY `replay-cppa-risk-harness`.
**Untouched.** Legacy wire (`run-cppa-risk-assessment/`), `supabase/_rebuild-snapshot-item244/`, prompts, screens (grounded-note / coherence / value), registry content values (`cppa-risk-deadlines.ts`, `pass2-templates.ts` — see §3).

---

## 1. EVIDENCE (controller-verified)

Ramp-1 attempt 6 (job `1f04fff5`) assembled a priority action reading:

> **On entity name's record, …**

**Root cause (S1 dual-authorship class).** Item 243 defect 1(d) redefined the intake-ledger row's `.display` field to carry the human **FIELD LABEL** (a grounded-note vocabulary fix: `entity_name` → `"entity name"`). The composers' `pickIntakeDisplay()` continued to read `.display` expecting the **VALUE**. Two authors, one field, opposite semantics — every composer predicate and slot that went through that picker has been reading labels since Item 243.

**Consequential breakage.** Not only entity mentions: every value-testing predicate silently inverted. `q18No` tested `/^(no|false)$/i` against `"use of automated decisionmaking technology"` (never matched → ADMT-inapplicability explanation never emitted); `cohortIsProspective` tested `/^prospective/i` against label text (never matched → every action defaulted to the pre-existing `§ 7155(b)` cohort row); role-title parsing ran over `"internal contributors to the assessment"`; the processing-narrative `pick()` and the LIA clause carried labels as prose.

---

## 2. FIX 1 — `pickIntakeValue` seam (call-site table)

`pickIntakeDisplay()` is **REMOVED**. Enumeration of all former call sites: **every one is a value-consumer**; no composer site genuinely wants the field LABEL, so no label-reading picker remains in the composer module. (`displayLabelForField` in `grounded-note.ts` remains the single, correct label surface — untouched.)

New helper (`section-composers/cppa-risk.ts:374`):

```ts
function pickIntakeValue(plan: RenderPlan, field: string): string {
  const row = plan.intake_ledger.find((r) => r.intake_field === field);
  const v = row?.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();   // numbers/booleans coerced; structured values pass through
}
```

| # | Site (post-fix `file:line`) | Field(s) | Consumer class | Break it caused |
|---|---|---|---|---|
| 1 | `cppa-risk.ts:319` | `i1b_min_pi` | value (prose clause) | LIA line rendered the label as its clause |
| 2 | `cppa-risk.ts:383` | `entity_name` | value (entity slot) | **"On entity name's record"** — the attempt-6 residue |
| 3 | `cppa-risk.ts:384` | `company_name` | value (entity fallback) | same class |
| 4 | `cppa-risk.ts:406` | `i8_certifying_exec_title` | value (role title) | owner slot carried the label |
| 5 | `cppa-risk.ts:410` | `i7_internal_contributors` | value (role-title parse) | role-like filter ran over label text → always empty |
| 6 | `cppa-risk.ts:469` | `processing_start_date` | value (`/^prospective/` predicate) | cohort always resolved pre-existing |
| 7 | `cppa-risk.ts:470` | `cohort_effective_date` | value (`/^prospective/` predicate) | same |
| 8 | `cppa-risk.ts:719` | `assessment_date` | value (as-of date) | label leaked as a date, else fell back to `now()` |
| 9 | `cppa-risk.ts:751` | `q18_admt_use` | value (`/^(no\|false)$/` predicate) | ADMT-inapplicability explanation never emitted |
| 10 | `cppa-risk.ts:752` | `q5b_profiling` | value (`/^(yes\|true)$/` predicate) | same |
| 11 | `cppa-risk.ts:753` | `q5b_sensitive_categories` | value (`/^(yes\|true)$/` predicate) | same |
| 12 | `cppa-risk.ts:940` | `q4_pi_categories` | value (scope-opener slot) | label rendered as customer prose |
| 13 | `cppa-risk.ts:941` | `i1_processing_purpose` | value (scope-opener slot) | same |
| 14 | `cppa-risk.ts:960` | `pick()` — narrative sub-elements | value (narrative clauses) | whole processing narrative label-filled |
| 15 | `cppa-risk.ts:964` | `i1_processing_purpose` | value (activity label) | same |

`SECTION_COMPOSERS_VERSION` → `ltp-section-composers-cppa-risk-2026-07-29-item262-value-seam`.

---

## 3. FIX 2 — harness-side residue assert (Ruling-A location)

`replay/substance-gates.ts` gains `evaluateLabelResidue(report)`, wired into `evaluateSubstance` `hard_failures` (so the runner surfaces it identically to golden-shape). This is the SPEC §6 **"unresolved-slot literals ('entity name' class)"** structure-side assert.

Two literal classes, both matched over `JSON.stringify(report)` case-insensitively with word boundaries:

1. the bare literal `entity name` — a field label, never plausible customer prose in an assembled assessment;
2. any `INTAKE_FIELD_DISPLAY_LABELS` entry in **possessive** form (`"<label>'s"`, straight or curly apostrophe) — a shape that can only arise from a label/value swap.

Failure string: `label_residue:<match>`.

---

## 4. FIX 3 — deadline glue: **BLOCKED, NO CHANGE (recorded for CEO)**

Inspected `T.risk.priority_action.golden` (`content/pass2-templates.ts:323`). The glue is:

```
… The regulation requires the following: {{plan:compliance_guidance_sentence}} {{plan:deadline_sentence}} Owner: {{plan:owner_role_titles}}.
```

The template **already emits `deadline_sentence` as its own sentence with no `"by "` prefix** — the glue is clean. The awkward reading

> "…by Ongoing — 2027-12-31, the § 7155(b) compliance date…"

originates **inside the registry content value** `d.assessment_record.pre_existing.deadline_sentence` (`legal-test/cppa-risk-deadlines.ts:74-75`), which is a verbatim ITEM 241.2 courier §2.4 column-5 value under the prospective-marking rule (§2.2: the `Ongoing —` / `Prospective —` prefix "is part of the customer-facing sentence, not decoration").

Per dispatch instruction: a natural rendering is **impossible without rewording registry content**, therefore **no content change was made, glue left as-is, blocked state recorded here** and flagged as a Build-Issue for CEO. A future courier would need to either (a) reword the six registry `deadline_sentence` values so the cohort marker reads naturally ("…by 2027-12-31 (ongoing-processing cohort, § 7155(b))"), or (b) split the registry row into `deadline_marker` + `deadline_date` + `deadline_basis_clause` so the template can glue them. Both are content changes requiring CEO sign-off against the ITEM 241.2 courier.

---

## 5. TESTS (verbatim)

New `_shared/ltp/item262-value-seam.test.ts`:

```
running 6 tests from ./item262-value-seam.test.ts
item262 (a) — entity slots render the intake VALUE, never the field label ... ok (14ms)
item262 (a) — q18No + q5b affirmative emit the ADMT inapplicability explanation ... ok (2ms)
item262 (a) — composeSection('record_sufficiency') carries no label residue ... ok (0ms)
item262 (b) — residue check hard-fails on the attempt-6 literal ... ok (0ms)
item262 (b) — residue check flags possessive display labels ... ok (0ms)
item262 (b) — clean report passes ... ok (0ms)

ok | 6 passed | 0 failed (31ms)
```

The fixture pins the dual-authorship condition directly: ledger rows carry `value: "ClearPath Credit Solutions"` **and** `display: "entity name"`. Under the pre-fix picker, tests (a)#1 and (a)#2 fail.

Full regression:

```
replay/replay.test.ts + pass1-injection.test.ts + grader-check-mirror.test.ts + grounded-note-mode.test.ts
ok | 29 passed | 0 failed (800ms)

e2e-document.test.ts + surface-ownership.test.ts
ok | 15 passed | 0 failed (364ms)
```

**No existing assert was adjusted.** No e2e/mirror fixture was pinned to broken-label output — all 15 regression asserts held with the value seam corrected.

---

## 6. FOUR-LENS RECORD

- **CS.** Single-authorship restored on the ledger row: `.value` = data, `.display` = label, one reader each. The picker rename makes the seam self-documenting so an Item-243-class redefinition cannot silently re-cross it; the harness residue assert is the structural backstop if it ever does.
- **Privacy.** `pickIntakeValue` now surfaces real intake VALUES where labels previously masked them — this is the intended behavior, and the PII invariant is unchanged: the role-title filter (`contributorRoleTitles`, site #5) still drops name/contact-shaped segments, and it is now actually operating on the real field content rather than on a label that never matched. No new field is read; no PII-excluded field entered any slot.
- **Prompt.** No prompt text changed. Pass-1 is unaffected — this is a Pass-2 composition seam only.
- **Prose.** The customer-facing register improves on every affected surface: real entity names, real purposes, real categories, real retention clauses replace field labels. The deadline sentence remains awkward (§4, blocked) and is the only known residual prose defect in this seam.

---

## 7. DEPLOY

EXPLICIT redeploy of ONLY `replay-cppa-risk-harness`. **NO harness invocation, NO Pass-1 model call, NO grader edits this turn** — the controller reruns personally.
