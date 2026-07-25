# Non-CPPA Corpus — Phase 1 Batch Report

**Phase:** P1 — provision_texts EU bootstrap  
**Batch timestamp:** 2026-07-25T09:25:45Z (writes applied)  
**Ledger entry:** 2026-07-25T09:36:39Z (queue item 38)  
**Controller:** ingestion-controller (interactive session)  
**Five-lens review:** privacy counsel / UI / tech writing / prompt engineering / CS — TEAM-REVIEWED  

---

## Yield summary

| Result | Count |
|---|---|
| Accepted (pin-test passed, written, verified) | **19** |
| Failed acceptance check | 0 |
| Stuck / no source text | 0 |
| **Total EU rows in scope** | **19** |

---

## Acceptance check

- **Method:** deterministic normalized-substring pin-test in sandbox Python. `re.sub(r'\s+', ' ', verbatim_excerpt).strip()` must be a substring of `re.sub(r'\s+', ' ', gdpr_articles.body_text).strip()` for the cited article.  
- **Result:** 19/19 passed before any write was applied.  
- **Source:** `gdpr_articles.body_text` (jurisdiction='eu') — EUR-Lex verbatim text already in corpus; no external fetch.

---

## Rows written

| Key | Citation | Excerpt scope | Excerpt len (chars) |
|---|---|---|---|
| gdpr-art-5-1-a | GDPR Art. 5(1)(a) | Art 5(1)(a) sub-point only | 129 |
| gdpr-art-5-1-b | GDPR Art. 5(1)(b) | Art 5(1)(b) sub-point only | 398 |
| gdpr-art-5-1-c | GDPR Art. 5(1)(c) | Art 5(1)(c) sub-point only | 131 |
| gdpr-art-6-1-f | GDPR Art. 6(1)(f) | Art 6(1)(f) + public-authority exclusion sentence | 458 |
| gdpr-art-9 | GDPR Art. 9 | Full Art 9 (paras 1-4) | 4404 |
| gdpr-art-9-1 | GDPR Art. 9(1) | Art 9(1) prohibition sentence only | 367 |
| gdpr-art-9-2-j | GDPR Art. 9(2)(j) | Art 9(2)(j) research/archiving exception only | 428 |
| gdpr-art-13 | GDPR Art. 13 | Full Art 13 (paras 1-4) | 3158 |
| gdpr-art-14 | GDPR Art. 14 | Full Art 14 (paras 1-5) | 4584 |
| gdpr-art-22 | GDPR Art. 22 | Art 22(1)-(4) — automated decision-making | 1289 |
| gdpr-art-25 | GDPR Art. 25 | Full Art 25 (paras 1-3) | 1463 |
| gdpr-art-28 | GDPR Art. 28 | Full Art 28 (paras 1-10) | 5516 |
| gdpr-art-30 | GDPR Art. 30 | Full Art 30 (paras 1-5) | 2907 |
| gdpr-art-32 | GDPR Art. 32 | Full Art 32 (paras 1-4) | 1811 |
| gdpr-art-33 | GDPR Art. 33 | Full Art 33 (paras 1-5) | 1734 |
| gdpr-art-34 | GDPR Art. 34 | Art 34(1)-(4) — subject notification | 1649 |
| gdpr-art-35 | GDPR Art. 35 | Full Art 35 (paras 1-11) | 4410 |
| gdpr-art-44 | GDPR Art. 44 | Full Art 44 (single paragraph) | 667 |
| gdpr-art-46 | GDPR Art. 46 | Full Art 46 (paras 1-5) | 2594 |

---

## Fields set per row

- `verbatim_excerpt`: exact text from `gdpr_articles.body_text` (sub-provision or full article as appropriate)
- `plain_requirements`: JSONB `{"requirements": [...]}` with 2–7 plain-English obligation statements per provision
- `status`: `approved`
- `approved_by`: `02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`
- `last_verified_at`: `2026-07-25T09:25:45Z`

---

## Guardrails observed

- No external fetch (all source text from `gdpr_articles.body_text` already in DB)
- No US-CA rows touched (permanently out of scope)
- No edge-function deploys, no rubric/grader/golden/prompt/contract/sample-fixture changes
- No CPPA-table writes
- No run-* functions touched
- All writes via Lovable query_database (project 75bce9a1-c7dc-4628-aea5-12baa2e26bf2) per CEO standing order

---

## Cost

~$0 Sonnet API spend. Extraction ran in sandbox Python from already-retrieved DB text. No Sonnet API calls were required for Phase 1.

---

## Next phases (per sequence)

| Next | Phase | Gate |
|---|---|---|
| P3 | UK gdpr_articles reconciliation (3 missing slots) | Ready — no gate |
| P2 | EDPB guidelines cleanup (893 rows) | After P1 done ✓ |
| P5 | enforcement_actions verification drain (~100-row batches) | Eligibility-bar ruling (deferred) |
| P4 | national_provisions — Member-State derogations | CEO scope confirmation (UK/DE/FR/IE/ES) |
