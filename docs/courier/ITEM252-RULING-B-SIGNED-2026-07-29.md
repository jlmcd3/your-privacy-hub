# ITEM 252 — RULING B SIGNED (CEO 2026-07-29)

**Dispatch:** TRACK 2 — STAGE 6 (Item 252), CEO sign-off on Ruling B
content (Item 250 HELD courier).
**CEO instruction (verbatim, 2026-07-29):** *"Proceed with your
recommendations for Ruling B sign-off"* — signed AS AMENDED by
controller verification against the intake contract and ledger
mechanics (see Row 3 below).
**Scope:** populates `resolution_source_fields` on the Type-J
`ConclusionSpec` rows in
`supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts`
authorized by Item 250 (wiring landed; content held). Same signature
authorizes narrowing CHECK 1 of `grader-check-mirror.test.ts` to the
signed state (anticipated by ITEM250's closing paragraph: *"If Row 1
is confirmed to remain unpopulated on sign-off, CHECK 1 should be
narrowed at that time to assert population only where a field was
proposed — not before."*).

## Signed row decisions

### Row 1 — `j.initiation_decision` — resolution_source_fields UNDEFINED

- **Anchor:** 11 CCR § 7152(a)(7); reserved to business.
- **Decision:** intentionally undefined; always-asking.
- **Rationale:** the § 7152(a)(7) reasoned proceed / proceed-with-
  modifications / do-not-initiate record is not captured by any current
  intake field. No field can "resolve" it; leaving
  `resolution_source_fields` undefined preserves the legitimate review
  ask on every intake. This matches the ITEM250 courier proposal
  verbatim.

### Row 2 — `j.purpose_specificity_adequacy` — ["i1_processing_purpose"]

- **Anchor:** 11 CCR § 7152(a)(1); reserved to legal_counsel.
- **Decision:** `resolution_source_fields: ["i1_processing_purpose"]`.
- **Rationale (contract + grader evidence):**
  - `i1_processing_purpose` is a real, always-required intake field in
    `_shared/intake-contracts/cppa-risk-assessment.ts` and is
    LEDGER_KEYS-registered in `_shared/ltp/derive.ts`, so
    `pickLedger` produces the ledger row and the composer skip-clause
    fires when it is populated.
  - The historical grader failure that motivates CHECK 1 is verbatim
    *"information_needed asks for resolved field
    'i1_processing_purpose'"* — the signed value is a direct fix to
    the empirically-observed failure, not a speculative addition.
  - Counsel's adequacy determination attaches to the specific purpose
    text in the record; when the text is present, asking for it again
    under `information_needed` is redundant and trips
    `qc_r1_1_no_asks_on_resolved_tests`.

### Row 3 — `j.safeguard_sufficiency` — resolution_source_fields UNDEFINED (ITEM250 proposal REJECTED)

- **Anchor:** 11 CCR § 7152(a)(6); reserved to legal_counsel.
- **Decision:** intentionally undefined; always-asking. The ITEM250
  courier's proposed value `["safeguards_summary"]` is **REJECTED** by
  the CEO on controller verification.
- **Rationale for the rejection (evidence-anchored):**
  - `safeguards_summary` does **not exist** in the intake contract.
    `_shared/intake-contracts/cppa-risk-assessment.ts` has no
    safeguards field at all; there is no form input, no contract row,
    and no path by which a customer intake can carry a value under
    that key.
  - The `safeguards_summary` entry in `LEDGER_KEYS`
    (`_shared/ltp/derive.ts`) is a shadow-era fossil. `pickLedger`
    only emits ledger rows for fields present on the intake object, so
    the row is never produced and the composer's `isPopulated` check
    can never return true for `safeguards_summary` — populating the
    registry with this value would green CHECK 1 **vacuously** while
    the composer's behavior remained byte-identical.
  - The grader archive
    (`quality_archive.quality_check_results_20260728`) records **zero**
    `qc_r1_1_no_asks_on_resolved_tests` failures naming a safeguard-
    related field. Always-asking on safeguard sufficiency is
    grader-compliant on the empirical record.
- **Follow-on (out of scope this turn):** if a real safeguards intake
  field is added in a future turn, a new courier can populate this row
  against the actual contract-real field name at that time.

## Deferred cleanup (recorded, not executed this turn)

The `safeguards_summary` entry in `LEDGER_KEYS` is a fossil (see Row 3
rationale). Removing it is a separate `derive.ts` edit outside the
strict four-file scope of this dispatch; noted here so a future ledger
cleanup can retire it explicitly rather than silently.

## CHECK 1 narrowing (authorized)

`supabase/functions/_shared/ltp/grader-check-mirror.test.ts` CHECK 1 is
rewritten this turn to assert the signed state exactly:

- **1a (registry):** `j.purpose_specificity_adequacy` carries exactly
  `["i1_processing_purpose"]`; `j.initiation_decision` and
  `j.safeguard_sufficiency` carry `undefined`
  `resolution_source_fields` (citing this courier so any future drift
  points back to the signed record).
- **1b (behavioral):** on the REAL_INTAKE fixture (with
  `i1_processing_purpose` populated), `composeSection("information_
  needed", plan)` returns NO item whose `ctx.doc_element_label` is
  the purpose-adequacy display label but DOES return items for the
  initiation-decision and safeguard-sufficiency labels; on
  `{...REAL_INTAKE, i1_processing_purpose: undefined}` the
  purpose-adequacy item IS present. Display labels are read from
  `CPPA_RISK_CONCLUSION_INDEX`, never hand-typed.

CHECK 1 is no longer known-failing after this turn.
