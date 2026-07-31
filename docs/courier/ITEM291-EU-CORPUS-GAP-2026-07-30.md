> ## ⛔ WITHDRAWN — SUPERSEDED BY ITEM 300 (annotated 2026-07-31, Item 304 Fix C)
>
> **Scope of the withdrawal:** the P0 "truncation" finding in this document —
> specifically the rows reading `Art. 22 | PRESENT BUT TRUNCATED` and
> `Art. 34 | PRESENT BUT TRUNCATED` (and any downstream "fix before Wave 3"
> framing that depends on them). **Nothing else in this courier is withdrawn.**
>
> **Why it was wrong.** The finding was produced by length-comparing the
> `provision_texts` rows `gdpr-art-22` / `gdpr-art-34` against the corresponding
> `gdpr_articles` (eu) rows. Those `gdpr_articles` rows themselves carried a
> **trailing next-section-heading artifact** — the following Section/Chapter
> heading block appended after the article's real end (Art. 22 carried
> `"\n\nSection 5\n\nRestrictions"`, +25 chars; Art. 34 carried
> `"\n\nSection 3\n\nData protection impact assessment and prior consultation"`,
> +69 chars). The `provision_texts` rows were never short; the comparison
> baseline was long. The apparent 25- and 69-character deficits are exactly the
> artifact lengths.
>
> **Independent confirmation.** Item 300 confirmed both `provision_texts` rows
> byte-identical to the live CELEX 32016R0679 text, and the controller
> independently confirmed the same. Item 304 Fix A then scanned **all 180
> `gdpr_articles` rows (99 `eu` + 81 `uk`)**, found the artifact on **21 EU rows**
> (0 UK rows), stripped it, and re-verified each corrected `body_text` against
> live CELEX. `provision_texts` was NOT touched by that fix — it was already
> clean.
>
> **Status:** finding withdrawn; root cause fixed at source (Item 304 Fix A);
> no repair to `provision_texts` was needed and none was made. The original
> text below is preserved unedited for the record — read the Art. 22 / Art. 34
> "TRUNCATED" rows as **FALSE POSITIVE**.

# ITEM 291 — EUROPEAN CORPUS GAP ANALYSIS (2026-07-30)


DOCS-ONLY. Executing the CEO's corpus authorization of 2026-07-30 (Item 289
ruling 5: "European corpus completion authorized, conditioned on CEO review of
the proposed ingestion inventory before start; no ingestion spend until he
approves the list"). NO code, NO deploy, NO harness invocation, NO ingestion
writes. Every figure below is a read-only `SELECT` against the Lovable Cloud
database, taken 2026-07-30T22:16–22:18Z.

---

## HEADLINE FINDING — THE GAP IS WIRING, NOT INGESTION

**The CEO is right: the full GDPR text is already ingested**, and considerably
more besides. The 20 approved EU rows in `provision_texts` are a hand-picked
20-row *registry slice* over a corpus that already holds the complete
Regulation, the complete recitals, and ten EDPB/WP29 guidance documents.

| Table | Rows | Coverage | Provenance (`source_url`) | Hash |
|---|---|---|---|---|
| `gdpr_articles` (jurisdiction `eu`) | **99** | Arts. 1–99 — the COMPLETE Regulation | 1 distinct URL: `https://publications.europa.eu/resource/celex/32016R0679` (EUR-Lex CELEX, authentic OJ text) | `content_hash` on 99/99 |
| `gdpr_articles` (jurisdiction `uk`) | **81** | UK GDPR as retained; 18 EU articles have no UK twin | 81 distinct URLs, `https://www.legislation.gov.uk/eur/2016/679/article/{n}` | `content_hash` on 81/81 |
| `gdpr_recitals` (jurisdiction `eu`) | **173** | Recitals 1–173 — COMPLETE | 1 distinct URL (same CELEX) | `content_hash` on 173/173 |
| `gdpr_recitals` (jurisdiction `uk`) | **0** | none | — | — |
| `edpb_guidelines` | **893 excerpts / 10 documents** | see §3 | official `edpb.europa.eu` / `ec.europa.eu` PDFs | `content_hash` on 893/893 |
| `regulatory_guidance` | **5** | ICO legitimate-interests guidance (UK), all `verification_status = verified` | `ico.org.uk` | `source_document_hash` column present |
| `national_provisions` | **0** | EMPTY — no member-state implementing law | — | — |
| `provision_texts` (jurisdiction `EU`) | **20 approved** | the registry slice under change control | — | `verbatim_excerpt` |

Tables searched for a full-text EU corpus (`information_schema.tables`,
`public`, name-matched on gdpr / article / recital / provision / edpb /
guidance / national / corpus / source): `gdpr_articles`, `gdpr_recitals`,
`edpb_guidelines`, `regulatory_guidance`, `national_provisions`,
`provision_texts`, `corpus_versions`, `corpus_drift_log`,
`corpus_field_history`, `corpus_extraction_errors`, `cppa_corpus_settings`,
`cppa_source_registry`, `primary_source_fetch_runs`, `source_document_cache`,
`article_image_pool`. No other schema holds EU legal text.

**Reconciliation: promotion is byte-safe.** For 13 of the 20 EU registry rows a
matching `gdpr_articles` row exists; `verbatim_excerpt = body_text` is TRUE for
**11 of 13** — Arts. 9, 13, 14, 25, 28, 30, 32, 33, 35, 44, 46 are byte-identical
between the registry and the CELEX corpus. Two diverge and are the only
reconciliation defects found:

| key | `provision_texts` len | `gdpr_articles` len | Δ |
|---|---|---|---|
| `gdpr-art-22` | 1,289 | 1,314 | −25 |
| `gdpr-art-34` | 1,649 | 1,718 | −69 |

Both registry rows are SHORTER than the authentic CELEX text — a truncated
excerpt, not a variant. Art. 34 is a live ir-playbook citation source. These two
are the highest-priority items in the plan below and cost no ingestion.

---

## TASK 2 — PER-PRODUCT GAP INVENTORY (Wave 3)

Evidence convention: PRESENT claims carry the `provision_texts.key` or
`table + row selector`; MISSING claims name the tables searched
(`gdpr_articles`, `gdpr_recitals`, `edpb_guidelines`, `regulatory_guidance`,
`national_provisions`, `provision_texts` — all six searched for every MISSING
line below).

### dpia

| Need | Status | Evidence |
|---|---|---|
| Art. 35 full text | **PRESENT, registry-wired** | `provision_texts.key = 'gdpr-art-35'`, 4,410 chars, `status=approved`; byte-identical to `gdpr_articles(eu,'35')` |
| Art. 35(1) similar-processing sentence — VERIFIED VERBATIM | **PRESENT** | The ingested row contains, at char 400 of `gdpr-art-35`: *"A single assessment may address a set of similar processing operations that present similar high risks."* Confirmed in BOTH the registry row and the CELEX row. (The dispatch's lower-case probe returned 0 only because the sentence begins with a capital "A".) |
| Art. 35(3)(a)–(c) trigger list | **PRESENT** | same row, `'systematic and extensive evaluation'` at char 767 |
| Art. 36 (prior consultation) | **PRESENT in corpus, NOT in registry** | `gdpr_articles(eu,'36')` "Prior consultation", 2,583 chars, hashed. No `provision_texts` key → **promotion item** |
| Art. 5 principles | **PARTIAL in registry** | `gdpr-art-5-1-a/-b/-c` only (129 / 398 / 131 chars). Full Art. 5 is in `gdpr_articles(eu,'5')`, 1,977 chars |
| Art. 5(2) accountability | **PRESENT in corpus, NOT in registry** | `"2. The controller shall be responsible…"` at char 1,859 of `gdpr_articles(eu,'5')`; `'accountability'` at char 1,961. No registry key → **promotion item** |
| Art. 5(1)(d)–(f) | **NOT in registry** | in `gdpr_articles(eu,'5')` only |
| WP248 rev.01 nine criteria (guidance layer) | **PRESENT** | `edpb_guidelines.guideline_ref = 'WP248 rev.01'`, 46 hashed excerpts, adopted 2017-10-04, `ec.europa.eu/newsroom/just/document.cfm?doc_id=47711`. Criterion text verified present, incl. *"Matching or combining of datasets. - Sensitive data or data of a highly personal nature"*, evaluation/scoring, systematic monitoring, large scale, vulnerable data subjects, innovative use, and the *"the more criteria are met… the more likely"* rule |
| `gdpr-art-9-1` already cites WP248 criterion 4 | **CONFIRMED** | `provision_texts.citation` = *"GDPR Art. 9(1) (special categories of personal data); EDPB WP248 rev.01 criterion 4 (sensitive data)"* — the citation is now backed by an ingested source and can be hash-gated |
| Art. 9(2)(j) / Art. 89 research route | **registry key exists** | `gdpr-art-9-2-j`, 428 chars; Art. 89 full text in `gdpr_articles(eu,'89')`, 1,892 chars, not registry-wired |

**dpia verdict: ZERO ingestion required.** Every dpia need is already in the
database. The work is promotion + hash-gating + pin tests.

### lia

| Need | Status | Evidence |
|---|---|---|
| Art. 6(1)(f) | **PRESENT** | `provision_texts.key='gdpr-art-6-1-f'`, 458 chars, approved |
| Recital 47 | **PRESENT** | `provision_texts.key='gdpr-recital-47'`, 1,656 chars, approved |
| Full Art. 6 | **PRESENT in corpus** | `gdpr_articles(eu,'6')`, 4,114 chars |
| EDPB legitimate-interest guidance | **PRESENT — the dispatch's "missing" is stale** | `edpb_guidelines.guideline_ref = 'EDPB Guidelines 1/2024'` — *"Guidelines 1/2024 on processing of personal data based on Article 6(1)(f) GDPR (legitimate interests)"*, adopted 2024-10-08, **109 hashed excerpts**, official EDPB PDF |
| CJEU three-part-test formulation source | **PRESENT inside 1/2024** | excerpt: *"This assessment should follow the three-step process outlined below, although in some circumstances the examinations of the second and third conditions may merge…"*; 10 excerpts carry CJEU/Court-of-Justice references incl. *"CJEU, judgment of 4 July 2023, Case C-252/21, Meta v Bundeskartellamt (ECLI:EU:C:2023:537), para. 121"*. **Gap is a `guidance_refs` WIRING gap, not an ingestion gap.** A separate primary-source row for *Rīgas satiksme* (C-13/16) is optional and is the only genuinely new lia ingestion candidate |
| ICO legitimate-interests (UK twin) | **PRESENT** | 5 `regulatory_guidance` rows, regulator `ICO`, jurisdiction `UK`, all `verified` |

### ir-playbook

| Need | Status | Evidence |
|---|---|---|
| Art. 33 | **PRESENT** | `provision_texts.key='gdpr-art-33'`, 1,734 chars, byte-identical to CELEX |
| Art. 34 | **PRESENT BUT TRUNCATED** | `gdpr-art-34` is 1,649 chars vs CELEX 1,718 — **69 chars short. Defect, fix before Wave 3** |
| Recitals 85–88 | **PRESENT in corpus, NOT in registry** | `gdpr_recitals(eu)` holds recitals 1–173 complete, all hashed → **promotion item, no ingestion** |
| EDPB breach-notification guidelines | **PRESENT — the dispatch's "missing" is stale** | `edpb_guidelines.guideline_ref = 'EDPB Guidelines 9/2022'`, *"Guidelines 9/2022 on personal data breach notification under GDPR"*, adopted 2023-03-28, **74 hashed excerpts** |
| Member-state deadline schedule sources | **GENUINELY MISSING** | `national_provisions` is **EMPTY (0 rows)**; no member-state row in `gdpr_articles`, `regulatory_guidance`, or `provision_texts`. This is the ONLY confirmed raw-ingestion need in the entire EU inventory |

### governance

| Need | Status | Evidence |
|---|---|---|
| Art. 30 | **PRESENT** | `provision_texts.key='gdpr-art-30'`, 2,907 chars, byte-identical |
| Art. 24 | **PRESENT in corpus, NOT in registry** | `gdpr_articles(eu,'24')` "Responsibility of the controller", 861 chars |
| Arts. 37 / 38 / 39 (DPO) | **PRESENT in corpus, NOT in registry** | `gdpr_articles(eu,'37')` 1,989 / `('38')` 1,390 / `('39')` 1,325 chars, all hashed |
| Art. 5(2) | **PRESENT in corpus, NOT in registry** | as above |

### Cross-cutting — UK GDPR divergences

UK twins EXIST for every governance/dpia/ir-playbook/lia article named above:
`gdpr_articles(uk)` holds 5, 6, 9, 13, 14, 24, 25, 28, 30, 32, 33, 34, 35, 36,
37, 38, 39, 46 — each with its own `legislation.gov.uk` URL and hash. UK text
differs materially from EU text (e.g. Art. 6 UK 4,897 vs EU 4,114 chars; Art. 9
UK 4,605 vs EU 4,404) — the retained-law amendments, so a UK twin row is a
genuine registry requirement, not a duplicate.

**UK twins ABSENT (18 EU articles with no UK row):** 22, 44, 45, 48, 53–56,
59–76, 81, 87–93, 97–99. Of these, only **Art. 22** (ADMT) and **Art. 44**
(transfers) are Wave-3 relevant → 2 UK ingestion rows from
`legislation.gov.uk/eur/2016/679/article/{22,44}`.

**UK recitals: 0 rows.** If any UK surface cites a recital, the UK recital set
is a second ingestion need. No Wave-3 product currently requires it.

### VERIFY-FIRST backlog mined from `quality_loop2_results`

| product | rows | rows whose recommendation names a verification / citation / source / statute defect |
|---|---|---|
| ir-playbook | 11 | **11** (avg score 97.92) |
| governance | 10 | **10** (96.21) |
| lia | 10 | 7 (97.65) |
| dpia | 9 | 7 (95.61) |

Representative flags, verbatim from `recommendation`:

- **dpia** — *"The risk assessment methodology mentions 'WP248 rev.01 informs the risk factors to assess,' but WP248 rev.01 is not a risk assessment framework"* (`fix_location: section_4_risk_management`) and *"mentions 'EDPB WP248 rev.01' but does not specify that it refers to the EDPB Guidelines on DPIA"*. Both are cured by wiring the ingested WP248 title/excerpts as a `guidance_ref` instead of a bare label.
- **dpia** — *"The statement 'Article 35(3)(c) does not apply — this is online-platform monitoring of registered users, not systematic monitoring of a publicly acc…'"* (`fix_location: dpia_metadata.article_35_3_trigger`): an Art. 35(3) reading defect, curable against the ingested verbatim row.
- **governance** — repeated CALIFORNIA citations inside an EU/UK governance surface: *"Cal. Civ. Code § 1798.82 concerns breach notification, not vendor contract requirements"*, *"The citation '11 CCR § 7001(e)' … is a California Privacy Protection Agency (CPPA) regulation"*. Per this dispatch **NO U.S./CA material may serve any role in the EU corpus**; these are recorded as an EU-registry-wiring defect for governance (the tool is reaching for CA rows because no EU Art. 24/37–39/5(2) registry key exists to reach for).
- **governance** — *"the parenthetical gloss for GDPR Art. 33(2) states the processor must notify 'without undue delay' and then describes when the controller's 72-hour…"*: cured by hash-gated Art. 33 verbatim (already present).
- **ir-playbook** — flags cluster on record-facts (affected-individual counts, processor-notification steps), not on corpus absence.

---

## TASK 3 — PROPOSED INGESTION / PROMOTION PLAN

Priority key: **P0** = defect on a shipped citation; **P1** = Wave-3 blocking;
**P2** = Wave-3 quality; **P3** = optional.

| # | Row key | Source | Hash-gate feasible? | Pin-test candidate | Product(s) | Pri |
|---|---|---|---|---|---|---|
| 1 | `gdpr-art-34` (REPAIR) | `gdpr_articles(eu,'34')` CELEX | YES — replace with byte-identical body_text | 40-char verbatim substring of the restored tail; length pin 1,718 | ir-playbook | **P0** |
| 2 | `gdpr-art-22` (REPAIR) | `gdpr_articles(eu,'22')` CELEX | YES | length pin 1,314 + verbatim substring | dpia, admt-EU | **P0** |
| 3 | `gdpr-art-5` (full, replacing/complementing the three 5(1) shards) | `gdpr_articles(eu,'5')` | YES | pin the 5(2) accountability sentence at a verbatim substring | dpia, governance | **P1** |
| 4 | `gdpr-art-36` | `gdpr_articles(eu,'36')` | YES | "prior consultation" verbatim substring | dpia | **P1** |
| 5 | `gdpr-art-24` | `gdpr_articles(eu,'24')` | YES | verbatim substring | governance | **P1** |
| 6 | `gdpr-art-37` / `-38` / `-39` | `gdpr_articles(eu,'37'/'38'/'39')` | YES | one substring pin per row | governance | **P1** |
| 7 | `gdpr-recital-85` … `-88` | `gdpr_recitals(eu, 85–88)` | YES | 40-char pin per recital | ir-playbook | **P1** |
| 8 | `guidance-wp248-rev01` (guidance_ref, not a provision) | `edpb_guidelines('WP248 rev.01')`, 46 excerpts | YES — `content_hash` present on all 46 | nine-criteria enumeration pin | dpia | **P1** |
| 9 | `guidance-edpb-01-2024` | `edpb_guidelines('EDPB Guidelines 1/2024')`, 109 excerpts | YES | three-step-process excerpt pin | lia | **P1** |
| 10 | `guidance-edpb-09-2022` | `edpb_guidelines('EDPB Guidelines 9/2022')`, 74 excerpts | YES | breach-notification excerpt pin | ir-playbook | **P1** |
| 11 | `guidance-ico-legitimate-interests` (UK) | `regulatory_guidance`, 5 verified ICO rows | PARTIAL — `source_document_hash` populated per row; ICO pages are living HTML, so gate on stored hash + drift alert | ICO three-part-test pin | lia (UK) | **P2** |
| 12 | UK twins for the promoted set (5, 24, 30, 33, 34, 35, 36, 37–39) | `gdpr_articles(uk,…)`, already ingested | YES | per-row divergence pin (UK ≠ EU length) | all four | **P2** |
| 13 | UK Art. 22 + Art. 44 | **NEW INGESTION** `legislation.gov.uk/eur/2016/679/article/{22,44}` | YES on fetch | length + verbatim pin | dpia/admt-EU, transfers | **P2** |
| 14 | Member-state breach-deadline schedule | **NEW INGESTION** into the empty `national_provisions` | YES per source document | one deadline pin per member state ingested | ir-playbook schedule surface | **P2** |
| 15 | CJEU *Rīgas satiksme* C-13/16 as a standalone primary source | **NEW INGESTION** (curia.europa.eu) | YES | three-part-test paragraph pin | lia | **P3** |
| 16 | UK recitals | **NEW INGESTION** | YES | — | none today | **P3** |
| 17 | Remaining 79 EU articles as registry keys | already ingested | YES | — | none today | **P3** |

**Cost shape.** Items 1–12 (P0–P2, twelve of seventeen lines) require **NO
ingestion spend at all** — they are promotion, hash-gating, and pin tests over
rows already in the database with hashes already computed. Only items 13, 14,
15, 16 involve fetching new material, and only item 14 (member-state deadlines)
is Wave-3 blocking.

**Estimated turn count**

| Stage | Content | Turns |
|---|---|---|
| A | Items 1–2 (P0 truncation repairs) + pin tests | 1 |
| B | Items 3–7 (EU provision promotions) + pin tests | 2 |
| C | Items 8–10 (guidance-ref wiring layer) + pin tests | 2 |
| D | Item 12 (UK twins) + item 11 (ICO) + divergence pins | 2 |
| E | Item 13 (UK 22/44 fetch) | 1 |
| F | Item 14 (member-state deadlines — scope depends on how many states the CEO wants) | 2–4 |
| G | Items 15–17 if authorized | 1–2 |
| | **Total P0–P2 (A–F)** | **8–10 turns** |

**NO U.S./CA MATERIAL IN ANY ROLE.** No CCPA/CPPA row appears in any line of
this plan. The 12 `provision_texts` rows with `jurisdiction = 'US-CA'` (7 of
which are `status = 'pending'` with empty text) are out of scope for the EU
corpus and are NOT to be used as fallback sources for EU/UK surfaces — the
governance VERIFY-FIRST flags above show the tool doing exactly that today, and
the EU registry promotions are the cure.

---

## DOUBLE-CHECK

- Every PRESENT claim above carries either a `provision_texts.key` or a
  `table + row selector` with a length and, where relevant, a hash or a verbatim
  substring.
- Every MISSING claim was checked against all six candidate tables
  (`provision_texts`, `gdpr_articles`, `gdpr_recitals`, `edpb_guidelines`,
  `regulatory_guidance`, `national_provisions`). Only three MISSING claims
  survived: member-state deadline sources, UK Arts. 22/44, and a standalone
  CJEU row.
- Three "missing" items named in the dispatch are in fact PRESENT and are
  corrected above: EDPB legitimate-interest guidance (1/2024), EDPB
  breach-notification guidelines (9/2022), and the CJEU three-part-test
  formulation (inside 1/2024).
- Read-only. No `INSERT`/`UPDATE`/`DELETE`, no migration, no deploy, no harness
  invocation. Diff limited to this courier and `docs/pipeline-state.md`.
