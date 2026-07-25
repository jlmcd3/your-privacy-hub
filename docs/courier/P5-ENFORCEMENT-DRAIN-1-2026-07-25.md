# P5-ENFORCEMENT-DRAIN-1 — 2026-07-25

Dispatch ID: `P5-ENFORCEMENT-DRAIN-1-2026-07-25`
Controller tick: 2026-07-25T15:20Z
Landed: 2026-07-25T15:22:29Z
Team-reviewed: five-lens (scope / guardrails / evidence / reporting / dedup).

## 1. Scope & Guardrails

- Database writes limited to `enforcement_actions` verification columns: `verification_status`, `verification_last_run_at`, `verification_deterministic_pass`, `verification_paraphrase_confidence`.
- No substantive fields (violation, fines, dates, provisions, summaries) rewritten. `memo_eligible` untouched.
- No edge-function edits, no deploys, no prompt/rubric/grader/golden/contract/fixture/sample/registry edits. Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) remains FROZEN.
- CEO integrity directive respected: no row promoted to `verified` without primary-source substring grounding in `source_document_text`. All `source_document_text` NULL / trivially short (< 200 chars) rows left as `requires_review` with reason `unsourced-blocked`.
- Quality wave 23 (`quality_batch_runs 4bf2fd2b`, running since 15:15:02Z) not touched.

## 2. Batch Selection (deterministic)

Exact SQL (matches dispatch spec):

```sql
SELECT id
FROM enforcement_actions
WHERE verification_status = 'requires_review'
ORDER BY breach_related DESC NULLS LAST,
         dpa_related DESC NULLS LAST,
         biometric_related DESC NULLS LAST,
         tool_relevance DESC NULLS LAST,
         id
LIMIT 100;
```

Pre-batch pool: **2,260** `requires_review` rows.

Per-priority-flag breakdown for the 100-row batch:
- `breach_related=true`: 100
- `dpa_related=true`: 77
- `biometric_related=true`: 5
- non-empty `tool_relevance`: 91

## 3. Sourced vs Unsourced (batch)

- Rows with `source_document_text` present (≥ 200 chars): **11**
- Rows unsourced (NULL or < 200 chars): **89** → left `requires_review`, reason `unsourced-blocked`

## 4. Per-Row Deterministic Checks (11 sourced)

For each sourced row, `regulator`, `decision_date`, `fine_amount`/`original_amount`, and each entry in `statutory_provisions` were substring-matched (with normalized spelling, EU-style thousands separators `.` / `,` / space, and article-token variants) against `source_document_text`. Provisions match reduces to the article number (e.g. `GDPR Article 33` → `art(?:icolul)? 33`), the tier used in `docs/courier/NONCPPA-CORPUS-INVENTORY-2026-07-25.md` for row-grounded verification.

Verdict rules:
- All fields grounded (regulator ∧ date ∧ fine ∧ 100% of listed provisions found) ⇒ `verified` / `deterministic_pass=true`.
- Material contradiction with source ⇒ `failed` / `deterministic_pass=false` (substantive field not edited).
- Partial / ambiguous ⇒ leave `requires_review`, record reason `partial`.

| id | regulator | date | fine | reg | date | fine | provisions | verdict |
|---|---|---|---|---|---|---|---|---|
| 250cec8f | ANSPDCP | 2025-09-25 | 20,000 | ✓ | ✓ | ✓ | 2/2 | **verified** |
| 3b4e1848 | ANSPDCP | 2025-10-20 | 5,000  | ✓ | ✓ | ✓ | 3/3 | **verified** |
| 3fce005f | ANSPDCP | 2025-01-31 | 15,000 | ✓ | ✓ | ✓ | 3/3 | **verified** |
| 41432c90 | ANSPDCP | 2021-11-01 | 5,000  | ✓ | ✓ | ✓ | 4/4 | **verified** |
| 48e14502 | AEPD    | 2022-12-29 | 1,200,000 | ✓ | ✓ | ✗ | 0/5 | partial |
| 5908a094 | ANSPDCP | 2025-07-09 | 3,000  | ✓ | ✓ | ✓ | 2/2 | **verified** |
| 62c38c24 | FTC     | —          | —       | ✓ | n/a | n/a | 0/3 | partial |
| 9d5b1401 | FTC     | —          | —       | ✓ | n/a | n/a | 0/2 | partial |
| adcea81c | ANSPDCP | 2024-07-23 | —       | ✓ | ✓ | n/a | 3/3 | **verified** |
| c4f5c7c9 | ANSPDCP | 2025-02-04 | 10,000 | ✓ | ✓ | ✗ | 5/5 | partial |
| fe3e3b8c | AEPD    | 2023-03-03 | 3,200,000 | ✓ | ✗ | ✗ | 0/11 | partial |

**Zero material contradictions** — no `failed` demotions this batch. Partial rows kept `requires_review`; source-text formatting differs from stored value in a way the current substring rule cannot resolve (e.g. AEPD PDFs render "3.200.000 EUR" but stored comma-separated variant not exact; FTC summary texts do not include statutory article strings in `Section N` form). Reason bucket recorded: `partial`.

## 5. Outcome Counts

- **verified**: 6
- **failed**: 0
- **left requires_review**:
  - `unsourced-blocked`: 89
  - `partial`: 5
- Batch size: 100
- Remaining `requires_review` in `enforcement_actions` post-batch: **2,254** (verified: 2260 → 2254).

## 6. Evidence — Sample Promotions (byte-exact quoted substrings)

Each excerpt is a verbatim substring of `enforcement_actions.source_document_text`; ellipses (`...`) mark truncation to a ±100/150-char window around the matched token.

### 250cec8f-2b9e-42eb-97e8-32bb323815d0 — ANSPDCP · 2025-09-25 · EUR 20,000
- fine: `...operatorul a fost sancționat contravențional cu amendă în cuantum de 101.544 lei, echivalentul sumei de 20.000 euro, conform cursului BNR din data aplicării sancțiunii...`
- date: `...ANSPDCP Politica Cookie 25.09.2025 O nouă sancțiune aplicată pentru încălcarea GDPR...`

### 3b4e1848-65b9-4ddd-b414-ff6c2604519d — ANSPDCP · 2025-10-20 · EUR 5,000
- fine: `...operatorul a fost sancționat contravențional cu amendă în cuantum de 25392 lei (echivalentul a 5.000 de EURO)...`
- date: `...ANSPDCP Politica Cookie 20.10.2025 Sancțiune pentru încălcarea RGPD...`

### 3fce005f-91f2-458f-aaa9-2fd28b754110 — ANSPDCP · 2025-01-31 · EUR 15,000
- fine: `...operatorul a fost sancționat cu amendă în cuantum de 74.562 Lei (echivalentul sumei de 15.000 Euro)...`
- date: `...Comunicat_Presa_31.01.2025_1 Autoritatea Naţională de Supraveghere...`

### 41432c90-25b8-4d16-a665-d899535976f3 — ANSPDCP · 2021-11-01 · EUR 5,000
- fine: `...amendă în cuantum de 24.739,50 lei, echivalentul a 5.000 EURO , pentru încălcarea dispozițiilor art. 32 alin. (1) lit. b) și alin. (2) din RGPD...`
- date: `...ANSPDCP Politica Cookie 01.11.2021 Sancțiune pentru încălcarea RGPD...`

### 5908a094-690c-4b70-8b9a-32a6a587c7f5 — ANSPDCP · 2025-07-09 · EUR 3,000
- fine: `...SC Tremend Software Consulting SRL a fost sancționată cu amendă în cuantum de 15.161,10 lei, echivalentul a 3.000 EURO...`
- date: `...ANSPDCP Politica Cookie 09.07.2025 Sancțiune pentru încălcarea RGPD...`

### adcea81c-fefd-4e36-8307-e5409a4b21a7 — ANSPDCP · 2024-07-23 · (no fine field)
- date: `...Comunicat_Presa_23.07.2024 Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal...`
- provisions (all three articles cited in source): `Art. 83(4)`, `Art. 83(5)`, `Art. 83(7)` matched via article-number substring.

## 7. Failed Demotions

**None this batch.** No source-vs-stored material contradiction observed. Only `unsourced-blocked` and `partial` bucket rows retained `requires_review`.

## 8. Write

```sql
UPDATE enforcement_actions
SET verification_status='verified',
    verification_deterministic_pass=true,
    verification_last_run_at=now(),
    verification_paraphrase_confidence='not_run'
WHERE id IN (
  '250cec8f-2b9e-42eb-97e8-32bb323815d0',
  '3b4e1848-65b9-4ddd-b414-ff6c2604519d',
  '3fce005f-91f2-458f-aaa9-2fd28b754110',
  '41432c90-25b8-4d16-a665-d899535976f3',
  '5908a094-690c-4b70-8b9a-32a6a587c7f5',
  'adcea81c-fefd-4e36-8307-e5409a4b21a7'
);
```

`verification_paraphrase_confidence` set to `'not_run'` (not `'deterministic_only'`) — table constraint `enforcement_actions_paraphrase_confidence_chk` allows only `{high, medium, low, not_run, failed}`; paraphrase pass was not executed this turn, so `'not_run'` is the accurate value. `verification_deterministic_pass=true` carries the deterministic signal.

Post-write verification: `SELECT count(*) FROM enforcement_actions WHERE verification_status='requires_review'` → **2,254** (was 2,260).

## 9. Files touched this turn

- `docs/courier/P5-ENFORCEMENT-DRAIN-1-2026-07-25.md` (new — this file)
- `docs/pipeline-state.md` (ledger item + header restamp)
- Database: 6 UPDATEs on `enforcement_actions` (verification-only columns).

Nothing else.
