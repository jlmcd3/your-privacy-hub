# DOC 188 — DPIA spine v4.10 — RATIFICATION REVIEW (generated from the shipped spine bytes)
Date: 2026-09-05. Spine: `supabase/functions/_shared/prose/plans/dpia.spine.ts`. One fixed-prose block changed; no block moved, added or removed. Per the RATIFICATION PROCESS RULE (CEO, 2026-08-12) this review is generated from the SHIPPED bytes, not from a stored .docx.

## Why
All-products batch `local-2026-09-05T21:19:08.501Z-e38460` (pinned data), both DPIA runs (EU-only record, DE controller, `jurisdictions: ["EU (GDPR)"]`): the Executive Summary opened "Article 35(1) of the General Data Protection Regulation **for the EU and UK** (“GDPR”) requires …" — the UK named on a record that never names it (doc 188 P6). The subtitle already selects its instrument by regime (PROMPT 9H.1 item 2; `regimeName`, PROMPT 9L item 1); the opener did not.

## The one change (executive_summary, block 0 — the statutory frame)

BEFORE (v4.8 bytes):

> Article 35(1) of the General Data Protection Regulation for the EU and UK (“GDPR”) requires a data protection impact assessment before processing that, taking into account its nature, scope, context and purposes, is likely to result in a high risk to the rights and freedoms of natural persons, and Article 35(3) identifies the cases in which one is required in particular. {organizationName} believes that this assessment may be required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is described as the following: {description - own sentence}{VERSION_CLAUSE - ", version " + processingVersion; absent => omitted}{LAUNCH_CLAUSE - ", planned to commence " + launchDate; absent => omitted}.

AFTER (v4.10 bytes):

> Article 35(1) of the {gdprInstrument - regime-selected instrument name} requires a data protection impact assessment before processing that, taking into account its nature, scope, context and purposes, is likely to result in a high risk to the rights and freedoms of natural persons, and Article 35(3) identifies the cases in which one is required in particular. {organizationName} believes that this assessment may be required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is described as the following: {description - own sentence}{VERSION_CLAUSE - ", version " + processingVersion; absent => omitted}{LAUNCH_CLAUSE - ", planned to commence " + launchDate; absent => omitted}.

Every other byte of the block, and every other block, is unchanged.

## The slot (`{gdprInstrument}`) — three ratified readings
Selected by `readDpiaRegimeScope(intake)` (`_shared/ltp/dpia-deliverables/build.ts`, the same jurisdiction patterns as `readDpiaRegime`), rendered from `DPIA_GDPR_INSTRUMENT_BY_SCOPE` (`_shared/ltp/dpia-skeleton-assemble.ts`):

| Record names | Rendered instrument |
|---|---|
| EU/EEA only (or neither — the `readDpiaRegime` default) | General Data Protection Regulation (“GDPR”) |
| UK only | UK General Data Protection Regulation (“UK GDPR”) |
| Both EU/EEA and UK | General Data Protection Regulation for the EU and UK (“GDPR”) — the former literal, byte-for-byte |

Slot map: `dpia.slotmap.ts` gains `{ slot: "gdprInstrument", kind: "composed", source: "jurisdictions", render: "label-map" }`. Slot inventory: 14 → 15 (`gdprInstrument` added; nothing removed).

## Pins
- `DPIA_SKELETON_VERSION`: `dpia-v4.8-2026-08-30` → `dpia-v4.10-2026-09-05` (v4.8 retained as `DPIA_SKELETON_VERSION_V48`; the "v4.9" label was already used by the DOC 132 spine-hash entry, which added the advisory-corpus block without a version bump).
- Basis v1 (skeleton-block text, newline-joined): `35d9a83b…6c18` (retained as `DPIA_SKELETON_CONTENT_HASH_V47`) → `4e401fe574a8c4043974b8b61d87604dc1b5605051a7ffcee9eb49861103bc9a`.
- Basis v2 (`serializeDpiaSpine()`): `edc29494…4ae3` (retained as `DPIA_SPINE_HASH_V49`) → `c8f4b0b90966b1f94c9bc9be5416ce7c1919e55a6bb42bca7e28fc220458517f`.
- Method: both values recomputed by the same script that reproduced the prior pins first (`sha256` over the shipped module's exports).
- Tests re-pinned: `_tests/so-final-test/dpia-spine-v4.test.ts` (slot inventory), `tests/edge/so-final-test/prompt9l1-step2-and-relocation.test.ts`, `tests/edge/so-final-test/prompt9l2-section4-order.test.ts`, `tests/edge/run-dpia-framework/c3-verdict-first.test.ts` (version); new `tests/edge/run-dpia-framework/doc188-dpia-fixes.test.ts` renders all three readings.

## Also in doc 188, assembler-side only (no spine bytes)
P5 — the Section 2 "Article 9." framing paragraph now renders iff its table (`section2_coverage.special_category_conditions`) renders, through the PROMPT 12J conditional-intro mechanism (`CONDITIONAL_INTRO_TABLE_SURFACES`). The spine keeps the block; the assembler blanks it for the render when the record carries no special-category row.

## For ratification
The CEO's "write the fixes" (doc 188) is taken as approval of P6 (doc 188 §4 had flagged it as the CEO's call). If the opener should instead stay "for the EU and UK" on every record, revert the block to the BEFORE bytes, drop the slot from `dpia.slotmap.ts` and `buildDpiaSlotValues`, and restore the v4.8 version and both retained hashes.
