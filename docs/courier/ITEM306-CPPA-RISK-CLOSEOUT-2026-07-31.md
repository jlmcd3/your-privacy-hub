# ITEM 306 — CLOSE-OUT: ITEM 305 COURIER + PIN TEST + FIXTURE UNBLOCK (COURIER)

**Dispatch:** Controller Item 306 (CLOSE-OUT), 2026-07-31.
**Authority:** CEO directive 2026-07-31, on the controller's plan-mode finding.
**Scope executed:** retroactive Item 305 courier + ledger, the pin/regression test Item 305 owed, and minimum cppa-risk fixture coverage. **NO other engine changes. NO deploy. NO harness invocation. NO ingestion.**
**Stamp:** 2026-07-31T07:36Z (sandbox clock re-read before writing).

---

## 1. TASK 1 — RETROACTIVE COURIER

`docs/courier/ITEM305-CPPA-RISK-REBUILD-2026-07-31.md`, authored to the Items 298–304 standard: what changed (five deliverables, intake additions, narrative wiring), catalogue provenance **verified live rather than restated**, explicit zero-ingestion confirmation, files-touched list, a "what Item 305 got wrong" section, and a double-check ledger. Ledger Item 305 added alongside Item 306 in the same append-only style.

## 2. TASK 2 — PIN / REGRESSION TEST

**Location:** `src/registry/__tests__/cppa-risk-analytics.test.ts`.
**Placement rationale (checked, not assumed):** there is no separate test home for `derive.ts` / `section-shards`; every Deno-side module tested this session is tested from `src/registry/__tests__/` by relative import (`risk-verified-authorities.test.ts`, `ir-playbook-uk-mirror-exclusion.test.ts`, `biometric-statute-self-consistency.test.ts`, and the four corpus pins). Item 306 follows that convention rather than inventing a second one. Note: `enums.ts`'s header comment anticipated a Deno-side test path (`./cppa-risk-analytics.test.ts`) that Item 305 never created; the vitest location supersedes it.

**Result: 24 tests, all passing (1.87 s; corpus pin 1.84 s of it, live `psql`).**

| Dispatch requirement | Mechanism |
| --- | --- |
| (a) eight entries byte-verifiable in `cppa-7152` | Live `psql` read; `norm()` matching the session's other corpus pins (curly quotes, dashes, NBSP, whitespace runs) **plus one documented addition** — word-internal hyphen + whitespace rejoined, because the corpus line-wraps `"non- medical"` in (H). The rule requires a word char immediately before the hyphen, so normalized en/em dashes (`" - "`) are untouched. This is exactly the false-negative class the controller's manual grep hit. (D) is matched as two fragments with the gap asserted against an explicit page-header regex. |
| (b) `consequence` closed domain, never null when `weighing[]` populated | 5 scenarios (perfect / empty / minimisation / high-residual / secondary-activity) × every emitted activity: `weighing` length = 4 ⇒ `consequence` truthy, `decision` ∈ the four enumerated values, `rule_ids` non-empty, citation `11 CCR § 7152(a)(7)`. Plus behavioural pins: empty record ⇒ `reserved_insufficient_record`; planned-only safeguard on a severe harm ⇒ never bare `initiate`. |
| (c) catalogue membership of every `harm_causation[]` entry | `isHarmId` on every entry across all scenarios, pinpoint format asserted, `harm_verbatim` asserted **identical to the catalogue entry** (so paraphrase downstream fails the test), `safeguard_map[].harm_id` foreign key checked, and a negative pin: harm label `(Z)` yields no entry. |
| (d) structural distinctness across the four `weighing[]` records | **Class-token-stripped Dice coefficient over token bigrams.** Beneficiary-class words are removed FIRST — difference alone is worthless here because the class name always differs — then pairwise bigram overlap must be **< 0.60**. **The detector is itself pinned:** a synthetic Item 295 artefact (one sentence, class name swapped) is asserted to score **> 0.95**, so the test proves it catches the defect pattern rather than merely passing. |

## 3. TASK 3 — MINIMUM FIXTURE COVERAGE

Extended the shared `base` object in `supabase/functions/_shared/golden/cppa-risk.ts` (**confirmed filename**; `CPPA_RISK_GOLDEN`, 3 cases) with every field Item 305 marked `required: "always"`: `a2_necessity_set[]` (3 elements, one deliberately a `minimisation_candidate`), the four `a4_benefit_*` statements, `a5_harm_pathways[]` (A and C, source and cause stated separately), `a6_safeguards[]` mapped to both harms, and the `a9_approver_*` record. Extending `base` rather than adding a fourth case clears **all three** pinned fixtures in one change — the minimum that restores measurability.

Authored to the **"Perfect Data" standard** the CEO wants for the deferred quality-batch variant work: specific and non-generic (each benefit survives the § 7152(a)(4) generic screen), distinct per beneficiary class (Dice-checked by the test above), causally stated rather than labelled. **This dispatch is NOT the quality-batch variant work**, which stays deferred.

**PIN-VALIDATION ABORT CLEARED — TRACED, NOT ASSERTED.** `run-quality-batch/index.ts` L60 imports the validator as `validateIntake as validateAgainstContract` and L1886–1910 runs it over every pinned intake at run start, aborting the run on any violation. The fixture guard in the new test calls **that same function** with `CONTRACT_BY_TOOL["cppa-risk"]`'s contract object (`cppaRiskContract`) over each `CPPA_RISK_GOLDEN[].intake` and asserts **zero violations** — i.e. the exact predicate the batch evaluates, not a proxy for it. All 3 cases pass. Any future contract addition now fails at commit time instead of at batch start.

## 4. FILES TOUCHED

| File | Change |
| --- | --- |
| `docs/courier/ITEM305-CPPA-RISK-REBUILD-2026-07-31.md` | NEW (retroactive) |
| `docs/courier/ITEM306-CPPA-RISK-CLOSEOUT-2026-07-31.md` | NEW (this) |
| `docs/pipeline-state.md` | Items 305 + 306 appended; `Last updated` restamped |
| `src/registry/__tests__/cppa-risk-analytics.test.ts` | NEW (24 tests) |
| `supabase/functions/_shared/golden/cppa-risk.ts` | `base` extended with the § 7152 operands |

**Nothing else was touched.** No engine module, no contract, no migration, no corpus row, no page.

## 5. DOUBLE-CHECK LEDGER

| Check | Result |
| --- | --- |
| Courier written, Items 298–304 format | ✅ provenance, zero-ingestion confirmation, files-touched, double-check section |
| Test location matches convention | ✅ `src/registry/__tests__/` — the only home Deno-side module tests use in this codebase |
| Test passes | ✅ 24/24, corpus pin included (`PGHOST` present; pin `describe.skipIf`s without it) |
| Fixture clears contract validation | ✅ 3/3 golden cases, via the batch's own validator function and contract object |
| Typecheck | ✅ clean |
| No other files touched | ✅ 5 files, listed above |
| Deploy / harness invocation | ✅ NONE |

**Unrelated pre-existing failure, recorded not fixed:** `src/registry/__tests__/admt-verified-authorities.test.ts` › "all rows share a single verified_on stamp" fails (2 distinct stamps, expected 1). It touches no file in this turn's diff and predates it — flagged for the cppa-admt Chapter-3 rebuild, **not actioned here** (out of scope).

---

**Disposition:** COMPLETE — awaiting controller verification. Item 305 is now fully documented and covered; cppa-risk is measurable again. Next per controller: **cppa-admt, Chapter 3**.
