# ITEM 298 — CORPUS INGESTION: CPPA CYBERSECURITY-AUDIT CONTENT PROVISIONS

**Dispatch:** CONTROLLER — ITEM 298 (prompt 1 of 7 in INGESTION-PROMPTS-2026-07-31; launch order 1→7→2→3→4→5→6)
**Authority:** CEO corpus approval 2026-07-31; Plan §6.1; Item 282 (§§ 7122–7124 recorded ABSENT)
**Date:** 2026-07-31
**Scope honoured:** `provision_texts` rows + pin test + courier + ledger ONLY. No engine code, no deploys, no harness invocation.

---

## 1. SOURCE + HASH VERIFICATION — **PASS**

- URL: `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf`
- Pinned SHA-256: `7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650`
- Computed SHA-256 (2026-07-31, executor fetch): `7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650`
- **Result: PASS — no source drift.**
- Full 127-page document retrieved and text-extracted locally; the controller's page-56 truncation did **not** reproduce on the executor side. §§ 7122–7124 were read from the primary text, not from a secondary source.

---

## 2. ROWS INGESTED

| key | citation | jurisdiction | status | excerpt bytes | plain_requirements |
|---|---|---|---|---|---|
| `cppa-7122` | CCPA Regs § 7122 (Thoroughness and Independence of Cybersecurity Audits) | `US-CA` | approved | 3,991 | 10 |
| `cppa-7123` | CCPA Regs § 7123 (Scope of Cybersecurity Audit and Audit Report) | `US-CA` | approved | 15,371 | 13 |
| `cppa-7124` | CCPA Regs § 7124 (Certification of Completion) | `US-CA` | approved | 2,190 | 6 |

**Jurisdiction deviation from dispatch (recorded, deliberate):** the dispatch specified `cppa-ca`. Every pre-existing CPPA row (`cppa-7120`, `cppa-7121`, `cppa-7150`, `cppa-715x`, `cppa-72xx`, `cppa-7300`, `ccpa-1798-*`) carries `US-CA`, and the provision store filters/joins on that value. Ingesting under `cppa-ca` would have created a second, unreachable jurisdiction partition. Rows were ingested as `US-CA` for consistency. Flagging for CEO ratification; a one-line re-key is available if `cppa-ca` is intended as the new canonical.

Extraction preserved subsection typography verbatim (curly apostrophes/quotes, en-dashes, subsection indentation, the closing `Note: Authority cited:` line). Running headers/footers (`CA PRIVACY PROTECTION AGENCY`, parenthetical title line, `Page N of 127`) were stripped as non-substantive page furniture; no substantive character was altered.

**Diff result:** each stored `verbatim_excerpt` was read back from the database and compared byte-for-byte against the locally extracted PDF text. **All three: IDENTICAL.**

---

## 3. VERIFICATION OF EXISTING `cppa-7120` / `cppa-7121` — **NO SHORTFALL**

- `cppa-7120` contains the full § 7120(b) threshold structure: (b)(1) the Civil Code § 1798.140(d)(1)(C) 50%-revenue prong; (b)(2) the § 1798.140(d)(1)(A) size prong with **both** operands — (b)(2)(A) 250,000 consumers or households, (b)(2)(B) 50,000 sensitive-PI consumers. Nothing the cyber product needs is missing.
- `cppa-7121` contains all three § 7121(a) cohorts with dollar figures intact: (a)(1) >$100,000,000 → April 1, 2028; (a)(2) $50,000,000–$100,000,000 → April 1, 2029; (a)(3) <$50,000,000 → April 1, 2030.
- **Recorded shortfall (typographical only, not substantive):** both rows use straight ASCII apostrophes where the PDF uses U+2019. This is why the pin test normalizes typography before matching. No re-ingestion ordered; noted so a future byte-exact pin author does not trip on it.

---

## 4. LOOP2 ANCHOR RE-VERIFICATION AGAINST PRIMARY TEXT

Each controller-supplied `quality_loop2_results` pointer was re-checked against the executor's own fetch. The list was treated as a pointer, not as ground truth.

| Anchor | Loop2 rows | Verdict against enacted text |
|---|---|---|
| **§ 7123(c)(10)** segmentation as standalone component; zero-trust deleted (FSOR pp. 24–25) | `8915dc35`, `a230405b`, `a87d3feb`, `95d59776`, `6efe1922` | **CONFIRMED.** Enacted text: "Segmentation of an information system (e.g., via properly configured firewalls, routers, switches)." It is its own enumerated component. The string "zero trust" / "zero-trust" appears **nowhere** in the enacted text of the article. Negative pin added. |
| **§ 7122(g)** five-year retention; anchor date ambiguity | `8915dc35`, `6efe1922` | **CONFIRMED, and the reviewer's ambiguity flag is WRONG.** Enacted text fixes the anchor explicitly: "…for a minimum of five (5) years **after completion of the cybersecurity audit**." The anchor is completion of the audit, not the audit period or the certification date. Generators must not hedge this. Positive pin added. |
| **§ 7123(e)** auditor documents the assessed component in the audit report — distinct from business remediation actions | `8915dc35` | **CONFIRMED.** § 7123(e) imposes reporting duties on the **auditor** (describe the information system, identify criteria and specific evidence, explain effectiveness, detail gaps/weaknesses). The business's remediation plan and timeframe is a separately enumerated item within the report, not a substitute for the auditor's own assessment narrative. Two distinct duties. |
| **§ 7123(c)(11)** ports/protocols — "permitted, restricted, or blocked" flagged as possible paraphrase | `8915dc35` | **PARAPHRASE CONFIRMED — flag upheld.** Enacted text is exactly: "Limitation and control of ports, services, and protocols." The phrase "permitted, restricted, or blocked" occurs **zero** times in the entire 127-page document (`grep -c` = 0). It is generator invention. Negative pin added to make reintroduction fail CI. |
| **§ 7123(c)(12) / (c)(13)** awareness vs. training as two components (FSOR p. 26) | `8a808f2a`, `a87d3feb` | **CONFIRMED.** (c)(12) is cybersecurity **awareness** (maintaining current knowledge of changing threats and countermeasures); (c)(13) is cybersecurity **education and training** (per-person training for employees, independent contractors, and other personnel with system access). Collapsing them into one component understates the enumerated list. Both pinned separately. |
| **§ 7123(d)** non-enumerated components assessable but not mandatory | `b4c79387`, `a87d3feb` | **CONFIRMED.** Enacted text: "Nothing in this section prohibits a cybersecurity audit from assessing components of a cybersecurity program that are not set forth in subsections (b) or (c)." Permissive, not mandatory — a generator that presents zero-trust as required misstates the law twice over (deleted from (c)(10), and (d) is permissive). Pinned. |

**Net:** six of six anchors confirmed; one reviewer characterization corrected (§ 7122(g) is unambiguous); one generator paraphrase positively identified and now CI-blocked.

---

## 5. PIN TESTS

New file: `src/registry/__tests__/cppa-cyber-corpus-pin.test.ts` (cyber twin; `registry-corpus-pin.test.ts` left untouched — it is Deno-resident and scoped to § 7150(b)).

Positive pins — definitional sentences only, no illustrative examples:
- `cppa-7120`: four § 7120(b) threshold operands (both (b)(1) revenue and (b)(2)/(A)/(B) size prongs).
- `cppa-7121`: all three § 7121(a) cohort boundaries with dollar figures verbatim.
- `cppa-7122`: § 7122(g) five-year retention; § 7122(d) no-primary-reliance-on-management-assertions.
- `cppa-7123`: (c)(10) segmentation, (c)(11) ports, (c)(12) awareness, (c)(13) education-and-training, (d) non-enumerated permissive clause.
- `cppa-7124`: § 7124(b) April 1 deadline.

Negative pins (must appear in **no** cyber corpus row): `/zero[- ]trust/i`, `/permitted, restricted, or blocked/i`.

Typography is normalized (curly→straight quotes, en/em-dash→hyphen, NBSP, whitespace runs) before matching, per §3's recorded 7120/7121 apostrophe deviation. Test skips when `PGHOST` is unset (CI/dev guard, consistent with the existing corpus-pin family).

**Run result: 1 file / 1 test PASSED (771 ms).**

---

## 6. DOUBLE-CHECK (as required by dispatch)

1. **Every row diffed against the PDF text** — yes. All three read back from the database and compared to the local extract: IDENTICAL, all three.
2. **Hash verification** — **PASS**. Computed digest equals the pinned `7a343…8650`.
3. **Row keys** — `cppa-7122`, `cppa-7123`, `cppa-7124`.
4. **No other file touched** — confirmed. Writes this turn: `src/registry/__tests__/cppa-cyber-corpus-pin.test.ts` (new), this courier (new), `docs/pipeline-state.md` (Item 298 + header restamp). No engine, emitter, validator, or config file modified; no function deployed; no harness run.

---

## 7. OPEN FOR CONTROLLER / CEO

- **Jurisdiction key:** `US-CA` used instead of the dispatched `cppa-ca` (§2). Ratify or order a re-key.
- **§ 7122(g) reviewer correction:** loop2 row `6efe1922` records an ambiguity that the enacted text does not support. Recommend the finding be reclassified as resolved rather than carried into the cyber backlog.
- **§ 7123(c)(11) paraphrase:** now CI-blocked at the corpus layer, but the generator that produced "permitted, restricted, or blocked" is unmodified (scope bar). Needs its own dispatch.

Prompt 1 of 7 complete. Ready for prompt 7 on your verification.
