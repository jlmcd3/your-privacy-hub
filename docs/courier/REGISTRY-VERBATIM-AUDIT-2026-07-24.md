# REGISTRY-VERBATIM-AUDIT — 2026-07-24

Restored from dropped-order dispatch `umsg_01kyaj814` (TURN C ACK).
Standing rule established this turn: **no registry row lands without corpus verification**.

## Method

- **ADMT** (`_shared/registry/admt-verified-authorities.ts`): for each row, load
  `cppa_authorities.full_text WHERE citation = row.citation AND status='current'`,
  normalize both sides (smart→straight quotes, whitespace collapse, en/em dash
  fold), then test `body.includes(quote)`. Fallback: 80-char head / 80-char tail
  window substring match to distinguish paraphrase from missing.
- **Biometric** (`_shared/registry/biometric-statute-registry.ts`): no corpus
  DB mirror for the external statutes (BIPA, CUBI, RCW, GDPR, etc.); primary
  sources are the URLs listed on each row. Corpus-pin CI is INFEASIBLE without
  building a `source_document_cache` for each statute. Self-consistency
  (pinpoint literal ⊂ verbatim_quote) is already CI-guarded in
  `src/registry/__tests__/biometric-statute-self-consistency.test.ts` and
  passes for all 46 rows.

## ADMT result

| verdict                      | count | meaning |
| ---------------------------- | ----: | ------- |
| EXACT                        |     0 | verbatim substring match against `cppa_authorities.full_text` |
| PARAPHRASED_HEAD_ONLY        |     1 | 80-char head matched; tail differs |
| PARAPHRASED_TAIL_ONLY        |     2 | 80-char tail matched; head differs |
| NOT_FOUND                    |    31 | neither window matched (heavy rewrite or the pinpoint text is elsewhere) |

**All 34 ADMT rows are paraphrases**, not verbatim excerpts. This is the same
failure class as the TURN C fabricated `§ 7222(c)` row — authored language
labelled `verbatim_quote`. Two spot examples:

- Row `scope_apply` (`11 CCR § 7200(a)`) claims verbatim:
  > "This Article applies to a business's use of automated decisionmaking technology (ADMT) for a significant decision concerning a consumer."

  Corpus § 7200(a) actually reads:
  > "A business that uses ADMT to make a significant decision concerning a consumer must comply with the requirements of this Article."

- Row `notice_purpose` (`11 CCR § 7220(c)(1)`) claims a "plain-language
  explanation of the specific purpose" sentence that does not appear at
  § 7220(c)(1); the actual subsection lists distinct enumerated fields.

Per-row keys (all 34): access_logic, access_outcome, access_provide, admt_def,
admt_def_profiling, ccpa_defs, ccpa_rulemaking, fsor_advertising_exclusion,
fsor_human_involvement_three_part, human_involvement, notice_access,
notice_altprocess, notice_antiretal, notice_howworks_inputs,
notice_howworks_output, notice_optout, notice_purpose, notice_timing,
optout_exc_appeal, optout_exc_hire, optout_offer, ra_submit,
ra_timing_existing, ra_timing_new, ra_trigger_admt, ra_trigger_train,
scope_apply, scope_deadline, sig_decision, sig_education, sig_employment,
sig_financial, sig_healthcare, sig_housing.

## Biometric result

- 46/46 rows pass the pinpoint-in-quote CI (self-consistency).
- 46/46 supply `primary_source_url` with an `https://` scheme.
- Corpus-anchored verification is **infeasible** today (no ingested corpus for
  BIPA / CUBI / RCW / GDPR text). Deferred until a biometric corpus lands.
  Standing risk: a biometric row's `verbatim_quote` could still be a paraphrase
  of the pinpoint — humans cannot rely on the self-consistency test alone to
  reject fabrication.

## Actions

1. **CI pinning (this turn):** added
   `src/registry/__tests__/admt-verified-authorities-corpus-pin.test.ts`,
   which normalizes both sides and asserts substring match against
   `cppa_authorities.full_text` for **every row**. The test carries a frozen
   `KNOWN_PARAPHRASED_KEYS` set of all 34 failures; the assertion is:
   - any NEW row failing → test FAILS (prevents regression);
   - any listed row starting to pass → test FAILS (forces set trim).
   As correction turns land, keys are removed from the set until it is empty.
2. **Correction turns (queued, not executed this turn):** § 7001 (definitions
   + FSOR overlays), § 7150 / § 7155 / § 7157 (RA triggers/timing), § 7200,
   § 7220 (pre-use notice), § 7221 (opt-out), § 7222 (access), Civ. Code
   § 1798.140 / § 1798.185. Each correction turn extracts actual subsection
   text from `cppa_authorities.full_text`, rewrites the row, removes the key
   from the CI allow-list.
3. **Biometric corpus:** track a follow-on program item to ingest primary
   biometric-statute text into a table so the same CI can extend there.
4. **Authoring rule:** the "corpus-verified-at-authoring" rule inherits to any
   future risk / cyber / DPIA / IR verified-authority registries; a new
   registry file may not merge unless its rows pass the corpus-pin CI on entry.

## Ledger accounting

Per the ANTI-DROP RULE, every order in the dispatch is accounted for:
- REGISTRY-VERBATIM-AUDIT — **DONE this turn** (this report + CI test).
- §4 LIA correction — **DONE this turn** (ledger §4 rewritten to HEAD).
- SAMPLES-CONTRACT-governance (6/8) — promoted to NEXT.
- 2 pre-existing shape-test failures on cppa_cyber/us-supplemental — folded
  into the next SAMPLES turn per dispatch.
