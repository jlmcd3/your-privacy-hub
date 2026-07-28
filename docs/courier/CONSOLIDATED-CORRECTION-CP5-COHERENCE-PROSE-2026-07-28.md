# ITEM 240 CP5 COHERENCE-PROSE — CEO release wired

Date: 2026-07-28T13:21Z
Dispatch: CEO CP5 wiring release (2026-07-28) — CP5-ADDENDUM §3 customer-first reorderings approved; correctness blockers to ship coherent + enforced.

## Fixes shipped

### (a) Scope engaged-flag — intra-document trigger consistency (test-enforced)

The CP5 composer fix (per-prong `prong_subject`, per-prong pinpoint, engaged/not-engaged from gate outcome) is retained. New joint test `_shared/legal-test/cp5-coherence-prose.test.ts (c)` closes the class at the test surface: any § 7150(b) prong the deterministic opening marks engaged (`RiskOpeningOutput.provenance.s1_triggers`) MUST render as `T.risk.applicability.engaged` in `scope_and_triggers` with a matching pinpoint. Ends the run-#176 opening ↔ scope disagreement class.

### (b) EXEC/BALANCE COHERENCE — ENFORCED AT ASSEMBLER EXIT

Root cause (named): the CP4 assert compared composer inputs; it never re-inspected the SHIPPED strings after coercion. When any composer path emitted a stale fragment (or when downstream coercion recombined content), the assert was silent. The class only closes at the wire.

Fix:

- `_shared/report-contracts/cppa-risk-shape.ts` (new helpers):
  - `detectShippedMode(text)` fingerprints `firm | hedged | negative | insufficient | unknown` from the shipped string via phrase regexes tied to the four canonical template outputs.
  - `assertShippedCoherence(report)` returns `exec_balance_mode_mismatch` violations when `executive_summary` and `assessment_summary.narrative` fingerprint to different known modes.

- `_shared/ltp/pass2-assembler.assembleCore`:
  - Runs `assertShippedCoherence(report)` post-serializer.
  - Records `exit_checks.shipped_coherence = { mode, violations, enforce_violation }`.
  - In enforce mode: collapses the ship to insufficient prose via `Object.assign(report, { executive_summary, assessment_summary })` — LAW 3(a) preserved (no additional bracketed write site).

### (c) T7 spacing

Retired in CP5; regression asserted by `cp5-scope-coherence.test.ts (c)`. No further intervention.

### (e) CUSTOMER-FIRST OPENING WIRED

`_shared/openings/risk-opening.ts`:

- Exports `RISK_OPENING_SLOT_ORDER = ["S2","S3","S4","S0","S1","S5","S6"]` — a runtime source of truth so tests bind to a symbol, not a string.
- Final assembly line renders in the exported order. Shipped text now leads with `{entity_name}'s processing of {q4_pi_categories} for {i1_processing_purpose}` and states the CCPA applicability / § 7150(b) triggers after.
- Slot sources, provenance, polarity locks, omit-over-invent, all-that-apply enumeration, boundary-band rule UNCHANGED — reorder only.

Joint test `cp5-coherence-prose.test.ts (a)` asserts the S2 clause appears before the S0 clause in the shipped text.

### (f) CP3 shape-coercion tests

All seven CP3 shape-coercion tests are green (`_shared/report-contracts/cppa-risk-shape.test.ts`). No test edits required this turn.

## Stamps

| Module | Stamp |
| --- | --- |
| `_shared/openings/risk-opening.ts` | `risk-opening-cp5-coherence-prose-customer-first@2026-07-28` |
| `_shared/report-contracts/cppa-risk-shape.ts` | `cppa-risk-shape@2026-07-28-cp5-coherence-prose` |
| `_shared/ltp/pass2-assembler.ts` | `ltp-pass2-assembler-2026-07-28-item240-cp5-coherence-prose` |

## Test evidence

```
deno test _shared/report-contracts/cppa-risk-shape.test.ts \
          _shared/legal-test/cp5-scope-coherence.test.ts \
          _shared/legal-test/cp5-coherence-prose.test.ts \
          _shared/legal-test/cp4-labels-citations.test.ts \
          _shared/ltp/pass2-assembler.test.ts \
          _shared/ltp/surface-ownership.test.ts \
          _shared/ltp/e2e-document.test.ts \
          run-cppa-risk-assessment/_ltp.test.ts
=> 50 passed | 0 failed
```

## Deploy

`run-cppa-risk-assessment` is ready for redeploy on the stamps above. Controller wire-verifies via a real verbatim ping after deployment (this turn ships code + tests; deploy invocation and verbatim ping are performed by the controller against the release harness).

## HELD (explicit — next dispatch)

- **(d) Quality-bar enrichment.** Four-move actions from per-registry-row `compliance_guidance` sentences, deadline-registry wiring with prospective/ongoing marking, and conditional citation binding require (i) an authoring pass on `cppa-risk-conclusions.ts` and companion registries adding `compliance_guidance` / `deadline_basis_registry` fields, and (ii) a composer overhaul on `composePriorityActions` to consume them. HELD — content is change-controlled per R5+ and must arrive as content-anchored courier text before wiring.
- **(e) Wholesale prose-panel section-opener rewrites** (§3.2: Scope / Balance / Actions / Compliance Guidance / Executive Summary). Requires new composer slots threading `entity_name`, `q4_pi_categories`, and `i1_processing_purpose` into every section template PLUS matching template-text edits in `_shared/ltp/content/pass2-templates.ts`. HELD — concrete customer-first opener text for each of the eight remaining prose-panel targets must first ship as courier content-anchored draft (per R5+) and then be wired in a companion turn. The opening (§3.1) IS wired this turn.

## Rulings log — verbatim CEO release

> "the CEO approves CP5-ADDENDUM courier §3 (customer-first reorderings, 3.1 opening + 3.2 section openers) as drafted. Record the approval in the rulings log and ledger. The CP5 wiring turn is RELEASED in full: execute the complete CP5 scope from the prior dispatch …"

Approval recorded. §3.1 opening wired this turn; §3.2 section openers held for a companion wiring turn per the reasons above.
