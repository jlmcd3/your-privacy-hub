# ITEM 324 — CPPA-RISK PINNED-FIXTURE CONTRACT PARITY + DEDICATED § 7152(a)(5) PIN (COURIER)

**Dispatch:** Queued task 2026-08-01 — close the Item 305 residue found by the exploratory doc `.lovable/plan-quality-batch-as-a-post-rebuild-product-quality-harness-find-2026-07-31.md` (Parts A/D).
**Authority:** CEO-queued.
**Stamp:** 2026-08-01T08:12Z (sandbox clock re-read before writing).
**Scope executed:** fixtures, tests and documentation only. **NO engine code changed. NO corpus row created, edited or promoted. NO deploy. NO harness invocation.**

---

## 0. WHAT THE DISPATCH ASSUMED vs WHAT WAS ON DISK

The dispatch is accurate about the defect but partly stale about the paperwork. Recorded plainly rather than silently worked around:

| Dispatch premise | On-disk state 2026-08-01 | Action |
| --- | --- | --- |
| "Item 305 shipped with no courier document" | `docs/courier/ITEM305-CPPA-RISK-REBUILD-2026-07-31.md` **exists**, written retroactively under Item 306 and labelled as such. | No second Item 305 courier written — that would duplicate the record. This courier documents the residue instead. |
| "no verbatim pin test on the § 7152(a)(5)(A)-(H) harm catalogue" | A pin **exists** inside `src/registry/__tests__/cppa-risk-analytics.test.ts` (Item 306, block "(a) § 7152(a)(5)(A)–(H) harm catalogue — corpus pin"). It is not a dedicated `*-corpus-pin.test.ts`, so it does not match the convention Items 298/307 set. | A dedicated file was added (§2). The Item 306 pin was left in place — two independent pins over the same corpus row is a feature, not a duplication defect. |
| "`golden/cppa-risk.ts` … missing the new `required: "always"` fields" | **Already refreshed** by Item 306 (the `base` object carries the whole Item 305 operand block). | Left as authored; only the adversarial case's ADMT conditionals were resolved (§4). |
| "`cppa-risk-contract-fixtures.ts` … missing" | **TRUE, and unfixed.** All three fixtures were stale. | Fixed (§3). This was the live defect. |

**Net:** one real blocker (the revision-contract fixtures), one convention gap (pin file location), one latent inconsistency (§4).

## 1. THE DEFECT, PRECISELY

`run-quality-batch/index.ts` (L1886–1910) validates **every pinned intake** against `CONTRACT_BY_TOOL[tool]` before case 0 runs, and on any failure writes `status: "error"` with

```
Pinned-fixture contract violations for cppa-risk (n/N): #idx → key: reason; …
```

then returns. Item 305 added eight `required: "always"` § 7152 operand keys to `cppaRiskContract`. `validateIntake` (`_shared/intake-contracts/validate.ts` L132–136) rejects each as `required-always field is empty`. The three `CppaRiskContractFixture` objects carried none of them → **8 violations each, 24 total**, and the batch aborted at start.

## 2. DEDICATED HARM-CATALOGUE PIN — NEW FILE

`src/registry/__tests__/cppa-risk-harm-catalogue-corpus-pin.test.ts` — pattern taken from `cppa-admt-corpus-pin.test.ts` (`norm()` typography normalizer, `psql -tAX` live read, `describe.skipIf(!CAN_RUN)` on `PGHOST`/`PGDATABASE`).

**Corpus row pinned:** `provision_texts` key `cppa-7152`, `status='approved'`, citation `"11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)"`, `verbatim_excerpt` 8,051 chars (read live 2026-08-01, unchanged since Item 306).

**Coverage — 8 tests, all passing:**

| # | Assertion |
| --- | --- |
| 1 | `HARM_CATALOGUE_VERSION` carries `item305`; corpus key and citation constants are exact. |
| 2 | The catalogue is the **closed set** `A…H`, in order, length 8 — no gaps, no extras. |
| 3 | Every entry's `pinpoint` is `11 CCR § 7152(a)(5)(<id>)` and its `verbatim` is non-trivial and never equal to the short `label`. |
| 4 | No catalogue `verbatim` contains a pagination artifact (`Page 104 of 127`, `CA PRIVACY PROTECTION AGENCY`). |
| 5 | The corpus row exists, is `approved`, and is >4,000 chars. |
| 6 | **(A),(B),(C),(E),(F),(G),(H) are byte-exact substrings** of the corpus row under typography normalization. |
| 7 | **(D)** matches as two contiguous halves either side of the running page header, and the excised span is asserted to be **exactly** that header and nothing else. |
| 8 | All eight `(A)`–`(H)` sub-paragraph markers are present in the corpus row. |

**Transcription artifacts — handled, not papered over.** Two PDF artifacts sit inside § 7152(a)(5):
- the running header inside (D) — asserted explicitly, as above;
- a line-break inside the hyphenated compound `"non-\nmedical"` in (H) — the corpus side (only) drops the **line break** and **keeps the hyphen** (`joinHyphenLineBreaks`), because the hyphen is part of the word. The Item 306 pin normalises this differently (it rejoins to `nonmedical`); both are defensible and both now pass over the same unmodified row. **No corpus row was edited and no catalogue string was bent to make a pin pass.**

## 3. `cppa-risk-contract-fixtures.ts` — FIELDS ADDED

Each of the three fixtures received its **own** operand block. A shared `REQUIRED_ALWAYS_FILLERS`-style block was deliberately **not** used: the harm pathways of a mental-health triage service, a credit scorer and a loyalty engine are not interchangeable, and a shared block would have been placeholder data wearing a "Perfect Data" label.

| Fixture | Entity / activity | `a2_necessity_set` | `a5_harm_pathways` | `a6_safeguards` | `a9_approver_*` |
| --- | --- | --- | --- | --- | --- |
| `cppa-risk-rcC1-yield-k3` | Meridian Health — mental-health triage routing | 3 elements (1 deliberately `Collected but not necessary…`: imported mood-diary text) | (A) severity **Severe**, (G) callback disclosure, (H) unexpected diary re-use | 3, one per harm, statuses `Implemented and tested` / `Implemented, not tested` / `Planned, not yet implemented` | Dr. Helena Voss, Chief Medical Officer |
| `cppa-risk-rcC1-partial-j-lt-k` | Solstice FinPay — consumer credit scoring | 3 elements (1 not necessary: precise geolocation from the fraud SDK default) | (B) residential-area proxy, (E) mis-scored decline/rate, (A) feature-store export | 3, one per harm | Marcus Adeyemi, General Counsel |
| `cppa-risk-rcC1-full-close` | Aurora RetailWorks — loyalty personalisation | 3 elements (1 not necessary: in-store position beyond store id) | (C) notice omits geolocation, (E) shallower discounts on thin history, (A) joined member table | 3, one per harm | Denise Okafor, SVP Legal and Compliance |

All four `a4_benefit_*` narratives were written per fixture, each naming a **specific decision the benefit feeds** (§ 7152(a)(4) forbids generic benefit terms, and `build.ts` runs a generic-benefit screen — generic filler would have produced a degraded weighing record even though the contract validated).

**Untouched on purpose:** the deliberate thin spots that give these fixtures their contract character (`q15c_spi_volume` blank, `q19_admt_description`/`q20_admt_opt_out` blank on the ADMT-`In evaluation` fixture, `impact_intake` benefits/rationale absent). Those are `conditional`/`optional`, the batch validator does not evaluate `requiredWhen`, and the revision harness needs them to raise asks.

## 4. THE LATENT INCONSISTENCY — RESOLVED BY SUPPLYING, NOT BY REJECTING

`risk-consumer-boundary-adversarial` set `q18_admt_use: "Yes"` while leaving `q19_admt_description`, `i5_admt_logic` and `i5_admt_human_review` absent — all `required: "conditional"` on that trigger. It survived only because `validateIntake` documents that it does **not** mechanically evaluate `requiredWhen`.

**Ruling: supply the companions.** This case's adversarial character is the **consumer-volume enum edge** (`100,000 to under 250,000` straddling § 1798.140(d)(1)(B) from below); ADMT was switched on in QB-P25 purely to clear the § 7150(b) pre-generation validator. Testing the conditional-requirement rejection path through a case whose assertions are about a volume boundary would have conflated two unrelated failure modes, and would in any event test nothing today — no validator evaluates the predicate. The four fields (`q19_admt_description`, `q20_admt_opt_out`, `i5_admt_logic`, `i5_admt_human_review`) are now authored to the Perfect Data bar; the boundary values are byte-unchanged. A rationale comment sits in the fixture.

`q20_admt_opt_out` was initially authored as `"Yes, with a documented process"` and **caught by the new parity guard** as not a member of `Q20_OPTS`; corrected to the verbatim option `"Yes, with documented opt-out"`.

## 5. PARITY GUARD — NEW FILE

`src/registry/__tests__/cppa-risk-fixture-contract-parity.test.ts` runs the **same validator the batch runs** over **both** pinned sets, so they cannot drift apart again. 5 tests, all passing:

1. every `CPPA_RISK_GOLDEN` case validates with zero violations;
2. every `CPPA_RISK_CONTRACT_FIXTURES` fixture validates with zero violations;
3. both sets carry all eight Item 305 required-always operands, non-empty;
4. every harm pathway is `(A)`–`(H)`-tagged and carries a **source AND a cause** over a length floor — the anti-recitation property Item 305 exists to enforce;
5. the adversarial case's ADMT conditional companions are present.

## 6. WOULD A `/admin/quality-batch` RUN ON cppa-risk NOW COMPLETE WITHOUT ABORTING?

**The abort condition is cleared. Verified, not assumed:** the batch's own validator was executed against all six pinned intakes —

```
risk-saas-clean-tuning              OK
risk-adtech-sell-tuning             OK
risk-consumer-boundary-adversarial  OK
cppa-risk-rcC1-yield-k3             OK
cppa-risk-rcC1-partial-j-lt-k       OK
cppa-risk-rcC1-full-close           OK
failing: 0
```

**Stated precisely:** the **pin-validation gate at `nextIdxSafe === 0` no longer fires**, which is the abort this task was scoped to. Whether the batch then runs to completion depends on generation-time behaviour that this turn did not exercise — **no batch was launched**, per the standing deploy hold (Item 245) and the no-harness-invocation scope. Claiming a green end-to-end run without launching one would be exactly the grader-divergence failure Item 169 hardened against.

## 7. FILES TOUCHED

| File | Change |
| --- | --- |
| `src/registry/__tests__/cppa-risk-harm-catalogue-corpus-pin.test.ts` | NEW — 8-test dedicated § 7152(a)(5)(A)–(H) corpus pin. |
| `src/registry/__tests__/cppa-risk-fixture-contract-parity.test.ts` | NEW — 5-test pinned-fixture contract parity guard. |
| `supabase/functions/_shared/cppa-risk-contract-fixtures.ts` | Item 305 operand blocks added to all three fixtures + header note. |
| `supabase/functions/_shared/golden/cppa-risk.ts` | Adversarial case: four ADMT conditional companions supplied + rationale comment. |
| `docs/courier/ITEM324-CPPA-RISK-FIXTURE-CONTRACT-PARITY-2026-08-01.md` | THIS FILE. |
| `docs/pipeline-state.md` | Ledger item 324 + Last-updated stamp. |

**No engine file, no contract file, no corpus row, no deployment config was touched.**

## 8. DOUBLE-CHECK LEDGER

| # | Check | Result |
| --- | --- | --- |
| 1 | Item 305 courier written | ✅ Already existed (retroactive, under Item 306) — recorded in §0 rather than duplicated. |
| 2 | § 7152(a)(5)(A)–(H) pin added, byte-exact against corpus | ✅ 8/8 passing against live `cppa-7152`. |
| 3 | Pin passes without editing corpus or catalogue | ✅ Both read-only; artifacts handled in the normalizer and disclosed. |
| 4 | Missing Item 305 fields added to `cppa-risk-contract-fixtures.ts` | ✅ 3 fixtures × (a2, four a4, a5, a6, a9) — 24 prior violations → 0. |
| 5 | Fields "well-formed and specific, not placeholder" | ✅ Per-fixture, activity-specific, source-and-cause traced; no shared filler block. |
| 6 | `golden/cppa-risk.ts` Item 305 fields | ✅ Verified already present (Item 306); left byte-unchanged. |
| 7 | Adversarial-case conditional inconsistency resolved | ✅ Companions supplied + rationale comment; boundary values unchanged. |
| 8 | Enum values verbatim from the contract | ✅ One drift caught by the new guard (`q20_admt_opt_out`) and corrected. |
| 9 | Batch pin-validation gate clears | ✅ 6/6 intakes validate; abort condition gone. |
| 10 | End-to-end batch run | ⛔ NOT performed — deploy hold + no-harness-invocation scope. Stated as such in §6. |
| 11 | Suite regression | ✅ 37/37 on the three cppa-risk registry suites; full `src` suite unchanged apart from the 12 net-new passing tests. |

**Disposition:** COMPLETE (fixtures + pins + documentation). NOT DEPLOYED.

## OPEN FOR CONTROLLER / CEO

1. **Launch the cppa-risk `/admin/quality-batch` run.** The start-gate blocker is gone; the run itself needs a controller green-light against the Item 245 hold.
2. **Two normalizers, one row.** The Item 306 pin rejoins `"non-\nmedical"` to `nonmedical`; the Item 324 pin keeps the hyphen. Both pass. If a single convention is wanted, say which and the loser gets retired — flagged, not unilaterally resolved.
3. **`REQUIRED_ALWAYS_FILLERS` is now a partial filler.** It covers the pre-Item-305 required-always set only. A future contract addition will re-open the same hole in the same three fixtures. The parity guard (§5) will catch it at test time rather than at batch time — the guard is the durable fix; the fixture data is not.
