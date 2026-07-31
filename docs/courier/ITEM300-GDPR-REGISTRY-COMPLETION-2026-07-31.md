# Courier — ITEM 300: GDPR REGISTRY COMPLETION (Wave-3 EU corpus)

**Dispatch:** ITEM 300 — prompt 2 of 7 of the CEO-approved INGESTION-PROMPTS-2026-07-31 inventory
**Executed:** 2026-07-31T05:30Z
**Kind:** corpus turn — `provision_texts` rows + one new pin test + courier + ledger. No engine code, no deploys, no harness invocation.
**Predicate:** Items 298 and 299 complete and controller-verified.

---

## 1. Baseline re-verification (Item 291's read still holds)

| Source | Content | Status |
|---|---|---|
| `gdpr_articles` (jurisdiction `eu`) | Arts. 1–99, `source_url` = `https://publications.europa.eu/resource/celex/32016R0679`, hashed | CONFIRMED |
| `gdpr_recitals` (jurisdiction `eu`) | Recitals 1–173, hashed | CONFIRMED |
| `provision_texts` `gdpr-*` | 20 rows before this turn, all `jurisdiction='EU'`, all `approved` | CONFIRMED |

**Item 291's core finding holds: this was a PROMOTION job, not a fresh-ingest job.** Every row required by the dispatch already existed in `gdpr_articles` / `gdpr_recitals` verbatim with provenance. Zero rows were fresh-ingested from EUR-Lex. EUR-Lex was nevertheless fetched live (CELEX 32016R0679 HTML, 809,035 bytes) and used as an **independent third check** on all twelve rows this turn touched or verified — see §5.

## 2. THE P0 "TRUNCATION" IS NOT A TRUNCATION — Item 291's finding is DISPROVED

Item 291 flagged `gdpr-art-22` (1,289 vs 1,314) and `gdpr-art-34` (1,649 vs 1,718) as P0-truncated. **Both registry rows are complete and correct. No repair was needed, and none was made.**

Byte-level diff of the registry row against `gdpr_articles`:

```
gdpr-art-22 vs gdpr_articles(eu,'22'):   + "\n\nSection 5\n\nRestrictions"                                              (25 chars)
gdpr-art-34 vs gdpr_articles(eu,'34'):   + "\n\nSection 3\n\nData protection impact assessment and prior consultation"  (69 chars)
```

The deltas are **exactly and only** the trailing heading of the *next* section, an artifact of the consolidated-text scrape that populated `gdpr_articles`. They are not Article 22 or Article 34 text. Had the dispatch's instruction been followed literally — "replace with the byte-identical `gdpr_articles` text", pin Art. 22 = 1,314 and Art. 34 = 1,718 — the registry would have been *corrupted* with a foreign heading and the corruption would have been pinned in permanently.

**Independent confirmation:** both registry rows, whitespace-normalized, occur as exact substrings of the live EUR-Lex CELEX 32016R0679 consolidated text. Both are complete: Art. 22 carries (1)–(4); Art. 34 carries (1)–(4) including 34(2)'s "points (b), (c) and (d) of Article 33(3)" cross-reference.

| Row | Before | After | Action | CELEX substring match |
|---|---|---|---|---|
| `gdpr-art-22` | 1,289 | 1,289 (unchanged) | NO-OP — already correct | TRUE |
| `gdpr-art-34` | 1,649 | 1,649 (unchanged) | NO-OP — already correct | TRUE |

**Consequence for the pin tests:** the length pins lock 1,289 / 1,649 (article-only), not the dispatch's 1,314 / 1,718. This is a deliberate, recorded deviation. The pin comment states why, so no future turn "fixes" it back.

**Consequence for `gdpr_articles`:** the artifact is a low-grade defect in the *source* table affecting an unknown number of articles that sit at a section boundary. Not repaired here (out of scope — this dispatch is `provision_texts` only). Flagged for a dedicated turn. Two such artifacts were caught and stripped on promotion this turn (Arts. 36 and 39, below).

## 3. Rows verified, no change

| Key | Len | Verification |
|---|---|---|
| `gdpr-art-35` | 4,410 | Byte-identical to `gdpr_articles` id `e2e3491b-24fe-42fd-9b14-59330fba743c`. Carries 35(1) including "A single assessment may address a set of similar processing operations that present similar high risks." and 35(7)(a)–(d) including the (7)(b) "necessity and proportionality" phrase. Complete through 35(11). CELEX substring match TRUE. |
| `gdpr-art-33` | 1,734 | Byte-identical to `gdpr_articles` id `b6fc4ef0-8018-43b7-889f-a22eb586548f`. Carries 33(1) "without undue delay and, where feasible, not later than 72 hours after having become aware of it" verbatim, 33(3)(a)–(d), and 33(5). CELEX substring match TRUE. |
| `gdpr-art-22`, `-34` | 1,289 / 1,649 | See §2. |

## 4. Rows created — ALL PROMOTIONS (10 rows)

Every row below is a **promotion**, byte-identical to the named source row. `jurisdiction='EU'`, `status='approved'`, `last_verified_at` = insert time. Citation form: `GDPR Art. N (Regulation (EU) 2016/679, CELEX 32016R0679)`. `plain_requirements` authored in the existing `{"requirements":[…]}` shape.

| New key | Len | Provenance (source table + row id) | Notes |
|---|---|---|---|
| `gdpr-art-5-2` | 119 | `gdpr_articles` `5540e76f-da6a-4eab-940d-48cc07f7e1ff` (Art. 5) | Tail slice from "2. The controller shall be responsible" — suffix-identical to the source row |
| `gdpr-art-24` | 861 | `gdpr_articles` `13565dfb-aaa5-4542-ac4d-f2437a0bd6a2` | Whole row, unmodified |
| `gdpr-art-36` | 2,547 | `gdpr_articles` `6b65355f-e1b3-48a9-9508-be455aa8ed04` (2,583) | **Artifact stripped:** trailing "Section 4 / Data protection officer" (36 chars) removed |
| `gdpr-art-37` | 1,989 | `gdpr_articles` `eacdb90f-a566-4bf9-b98c-e9d1487058e9` | Whole row, unmodified |
| `gdpr-art-38` | 1,390 | `gdpr_articles` `cf323df3-4d55-469e-94b7-83e3e339d7b0` | Whole row, unmodified |
| `gdpr-art-39` | 1,278 | `gdpr_articles` `f2c01164-9fa3-4f16-b785-a5f714349770` (1,325) | **Artifact stripped:** trailing "Section 5 / Codes of conduct and certification" (47 chars) removed |
| `gdpr-recital-85` | 1,188 | `gdpr_recitals` (eu, 85) | Whole row, unmodified |
| `gdpr-recital-86` | 957 | `gdpr_recitals` (eu, 86) | Whole row, unmodified |
| `gdpr-recital-87` | 643 | `gdpr_recitals` (eu, 87) | Whole row, unmodified |
| `gdpr-recital-88` | 608 | `gdpr_recitals` (eu, 88) | Whole row, unmodified |

Rows were written with `INSERT … SELECT` **from the source tables directly**, so byte-identity is structural, not transcribed — there was no copy step in which drift could occur.

### Art. 5 decision — 5(2) alone as its own row; shards left intact

Recorded reasoning: the registry already carries `gdpr-art-5-1-a/-b/-c` as three separate shards, and those keys are referenced by shipping generators. Promoting the FULL Art. 5 (1,977 chars) as `gdpr-art-5` would put 5(1)(a)–(c) in the corpus **twice** — the exact duplication/drift risk the dispatch asked to avoid — and deprecating the shards would break live key lookups in an ingestion-only turn that is forbidden to touch engine code. **Chosen: promote 5(2) alone (`gdpr-art-5-2`, 119 chars).** No duplication, no engine breakage, accountability now citable.

Residual, recorded not silently accepted: 5(1)(d) accuracy, (e) storage limitation and (f) integrity and confidentiality remain unregistered. That is a pre-existing shape decision, not a regression introduced here; consolidating Art. 5 into one row with a shard-key migration is a proper engine turn and should be dispatched as one.

Typography note: the three legacy shards use ASCII apostrophes where the source uses U+2019; the new rows preserve the source's U+2019 verbatim. The pin test normalizes typography, so both forms pass.

## 5. Verbatim diff results — 12/12 EXACT

Every row this turn created or verified was whitespace-normalized and substring-matched against the **live EUR-Lex CELEX 32016R0679 consolidated text** fetched this turn:

```
gdpr-art-22  1289 TRUE     gdpr-art-37      1989 TRUE
gdpr-art-33  1734 TRUE     gdpr-art-38      1390 TRUE
gdpr-art-34  1649 TRUE     gdpr-art-39      1278 TRUE
gdpr-art-35  4410 TRUE     gdpr-recital-85  1188 TRUE
gdpr-art-5-2  119 TRUE     gdpr-recital-86   957 TRUE
gdpr-art-24   861 TRUE     gdpr-recital-87   643 TRUE
gdpr-art-36  2547 TRUE     gdpr-recital-88   608 TRUE
```

Promotions were additionally diffed against their `gdpr_articles` / `gdpr_recitals` source rows in SQL — match TRUE on all ten.

**No U.S./CA content:** every new row tested against `/(california|CCPA|CPPA|11 CCR|U\.S\.|United States)/i` — FALSE on all ten. The same check is a permanent negative pin in the test.

## 6. Pin test

`src/registry/__tests__/gdpr-registry-corpus-pin.test.ts` — **1/1 PASSED**. Pins:

- Art. 35(1) similar-processing sentence; Art. 35(7)(a)–(d) including "necessity and proportionality"
- Art. 33(1) 72-hour clause and risk carve-out; 33(3)(a)–(d) all four
- Art. 34(1) high-risk trigger; 34(2) Art. 33(3)(b)(c)(d) cross-reference
- Art. 22(1) sole-automated-decision right; 22(3) safeguards; 22(4) special-category bar
- Art. 5(2) "shall be responsible for, and be able to demonstrate compliance"
- Art. 24(1), 36(1), 37(1)(b), 37(5), 38(3), 39(1)(c); recitals 85–88
- **Length pins:** `gdpr-art-22` = 1,289 and `gdpr-art-34` = 1,649 (article-only, per §2)
- **Negative pin:** no US/CA jurisdiction bleed in any EU row

Two pin quotes were corrected during authoring after the first run failed — Art. 38(3) is "does not receive any instructions" (not "shall not receive"), Recital 87 is "have been implemented" (not "were implemented"). The corpus was **not** edited to fit the pins; the pins were corrected to the enacted text, per the authoring rule.

## 7. Double-check

- [x] Promotion-vs-fresh-ingest stated per row with source table + row id — 10/10 promotions, 0 fresh ingests.
- [x] Every excerpt diffed against its source table AND independently against live EUR-Lex CELEX 32016R0679 — 12/12 exact.
- [x] The two "P0 repairs" investigated rather than executed: both rows already complete; the reported deltas are next-section heading artifacts in `gdpr_articles`. Before/after lengths 1,289→1,289 and 1,649→1,649 (no-op), CELEX-confirmed complete.
- [x] No U.S./CA content in any EU row — verified by query and pinned negatively.
- [x] Files touched: this courier, `src/registry/__tests__/gdpr-registry-corpus-pin.test.ts` (new), `docs/pipeline-state.md`. Database writes confined to 10 INSERTs into `provision_texts`. No existing row modified or deleted. No engine code, no deploy, no harness invocation.

## 8. Open for controller

1. **`gdpr_articles` trailing section-heading artifact** — affects an unknown number of section-boundary articles in the source table. Needs its own cleanup turn.
2. **Art. 5 consolidation** — shard-vs-whole decision deferred; 5(1)(d)–(f) still unregistered.
3. **Item 291's P0 finding should be formally withdrawn** in the ledger record — it was a false positive produced by comparing against an artifact-bearing source.
