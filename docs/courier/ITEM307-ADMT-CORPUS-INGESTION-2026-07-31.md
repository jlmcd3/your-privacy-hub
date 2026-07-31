# ITEM 307 — CORPUS INGESTION: 11 CCR §§ 7200 AND 7222 (cppa-admt prerequisite)

**Dispatch:** Controller, Item 307, 2026-07-31.
**Authority:** CEO directive 2026-07-31 (continue-rebuild instruction covers clearing this blocker).
**Scope executed:** `provision_texts` rows (2 updates in place) + pin test + this courier + ledger. **NO engine code, NO deploy, NO harness invocation.**
**Completed:** 2026-07-31T08:45Z.

---

## 1. The gap, stated plainly

Chapter 3 of `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md` named §§ 7200 and 7222 as MUST-INGEST. Neither appeared in the `INGESTION-PROMPTS-2026-07-31` 7-prompt inventory. **This is a real miss in that plan, not a covered-and-skipped item.** Pre-state read live:

| key | citation (pre) | status | `length(verbatim_excerpt)` |
| --- | --- | --- | --- |
| `cppa-7200` | CCPA Regs § 7200 (ADMT) | `pending` | 0 |
| `cppa-7222` | CCPA Regs § 7222 | `pending` | 0 |

Both rows were seed stubs from `_shared/provision-store.ts` `seedProvisionRegistry()`. Siblings `cppa-7220` (7,655 chars) and `cppa-7221` (8,989 chars) were already `approved` — so § 7220(a)'s Pre-Use Notice duty was ingested while **the clause it depends on was not**.

## 2. Provenance — hash re-verified BEFORE extraction

Source: `https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf` (OAL-approved text; the same artifact used in Item 298).

```
sha256  7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650   src.pdf
```

**Matches the pinned hash exactly. No drift; extraction proceeded.** Extraction: `pdftotext -layout`, §§ 7200 (p. 111) and 7222 (pp. 119–122). Running page headers (`CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS` + two following lines) excised as pagination; form-feed control characters dropped. **No other transformation** — indentation, curly quotes, en-dashes and the PDF's own irregular `(b)(1)` vs `(b)(2)–(4)` indent are preserved as found.

## 3. What was written

Two `UPDATE`s **in place** — no new keys, no duplicates. Both rows: `status='approved'`, `verbatim_excerpt` populated, `plain_requirements` authored, `last_verified_at=now()`, citation restyled to the sibling convention.

| key | citation (post) | status | chars | `plain_requirements` |
| --- | --- | --- | --- | --- |
| `cppa-7200` | 11 CCR § 7200 (OAL-approved text, eff. 2026-01-01) | `approved` | 725 | 2 |
| `cppa-7222` | 11 CCR § 7222 (OAL-approved text, eff. 2026-01-01) | `approved` | 7,910 | 12 |

`last_verified_at` = `2026-07-31 08:43:21Z` on both.

## 4. DOUBLE-CHECK — read back and diffed against the PDF

Each stored `verbatim_excerpt` was dumped with `psql -tAX` and diffed against the extraction file.

- **`cppa-7200`: identical.**
- **`cppa-7222`: identical.**

The only diff hunks on the first pass were four lines where the extraction file carried a stray `\f` (form-feed) page-break control character that the stored row correctly does not — confirmed byte-level with `cat -A`, and the diff is clean once form-feeds are excluded (`tr -d '\f'`). Character counts reconcile exactly: 7,914 (file, incl. 4 form-feeds) − 4 = 7,910 (stored). **No word, punctuation mark or line of statutory text differs.**

## 5. DOUBLE-CHECK — § 7220(a) → § 7200(a) cross-reference, verbatim on BOTH sides

The dispatch required the citation be verified rather than assumed.

**Referring side — § 7220(a), quoted from the PDF and confirmed present in the stored `cppa-7220` row:**

> (a)   A business that uses ADMT **as set forth in section 7200, subsection (a)**, must provide consumers with a Pre-use Notice. The Pre-use Notice must inform consumers about the business's use of ADMT and consumers' rights to opt-out of ADMT and to access ADMT, as set forth in this section.

**Referenced side — § 7200(a), as newly ingested:**

> (a)   A business that uses ADMT to make a significant decision concerning a consumer must comply with the requirements of this Article.

**CONFIRMED: § 7200(a) is in fact the ADMT-usage trigger clause § 7220(a) cross-references.** The heading of § 7200 states the same function — *"When a Business's Use of Automated Decisionmaking Technology is Subject to the Requirements of This Article."* The phrase `as set forth in section 7200, subsection (a)` occurs **four times** in the source (lines 940, 944, 1098, 4786 of the extracted text), i.e. it is also the operative hook from outside Article 11 — so § 7200(a) is load-bearing beyond the Pre-Use Notice alone.

## 6. DOUBLE-CHECK — what § 7222 ACTUALLY covers (read, not assumed)

Chapter 3 flagged § 7222 as absent without characterising it. Read from source, its scope is:

**§ 7222. Requests to Access ADMT** — the consumer's **right of ACCESS to ADMT**, and the business's response duties. It is *not* the opt-out section; opt-out is § 7221. Structure:

- **(a)** Trigger — a business using ADMT for a significant decision must provide information about that use when responding to an access request.
- **(b)** Response content, in plain language: **(1)** the specific purpose (generic descriptions such as *"to improve our services"* expressly prohibited); **(2)** the **logic** of the ADMT, sufficient for the consumer to understand how their personal information generated the output, possibly including parameters and the specific output; **(3)** the **outcome**, including whether the output was the sole factor, what other factors applied, and the role of any human whose involvement **does not meet § 7001(e)(1) "human involvement"** — with **(3)(A)** extending the explanation to planned future significant decisions using the same output; **(4)** the anti-retaliation statement plus instructions for exercising other CCPA rights, **(4)(A)** permitting a deep link to the specific privacy-policy section but expressly **not** to the policy's beginning or an unrelated section.
- **(c)** Withholding — (b)(2)–(3) need not include trade secrets (Civ. Code § 3426.1(d)) or information compromising (A) security-incident prevention/detection/investigation, (B) resistance to malicious/deceptive/fraudulent/illegal actions, (C) physical safety of natural persons.
- **(d)** Submission methods easy to use, **no dark patterns**; § 7020 know/delete/correct methods may be reused.
- **(e)** Article 5 verification; inability to verify must be communicated.
- **(f)** Denial handling (legal conflict / CCPA exception): inform, explain basis unless prohibited; partial denial still discloses the rest.
- **(g)** Reasonable security measures on transmission.
- **(h)** Password-protected-account holders may be served by a compliant secure self-service portal.
- **(i)** Service providers and contractors must assist.
- **(j)** **Aggregate-level response** permitted where ADMT was used as to that consumer **more than four times in a 12-month period** — for (b)(2), a summary of outputs over the preceding 12 months, the parameters that on average affected them, and how those parameters applied.
- **(k)** No retaliation (Civ. Code § 1798.125, Article 7).
- **(l)** Additional voluntary explanatory information permitted.

**Consequence for the coming Chapter 3 engine rebuild:** the *notice-adequacy* and *opt-out mechanism* operations sit on §§ 7220/7221, while § 7222 supplies a **distinct access-response adequacy surface** — in particular the (b)(2) logic explanation, the (b)(3) human-involvement boundary against § 7001(e)(1), the (c) withholding grounds and the (j) aggregate-response threshold. Chapter 3's five-operation table should be read against that, not against an assumed opt-out reading of § 7222.

## 7. Pin test

`src/registry/__tests__/cppa-admt-corpus-pin.test.ts` — twin of the Item 298 cyber pin, same `norm()` (typography only), same live-`psql` load, same `describe.skipIf(!PGHOST)` guard, same authoring rule: **definitional sentences only, never illustrative examples; do NOT edit a pin to make a failing corpus pass.**

- **`cppa-7200`** — 3 pins: the (a) Article-11 usage trigger, and both (b) compliance-date sentences.
- **`cppa-7222`** — 11 pins: (a) trigger, (b) plain-language duty, (b)(1) no-generic-terms, (b)(2) logic, (b)(3) outcome, (c)(1) trade-secret carve-out, (d) dark-patterns, (e) Article 5 verification, (g) transmission security, (j) four-times/12-month aggregate threshold, (k) no-retaliation.
- **Negative pin** — `/request to opt-out of ADMT/i` must NOT appear in `cppa-7222`, so a future mis-ingestion that pastes § 7221 content into the § 7222 row fails loudly rather than silently mislabelling the access right as an opt-out right.
- **Cross-reference integrity test** — a second `it()` asserts § 7220(a)'s referring sentence in `cppa-7220` **and** § 7200(a)'s referenced sentence in `cppa-7200`, so the citation stays verified in CI rather than in this document only.

**Result: 2 tests, 2 passing (1.39 s).**

## 8. Files touched

1. `src/registry/__tests__/cppa-admt-corpus-pin.test.ts` (new)
2. `docs/courier/ITEM307-ADMT-CORPUS-INGESTION-2026-07-31.md` (this file)
3. `docs/pipeline-state.md` (Item 307 + header restamp)

Plus the two `provision_texts` row updates. **No engine module, no contract, no fixture, no migration, no deploy, no harness invocation.**

## 9. Handover to the Chapter 3 engine rebuild

The corpus blocker is cleared: `cppa-7200`, `cppa-7220`, `cppa-7221`, `cppa-7222` are all `approved` with verbatim text. The rebuild is now **informed by** the corpus rather than blocked by it — and per §6 above, its exception-qualification and opt-out-mechanism operations should draw on § 7221, with § 7222 driving a separate access-response adequacy deliverable.
