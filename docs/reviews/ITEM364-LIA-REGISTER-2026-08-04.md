# ITEM 364 — WAVE 1, DISPATCH 2: LIA REGISTER PROPAGATION

Review packet, same series as `ITEM364-DPIA-REGISTER-2026-08-04.md`. Everything
here is **prose only**: no schema, deliverable, determination-logic, or
structural change. All artifacts are seeded `approved: false` and are therefore
unrenderable until CEO sign-off.

## WHAT YOU ARE APPROVING

Two database rows for the LIA product flip from `approved: false` to `approved: true`:

1. **The document plan** — `prose_document_plans` / `lia`, content hash
   `c9be2a83…ac6b`. This is the blueprint for how every future LIA report is
   composed: its thesis, the order of its sections, the register each section
   must be written in, its sentence discipline, and the worked exemplars the
   engine imitates.
2. **The frame set** — `prose_frame_sets` / `lia`, content hash
   `700249c3…d6cd`. These are the pre-written counsel-voice patterns the
   document uses to state what the customer's record does not yet say.

**What changes for customers.** Once both rows are approved, every *newly
generated* LIA is composed to the plan and speaks through the frames. Reports
already stored in a customer's account are untouched and read exactly as before.

**What does not change.** Determinations, verdicts, scoring, schemas, statutory
quotes, and the universal disclaimer are not touched by the flip. Only the way
the prose is written changes.

**How to revert.** Set either row back to `approved: false`. The product returns
to today's prose on the very next report. No code change and no deployment.

**Before you decide.** Read the BEFORE→AFTER exemplar pairs in this packet, then
read the first LIA generated after approval.

---

## 0. Carried correction — the DPIA thesis, and the lint hole behind it

The DPIA thesis opened with "On the record this organisation gave…", a phrase
A6 bans. It passed lint because the lint never read plan metadata — only
rendered prose. Two changes:

- **Thesis reworded** to "This assessment states what the processing is and what
  the record this organisation supplied will and will not carry. Where the
  record is silent the document says so. Nothing here is settled until the
  organisation writes the missing facts down." The exemplar AFTER text and one
  frame body carrying the same phrase were corrected with it.
- **The hole is closed.** `register-lint.ts` gained a `BANNED_PHRASES` set (a
  `banned_phrase` rule) covering "on the record", "in this regard", "it is worth
  noting", "as noted above" and their kin; `lintPlan` now runs the **thesis** and
  **every exemplar AFTER passage** through the register battery itself
  (`register_defect_in_thesis`, `register_defect_in_exemplar`). BEFORE passages
  are quoted live output and are deliberately exempt. There is now one
  definition of the register, not two.

DPIA plan and frame rows were re-seeded (`approved: false`) so the DB content
pin matches the corrected JSON.

---

## 1. PART A register — what landed for LIA

| A | Item | Where |
|---|---|---|
| A1 | Architecture + thesis | `library/prose/plans/lia.plan.json` — 14 sections, thesis states the weighing as the document's job |
| A2 | Syllogistic unit + banned diction | `REGISTER — SENTENCE ORDER`, `REGISTER — DICTION` in `run-li-assessment` |
| A3 | Economy + banned openers | `REGISTER — SENTENCE ORDER` (no scaffolding openers) |
| A4 | Cadence + 2 BEFORE→AFTER exemplars | `REGISTER — CADENCE`; `xp-lia-1`, `xp-lia-2` |
| A5 | Audience | counsel-to-counsel; labels written as record items, not form fields |
| A6 | Standing 363 + 370 rules | banned-word **and** banned-phrase sets, now also enforced on plan metadata |
| A7 | Degraded-record register | `REGISTER — DEGRADED RECORD` + 12 plan-authored gap atoms; pipeline order unchanged (prose → span/citation validators → boilerplate cap → universal disclaimer) |
| A8 | Structured surfaces never narrated | `REGISTER — THE ARC AND THE BALANCE`: "the table records the verdicts; the prose gives the reasons" |
| A9 | Mechanics/acceptance | seeded `approved: false`; this packet |

## 2. PART B — the LIA supplement

**The ICO three-part arc is the spine.** Plan section order runs determination →
record → purpose stage (`interest_legitimacy`, `benefit_and_beneficiary`) →
necessity stage (`alternatives_considered`) → balancing inputs
(`relationship_with_individual`, `scale_frequency_duration`, `potential_harms`,
`opt_out_feasibility`) → **the balance** → comparable decisions → asks →
recommendations → attestation. Asserted in test, not just asserted in prose.

**The balancing section must weigh.** The prompt rule requires both directions
argued — the interests actually stated against the impacts actually found —
before the outcome lands, and forbids a tally, a score, or a recap of the
sub-tests. The sub-test table stays a structure (A8); the prose reasons.

**Cap seam — arc-stage variation.** The twelve gap atoms are written so that
absence reads differently at each stage: a purpose-stage silence is a missing
interest, a necessity-stage silence is a missing comparison, a balancing-stage
silence is an empty side of the scale, an attestation silence is an unadopted
draft. A test asserts no two stages share an opener.

**Eight structural-program additions covered** (closes F13): interest_legitimacy,
benefit_and_beneficiary, alternatives_considered, relationship_with_individual,
scale_frequency_duration, potential_harms, opt_out_feasibility,
attestation_block — plus sub-atoms for alternatives rationale, DPO review,
approver, and review triggers.

**22 FIELD_LABELS authored** — exactly the 22 LIA contract keys that had none,
all customer-facing and in-register (no de-underscored keys).

**Exemplar pairs**, both from the current `F_LIA_UK` sample render:
`xp-lia-1` (purpose-test analysis: three stacked asides, the standard quoted
twice, an erroneous Article 6(11) anchor dropped) and `xp-lia-2`
(opt-out recommendation: the stock hedge appeared **twice in one field**).

---

## 3. Boilerplate-cap telemetry (`_meta.internal.lia_boilerplate_cap`)

Measured deterministically over live LIA renders, including the thin-record run:

| report | scanned | info_needed | neutral_downgrade | rewrites |
|---|---|---|---|---|
| `387a9945` (thin balancing record) | 331 | 32 | 13 | **41** |
| `9a8c6b87` | 328 | 35 | 7 | 38 |
| `0b1e91c4` | 330 | 19 | 4 | 19 |

Register findings on the same renders: 19 / 32 / 29 (dominated by
`banned_phrase`, `appositive_stack`, `cadence_monotony`, `cadence_overlong`).

**This is the BEFORE state, and it cannot move yet.** Plan-authored variation is
what drives rewrites toward zero, and the plan and frame rows are seeded
`approved: false` — they are unrenderable by design until sign-off. The rewrite
count will only fall once the artifacts are approved; re-measuring the golden
MESSY fixture before that point reproduces the numbers above. That is the one
acceptance item in A9 that this dispatch cannot close, and the reason is the
gating the dispatch was told to respect.

---

## 4. Suites

| Suite | Result |
|---|---|
| `item364-lia-register.test.ts` | 8/8 |
| `item364-dpia-register.test.ts` | 11/11 (one assertion updated: "belongs in the record") |
| LIA edge + shared edge suites | 706 passed / 27 failed — **all 27 are the standing baseline** (registry byte-substring checks against live corpus, build-stamp pins, `deploy-hygiene` item354 fixtures, `contract-surface-audit` cppa-risk fixtures); none touch LIA prose |
| `lint:rails` | OK |
| Frontend (`vitest run`) | 1023/1023 after the DPIA rows were re-seeded (the pin test caught the stale row — working as intended) |

Seeded: `prose_document_plans/lia` `c9be2a83…`, `prose_frame_sets/lia`
`700249c3…`, both `approved: false`; `dpia` rows re-seeded `cc7ecf5b…` /
`15f55cd8…`, still `approved: false`.
