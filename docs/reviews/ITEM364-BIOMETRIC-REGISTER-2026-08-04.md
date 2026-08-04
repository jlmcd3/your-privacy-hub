# ITEM 364 — WAVE 1, DISPATCH 4: BIOMETRIC REGISTER

Date: 2026-08-04
Register: CEO-approved PART A specification (A1–A9), unchanged.
Scope: PROSE ONLY. No schema, deliverable-logic, or determination change.

## Artifacts

| Artifact | Path | Row | Approved |
|---|---|---|---|
| Document plan | `library/prose/plans/biometric.plan.json` | `prose_document_plans` product=`biometric` version=1, content_hash `80c9c7d2107f15dfc5bf0646b56d11fc9180d3870361a7eb7183046abb999340` | **false** |
| Frame set | `library/prose/frames/biometric.frames.json` | `prose_frame_sets` product=`biometric` version=1, content_hash `44581f7dc005949a0266a4795f794f4075dc3ab66102d71d246f560660bfee33` | **false** |

Both rows are unrenderable (`planRenderable` / `frameSetRenderable` = false) until CEO sign-off.

## PART B — statute-as-template

The plan's spine is the duty arc of each statute in scope (Illinois 740 ILCS 14/15,
Texas CUBI § 503.001, Washington RCW 19.375 and RCW 19.373), taken from
`biometric-statute-registry` and the `_local` verified authorities. No statutory text
was re-typed anywhere in this dispatch: the byte-exact quote path and its
self-consistency tests are untouched and green.

Ten plan sections, arc-ordered: determination (headline) → overview (record) →
identifier / entity / divergence (analysis) → duty findings and exposure surfaces
(duty) → information needed and scope-gated (ask) → attestation (close).

Per-duty findings are planned as the A2 syllogistic unit — duty as the statute
states it, practice the record shows, conclusion — and the determination section
carries `exposure_kept_separate` as an explicit theme so the exposure /
what-must-change-now line the determination logic draws is never blurred in prose.

## Diction sweep (A6)

Remaining `on this record` occurrences in the deterministic divergence templates
were replaced with five distinct register-compliant openings, so the replacement
itself does not become the new scaffold (Item 370 `repeated_boilerplate` applies):

| Site | Replacement |
|---|---|
| WA enrolment predicate | "One of those two elements is absent here" |
| CUBI one-year divergence | "As the facts are recorded, …" |
| release-form divergence | "Taking the facts as written: …" |
| § 15(d) / (c)(1) divergence | "By the facts described, …" |
| § 15(c) profit divergence | "As recorded here, …" |

## Field labels

31 curated biometric labels added to `FIELD_LABELS` (BIPA, CUBI, RCW 19.375 and
MHMDA limbs), each phrased as the question the field asks rather than a
de-underscored field id.

## Acceptance (A9)

Full lint set on golden PERFECT (`BIOMETRIC_GOLDEN`, `BIOMETRIC_GOLDEN_EXTRA`) and
MESSY (`MESSY_BY_TOOL["biometric-checker"]`) renders — zero register findings,
zero banned phrases.

| Suite | Result |
|---|---|
| `tests/edge/_tests/item364-biometric-register.test.ts` | 8 / 8 |
| Item 364 dispatches 1–4 combined | 41 / 41 |
| `tests/edge/check-biometric-compliance/` (schema coverage) | 3 / 3 |
| biometric corpus-pin + statute self-consistency (`biometric-wa-registry`) | green |
| `npm run lint:rails` | OK |
| frontend vitest | 1023 / 1023 (74 files) |

Pre-existing baseline failures in `tests/edge/_tests/` (27) are unchanged by this
dispatch — registry `w1` tags, grader stamps, and the item354 fixture import
offenders were already failing before it.

## WAVE 1 SUMMARY

| Product | Plan row | Frame row | Approved |
|---|---|---|---|
| DPIA | `prose_document_plans` dpia v1 `cc7ecf5b…` | `prose_frame_sets` dpia v1 `15f55cd8…` | false |
| LIA | lia v1 `c9be2a83…` | lia v1 `700249c3…` | false |
| Registration | registration v1 `b7fc6c4f…` | registration v1 `2caef3ee…` | false |
| Biometric | biometric v1 `80c9c7d2…` | biometric v1 `44581f7d…` | false |

Labels authored across the wave: DPIA 5, LIA 22, Registration 39, Biometric 31.
Missing-label count remaining fleet-wide for these four products: **0** (each
product's contract fields are asserted covered by its dispatch test).

Cap telemetry baselines: LIA golden boilerplate-cap rewrites 41 / 38 / 19 (captured
in dispatch 2); DPIA, Registration and Biometric narrative surfaces are
deterministic template strings and carry no cap telemetry.

Unsatisfiable across the wave: nothing. The only items deliberately left open are
the `approved: false` gates on all eight rows, which only a CEO sign-off flips.
