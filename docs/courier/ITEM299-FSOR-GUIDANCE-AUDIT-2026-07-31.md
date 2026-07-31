# Courier — ITEM 299: FSOR GUIDANCE-LAYER AUDIT + INGESTION (§§ 7120–7124, §§ 7220–7221)

**Dispatch:** ITEM 299 — prompt 7 of 7 of the CEO-approved INGESTION-PROMPTS-2026-07-31 inventory
**Executed:** 2026-07-31T05:20Z
**Kind:** corpus-only turn (`cppa_fsor_commentary` rows + courier + ledger). No engine code, no deploys, no harness invocation.
**Predicate:** Item 298 complete and controller-verified.

---

## 1. Source documents (title / URL / hash)

| Role | Title (PDF metadata) | URL | SHA-256 | Pages |
|---|---|---|---|---|
| FSOR body (the operative interpretive narrative) | **Final Statement of Reasons — CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations** (Author: CPPA; created 2025-09-23, modified 2025-09-30) | `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_and_uid.pdf` | `be2785fe763532707cf4b8ea4b418285113eb3b101dc7cfa0a0070708f46fa19` | 58 |
| FSOR Appendix A (comment/response) | Appendix A to the above | `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_appen_a.pdf` | `c2a79ee21ac2d1b2fb2d32cbf0a5771146185089af83674107c795991eec6da2` | 339 |

Both are linked from `https://cppa.ca.gov/regulations/ccpa_updates.html`. There is no standalone `…_fsor.pdf`; the body document is published as `…_fsor_and_uid.pdf` (FSOR + updated informative digest). Both fetched and hashed by the executor this turn. Appendix B (`…_fsor_appen_b.pdf`) was consulted for row provenance only; no rows written against it.

Extraction: `pdftotext -layout`, running headers/footers (`California Privacy Protection Agency Final Statement of Reasons` / `CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations   Page N of 58`) stripped for diffing only.

## 2. Coverage table — rows before → after

Counts are substring matches on the section number, split by whether the section appears as the row's **primary** `regulation_citation` or **only** in `related_citations`. (These exceed the controller baseline because the baseline counted exact-citation buckets; subsection-level primaries are included here.)

| Section | Primary rows BEFORE | Related-only rows BEFORE | Primary AFTER | Related-only AFTER | Ingested this turn |
|---|---|---|---|---|---|
| § 7120 | 6 | 9 | 6 | 9 | 0 |
| § 7121 | 14 | 7 | 14 | 7 | 0 |
| § 7122 | 37 | 14 | 37 | 14 | 0 |
| § 7123 | 98 | 18 | **103** | 18 | **5** |
| § 7124 | 21 | 9 | 21 | 9 | 0 |
| § 7220 | 58 | 15 | 58 | 15 | 0 |
| § 7221 | 105 | 18 | 105 | 18 | 0 |

Package/source split of the pre-existing corpus (whole table, 1,318 rows): Appendix A 523, Appendix B 195, FSOR body 198 + 123, 2023 FSOR 83, 2023 originals 166, DBR 15.

## 3. The specific gap the controller flagged — RESOLVED BY READING, NOT ASSUMED

**§ 7123(c)(9) (antivirus / anti-malware) — REAL ABSENCE, NO INGESTION WARRANTED.**
A full-text search of both the 58-page FSOR body and the 339-page Appendix A returns exactly **one** occurrence of "antivirus / anti-malware / antimalware" anywhere in the FSOR corpus (Appendix A, p. 87), and that passage is already ingested as row `a99195b0-d929-4bb4-892a-2f19cada832c`, primary-cited to § 7123(b)(2)(J) with `11 CCR § 7123(c)(9)` carried in `related_citations`. The Agency wrote no separate interpretive passage for the component under its final number: the component was carried forward unchanged, so the FSOR body's § 7123 walkthrough skips it entirely. **The related-citation row carries everything the FSOR says.** No dedicated row created — creating one would have required inventing text.

**§ 7123(c)(13) (cybersecurity education and training) — REAL GAP, INGESTED.**
The Agency *did* write a load-bearing passage (FSOR body p. 25) establishing that (c)(12) awareness and (c)(13) education-and-training are two distinct components. It was ingested only under the **superseded** numbering — row `e43c94ee-…` primary-cited to `11 CCR § 7123(b)(2)(M)`. An engine querying by final-text citation `11 CCR § 7123(c)(13)` never reached it.

## 4. Systemic defect found (the reason for all five ingests): SUPERSEDED-NUMBERING PRIMARIES

The FSOR body's § 7123 walkthrough labels each modified component by its **final** number with a "previously …" parenthetical. The existing ingest keyed those rows to the **previous** number. Result: five interpretive passages were unreachable by final-citation lookup — exactly the lookup shape the cyber registries use.

Remedy chosen: **additive**, not mutative. Five new rows created under the final-text citations, each carrying the superseded citation in `related_citations` so the historical rows are not orphaned. No existing row was modified or deleted.

### Rows created (all `fsor_package` = `CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR`, `source_url` = FSOR body)

| id | regulation_citation | page_ref | related_citations | Subject |
|---|---|---|---|---|
| `1c2f3d63-2a57-43bf-9996-8c3a99b8d389` | `11 CCR § 7123(c)(1)(B)` | p. 24 | (b)(2)(A)(ii), (c)(1) | "If the business uses passwords or passphrases" conditional applicability |
| `b2591357-1d1a-40b4-bc0c-b084e4778999` | `11 CCR § 7123(c)(3)(A)` | p. 25 | (b)(2)(D)(i), (c)(3) | "account" and "application" added to privileges/access |
| `c5e6516c-23cc-4210-ae84-2e6817e65eb7` | `11 CCR § 7123(c)(8)(A)` | p. 25 | (b)(2)(I)(i), (c)(8) | bot-/intrusion-detection and -prevention as examples |
| `fe92504b-9706-47fb-b14d-d1071d02e32d` | `11 CCR § 7123(c)(13)` | p. 25 | (c)(12), (b)(2)(M), (c) | awareness vs. education-and-training as distinct components |
| `42a7f0e3-cbcc-4cad-8560-8c4ee0b94ad5` | `11 CCR § 7123(c)(17)(A)` | p. 25 | (b)(2)(Q)(i), (c)(17) | "potentially" → "imminently"; NIST alignment; "personal" added |

**Verbatim diff:** every one of the five `agency_response` values was whitespace-normalized and substring-matched against the normalized FSOR body text — **5/5 EXACT MATCH**, curly quotation marks and em/en dashes preserved. Page refs were set from the PDF footer boundaries and cross-checked against the page refs on the sibling superseded-numbering rows (p. 24 / p. 25) — they agree.

## 5. Item 298 anchors — where their FSOR text lives now

- **Zero-trust deletion (FSOR body pp. 24–25):** already a row — `2bdc1b14-07da-47b1-9191-b5ef092c5806`, primary `11 CCR § 7123`, p. 25 ("Previous subsection (b)(2)(C): The Agency deleted the provision related to 'zero trust architecture' …"), plus `11 CCR § 7001` at p. 14 for the deleted definition. **No ingestion needed.** Note: the FSOR text attaches the deletion to *deleted* subsection (b)(2)(C), not to (c)(10); (c)(10) is segmentation, and its own primary row (`7bde9a4e-…`, Appendix p. 87) is intact. The Item 298 finding is corroborated, but the correct pinpoint for the zero-trust deletion is "previous (b)(2)(C)", not "(c)(10)".
- **(c)(12) vs (c)(13) distinction (FSOR body p. 25 / Appendix p. 87):** Appendix rows `03e13782-…` (primary (c)(12)) and `4dcde1e3-…` existed; the body passage was reachable only under (b)(2)(M). Now also reachable at `11 CCR § 7123(c)(13)` — row `fe92504b-…`. **Directly load-bearing for cyber output already shipping.**

## 6. Sections audited with NO ingestion, and why

- **§ 7120** — 6 primary rows, all Appendix A comment/response. The FSOR body contains **no "Amend § 7120" section at all**: § 7120 was not amended in the 15-day modifications, so the Agency wrote no body narrative for it. Threshold *intent* commentary lives in the Appendix rows (pp. 64–66) and in the § 7121 body discussion of the phase-in (pp. 19–20, which reference the § 7120 criteria). **Not a gap — an absence in the source.**
- **§ 7121, § 7122, § 7124** — the body walkthrough for these sections keeps the *current* numbering throughout (no renumbering occurred), and every paragraph is already represented (§ 7122 (a)–(j) at pp. 20–23; § 7124 (a)–(d) at pp. 26–27). No unreachable primaries found.
- **§ 7220** — 58 primary rows including body coverage of (a), (b)(2), (c)(1), (c)(5), (c)(5)(A), (c)(5)(B), (d), (d)(1)–(4). Pre-use notice reasoning (pp. 43–47) is fully represented. Renumbering here (previous (d)(x) → (e)(x)) exists but the *deleted* previous subsections are cited as deleted, and the surviving ones already carry final-number primaries.
- **§ 7221** — 105 primary rows including the significant-decision/opt-out narrative and the deletion of previous (b)(1). No unreachable final-number primaries found.

## 7. Deviations / notes for the controller

1. **`authority_weight` does not exist on `cppa_fsor_commentary`.** The dispatch instructed "authority_weight per the existing convention"; that column lives on `cppa_authorities`, not on this table. The commentary table's columns are `fsor_package, regulation_citation, related_citations, topic_tags, comment_summary, agency_response, page_ref, source_url, embedding, embedding_model, content_hash, agency_position_summary`. No weight recorded — nothing to record it in.
2. **`agency_position_summary` left NULL** on the five new rows. It is a derived field produced by the `backfill-fsor-summaries` function (an LLM pass), not a hand-authored field; authoring it by hand here would have been unsourced prose. The backfill picks up NULL rows on its next run. `embedding` likewise left NULL (populated by the embedding job).
3. **`content_hash`** set to a deterministic md5 of citation|source|page|topic, matching the "one row per interpretive passage" dedupe intent.
4. The controller's baseline counts (7120:6, 7121:14, 7122:33, 7123:84, 7124:21, 7220:45, 7221:84) are all *lower* than the audit's — the baseline appears to have counted exact-string buckets and missed rows whose primary citation is a deeper subsection. Re-verified independently; the audit numbers in §2 stand.

## 8. Double-check

- [x] Every new row page-cited and diffed against the FSOR PDF — 5/5 exact verbatim match.
- [x] Coverage table present, split by primary vs. related-citation coverage, before and after.
- [x] FSOR document title, URL and SHA-256 stated for both body and Appendix A.
- [x] (c)(9) and (c)(13) resolved by reading the rows and the FSOR, not by assumption — (c)(9) no dedicated commentary exists (coverage pattern documented); (c)(13) real gap, ingested.
- [x] Writes confined to `cppa_fsor_commentary` (5 INSERTs + a page-ref correction UPDATE on those same 5 rows). No other table, no existing row modified.
- [x] Files touched: this courier and `docs/pipeline-state.md`. No engine code, no deploys, no harness invocation.
