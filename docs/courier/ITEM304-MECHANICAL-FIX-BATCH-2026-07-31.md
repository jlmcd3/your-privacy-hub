# ITEM 304 — MECHANICAL FIX BATCH (2026-07-31)

CEO directive 2026-07-31 responding to controller findings from Items 300/301/302.
Four-team consultation (AI-prompt experts / senior privacy lawyers / PhD computer
scientists / English professors) run on Fixes B, C, D — unanimous on all three.
Fix A is a mechanical data correction.

**Boundaries honoured:** DB corrections + one additive migration + one file edit
+ one new regression test + this courier + ledger. **NO deploys. NO harness
invocation. No opportunistic refactors.** `provision_texts` was NOT touched.

---

## FIX A — `gdpr_articles` trailing-section-heading artifact — DONE

**Scope executed as ordered (not assumed to be only Arts. 22/34).** All 180 rows
scanned (99 `eu`, 81 `uk`) with a boundary-artifact regex covering
`\n\nSection N\n\n<heading>` **and** `\n\nCHAPTER <roman>\n\n<heading>` (UK
`Chapter`/`Part` equivalents included in the scan pattern).

| | before | after |
|---|---|---|
| `eu` rows carrying the artifact | **21** | **0** |
| `uk` rows carrying the artifact | **0** | **0** |
| rows written | — | **21** |
| `provision_texts` rows touched | — | **0** |

**Affected EU articles (21):** 4, 11, 12, 15, 20, **22**, 23, 31, **34**, 36, 39,
43, 50, 54, 59, 62, 67, 76, 84, 91, 93. The dispatch named 2; the scan found 21.
Nested artifacts (a `CHAPTER` heading followed by a `Section` heading) were
handled by running the strip in three idempotent passes; the third pass matched
0 rows, which is the termination proof.

**Re-verification against live source.** The corrected `body_text` of each of the
21 rows was checked as an exact substring of the live CELEX 32016R0679
consolidated text before writing; UK rows required no change so
legislation.gov.uk re-verification was not triggered. **Two rows (Arts. 4 and 43)
showed an initial substring mismatch** — traced to inline footnote-reference URLs
present in the scraped CELEX markdown but not in the DB text, i.e. an artifact of
the comparison copy, not of the DB row. With footnote markers normalised out,
all 21 corrected rows are byte-accurate to CELEX. Recorded rather than waved
past, so no future turn re-opens it as a defect.

**Post-write verification:** artifact-pattern scan returns **0** rows across both
jurisdictions; every corrected row's length equals its predicted post-strip
length (21/21, zero mismatches). `src/registry/__tests__/gdpr-registry-corpus-pin.test.ts`
re-run: **PASS**.

---

## FIX B — EDPB guidance version-currency metadata + re-check convention — DONE

**Migration (additive, no data loss):** `doc_version TEXT` and
`version_verified_at TIMESTAMPTZ` added to `public.edpb_guidelines`
(`ADD COLUMN IF NOT EXISTS`, column comments recorded in-schema). No column was
dropped, renamed, or retyped; no row was deleted.

**Backfill — only what Item 301 actually verified live:**

| guideline_ref | doc_version | version_verified_at | rows |
|---|---|---|---|
| EDPB Guidelines 9/2022 | `2.0` | 2026-07-31T00:00Z | 74 |
| EDPB Guidelines 1/2024 | `1.0` | 2026-07-31T00:00Z | 109 |
| WP248 rev.01 | `rev.01` | 2026-07-31T00:00Z | 46 |

The other **7** documents (01/2022, 05/2020, 07/2020, 2/2019, 3/2018,
Recommendations 01/2020, WP260 rev.01) retain `doc_version = NULL` and
`version_verified_at = NULL`. **Not checked ⇒ not guessed.** NULL is the honest
signal that a currency check is owed.

### CONVENTION — EDPB VERSION-CURRENCY RE-CHECK (documented, not automated)

A cron job is a larger engine decision than this batch covers; this is a written
convention for a future turn to follow by hand.

1. **Select the queue:** `SELECT DISTINCT guideline_ref, doc_version,
   version_verified_at FROM edpb_guidelines ORDER BY version_verified_at NULLS FIRST`.
   NULL `version_verified_at` first, then oldest.
2. **Fetch the official EDPB document page** for that `guideline_ref` (the EDPB
   site page, not a mirror, not an aggregator, not a cached PDF) — the same
   method Item 301 used.
3. **Compare** the page's "Final version" / version number / "rev." marker
   against the stored `doc_version`.
4. **On confirmation** (page version == `doc_version`, or `doc_version` was NULL
   and the page version is now read): write the page's version into
   `doc_version` and set `version_verified_at = now()`. Nothing else changes.
5. **On mismatch:** **STOP. Do not update the text, do not silently re-ingest.**
   Report the mismatch (stored version, live version, document, affected row
   count) to the controller and await dispatch — a version bump means the
   *content* may have moved, which is an ingestion decision, not a metadata one.
6. **Never guess a version** from a filename, a PDF header, or an inference.
   Absent a live read, the field stays NULL.

**NEXT-REVIEW PRIORITY — EDPB Guidelines 1/2024 (109 rows).** Flagged explicitly:
its version 1.0 is the post-consultation-pending state, so it is the single
document in the table most likely to be superseded without notice. Re-check it
first at the next currency turn.

---

## FIX C — Item 291 P0-truncation finding formally WITHDRAWN — DONE

**Method: annotation, not deletion.** A labelled
`⛔ WITHDRAWN — SUPERSEDED BY ITEM 300` block was prepended to
`docs/courier/ITEM291-EU-CORPUS-GAP-2026-07-30.md`. **The original body is
preserved unedited** — including the `Art. 22 | PRESENT BUT TRUNCATED` and
`Art. 34 | PRESENT BUT TRUNCATED` rows, which the annotation instructs the reader
to read as FALSE POSITIVE. The annotation states: the finding came from
length-comparing clean `provision_texts` rows against `gdpr_articles` rows that
themselves carried the trailing next-section-heading artifact (+25 chars on
Art. 22, +69 on Art. 34 — *exactly* the reported deficits); both
`provision_texts` rows were independently confirmed byte-identical to live CELEX
by Item 300 and by the controller; the root cause is fixed at source by Fix A in
this same turn; `provision_texts` needed no repair and received none.

### Grep for surviving stale assumptions (AI-prompt-experts' condition)

`rg -ni "truncat"` across `docs/`, `src/`, `supabase/` (rebuild snapshots
excluded as frozen artifacts). Findings, classified:

**STALE — still asserts the truncation is real (3 live locations, all in one file):**

| File | Line | Text |
|---|---|---|
| `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md` | 42 | "two **P0 truncation defects** … Both must be repaired before any chapter-driven prompt work quotes those articles." |
| same | 205 | "repair the `gdpr-art-22` truncation (Item 291 P0) before any EU-side ADMT cross-reference is quoted" |
| same | 440, 444 | "Art. 34 is 69 chars short of CELEX. Repair before Art. 34 is quoted… bars quoting the tail until repair" |
| same | 516 | fleet table cell: "Art. 34 **P0 truncated**" |

**Action taken:** a `⛔ SUPERSEDED` correction note was prepended to that document
pointing at this item, rather than rewriting five in-body passages of a
CEO-reviewed analysis. **The operational consequence is that the document's
"bars quoting Art. 34's tail until repair" instruction is LIFTED** — there is
nothing to repair. Flagged for the controller because it gated ADMT and
ir-playbook prompt work.

**NOT STALE — already carries the correct (disproving) account, no action:**
- `docs/pipeline-state.md` L6980 — Item 291's own historical entry (ledger is append-only; L7164 immediately below it records the disproof).
- `docs/pipeline-state.md` L7164 — Item 300's disproof entry.
- `docs/courier/ITEM300-…md` §2 — "the P0 truncation is not a truncation".
- `src/registry/__tests__/gdpr-registry-corpus-pin.test.ts` L1, 14–15, 181, 242 — pins 1,289/1,649 with the disproof reasoning inlined in the header; this test is the permanent guard and is **correct as written**.

**UNRELATED — different sense of the word, no action:**
- `supabase/functions/run-dpia-framework/index.ts` L128 — IPv4-octet truncation guidance.
- `docs/courier/ITEM302-…md` L83 — legislation.gov.uk ellipsis markers ("faithful to source, not truncation").
- `supabase/functions/_shared/gdpr-context.ts` L33 — a `truncated: boolean` context-budget field.

**No prompt, system block, or validator was found asserting the truncation.** The
contamination was confined to documentation.

---

## FIX D — stale UK-mirror exclusion removed from `ir-playbook-verified-authorities.ts` — DONE

**Behavioural dependency check FIRST (PhD-CS team's condition) — and it found a
real trap.** `applyW1IrWire` in `supabase/functions/generate-ir-playbook/_w1_ir_wire.ts`
resolves a proposition key in this order: (1) `IR_PLAYBOOK_VERIFIED_AUTHORITIES`
→ stamp the row; (2) else `IR_PLAYBOOK_UNANCHORED_PROPOSITIONS` → scrub/write
around, silently and by design; (3) else → report as `unknown_keys`.

Removing the two keys from list (2) **without** adding rows to (1) would have
dropped them straight into branch (3): the citations would no longer be scrubbed,
so **model-authored UK citation text would have leaked into output** as an
unknown key. This is exactly the "silent behaviour change once they're found"
the team's condition was written to catch. **Both fixes were therefore made in
the same edit.**

**Edit executed:**
- Removed `"uk_gdpr_art_33_mirror"` and `"uk_gdpr_art_34_mirror"` from
  `IR_PLAYBOOK_UNANCHORED_PROPOSITIONS` (replaced with an in-place comment
  recording why, so no future turn re-adds them). `"uk_dpa_2018_ico_notification_portal"`
  was **left on the list** — the ICO portal mechanics genuinely are not in corpus.
- Added two real registry rows keyed on the same proposition keys, quoting the
  **UK-specific** Item 302 corpus text, anchored to
  `Regulation (EU) 2016/679 as retained in UK law (UK GDPR)` with
  `legislation.gov.uk` primary-source URLs and `verified_on = 2026-07-31`.

**Downstream citation resolution CONFIRMED (not assumed).** Both `verbatim_quote`
strings were checked with `POSITION(quote IN verbatim_excerpt)` against the
Item 302 corpus rows: `ukgdpr-art-33` → **1**, `ukgdpr-art-34` → **1** (exact
substring at offset 1, byte-for-byte). The Art. 33 row resolves to the UK text
carrying **"notify the personal data breach to the Commissioner"** — *not* the EU
row's "supervisory authority". No fallback to an EU row occurs on either key.

*(Recorded verbatim-fidelity note: the corpus row renders "to the Commissioner ,"
with a space before the comma, an artifact of legislation.gov.uk's amendment
markup. The registry quote reproduces it exactly. Verbatim means verbatim — do
not "clean" this, or the corpus-pin substring check breaks.)*

**Regression test: `src/registry/__tests__/ir-playbook-uk-mirror-exclusion.test.ts` — 4 tests, ALL PASSING.**
1. exclusion list contains neither key;
2. both keys resolve to registry rows (no `unknown_keys` passthrough);
3. resolved text is UK-specific — Art. 33 contains "the Commissioner", does NOT
   contain "supervisory authority", URL is `legislation.gov.uk`;
4. the EU Art. 33 row (`breach_notify_sa_72h`) is untouched and still distinct
   from the UK row.

---

## DOUBLE-CHECK SUMMARY

| Fix | Check | Result |
|---|---|---|
| A | affected rows before → after | 21 EU / 0 UK → **0 / 0**; 21 rows written |
| A | live-source re-verification | all 21 byte-accurate to CELEX (Arts. 4, 43 mismatch traced to footnote URLs in the scrape copy) |
| A | `provision_texts` touched | **no** |
| B | columns added | `doc_version`, `version_verified_at` (additive, IF NOT EXISTS) |
| B | backfilled | 9/2022→`2.0`, 1/2024→`1.0`, WP248→`rev.01`, all @2026-07-31; 7 docs left NULL |
| B | convention | 6-step written convention above; STOP-on-mismatch; 1/2024 = next-review priority |
| C | stale-reference grep | 5 stale passages, all in `PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md`; superseded note added; no prompts/validators affected |
| C | annotation | prepended, original body preserved unedited |
| D | behavioural dependency | trap found and closed — removal alone would have leaked citations via `unknown_keys` |
| D | regression test | 4/4 PASS |
| D | downstream resolution | UK rows resolve ("Commissioner"), no EU fallback |

**Deploys: none. Harness runs: none.** `generate-ir-playbook` now carries an
undeployed registry change — it takes effect only at that function's next
dispatched deploy turn.
