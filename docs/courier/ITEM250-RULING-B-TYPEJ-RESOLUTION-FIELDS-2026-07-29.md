# ITEM 250 — RULING B: TYPE-J RESOLUTION-SOURCE FIELDS (HELD)

**Dispatch:** TRACK 2 — STAGE 5 (Item 250), controller ruling B.
**Governance (wiring mechanism):** Team-unanimous (2026-07-29) across
the four spec-authoring panels — option (b) from Item 249's courier:
registry-driven `resolution_source_fields` on the Type-J
`ConclusionSpec`.
**Governance (content values below):** **HELD** for CEO sign-off per
the standing content-law (customer-facing content ships only via
CEO-signed courier; team-unanimity governs the wiring mechanism, NOT
the content values).

## Scope

The `run-cppa-risk-assessment` `composeInformationNeeded` composer
currently emits one `T.risk.documentation.gap` review item per Type-J
proposition, unconditionally. Grader check
`qc_r1_1_no_asks_on_resolved_tests` fails whenever a review item asks
for a field that is already resolved on the intake. Wiring landed this
turn: an optional `resolution_source_fields?: readonly string[]` on the
Type-J `ConclusionSpec` type, plus a skip-clause in the composer that
drops a review item when every listed field is populated on the
`plan.intake_ledger`. **No registry row is populated** — the field is
undefined on all three rows, so behavior is byte-identical to Item 249.

This courier proposes the values for CEO sign-off.

## The three Type-J rows (verbatim from
`supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts`)

### 1. `j.initiation_decision`

- **Anchor:** 11 CCR § 7152(a)(7)
- **Reserved to:** business
- **Description:** "Whether the business will initiate the processing
  subject to the risk assessment. The regulation expressly delegates
  this decision to the business."
- **CURRENT:** `resolution_source_fields` undefined → composer always
  emits a review item asking the business to confirm the initiation
  decision.
- **PROPOSED:** *(empty list — no intake field captures the § 7152(a)(7)
  initiation decision today; the review ask is legitimate on every
  intake and this row should stay always-asking).*
- **Reasoning:** The § 7152(a)(7) decision is the reasoned proceed /
  proceed-with-modifications / do-not-initiate record the regulation
  reserves to the business. No current intake field records that
  decision, so no field can "resolve" it. Leaving `resolution_source_fields`
  undefined on this row preserves current behavior and is the correct
  outcome. This row is called out here for completeness so CEO sign-off
  is explicit that no fields are being proposed for row 1.

### 2. `j.purpose_specificity_adequacy`

- **Anchor:** 11 CCR § 7152(a)(1)
- **Reserved to:** legal_counsel
- **Description:** "Whether a given non-generic purpose statement is
  adequately specific for the business's circumstances. The tool
  checks presence + non-generic phrasing; substantive adequacy is
  reserved to counsel/business."
- **CURRENT:** `resolution_source_fields` undefined → composer always
  emits a review item asking counsel to confirm purpose adequacy.
- **PROPOSED:** `["i1_processing_purpose"]`
- **Reasoning:** The § 7152(a)(1) adequacy determination attaches to
  the specific operational purpose statement in the record. The intake
  field `i1_processing_purpose` is the canonical location where that
  statement is captured (see `_shared/ltp/derive.ts` LEDGER_KEYS).
  When `i1_processing_purpose` is non-empty on the intake, the
  substantive purpose text is present in the record and counsel's
  adequacy determination attaches to that text — asking for it again
  under `information_needed` is redundant and trips
  `qc_r1_1_no_asks_on_resolved_tests`.

### 3. `j.safeguard_sufficiency`

- **Anchor:** 11 CCR § 7152(a)(6)
- **Reserved to:** legal_counsel
- **Description:** "Whether the safeguards a business plans to
  implement are sufficient to address the identified negative impacts.
  The tool inventories the safeguard categories the business claims;
  sufficiency is reserved to counsel/business."
- **CURRENT:** `resolution_source_fields` undefined → composer always
  emits a review item asking counsel to confirm safeguard sufficiency.
- **PROPOSED:** `["safeguards_summary"]`
- **Reasoning:** The § 7152(a)(6) sufficiency determination attaches
  to the safeguards enumerated in the record. The intake field
  `safeguards_summary` (LEDGER_KEYS-registered) is the canonical
  location where the customer records the safeguard inventory. When
  `safeguards_summary` is non-empty, counsel's sufficiency
  determination attaches to that inventory — asking for it again is
  redundant and trips `qc_r1_1_no_asks_on_resolved_tests`.

## Wiring landed this turn (no content)

1. `ConclusionSpec.resolution_source_fields?: readonly string[]` added
   to the type in
   `supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts` —
   undefined on every row, no behavior change.
2. `composeInformationNeeded` in
   `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts`
   now filters Type-J entries whose `resolution_source_fields` are all
   populated on the intake_ledger. No-op today.
3. `supabase/functions/_shared/ltp/grader-check-mirror.test.ts` CHECK 1
   asserts every Type-J row carries a `resolution_source_fields`
   value. Currently FAILS with message pointing to this courier.

## HELD — awaiting CEO sign-off

Registry population of the values above must arrive as a CEO-signed
courier; do NOT populate the rows directly. Once approved:

- Row 1 (`j.initiation_decision`) leaves `resolution_source_fields`
  undefined (no fields proposed).
- Row 2 (`j.purpose_specificity_adequacy`) sets
  `resolution_source_fields: ["i1_processing_purpose"]`.
- Row 3 (`j.safeguard_sufficiency`) sets
  `resolution_source_fields: ["safeguards_summary"]`.

CHECK 1 in `grader-check-mirror.test.ts` will remain failing until
CEO sign-off lands, because it asserts population on **every** Type-J
row. If Row 1 is confirmed to remain unpopulated on sign-off, CHECK 1
should be narrowed at that time to assert population only where a
field was proposed — not before.
