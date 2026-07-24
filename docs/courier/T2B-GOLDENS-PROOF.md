# T2(b) — BIO-REG-W1 GOLDEN REFRESH + PINPOINT SELF-CONSISTENCY

**Label:** BIO-REG-W1-T2B-GOLDENS-PROOF
**Turn:** T2(b) only — evidence-gate batch (c) NOT executed this turn.

## 1. Golden Refresh

File: `supabase/functions/_shared/golden/biometric-extra.ts`
(active biometric fixture per `_shared/golden/registry.ts` → `"biometric-checker": BIOMETRIC_GOLDEN_EXTRA`).

Six cases, all using contract `JURS` labels from
`_shared/intake-contracts/biometric-checker.ts` so `validateIntake` passes:

| # | id | jurisdiction path | asserts |
|---|---|---|---|
| 1 | `bio-reg-w1-il-bipa-fingerprint` | IL BIPA (direct) | registry pinpoint `740 ILCS 14/15(b)`, `BIPA`; no TX/WA/CO leak |
| 2 | `bio-reg-w1-tx-cubi-hand-geometry` | TX CUBI (direct) | registry `Tex. Bus. & Com. Code § 503.001`; no BIPA/PRA leak |
| 3 | `bio-reg-w1-wa-hb1493-voiceprint` | WA HB1493 (direct) | registry `RCW 19.375`, commercial-purpose; no BIPA/CUBI leak |
| 4 | `bio-reg-w1-co-hb24-1130-named-state` | Other US → `Colorado` | registry pinpoints `C.R.S. § 6-1-1303(5)`, `6-1-1303(24)(b)`, `6-1-1308(7)`; no scaffolding, no cross-state leak |
| 5 | `bio-reg-w1-unresolved-other-us-state` | Other US (no name) | structured-unresolved shape; references `other_state_names`; no Wave-1 default citations |
| 6 | `bio-reg-w1-unregistered-named-state-ohio` | Other US → `Ohio` | names Ohio + structured-unresolved shape; no fabricated Wave-1 citations |

Output schema is **unchanged** — the fixtures verify the registry-gated
composition (pinpoints must come from supplied `statute_short + pinpoint`
rows; out-of-registry states get the structured-unresolved shape). No
`GoldenAssertion` kinds added; no schema drift.

## 2. Pinpoint-in-Verbatim-Quote CI Test

File: `src/registry/__tests__/biometric-statute-self-consistency.test.ts`
(shipped with BIO-REG-W1 T1; covered by the project's default `vitest run`
via `vitest.config.ts` `include: ["src/**/*.{test,spec}.{ts,tsx}"]`).

Contract asserted: for **every** row in `BIOMETRIC_STATUTE_REGISTRY`, the
row's `pinpoint` literal appears as a substring of that row's
`verbatim_quote`. Also enforces: registry version stamp shape; the four
Wave-1 jurisdictions present; ≥1 row per jurisdiction; unique row ids;
`primary_source_url` + `verification_date` present; ≥1 applicability
predicate per row.

**Flagged rows this run:** none. All 23 Wave-1 rows self-consistent.

## 3. Test Results (pasted green)

### Vitest — pinpoint self-consistency (7 tests)

```
 RUN  v3.2.4 /dev-server

 ✓ src/registry/__tests__/biometric-statute-self-consistency.test.ts (7 tests) 6ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### Deno — golden-contract + qbp20 (6 tests)

```
running 1 test from ./supabase/functions/_tests/golden-contract.test.ts
golden-contract / every golden fixture validates against its tool contract ...
------- output -------
[golden-contract] skipped (no contract): registration (no contract mapped)
----- output end -----
golden-contract / every golden fixture validates against its tool contract ... ok (6ms)
running 5 tests from ./supabase/functions/_tests/qbp20.test.ts
QB-P20 goldens validate against their contracts ... ok (5ms)
QB-P20 buildSeedRow pins intakes when provided ... ok (1ms)
QB-P20 fixture-lint catches planted collisions ... ok (1ms)
QB-P20 gate_v2 truth-table ... ok (0ms)
QB-P20 shadow_score arithmetic ... ok (0ms)

ok | 6 passed | 0 failed (161ms)
```

## 4. Function Edits / Deploy Stamps

**None.** This turn touches only:
- `supabase/functions/_shared/golden/biometric-extra.ts` (fixture data)

No deployed function file was edited; no `BUILD_STAMP` bump or boot-log
required per the standing rule. Pricing, payment, marketing copy, design
tokens, customer revision path, signup, and contracts/schemas are
untouched.

## 5. Deviations

1. **CI-test location.** The standing-rule test asserted by the dispatch
   already lives under `src/registry/__tests__/…` (not `tests/registry/…`)
   because the project's vitest `include` glob is `src/**`. It runs on
   every default `vitest run`. Reporting the discrepancy in case CEO wants
   the file mirrored under `tests/`.
2. **Registered vs. contract-only `jurisdictions` labels.** Fixtures 5 & 6
   both select `"Other US state"` because the biometric contract's `JURS`
   enum has no separate "Ohio" option; the registry's resolver reads
   `other_state_names` to distinguish the two paths. `golden-contract`
   passes in both configurations.
