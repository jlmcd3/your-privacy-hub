# Courier — T5-CPPA-SUBDIVISION-INGESTION-7220-7221

**Dispatch:** T5-CPPA-SUBDIVISION-INGESTION-7220-7221
**Controller tick:** 2026-07-26T01:37:00Z
**Kind:** corpus-only turn (no code, no deploys, no instrument/rubric/grader/registry/golden/contract/fixture/sample changes)
**Instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN)
**Discharges:** ingestion obligation released by ledger item 95 (CPPA CORPUS INGESTION HOLD)
**Ledger item:** 102 (see ledger-numbering note below)

---

## 1. Goal

Populate and approve `provision_texts` rows `cppa-7220` (Pre-use Notice Requirements) and `cppa-7221` (Requests to Opt-Out of ADMT) — previously `status='pending'` with `verbatim_excerpt=''` since 2026-07-13 — with OAL-approved verbatim text and per-subdivision plain-language requirement lists. Mirror the item 42/43 pattern (cppa-7150 / cppa-7121).

## 2. Primary source

- URL: `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf`
- SHA-256: `7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650`
- **Hash match:** IDENTICAL to the SHA-256 recorded in ledger items 42/43 for the same OAL-approved PDF. No re-stamp; text of record unchanged.

## 3. Extraction method

- Tool: `pdftotext -layout`, then programmatic section slicing on the `§ 7220. Pre-use Notice Requirements.` and `§ 7221. Requests to Opt-Out of ADMT.` headings, cut at the next section heading.
- Stripped page-header/footer artifacts: `CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS`, `(CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations)`, `Page N of 127`.
- De-hyphenation applied only to PDF hard-wrap artifacts.
- No paraphrase; subdivision structure preserved verbatim (indentation, ordering, note lines).

## 4. Cross-check vs `cppa_authorities`

Compared against:
- `45ff3c31-2534-42eb-86db-b383103debf0` — § 7220, full_text 6,774 chars, verified 2026-06-07
- `4db8ee47-658c-471f-b730-f3f87a861138` — § 7221, full_text 8,329 chars, verified 2026-06-07

**Result (whitespace-normalized):** substantive regulatory prose MATCHES on both sections. The only divergences are the page-header/footer strings noted in §3, which the June-07 `cppa_authorities` ingestion left interleaved mid-sentence and which THIS extraction correctly strips per doctrine. The new `provision_texts` rows are therefore CLEANER than the current `cppa_authorities` full_text.

**Consequence:** does NOT block approval per fallback contract (regulation text is verbatim identical after artifact removal). Flagged as a candidate for a future `cppa_authorities` re-verification turn (own turn, not this one).

## 5. Before / After row state

Before (2026-07-13 pending state):

| key       | status  | verbatim_len | plain_requirements | citation           |
|-----------|---------|--------------|--------------------|--------------------|
| cppa-7220 | pending | 0            | `[]`               | `CCPA Regs § 7220` |
| cppa-7221 | pending | 0            | `[]`               | `CCPA Regs § 7221` |

After (2026-07-26T01:36:02Z, verified via SELECT):

| key       | status   | verbatim_len | plain_requirements | citation                                             |
|-----------|----------|--------------|--------------------|------------------------------------------------------|
| cppa-7220 | approved | 7655         | 9 entries          | `11 CCR § 7220 (OAL-approved text, eff. 2026-01-01)` |
| cppa-7221 | approved | 8989         | 16 entries         | `11 CCR § 7221 (OAL-approved text, eff. 2026-01-01)` |

`jurisdiction` unchanged (`US-CA`) on both rows. `last_verified_at` = `2026-07-26 01:36:02.712318+00`. No other `provision_texts` rows written or touched (WHERE key IN ('cppa-7220','cppa-7221') on both statements).

## 6. plain_requirements shape

Mirrors the cppa-7150 sibling: array of concise plain-language sentences, one per operative subdivision, each prefixed with the pinpoint.

- **§ 7220 (9 entries):** (a) Pre-use Notice obligation + Notice-at-Collection option; (b) placement/timing/comply-with-§7003 rules; (c)(1) specific-purpose plain-language; (c)(2) opt-out description + § 7221(b) exception disclosures; (c)(3) access-right description; (c)(4) no-retaliation statement; (c)(5) additional information on ADMT operation with (A)–(C) plain-language explanations; (d) trade-secret / security-safety carve-outs; (e) consolidated Pre-use Notice options (1)–(4).
- **§ 7221 (16 entries):** (a) opt-out right; (b)(1) human-appeal exception with (A)–(B) reviewer + submission requirements; (b)(2) admission/acceptance/hiring exception; (b)(3) work-allocation/compensation exception; (c) two-methods rule with (1)–(4) illustrative requirements; (d) ease-of-execution; (e) no-account/no-extra-info; (f) no-verifiable-request; (g) fraud denial; (h) confirmation-of-processing; (i) granular-choice option; (j) authorized agent; (k) 12-month re-consent wait; (l) no retaliation; (m) pre-processing block; (n) post-processing cease-within-15-business-days + service-provider notification.

## 7. Acceptance checks

- [x] SHA-256 matches items 42/43 recorded hash for same PDF.
- [x] Section headings located; extraction cut cleanly at next section heading.
- [x] Page-header/footer artifacts stripped; no paraphrase; subdivision structure preserved.
- [x] Whitespace-normalized substantive-prose match vs `cppa_authorities` full_text on both sections.
- [x] Citation normalized to sibling convention (`11 CCR § NNNN (OAL-approved text, eff. 2026-01-01)`).
- [x] plain_requirements populated (9 / 16 entries), pinpoint-prefixed, mirrors cppa-7150 shape.
- [x] `status='approved'`, `last_verified_at=now()` set on both rows.
- [x] Post-check SELECT confirms status/lengths/counts (see §5).
- [x] No writes to any other row, table, or schema. No edge-function deploys. No instrument, rubric, grader, golden, contract, fixture, sample, registry, or other-corpus edits.

## 8. Rollout implication

UNBLOCKS a future H7-subdivision-pinpoint upgrade turn on `run-admt-checker` (per item 91 T5 RESIDUAL and item 100 GATE) — the ADMT generator will be able to lift `notice_gaps` / `opt_out_gaps` requirements from subdivision-level pinpoints (`§ 7220(c)(x)`, `§ 7221(b)(x)`, `(c)(x)`, `(n)(x)`) rather than section-level H7 anchors. **This turn changes NO runtime behavior.**

## 9. Ledger-numbering note

Dispatch requested "item 101" but item 101 was already committed for H6-ADMT-GOVERNING-ANCHOR earlier this tick (2026-07-26T01:31:00Z). Assigned next available number **102** per ledger append-only rule.

## 10. Guards / discipline

- No deploys → no wave-28 collision risk (wave-28 launches ~02:30Z).
- No writes to `quality_batch_runs`, `harness_artifacts`, or any function-runtime table.
- Sandbox clock re-read via `date -u` at 01:36:13Z bracketing the writes; no forward-carried stamps.
- Controller VM disk-full persists; all DB access via Lovable `query_database` per Backend-access law.
- `cppa_authorities` untouched (candidate re-verification queued as own turn).

## 11. Files touched

- `docs/courier/T5-CPPA-SUBDIVISION-INGESTION-7220-7221-2026-07-26.md` (this courier, new)
- `docs/pipeline-state.md` (item 102 + header restamp)

Corpus writes (via Lovable insert tool, two `UPDATE` statements, WHERE key IN ('cppa-7220','cppa-7221')):
- `public.provision_texts` — 2 rows updated (verbatim_excerpt, citation, plain_requirements, status, last_verified_at, updated_at)
