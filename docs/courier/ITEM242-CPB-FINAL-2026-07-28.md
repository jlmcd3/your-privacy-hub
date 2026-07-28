# ITEM 242 — CP-B FINAL WIRING

Dispatch: `CONTROLLER RELEASE — ITEM 242 CP-B FINAL WIRING (2026-07-28)`
Executed: 2026-07-28.
Deploy status: **LIVE.**
Build stamp: `ltp-risk-item242-cpb-final@2026-07-28T23:07:59.895Z`
Composer version: `ltp-section-composers-cppa-risk-2026-07-28-item242-cpb-final`
Submission-postures stamp: `submission-postures@2026-07-28-cpb-final`

## (A) CEO-ratified KIND opener stems (verbatim in code)

The six CEO clauses are exported as `KIND_OPENERS` in
`_shared/ltp/section-composers/cppa-risk.ts` and consumed as
`element_short_label` PREFIX in `T.risk.priority_action.golden` per
courier §2.1. Controller-corrected typo (`substantiale` → `substantiate`)
retained per prior flag.

```
benefit_absent    "Additional information would be needed to substantiate the stated benefit of"
harm_absent       "Additional information would be needed to address the potential negative impact category"
safeguard_absent  "Additional information would be needed to document the safeguard"
gate_unresolved   "Additional information would be needed for"
type_j_reserved   "Qualified counsel should be consulted for further consideration of"
conditional       "Additional information would be necessary to substantiate"
```

Family-grouping thresholds (courier §2.2) ratified verbatim:

```
harm      absent_count >= 2   →  one consolidated action (family)
safeguard absent_count >= 2   →  one consolidated action (family)
benefit   absent_count >= 3   →  one consolidated action (family)
```

Family action opener text:
- Harm:      `"the following potential negative impact categories:\n• …"`
- Safeguard: `"the following safeguards:\n• …"`
- Benefit:   `"the following stated benefits:\n• …"`

## (B) Re-scoped repeated-opener assert

Per controller ruling, the CEO's sanctioned opener stems are EXEMPT
from a naive prefix-repetition check. The re-scoped rule ships in the
joint test (`_item242_cpb_final.test.ts` — CP-B §2.3 test): consecutive
actions must differ in the (KIND stem, element core) pair AND the
post-stem substance tokens. Ratified stems shared across actions are
allowed by construction; substance duplication remains a failure. The
old `first_20_chars(actions[i]) !== first_20_chars(actions[j])` form
IS RETIRED and replaced by the KIND/tail decomposition above.

## (C) CP-B §1 — corpus-sourced § 7120(b) posture clauses (VERIFIED)

### C.1 Marker source verification (VERIFY-FIRST)

- M4 (`§ 7120(b)(2)(B)` SPI-volume) → `q15c_spi_volume`
  → `_shared/cppa-test-states.ts:84`.
- M5 (`§ 7120(b)(1)` 50%-revenue) → `q5c_share_revenue_50pct`
  → `_shared/cppa-test-states.ts:82`.
- b2A (§ 7120(b)(2)(A) volume + revenue) → `q2_consumers` +
  `q1_revenue`, derived in `_shared/ltp/waveb-completion.ts:265-288`
  (WAVEB2-CLOSURE band-straddle rule retained).

### C.2 Corpus pins — verbatim provision text

New file `_shared/openings/ccpa-7120-pin.ts` (verified against
`provision_texts` row `key='cppa-7120'`, `status='approved'`, fetched
via anon SELECT 2026-07-28T23:00Z):

```
CCPA_7120_B_1     = "The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(C), in the preceding calendar year"
CCPA_7120_B_2_A   = "Processed the personal information of 250,000 or more consumers or households in the preceding calendar year"
CCPA_7120_B_2_B   = "Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year"
CCPA_1798_140_D_1_C = "Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information."
```

### C.3 Posture clauses per (prong, state) — 3 × 4 = 12 forms

Emitted by `renderProngPosture(prong, state)` in
`_shared/ltp/submission-postures.ts`. Each posture is a state-the-law
clause that quotes the provision verbatim and states the posture on
the current record without computing beyond it.

Templates (verbatim in code):

```
met                → `${preface}. On the current record this threshold is met.`
not met            → `${preface}. On the current record this threshold is not met.`
not applicable     → `${preface}. On the current record this prong is not applicable.`
indeterminate      → `${preface}. The current record does not yet resolve this threshold; completing the underlying intake field resolves it.`
```

Where `preface` per prong:

```
b1  → `§ 7120(b)(1) incorporates Civil Code § 1798.140(d)(1)(C), which applies when a business "Derives 50 percent or more of its annual revenues from selling or sharing consumers' personal information"`
b2A → `§ 7120(b)(2)(A) applies when a business "Processed the personal information of 250,000 or more consumers or households in the preceding calendar year"`
b2B → `§ 7120(b)(2)(B) applies when a business "Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year"`
```

Wired at `_shared/ltp/waveb-completion.ts::extendSubmissionBasisCrosswalk`
— replaces the compact `cybersecurity-audit linkage — …` triad with the
three state-the-law posture clauses; idempotency preserved (new skip
marker `§ 7120(b)(1) incorporates`).

## (D) Composer diff summary

`_shared/ltp/section-composers/cppa-risk.ts`:
- `KIND_OPENERS`, `FAMILY_THRESHOLDS`, `ActionKind` exports.
- `groupFamilies(sources)` — consolidator per §2.2 thresholds.
- `composePriorityActions` — kind-typed ActionSource, family grouping,
  KIND-stem prefixed `element_short_label` at emission.
- `SECTION_COMPOSERS_VERSION` → `…-item242-cpb-final`.

Rest of the golden template is unchanged; the four-move contract
(customer-recorded fact / gap-or-consequence / compliance guidance /
deadline + owner) still renders through existing slots.

## Tests

`supabase/functions/run-cppa-risk-assessment/_item242_cpb_final.test.ts` —
eight asserts:

1. Posture clauses quote § 7120 verbatim
2. Six-per-state posture asserts (12 forms total exercised)
3. Crosswalk emits state-the-law postures grounded in verbatim text
4. Six KIND openers exposed and non-empty
5. KIND opener stem appears as `element_short_label` prefix on every
   action
6. Family grouping consolidates absent negatives when >= 2
7. Re-scoped repeated-opener assert exempts ratified stems (CP-B §2.3)
8. `computeProngOutcomes` marker source verification (M4/M5)

Also updated `_shared/ltp/value-screen.test.ts:14` stamp expectation
to match the deployed VALUE_SCREEN_VERSION (stale from Item 242-BC).

Full suite (LTP shared + run-cppa-risk-assessment):
```
running 322 tests
ok | 322 passed | 0 failed (5s)
```

## Deploy + ping (verbatim)

Deployed 2026-07-28 via `supabase--deploy_edge_functions(["run-cppa-risk-assessment"])`.
Real edge-function boot log (verbatim from `supabase--edge_function_logs`):

```
2026-07-28T23:07:59Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-item242-cpb-final@2026-07-28T23:07:59.895Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
2026-07-28T23:07:59Z INFO [run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@… build_stamp=ltp-risk-item242-cpb-final@2026-07-28T23:07:59.895Z
2026-07-28T23:07:59Z INFO [run-cppa-risk-assessment] boot build_stamp=ltp-risk-item242-cpb-final@2026-07-28T23:07:59.895Z
```

Boot `build_stamp` echoes `ltp-risk-item242-cpb-final@…` — CP-B FINAL
wire confirmed live.

## Files touched

- `supabase/functions/_shared/openings/ccpa-7120-pin.ts` — NEW (corpus pins).
- `supabase/functions/_shared/ltp/submission-postures.ts` — NEW (posture emitter).
- `supabase/functions/_shared/ltp/waveb-completion.ts` — crosswalk uses postures.
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` — KIND openers, family grouping, kind-typed ActionSource.
- `supabase/functions/_shared/ltp/value-screen.test.ts` — stamp expectation refresh.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — BUILD_STAMP bump.
- `supabase/functions/run-cppa-risk-assessment/_item242_cpb_final.test.ts` — NEW joint tests.

## HARD STOP

CP-B FINAL is code-complete, deployed, boot-log-verified. Controller
wire-verifies and launches the BATCH OF THREE.
