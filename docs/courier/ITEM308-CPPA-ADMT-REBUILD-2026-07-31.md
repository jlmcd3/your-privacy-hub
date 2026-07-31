# ITEM 308 — cppa-admt PRODUCT REBUILD (Chapter 3) + TASK 0 TEST FIX

**Dispatch:** CONTROLLER — ITEM 308. **Authority:** CEO directive 2026-07-31.
**Stamp:** 2026-07-31T10:09Z. **Scope:** engine turn on `run-admt-checker` + one test-file fix.
**NO deploy. NO harness invocation. Build and pin-test only.**

---

## 1. TASK 0 — `admt-verified-authorities.test.ts` fix (four-team unanimous ruling)

The test asserted `new Set(rows.map(r => r.verified_on)).size === 1`. That treated an
artefact of how the registry was authored (one hand-verification pass) as a REGISTRY
INVARIANT. It is not one. `verified_on` is a **per-row fact**: it records when *that
row's* quote was checked against the publisher. Any legitimate later re-verification of
a single row — exactly what the `access_timeline` row carries at `2026-07-26` — fails a
test that has nothing to do with correctness.

Replaced with two assertions:

1. **Per-row validity** — every row has a non-empty `verified_on` matching `^\d{4}-\d{2}-\d{2}$`
   and parsing as a real date.
2. **Explicit non-invariance** — the stamp set is asserted to be `>= 1` distinct value, and
   the known later stamp on `access_timeline` is pinned at `2026-07-26`. The second
   assertion exists so a future author cannot silently re-flatten the stamps and
   re-introduce the false invariant.

`rg` confirmed no other consumer read the single-stamp property. **14/14 passing.**

---

## 2. TASK 1 — the three analytic deliverables

Chapter 3 (C) scored Op. 1 (significant-decision characterisation) and Op. 4 (opt-out
mechanism analysis) as **PERFORMS**. Per Chapter 3 (E) point 4 those paths are **untouched
and preserved**; the new deliverables sit alongside them and reuse their reasoning style.
The gap was Ops 2, 3, 5 — RECITES/RECITES/RECITES.

### New module: `supabase/functions/_shared/ltp/admt-deliverables/`

| File | Role |
|---|---|
| `types.ts` | Shapes only. `NoticeElementFinding`, `ExceptionCondition`, `ExceptionQualificationEntry`, `LawfulnessFinding`, `ExposureFinding`, `Determination`, `AdmtDeliverables`. |
| `elements.ts` | Groups EXISTING verified-authority rows into the five § 7220(c) elements and the § 7221(b) exception conditions. **Re-derives nothing.** |
| `build.ts` | The single writer. Pure, never throws, degrades instead of aborting. |

**REUSE LAW.** Every element's verbatim text and every condition's verbatim text is taken
from `supabase/functions/_shared/registry/admt-verified-authorities.ts`. No statutory text
is retyped in the deliverables layer. The pin test asserts byte-identical containment in
both directions, so a drifting registry breaks CI rather than shipping a paraphrase.

### 2.1 `notice_element_findings[]` — § 7220(c)(1)–(5)

One record per element, always five, never four and never six. Each carries the registry
`proposition_keys`, the `element_verbatim` from those rows, the citation, the **business's
own published notice text** for that element, a `verdict`
(`adequate | inadequate | absent | insufficient_record`) and a `why`.

The generic-text screen implements § 7220(c)(1)'s actual prohibition: notice wording such
as "business purposes", "to improve our services", or "as described in our privacy policy"
is scored `inadequate` on its face, because the regulation requires the notice to name the
**actual decision**.

**DEGRADATION LAW.** Where the record neither shows the published text nor affirmatively
records absence, the verdict is `insufficient_record`, `status = "record_insufficient"`,
and `information_needed` names the missing fact. The element is never omitted, and silence
is never read as compliance.

### 2.2 `exception_qualification[]` — § 7221(b)

One record per claimed exception, decomposed **condition by condition** against the
verbatim elements of the exception. Each condition carries `condition_verbatim` (a
byte-identical substring of the registry row), the `evidence_on_the_record`, a per-condition
verdict, and where unsatisfied the fact needed to satisfy it.

- **§ 7221(b)(1) human appeal** → three conditions: a method to appeal; to a human reviewer;
  who has authority to overturn.
- **§ 7221(b)(2) admission/acceptance/hiring** → sole-use, and works-for-purpose-without-
  unlawful-discrimination.

The roll-up `qualifies` is computed **over the conditions**, never asserted alongside them.
An unevidenced claim cannot reach `qualifies` — pinned in test.

### 2.3 `determination` — two components, separated

One object per activity with exactly two parts:

- `lawfulness.finding` — **what is unlawful NOW** under §§ 7220/7221 as they stand.
- `exposure.statement` — **what the consequence of that non-compliance is.**

**SEPARATION GUARD.** `normalizeDetermination` splits the model's lawfulness text into
sentences and relocates any sentence matching the exposure lexicon (penalty, fine, dollar
figure, enforcement, civil action, § 1798.155) into `exposure.statement`, recording the
count in `separation_repairs`. A report that leads with enforcement exposure instead of
answering the lawfulness question is a defect the engine repairs mechanically rather than
hoping the prompt holds.

**WHY 3 IS NOT A DECISION TABLE (contrast with Item 305).** cppa-risk's `consequence`
implements § 7152(a)(7), which supplies a fixed rule over typed, bounded inputs — a lookup.
§§ 7220/7221 supply no such rule. Deciding which shortfalls are dispositive against a
particular business's facts cannot be tabulated without inventing a severity ordering the
regulation does not contain. So the model reasons it; the builder supplies the grounded
inputs, enforces the two-part shape, and degrades to a named `record_insufficient`
scaffold when the model omits it.

### 2.4 Prompt

One appended prompt block in `run-admt-checker/index.ts` states the two-part determination
contract, forbids penalty/enforcement language inside `lawfulness.finding`, forbids `§`
tokens (the system stamps citations), and requires naming missing facts rather than
asserting a conclusion the record cannot support.

### 2.5 Wiring

`attachAdmtDeliverables(report, intake)` runs after the W9 slots attachment, overwrites the
three keys as single writer, and emits an `_admt_deliverables` telemetry line. Fail-open:
a throw is logged and the run continues.

---

## 3. INTAKE ADDITIONS (Chapter 3 (E)(1))

Without these, Ops 2/3/5 can only be ASSERTED.

| Field | Purpose |
|---|---|
| `notice_element_text.{purpose, optout, access, antiretaliation, howworks_inputs, howworks_output, altprocess}` | The **published pre-use notice text**, transcribed element by element. Adequacy is assessed against the words the business publishes, not against a description of them. |
| `admt_detail.appeal_step_count` | Steps from adverse decision to human reviewer — evidence that the § 7221(b)(1) method is real. |
| `admt_detail.appeal_reviewer_role`, `appeal_trained`, `appeal_authority_overturn` | Already on the form; now **registered in the contract** so the deliverable's evidence paths are contractual. |
| `admt_detail.sole_use_attestation` | § 7221(b)(2)(A) sole-use attestation. |
| `admt_detail.nondiscrimination_testing` | § 7221(b)(2)(B) testing-record status, separate from the free-text description. |

All are `required: "optional"` — the deliverables degrade explicitly rather than blocking
submission, and an honest blank produces a named `information_needed` instead of a silent
pass.

Enum options are declared once in `src/pages/admt/ADMTChecker.enums.ts` and mirrored in the
contract; the existing TURN-2 parity test pattern covers drift. Four new rail entries
(`notice_element_text`, `appeal_step_count`, `sole_use_attestation`,
`nondiscrimination_testing`) carry verbatim regulation text already in the registry,
coaching in the house voice, and a fictional `goodAnswer` illustrating FORM only.

---

## 4. PIN TESTS — `src/registry/__tests__/admt-deliverables.test.ts` (12/12)

1. The element registry IS the closed five-element list, in order.
2. Every finding cites one of the five real § 7220(c) elements; five emitted, no duplicates,
   none dropped; every citation is scoped to `11 CCR § 7220`.
3. `element_verbatim` **contains** the registry row's `verbatim_quote` for every
   `proposition_key` — the anti-re-derivation pin.
4. An empty record produces **no** `adequate` verdict, and every degraded finding names its
   missing fact.
5. A complete record produces no `insufficient_record` element.
6. Every `condition_verbatim` in `EXCEPTION_SPECS` is a byte-identical substring of the
   claimed exception's registry quote.
7. Emitted conditions match the spec set exactly — no paraphrase, no omission.
8. An unevidenced exception claim never rolls up to `qualifies`, and no condition reads
   `satisfied`.
9. `determination` always emits **both** components, even from an empty model payload, and
   marks itself `degraded` / `record_insufficient` when it does.
10. The separation guard relocates penalty language out of `lawfulness.finding` into
    `exposure.statement` and counts the repair.
11. A clean two-part determination survives with `separation_repairs === 0` and both parts
    `analysed`.
12. The envelope carries all three deliverables together.

**Suite state:** 28/28 across the three ADMT files (`admt-deliverables`,
`admt-verified-authorities`, `cppaAdmtTurn2Parity`). Full-suite failures are the
pre-existing `font-size`, `cppaRiskW9Slots` and `cppa_cyber` fixture failures — untouched by
this turn and unrelated to it. Typecheck clean.

---

## 5. WHAT THIS TURN DID NOT DO

- No deploy, no harness invocation, no fixture regeneration, no migration.
- No change to Op. 1 or Op. 4 paths.
- § 7222 (access-response adequacy) is **out of scope** for Item 308 — Chapter 3 (E)(3)
  names notice, exception and determination only. The Item 307 courier's §6 finding that
  § 7222 supplies a distinct adequacy surface remains an open, unscheduled item.
- The `cppa-admt` product remains **unmeasured**: no fixture carries the new
  `notice_element_text` keys yet, so a benchmark run today would score the degraded path.
  Fixture extension is the natural next turn, mirroring Item 306 for cppa-risk.
