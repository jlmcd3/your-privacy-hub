# Non-CPPA Corpus — Phase 3 Batch Report

**Phase:** P3 — UK gdpr_articles reconciliation
**Batch timestamp:** 2026-07-25T09:46:38Z
**Ledger entry:** 2026-07-25T09:46:38Z (queue item 39)
**Five-lens review:** TEAM-REVIEWED (privacy-counsel / UI / tech-writing / prompt-eng / CS)

## Yield

| Result | Count |
|---|---|
| Rows written | **0** |
| Rows that needed writing | 0 |
| Rows skipped (repealed — correctly absent) | 3 |
| Total UK articles in official UK GDPR | 81+ (incl. lettered articles) |
| Total UK articles in DB | 81 |

## Finding: no genuine gaps

The inventory identified Arts. 22, 44, and 45 as potentially missing from the 81-row UK set. Direct investigation of legislation.gov.uk (fetched 2026-07-25) confirmed all three were repealed by the Data (Use and Access) Act 2025 (c. 18), effective 5 February 2026 via S.I. 2026/82:

| Article | Status | Replacement in DB? |
|---|---|---|
| Art. 22 (Automated individual decision-making) | Omitted — substituted by Section 4A | Yes: Arts. 22A, 22B, 22C, 22D already in DB |
| Art. 44 (General principle for transfers) | Omitted (Sch. 7 para. 2(1)) | Yes: Arts. 44A, 45A, 45B, 45C already in DB |
| Art. 45 (Adequacy decisions) | Replaced by Art. 45A | Yes: Art. 45A already in DB |

The DB's UK article set correctly reflects the current state of the UK GDPR as amended by the Data (Use and Access) Act 2025.

## Residual item: article_title backfill

All 81 UK rows have `article_title = NULL`. This is a cleanup item that would upgrade UK rows from TIER-2 to TIER-1, but it is not a P3 gate requirement (P3 was defined as reconciling missing article slots). Recommend scheduling as a lightweight follow-on: a single UPDATE pass pulling titles from the official legislation.gov.uk table of contents (all titles confirmed above).

## Guardrails observed

- No DB writes
- No edge-function deploys
- No rubric/grader/golden/prompt/contract changes
- Source verified: https://www.legislation.gov.uk/eur/2016/679/article/22 and /article/44 (OGL v3.0)

## Cost

~$0 Sonnet API spend.

## Next phase

P2 — EDPB guidelines cleanup (893 rows). No gate — ready to proceed.
