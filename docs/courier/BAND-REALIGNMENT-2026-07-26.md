# BAND-REALIGNMENT — CPPA/CCPA revenue + consumer bands

**Status:** T1 SHIPPED (docs + design + dormant central module). T2 DEPLOY-HELD (wiring turn scheduled after next wave / ~04:30Z).
**CEO order:** 2026-07-26 ~02:40Z.
**Review:** TEAM-REVIEWED (five-lens). Privacy-counsel signed off on 1:1 statutory-line mapping; CS signed off on plain-language labels.
**Ledger:** item 113.
**Turn discipline:** contract turn (standing rule). This turn intentionally splits into T1/T2 per the dispatch's own DEPLOY-HELD provision to keep the ~04:30Z wave on the frozen `gc-2026-07-25-s4-eu-uk-ca-au-sg` instrument. Ruled deviation logged §2 item 113.

## 1. Root cause fixed

QL2-vs-quality-batch dummy-data investigation traced the recurring `qc_r1_4_cohort_determinism` CRITICAL to a band-edge defect, not an emitter or grader defect. The current `q1_revenue` band `"$25M–$50M"` straddles the § 7121(a)(2)/(a)(3) $50M cohort line — the emitter (correctly) refuses to assert a single cohort date; the grader (correctly) demands one. The QL2-era band `"$20M–$100M"` was the same defect, doubled (straddled both $25M and $50M lines). Similar defects exist in `q2_consumers` (`"100,000–1 million"` straddles the § 7120(b)(2)(A) 250,000 prong) and in the parallel `i3_ca_consumer_band` scale.

Fix shape: realign every band edge to a statutory line so every V2 band maps to exactly ONE cohort and ONE applicability answer. Legacy stored values keep working via an explicit mapping; unambiguous legacy values resolve to a V2 band; ambiguous legacy values (`"$25M–$50M"`, `"$25M–$100M"`, `"$20M–$100M"`, `"100,000–1 million"`, `"Unsure"`) resolve to `null` and mark `_meta.internal.band_legacy_ambiguous = true`. Emitters preserve conservative no-assert behavior for ambiguous inputs. No stored-data rewrites.

## 2. Corpus-verified statutory edges (verbatim, this turn)

Source: `provision_texts` (status=approved) — read via the Backend-access-law read path this turn.

| Anchor | Verbatim excerpt | Edge |
|---|---|---|
| `provision_texts.ccpa-1798-140` § 1798.140(d)(1)(A) | "As of January 1 of the calendar year, had annual gross revenues **in excess of twenty-five million dollars ($25,000,000)** in the preceding calendar year, as adjusted pursuant to subdivision (d) of Section 1798.199.95." | Covered-business trigger at $25M (exclusive above) |
| `provision_texts.ccpa-1798-140` § 1798.140(d)(1)(B) | "Alone or in combination, annually buys, sells, or shares the personal information of **100,000 or more consumers or households**." | Covered-business trigger at 100,000 (inclusive) |
| `provision_texts.cppa-7121` § 7121(a)(1) | "April 1, 2028, if the business's annual gross revenue for 2026 was **more than one hundred million dollars ($100,000,000)** as of January 1, 2027." | Cohort > $100M → 2028 |
| `provision_texts.cppa-7121` § 7121(a)(2) | "April 1, 2029, if the business's annual gross revenue for 2027 was **between fifty million dollars ($50,000,000) and one hundred million dollars ($100,000,000)** as of January 1, 2028." | Cohort $50M–$100M → 2029 |
| `provision_texts.cppa-7121` § 7121(a)(3) | "April 1, 2030, if the business's annual gross revenue for 2028 was **less than fifty million dollars ($50,000,000)**." | Cohort < $50M → 2030 |

## 3. Enum decisions

### 3.1 Revenue (`q1_revenue`, cyber `profile_revenue_band`)

| V2 label | § 1798.140(d)(1)(A) | § 7121(a) cohort |
|---|---|---|
| `Under $25M` | not met | none |
| `$25M to under $50M` | met | 2030-04-01 (a)(3) |
| `$50M to $100M` | met | 2029-04-01 (a)(2) |
| `Over $100M` | met | 2028-04-01 (a)(1) |

**Edge decisions.** `$25M to under $50M` is inclusive at $25M and exclusive at $50M; § 7121(a)(3) matches on `< $50M` so the band resolves cleanly to the 2030 cohort. `$50M to $100M` is inclusive at both edges; § 7121(a)(2) covers `[$50M, $100M]` and `Over $100M` covers `> $100M`, matching (a)(1). Every band maps to exactly one cohort.

### 3.2 Consumers (`q2_consumers` and `i3_ca_consumer_band`)

Unified onto one enum. `i3_ca_consumer_band` is DERIVED from `q2_consumers` with identical edges — the two scales overlapping-but-different is what created the § 7120(b)(2)(A) 250,000-prong ambiguity. Old i3 labels ("Fewer than 10,000", "10,000–100,000", "100,000–1,000,000", "More than 1,000,000") did not sit on the 250k line; V2 unification fixes that.

| V2 label | § 1798.140(d)(1)(B) 100k | § 7120(b)(2)(A) 250k |
|---|---|---|
| `Under 100,000` | not met | not met |
| `100,000 to under 250,000` | met | not met |
| `250,000 to under 1,000,000` | met | met |
| `1,000,000 or more` | met | met |

## 4. Legacy → V2 mapping (accept-only; no stored-data rewrites)

Revenue: `"Under $25M"` → `Under $25M`; `"$50M–$100M"` → `$50M to $100M`; `"$100M–$500M"` and `"Over $500M"` → `Over $100M`. **Ambiguous** (map to `null`, emitter preserves no-assert, `_meta.internal.band_legacy_ambiguous=true`): `"$25M–$50M"`, `"$25M–$100M"`, `"$20M–$100M"`.

Consumers: `"Fewer than 100,000"` → `Under 100,000`; `"100,000–249,999"` → `100,000 to under 250,000`; `"250,000–1 million"` → `250,000 to under 1,000,000`; `"1–10 million"` and `"Over 10 million"` → `1,000,000 or more`. **Ambiguous**: `"100,000–1 million"`, `"Unsure"`.

Full mapping tables live in `supabase/functions/_shared/bands/revenue-consumer.ts` (canonical) and `src/lib/bands/revenueConsumer.ts` (frontend mirror). Byte-identical for the enum arrays and mapping tables.

## 5. Instrument re-key

`qc_r1_4_cohort_determinism` and any other check keyed on band labels are re-keyed off the V2 map (`QC_R1_4_EXPECTED_COHORT` in `_shared/bands/revenue-consumer.ts`). Ambiguous-legacy bands are EXEMPT from `qc_r1_4` (cannot demand what the input cannot determine — this removes a check-vs-emitter contradiction, primary-source proof from the § 7121(a) subdivision text). Rubric text and thresholds are otherwise untouched — this is an instrument change, not a rubric change.

Instrument version bump: `gc-2026-07-25-s4-eu-uk-ca-au-sg` → **`gc-2026-07-26-s5-eu-uk-ca-au-sg`**. Hash + counter reset recorded in T2 alongside the wiring commit (counter currently 0/3 → practical cost: none).

## 6. Same-turn surfaces (T2 scope)

Per the standing contract-turn rule, T2 must land every surface simultaneously with the enum switch:

1. `supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts` — swap `REVENUE_OPTS`, `CONSUMER_OPTS`, and `CA_CONSUMER_BAND` to re-export V2 arrays.
2. `src/pages/CPPARiskAssessment.enums.ts` — re-export V2 arrays; preserve `SPI_VOLUME_OPTS`, `SHARE_REVENUE_50PCT_OPTS`, `Q5_SELL_SHARE_OPTS`, `Q15_SENSITIVE_PI_OPTS`, `SENSITIVE_LOCATION_BASIS_OPTS`, `HARM_TYPES` untouched (unrelated).
3. `src/pages/CPPACybersecurity.enums.ts` (or equivalent profile source) — revenue field switched to V2.
4. Both intake forms (`CPPARiskAssessment.tsx` + `CPPACybersecurity.tsx`) — no code changes if forms already read `REVENUE_OPTS` from the enum module; visual verification screenshot in T2 courier.
5. `supabase/functions/_shared/cppa-test-states.ts` — `classifyRevenueBand` + `classifyConsumerBand` accept V2 primary + legacy secondary via `resolveRevenueBand`/`resolveConsumerBand`; ambiguous-legacy returns the existing "indeterminate cohort" band shape (unchanged output contract).
6. `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts` — trigger condition changes from `band.key === "25_50m"` to `resolveRevenueBand(intake.q1_revenue) === "$25M to under $50M"`; excision literals unchanged; module already OMISSION-OVER-INVENTION for ambiguous inputs.
7. `supabase/functions/_shared/openings/risk-opening.ts` — S0 applicability criterion (A) mapping: `"$25M to under $50M"` UNAMBIGUOUSLY exceeds $25M → asserts (A); `"Under $25M"` never asserts.
8. `src/components/cppa/CPPARiskRailEntries.ts` — `q1_revenue` and `q2_consumers` `plainSummary` / `regulationText` / `goodAnswer` / `commonMistake` rewrites to reference V2 labels; corpus quotes already verbatim.
9. Dummy-data / scenario generators (`supabase/functions/generate-stress-fixtures/index.ts` + wave harness) — emit ONLY V2 labels.
10. Fixtures + goldens — REGEN with V2 labels; adversarial fixtures include one representative for each ambiguous-legacy label to guard the exempt path.
11. Sample fixtures — REGEN flag `sample_fixtures_regen_2026_07_26` in `src/lib/sampleFixtures.ts` header.
12. Tests — contract round-trip (V2 + legacy), band→cohort exhaustive (every V2 member resolves; every legacy member either resolves or maps to `null`), form parity (both forms enumerate V2), emitter+check property (for every V2 band, emitter asserts IFF check expects).

## 7. This turn (T1) — what changed

- **New:** `supabase/functions/_shared/bands/revenue-consumer.ts` (canonical, dormant — no imports elsewhere yet).
- **New:** `src/lib/bands/revenueConsumer.ts` (frontend mirror, dormant).
- **New:** this courier.
- **Updated:** `docs/pipeline-state.md` header + ledger item 113 + §7 CEO ruling log entry.

No enum, contract, form, generator, T7, rail, fixture, golden, sample, corpus, or grader/rubric change this turn. No edge-function deploy. The DORMANT modules compile cleanly (pure TS/Deno; no external side-effects) and can be imported from T2 without a follow-on migration.

## 8. T2 deploy protocol (planned)

Locks: 0 batches running/pending; no in-flight customer gens younger than 15 min. Split after the ~04:30Z wave; T2 lands with DEPLOY-HELD released and fresh-clock stamps re-read pre-deploy. T2 courier will re-quote §2 verbatim and append the boot-log paste + instrument-hash line.

## 9. Guardrails observed this turn

No rubric-text change, no threshold change, no golden loosening. No code that touches the running edge functions. Atomic (single commit spans dormant module + mirror + docs). No pricing/design/customer-path changes. No touch to reserved subtrees. No Fable 5.
