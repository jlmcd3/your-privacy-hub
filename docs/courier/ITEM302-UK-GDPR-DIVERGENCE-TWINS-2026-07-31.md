# ITEM 302 — CORPUS INGESTION: UK GDPR divergence twins

**Dispatch:** Controller, prompt 4 of 7 (INGESTION-PROMPTS-2026-07-31; launch order 1→7→2→3→4→5→6)
**Authority:** CEO corpus approval 2026-07-31. Items 298/299/300/301 complete and controller-verified.
**Date:** 2026-07-31
**Scope executed:** `provision_texts` rows tagged jurisdiction `UK` + this courier + ledger Item 302.
**Not touched:** engine code (0 edits), deploys (0), harness (0 invocations), `regulatory_guidance` (5 ICO rows, untouched), `gdpr_articles` (read-only).

---

## 1. Method

1. **Corpus-first discipline (per Item 300).** Queried `gdpr_articles` (jurisdiction `uk`) before any live fetch. All 11 Wave-3 target articles were already held with their own `legislation.gov.uk` URLs and `content_hash`.
2. **EU↔UK divergence diff.** Word-level `SequenceMatcher` opcode diff of stored `eu` vs stored `uk` body text for each target article.
3. **Live re-verification (required by dispatch).** Fetched `https://www.legislation.gov.uk/eur/2016/679/article/{N}/data.xml` (revision date **2026-06-22**, "Expert Participation" 2026-06-19) for all 13 candidate articles and computed token-level coverage of the stored UK text against the live extract. **Every promoted row is therefore diffed against legislation.gov.uk, not merely trusted from the corpus.**
4. **Fresh ingest** only where the corpus had no UK row and the live source carried operative text.

---

## 2. Divergence table

Legend: **PROMO** = promoted from `gdpr_articles`(uk), no live re-fetch needed for content (but live-verified); **FRESH** = live ingest from legislation.gov.uk, not previously in corpus.

| Article | Identical / Diverged | Evidence (EU → UK) | Live coverage of stored text | Action | Key |
|---|---|---|---|---|---|
| 5 | **DIVERGED** | Art. 5(1)(b) rewritten ("collected (whether from the data subject or otherwise) … by or on behalf of a controller … the purposes for which the controller collected the data"); Art. 89(1) safeguards clause replaced by bare cross-ref to **Art. 84B**; new closing sentence "For the avoidance of doubt, processing is not lawful by virtue only of being processing in a manner that is compatible with the purposes…" | 271/271 tokens (1.000) | PROMO | `ukgdpr-art-5` |
| 5(2) | **IDENTICAL in substance** to EU 5(2) | accountability sentence unchanged | verbatim within Art. 5 | PROMO (subsection row) | `ukgdpr-art-5-2` |
| 6 | **DIVERGED (major)** | New lawful basis **6(1)(ea) "recognised legitimate interest"** (Annex-conditioned); EU 6(1)(e) split into "a task of the controller carried out in the public interest or a task carried out in the exercise of official authority"; public-authority carve-out now reads "Points **(ea) and (f)**"; "Union law / Member State law" → **"domestic law or relevant international law (see section 9A of the 2018 Act)"**; EU 6(2)–(3) partly replaced by "…" omission markers; new children/child-protection weighing text and affirmative-resolution regulation-making power; illustrative LI examples added (intra-group administrative processing, network/information security) | 796/800 tokens (0.995; unmatched = two "…" omission markers) | PROMO | `ukgdpr-art-6` |
| 6(1)(f) | **DIVERGED** | body of (f) is substantively EU-identical, but the operative closing words differ ("Points (ea) and (f)…") — the UK LI basis cannot be quoted without the (ea) interaction | verbatim within Art. 6 | PROMO (subsection row) | `ukgdpr-art-6-1-f` |
| 24 | **DIVERGED (minor, textual)** | Art. 24(3): "an element by which to demonstrate" → **"a means of demonstrating"** (substituted 20.8.2025 by DUAA 2025 Sch. 11 para. 7; S.I. 2025/904 reg. 2(y)) | 127/127 tokens (1.000) | PROMO | `ukgdpr-art-24` |
| 30 | **DIVERGED** | Art. 30(1)(g) and 30(2)(d): security measures cross-ref extended to "**or, as appropriate, the security measures referred to in section 28(3) of the 2018 Act**"; Art. 30(4) "supervisory authority" → **"Commissioner"** | 452/452 tokens (1.000) | PROMO | `ukgdpr-art-30` |
| 33 | **DIVERGED** | Title: "…to the **Commissioner**"; "supervisory authority competent in accordance with Article 55" → **"Commissioner"** (Art. 55 has no UK analogue); 33(2) "to the supervisory authority" → "under this paragraph"; 33(5) "supervisory authority" → "Commissioner" | 259/259 tokens (1.000) | PROMO | `ukgdpr-art-33` |
| 34 | **DIVERGED** | Art. 34(4) "supervisory authority" → **"Commissioner"** | 267/267 tokens (1.000) | PROMO | `ukgdpr-art-34` |
| 35 | **DIVERGED (major)** | All "supervisory authority" → **"Commissioner"**; **Art. 35(4)–(6) EDPB/Board consistency machinery omitted** (rendered "…" / ".. …"); Art. 35(10) recast: "In the case of processing pursuant to point (c) or (e) of Article 6(1), paragraphs 1 to 7 of this Article do not apply if a DPIA … is **required by domestic law**, unless **domestic law provides otherwise**"; EU 35(11) review clause not carried in the same terms | 541/543 tokens (0.996) | PROMO | `ukgdpr-art-35` |
| 36 | **DIVERGED (major)** | 12× "supervisory authority" → **"Commissioner"**; EU 36(4) "Member States shall" → "**the relevant authority must**"; "a national parliament" → "**Parliament, the National Assembly for Wales, the Scottish Parliament or the Northern Ireland Assembly**"; **EU Art. 36(5) (Member-State prior-authorisation option) is NOT carried** — the UK text instead defines "the relevant authority" per devolved legislature (Secretary of State / Welsh Ministers / Scottish Ministers / NI department) | 438/440 tokens (0.995) | PROMO | `ukgdpr-art-36` |
| 37 | **DIVERGED** | 37(1)(a) "public authority or body, except for courts **and tribunals**"; 37(1)(c) conjunction "and" → "or"; EU 37(4) "or, where required by Union or Member State law shall," → "…" (omitted); 37(7) "supervisory authority" → "**Commissioner**" | 300/300 tokens (1.000) | PROMO | `ukgdpr-art-37` |
| 38 | **DIVERGED (minor)** | 38(5) "Union or Member State law" → "**domestic law**" | 219/219 tokens (1.000) | PROMO | `ukgdpr-art-38` |
| 39 | **DIVERGED** | 39(1)(a)/(b) "Union or Member State data protection provisions" → "**domestic law relating to data protection**"; 39(1)(d)/(e) "supervisory authority" → "**Commissioner**" | 187/187 tokens (1.000) | PROMO | `ukgdpr-art-39` |
| **22** | **DIVERGED — SUBSTITUTED (no Art. 22 in force)** | legislation.gov.uk renders Art. 22 as struck ("Article 22 . . . . . ."): *"Ch. 3 Section 4A substituted for Art. 22 (19.6.2025 for specified purposes, 5.2.2026 in so far as not already in force) by Data (Use and Access) Act 2025 (c. 18), ss. 80(1), 142(1)(2)(h); S.I. 2026/82, reg. 2(j) (with reg. 5)"* | live, HTTP 200, no operative text | **FRESH** (status row) | `ukgdpr-art-22` |
| **22A** | **FRESH — new UK-only provision** | defines "solely automated" (no meaningful human involvement) and "significant decision"; profiling as a factor | live verbatim | **FRESH** | `ukgdpr-art-22a` |
| **22B** | **FRESH — new UK-only provision** | prohibition where Art. 9(1) data is involved unless explicit consent or contract/law + Art. 9(2)(g); **bar on solely automated significant decisions taken in reliance on Art. 6(1)(ea)** | live verbatim | **FRESH** | `ukgdpr-art-22b` |
| **22C** | **FRESH — new UK-only provision** | mandatory safeguards: information, representations, human intervention, contest | live verbatim | **FRESH** | `ukgdpr-art-22c` |
| **22D** | **FRESH — new UK-only provision** | Secretary of State regulation-making powers over 22A/22C; affirmative resolution | live verbatim | **FRESH** | `ukgdpr-art-22d` |
| **44** | **DIVERGED — OMITTED (no Art. 44 in force)** | *"Art. 44 omitted (5.2.2026) by virtue of Data (Use and Access) Act 2025 (c. 18), s. 142(1), Sch. 7 para. 2(1); S.I. 2026/82, reg. 2(z9)"* | live, HTTP 200, no operative text | **FRESH** (status row) | `ukgdpr-art-44` |

**Result: ZERO `uk-mirror` rows.** The dispatch anticipated identical-in-substance articles warranting a mirror assertion. On the current consolidated text (revision 2026-06-22, post-DUAA 2025 commencement) **every Wave-3 article diverges** — at minimum by the Commissioner/domestic-law substitutions, and in four cases (5, 6, 35, 36) by operative content. Only Art. 5(2) is identical in substance, and it is carried as a subsection row inside a diverged parent article, so a standalone mirror row would have been misleading.

**Rows written: 19** (`ukgdpr-art-{5, 5-2, 6, 6-1-f, 24, 30, 33, 34, 35, 36, 37, 38, 39, 22, 22a, 22b, 22c, 22d, 44}`), all `jurisdiction='UK'`, `status='approved'`, `last_verified_at` = 2026-07-31. 13 promotions, 6 fresh ingests.

---

## 3. Item 291 ratification / correction

| Item 291 claim | Live check result | Verdict |
|---|---|---|
| Art. 6 UK 4,897 chars vs EU 4,114 | `gdpr_articles`: UK **4,897**, EU **4,114** (exact) | **RATIFIED** |
| Art. 9 UK 4,605 chars vs EU 4,404 | `gdpr_articles`: UK **4,605**, EU **4,404** (exact) | **RATIFIED** |
| "18 EU articles have NO UK twin, incl. 22 and 44" | True as a statement about **corpus contents**; the inference that these are corpus gaps is wrong. Live legislation.gov.uk returns HTTP 200 for both with **no operative text** — Art. 22 substituted by Ch. III Section 4A, Art. 44 omitted, both effective 5.2.2026 under DUAA 2025 | **CORRECTED** — these are *repeals in force*, not ingestion misses. The `ingest-gdpr-uk` function correctly captured nothing; the absence is legally faithful. |
| Art. 9 in scope for this wave | Not in the Wave-3 registry set for this dispatch; **not ingested** (char counts verified only for ratification purposes) | noted |

---

## 4. Art. 22 / Art. 44 scope determination (double-check demanded by dispatch)

The dispatch asked whether to skip these as speculative. Registry grep result:

- **Art. 22** is cited by `lia-verified-authorities.ts` (lines 179–183, "LI cannot itself authorise 22(1) decisions"), `governance-verified-authorities.ts` (lines 148–152), and `run-dpia-framework/index.ts` (WP248 criterion 2, rights table).
- **Art. 44** is cited by `ir-playbook-verified-authorities.ts` (lines 392–393) and `governance-verified-authorities.ts` (lines 387–388).

So they are **not** speculative — they are live citations in three of the four Wave-3 products. But the correct UK ingest is not a twin of the EU text: it is the **repeal record**. Ingesting UK "Art. 22" or "Art. 44" text would have manufactured provisions that do not exist in UK law. Both were therefore ingested as **status rows** carrying the verbatim legislation.gov.uk amendment note plus an explicit "no such Article in force" assertion, and the operative UK ADMT law (22A–22D) was ingested in full.

**Consequence flagged for the controller (no code touched this turn):** `lia-verified-authorities.ts` and `governance-verified-authorities.ts` assert an Art. 22(1) interplay that, for a UK-scoped assessment, is now Art. 22B(4) — which *prohibits* a solely automated significant decision made in reliance on the new recognised-legitimate-interest basis Art. 6(1)(ea). Likewise `ir-playbook-verified-authorities.ts` cites Art. 44 for UK transfer notification framing. These are registry-content defects to be resolved in a later engine turn, not here.

Separately: `ir-playbook-verified-authorities.ts` lines 451–453 enumerate `uk_gdpr_art_33_mirror` and `uk_gdpr_art_34_mirror` as "not in corpus". **Both are now in corpus** as `ukgdpr-art-33` / `ukgdpr-art-34`; that exclusion list is stale and should be revisited in the same later engine turn.

---

## 5. Hygiene assertions

- **No ICO commentary in `provision_texts`.** Verified by query: 0 rows in `provision_texts` whose citation or excerpt references the Information Commissioner's Office as a guidance publisher. Every UK row cites the consolidated statute at legislation.gov.uk only. (The word "Commissioner" appears inside UK statutory text — that is the enacted wording, not guidance.)
- **`regulatory_guidance` untouched:** 5 ICO rows, count unchanged before and after this dispatch.
- **No engine code edits, no deploys, no harness invocation.**
- **Omission markers preserved.** UK Arts. 6, 35, 36 carry "…" / ".. …" ellipses exactly as legislation.gov.uk renders omitted text. These are faithful to source, not truncation. Downstream renderers must not treat them as scrape defects.

---

## 6. Residual watch items (not actioned)

1. Wave-3 registries still cite EU Art. 22 / Art. 44 with no UK branch → registry turn required.
2. UK Art. 5(1)(e) cross-refers to **Art. 84B**, which is not in corpus (out of this dispatch's article set).
3. UK Art. 6(1)(ea) depends on the **Annex** of recognised legitimate interests, not in corpus.
4. UK Art. 9 (4,605 chars) is present in `gdpr_articles`(uk) but was not in this dispatch's Wave-3 set; promotable in one statement if the controller wants it.
