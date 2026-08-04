# ITEM 364 — WAVE 1, DISPATCH 3 of 4: REGISTRATION PROSE PROPAGATION

Date: 2026-08-04. Status: **pending CEO sign-off** (plan + frames seeded `approved:false`).
Scope honoured: PROSE ONLY. No schema, deliverable, determination-logic, or
structural change. Verdict vocabulary (`registrable` / `not_registrable` /
`conditional` / `record_insufficient`) untouched.

## What changed

1. **A6 diction sweep (the defect that started the dispatch).** The register's
   banned-phrase battery found 13 `banned_phrase` findings across every golden
   and messy render: `on this record` had propagated into threshold reasoning,
   broker determinations, filing-readiness summaries, representative
   applications, DPO branch conclusions, and both narrative surfaces. All 22
   sites in `registration-deliverables/build.ts` plus one in
   `run-registration-assessment/index.ts` are reworded, each in its own words
   rather than by a single find-and-replace — "as the record stands", "by the
   facts recorded", "from the facts recorded", "as matters stand".
2. **Corpus-pending register.** The EU AI Act flag rendered as one sentence
   carrying the topic, four repeated citations, and the note — six stacked
   asides, an `appositive_stack` finding on every fixture. It now reads as a
   short passage: the topic is named, the reason for silence is given once, the
   provisions ride the flag rather than the sentence, and the passage closes by
   saying what the silence does *not* mean ("nothing above should be read as a
   finding that no duty arises").
3. **Plan** (`library/prose/plans/registration.plan.json`) — rewritten from the
   Item 339 stub to the register: thesis, 12 sections, arc-ordered
   headline → record → analysis → duty → ask → remedy → close, two exemplar
   pairs. Statute-as-template is stated in the thesis and enforced by the
   `threshold_analysis` themes (`statute_frame`, `limbs`, `exclusions`,
   `unevidenced_limbs`). Schedule-surface law is a plan theme
   (`schedule_surface_only`), never a computed date.
4. **Frames** (`library/prose/frames/registration.frames.json`) — 13 gap atoms,
   varied by arc stage, covering threshold limbs, the direct-relationship limb,
   claimed exclusions, markets, establishment, the Art. 27 exemption limbs, the
   DPO branches, filing readiness, both schedule cases, corpus-pending, and the
   attestation block (approver and review date, separately).
5. **FIELD_LABELS** — audit found 39 of 40 registration contract fields
   unlabelled. All 39 authored in counsel's naming.

## Acceptance (A9)

| Check | Result |
| --- | --- |
| Register lint, 7 golden PERFECT renders | 0 findings (was 13 banned_phrase + 2 appositive_stack) |
| Register lint, 2 messy renders | 0 findings |
| `lintPlan(REGISTRATION_PLAN)` | 0 findings |
| `lintFrameSet(REGISTRATION_FRAMES)` | 0 findings |
| Thesis + both AFTER exemplars | register-clean |
| Frames carry no date or period | asserted |
| Registration labels | 40/40 |
| `item364-registration-register.test.ts` | 8/8 |
| Item 364 dispatches 1–3 together | 27/27 |
| Registration edge suites (engine, schema-coverage, intake contract) | 14/14 |
| Frontend (`vitest`) | 1023/1023, 74/74 files |
| Prose-library pin test | 6/6 after re-seed |

Seeded rows (`approved:false`, unrenderable until sign-off):
`prose_document_plans/registration` `b7fc6c4f…`,
`prose_frame_sets/registration` `2caef3ee…`.

Pre-existing failures outside this dispatch are unchanged: the `cppa-risk`
plan/frame approval assertions and the LTP/cppa-risk coverage drops already
recorded in the fleet-check baseline.
