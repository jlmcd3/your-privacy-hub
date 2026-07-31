# ITEM 303 — DATA-BROKER REGISTRATION STATUTE INGESTION (COURIER)

**Dispatch:** Controller, prompt 5 of 7 (INGESTION-PROMPTS-2026-07-31; order 1→7→2→3→4→5→6).
**Authority:** CEO corpus approval 2026-07-31. Items 298–302 complete and controller-verified.
**Scope executed:** `provision_texts` rows (per-state tagged) + new sources-only skeleton + pin tests + this courier + ledger Item 303. **No engine code beyond the one skeleton file. No deploys. No harness invocation.**
**Stamp:** 2026-07-31T06:24Z (sandbox clock re-read before writing).

---

## 1. CORPUS-FIRST CHECK (as instructed — do not repeat Chapter 4's assumption)

Chapter 4 of `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md` said "no registry exists at all" for registration. Verified rather than repeated:

| Table checked | Result |
| --- | --- |
| `provision_texts` | 67 approved rows on entry; **zero** data-broker registration rows under any key pattern (`%broker%`, `%1798.99%`, `%2446%`, `%509%`, `%510%`, `%646a%`). Chapter 4 was **correct** for this product. |
| `us_state_privacy_laws` | Consumer-privacy law metadata only. **No** registration-requirement column, no statutory text, no windows. Not a registry. |
| `gdpr_articles` | EU/UK only. Not applicable. |
| `regulatory_guidance` | No state data-broker registration text. |

**Conclusion:** unlike Items 300 and 302, this was a genuine **fresh ingest**, not a promotion. All 9 rows are fresh. Recorded explicitly because the two prior dispatches both inverted the chapter-level assumption — this one did not.

## 2. SERVED-JURISDICTION ENUMERATION (evidence, with row ids)

Mined the legacy `registration` product's own outputs before ingesting anything, per dispatch (e).

**`quality_run_documents` rows read:**
`9abdbe07-…`, `a0f20d69-…`, `185923b7-…`, `350d4c03-…`, `2bcbea36-…`, `2e66063e-…`.
**`registration_assessments`** distinct asserted jurisdictions: `UK`, `DE`, `US`, `US-CA`, `US-VA`, `US-IL`.
**Engine read:** `supabase/functions/run-registration-assessment/index.ts` L290–350 — CA Delete Act definitions and thresholds hardcoded in prose, no corpus lookup.

| Asserted jurisdiction | Sourceable registration statute? | Action |
| --- | --- | --- |
| US-CA | Yes — Civ. Code §§ 1798.99.80/.82/.86 | **Ingested (3 rows)** |
| US-VT | Yes — 9 V.S.A. §§ 2430, 2446 | **Ingested (2 rows)** |
| US-TX | Yes — Bus. & Com. Code ch. **510** | **Ingested (3 rows)** |
| US-OR | Yes — ORS 646A.593 | **Ingested (1 row)** |
| **US-VA** | **NO** | **FLAGGED — not ingested, not inferred** |
| **US-IL** | **NO** | **FLAGGED — not ingested, not inferred** |
| UK / DE / bare "US" | Not a data-broker registration regime; product-level scope artefact | Out of scope for this dispatch; noted for the engine turn |

### CEO-VISIBLE FLAG — TWO ASSERTED JURISDICTIONS WITH NO STATUTE BEHIND THEM

* **US-VA.** No data-broker registration statute, no registry. The VCDPA imposes controller/processor duties and **no filing duty whatsoever**. Any output telling a Virginia customer to register is **wrong on the law**, not merely unsourced.
* **US-IL.** No data-broker registration statute, no registry. BIPA is a biometric-consent statute; it creates notice/consent/retention duties and **no registration duty**.

These are **not** corpus gaps to be filled — they are product assertions that must be **retracted in an engine turn**. Left unfilled and flagged, per dispatch. Recorded in `UNSOURCEABLE_ASSERTED_JURISDICTIONS` in the skeleton file.

## 3. CURRENCY RE-VERIFICATION (dispatch: "don't assume the doc's framing is current")

Two of the requirements doc's framings were **stale**. Both caught before ingest.

| Assumption in the doc | Live check 2026-07-31 | Disposition |
| --- | --- | --- |
| CA registration filed with the **Attorney General** | **WRONG since SB 362 (Delete Act).** § 1798.99.82 now names the **California Privacy Protection Agency**. | Corrected; CPPA is the filing body in the corpus row and the skeleton. |
| CA registration fee is a **fixed statutory figure** | **WRONG.** § 1798.99.82 says the fee is *"in an amount determined by the California Privacy Protection Agency"* — the statute fixes **no** number. | Pinned as enacted; **no dollar figure ingested for CA**. Any engine output quoting a fixed CA statutory fee is fabricating one. |
| Texas data-broker law is **ch. 509** (as the dispatch itself states) | **REDESIGNATED to ch. 510** by HB 1620, eff. 2025-09-01. Ch. 509 is now the **SCOPE App Act** — a different statute entirely. | Ingested under **510** numbering. Citing 509 today cites the wrong law. |
| CA DROP is a 2026 stand-up only | § 1798.99.86: mechanism by **Jan 1, 2026**; **broker access duty begins Aug 1, 2026**, at least once every **45 days**. | Both dates ingested verbatim. |

**Dispatch correction, on the record:** the dispatch text said "TEXAS Bus. & Com. Code ch. 509". That citation is superseded. This is the same failure class as Item 299's *Superseded-Numbering Primaries* defect — recorded so the pattern is visible, not buried.

## 4. ROWS WRITTEN — 9

All `status='approved'`, `last_verified_at` 2026-07-31, `plain_requirements` as JSONB arrays, per-state `jurisdiction` tag.

| Key | Jurisdiction | Citation | Chars | Publisher |
| --- | --- | --- | --- | --- |
| `ca-delete-act-1798-99-80` | US-CA | Civ. Code § 1798.99.80 | 1252 | leginfo.legislature.ca.gov |
| `ca-delete-act-1798-99-82` | US-CA | Civ. Code § 1798.99.82 | 1274 | leginfo.legislature.ca.gov |
| `ca-delete-act-1798-99-86` | US-CA | Civ. Code § 1798.99.86 | 2139 | leginfo.legislature.ca.gov |
| `vt-9vsa-2430` | US-VT | 9 V.S.A. § 2430 | 1498 | legislature.vermont.gov |
| `vt-9vsa-2446` | US-VT | 9 V.S.A. § 2446 | 812 | legislature.vermont.gov |
| `tx-bc-510-001` | US-TX | Bus. & Com. Code § 510.001 | 875 | statutes.capitol.texas.gov |
| `tx-bc-510-003` | US-TX | Bus. & Com. Code § 510.003 | 1653 | statutes.capitol.texas.gov |
| `tx-bc-510-005` | US-TX | Bus. & Com. Code § 510.005 | 1845 | statutes.capitol.texas.gov |
| `or-ors-646a-593` | US-OR | ORS 646A.593 | 1248 | oregonlegislature.gov |

**Publisher discipline:** every excerpt from the state's own code publisher. **Zero** aggregator sources (no Justia, no FindLaw, no vendor summary, no registry FAQ page).

## 5. DEFINITIONAL DIVERGENCE TABLE — THE FOUR "DATA BROKER" DEFINITIONS ARE NOT THE SAME TEST

This is the load-bearing finding of the dispatch. A single cross-state definition would misclassify customers in three of four states.

| State | Collection element | Disposition element | Direct-relationship carve-out? | Net effect |
| --- | --- | --- | --- | --- |
| **CA** | knowingly **collects** | **sells** to third parties | **YES** | Narrowest on disposition — licensing alone does not trigger. |
| **VT** | knowingly **collects** | **sells or licenses** | **YES** | Broader than CA: licensing triggers. |
| **TX** | **collects, processes, or transfers** | **transfer** suffices — **no sale or licence element at all** | **NO** | **Broadest by a wide margin.** A processor that never sells anything can be a Texas data broker. |
| **OR** | **collects** | **sells or licenses** | **NO** | VT's disposition test **without** VT's carve-out. |

**Consequence the engine must respect:** Texas and Oregon have **no direct-relationship exclusion**. An entity that is *not* a data broker in California or Vermont *because* it has a direct consumer relationship can still be a data broker in Texas and Oregon. Any determination that reuses the CA definition across states is **wrong in TX and OR**.

## 6. SCHEDULE SURFACE — WINDOWS STATED VERBATIM, NEVER COMPUTED

Per schedule-surface law: the corpus carries enacted text; the engine states it and never computes the customer's date.

| State | Enacted window / term | Fee as enacted |
| --- | --- | --- |
| **CA** | *"On or before January 31 following each year in which a business meets the definition of data broker…"* | **Amount determined by the Agency — no statutory figure.** |
| **VT** | *"Annually, on or before January 31 following a year in which a person meets the definition of data broker…"* | **$100.00** (fixed in statute) |
| **TX** | *"A registration certificate expires on the first anniversary of its date of issuance."* — **rolling anniversary, not a calendar date** | **$300** registration; **$300** renewal |
| **OR** | *"…may not collect, sell or license brokered personal data within this state unless the data broker first registers…"*; *"A registration under this section is valid until December 31 of the year in which the department approves the registration."* | set by DCBS rule |

**Two traps recorded:** (1) **Texas is not a January 31 state** — it is a per-certificate anniversary, so no fleet-wide "January 31" sentence is safe. (2) **Oregon has no annual window at all** — it is a *pre-operation* bar plus a December 31 expiry. An engine that renders "register by January 31" fleet-wide is wrong in **two of four** states.

## 7. NEW FILE — SOURCES ONLY

`supabase/functions/_shared/registry/registration-verified-authorities.ts`

* 9 source rows: jurisdiction, state name, citation, filing body, official publisher URL, corpus key, role, verification date.
* `UNSOURCEABLE_ASSERTED_JURISDICTIONS`: US-VA, US-IL with findings.
* `REGISTRATION_SERVED_JURISDICTIONS`: the four regimes.
* **No engine logic. No conclusions. No thresholds restated in prose. No computed deadlines. Not imported by any generator this turn.**

## 8. PIN TESTS

`src/registry/__tests__/registration-statutes-corpus-pin.test.ts` — **PASSING** (1 test, 703 ms, live `psql` against `provision_texts`).

Pins: per-state definitional sentence (4), registration windows/terms verbatim (all 4 states), statutory fees where a figure exists (VT $100.00, TX $300/$300), CA DROP dates, TX dual thresholds, jurisdiction-tag assertion per row.
**Cross-state bleed guards (negative pins):** VT `sells or licenses` and TX `collects, processes, or transfers` must not appear in the CA definition; TX wording and OR `brokered personal data` must not appear in VT; the CA/VT `does not have a direct relationship` carve-out must not appear in TX or OR; `January 31` must not appear in the OR row.

## 9. DOUBLE-CHECK LEDGER (dispatch-required)

| Requirement | Status |
| --- | --- |
| Every excerpt from the official state publisher, not an aggregator | ✅ 9/9 |
| Per-state jurisdiction tags | ✅ asserted in the pin test, not just at write time |
| Registration windows stated verbatim, never computed | ✅ §6 |
| Unsourceable product-asserted jurisdictions flagged, not filled | ✅ US-VA, US-IL |
| Skeleton file = sources only, no engine logic, no conclusions | ✅ §7 |
| Per-state "data broker" definitional pins (cross-state bleed) | ✅ §8 |
| Corpus-first check before treating as fresh ingest | ✅ §1 |
| CA section numbers / fee / window re-verified live | ✅ §3 (registrar and fee assumptions both corrected) |

**Disposition:** COMPLETE — awaiting controller verification before prompt 6 (biometric statutes).

**Open, flagged not actioned (engine turns, not corpus turns):**
1. **US-VA and US-IL registration assertions must be retracted** — the product currently states a duty that does not exist in either state.
2. `run-registration-assessment` L290–350 hardcodes CA definitions in prose with **no corpus lookup** — must be rewired to `provision_texts` keys.
3. Any fleet-wide "January 31" deadline sentence is **wrong for TX and OR** and must be made per-state.
4. Any fixed CA statutory fee figure in engine output is **fabricated** — the statute sets none.
