# W25-ADMT-SPLICE-ATTRIBUTION — Docs-only Courier Report

**Dispatch:** `W25-ADMT-SPLICE-ATTRIBUTION-2026-07-25`
**Controller tick:** 2026-07-25T21:05Z
**Scope confinement:** docs-only; ZERO code/prompt/rubric/grader/golden/contract/fixture/sample/registry/corpus edits. NO deploys. NO edge-function touches. Wave harness + T6 artifacts untouched.
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN.

---

## Summary

Wave-25 admt `rubric_internal_reasoning_leak` 1→2 (run 114, quality_run `fa77954e`). **VERDICT: SPLIT** — one instance TURN-CAUSED by W24-ADMT-ATTRIBUTION-FIX T-Ab, one instance pre-existing W6-era fallback-phrase coverage gap. **NO revert:** the W24 fix module is fail-open, its target class `e6_counsel_referral` cleared 1→0 in wave 25, and net turn value is positive.

## Evidence

All reads via `query_database` against `quality_run_documents`.

### (1) Doc `04e7393b` — TURN-CAUSED (T-Ab partial-excision residue)

Customer text in an `access_logic` entry (citation `11 CCR § 7222(b)(2)`):

> "...Provide the missing details and refresh the assessment.exists to pronounce the logic disclosure adequate on this record."

Telemetry `_meta.internal.admt_w24_attr` on this doc:

- `info_needed_prose_scrubs=1`
- `strings_scanned=141`
- all other counters `0`
- stamp `w24-admt-attr@2026-07-25T18:28:00Z`

T-Ab `scrubInformationNeededProse` consumed the HEAD of an "...information is needed..." sentence but not its full extent — the orphaned tail ("exists to pronounce ... on this record.") was left spliced onto the preceding sentence with no space ("assessment.exists"). Partial-sentence-excision defect, same family as the risk W23B residue ruled in ledger item 78 evidence (5).

### (2) Doc `2235d1f6` — NOT turn-caused (pre-existing W6-era coverage gap)

Grader evidence for its leak finding:

> "the applicable ADMT-subchapter provision trigger, conditional on the scope determination being confirmed."

Telemetry on this doc: `template_var_drops=0`, `template_var_rewrites=0` (T-B INERT), `info_needed_prose_scrubs=13` with no splice artifact present (doc contains no "exists to pronounce" fragment; 13 strips landed cleanly). This is the pre-existing W6-era unresolved-fallback phrase appearing as an ATTRIBUTIVE NOUN MODIFIER ("the <FALLBACK> trigger, conditional on ..."), a grammatical variant outside T-B's three covered shapes. Coverage gap, not sanitizer mutation.

### (3) Correction to wave-25 digest (2026-07-25T20:05Z)

The digest grouped BOTH docs under the splice-fragment class. Evidence shows only `04e7393b` carries the splice; `2235d1f6` is the fallback-phrase class.

## Queued candidates (next admt fix turn — deploy-guarded, one turn, attribution satisfied)

- **(a) T-Ab full-sentence excision.** Pattern must consume the ENTIRE sentence from its start boundary through the terminal period inclusive, with whitespace re-join. Regression pin: doc `04e7393b` string.
- **(b) T-B coverage widening.** Detect the fallback phrase in ANY grammatical position in customer prose (registry-first rewrite when a `proposition_key` resolves, else drop the sentence). Regression pin: doc `2235d1f6` string.
- **(c) Cross-tool doctrine note.** For all future scrub passes (admt T-Ab/T-B, risk W23B, any T7-era sanitizers): sentence-excision passes MUST consume whole sentences and re-join boundaries. Partial-excision residue is a recurring turn-caused defect class (now seen on admt wave-25 and risk waves 24-25).

`h6_admt_governing_anchor` + `h7_admt_blanket_range` remain QUEUED (own turns). Wave 26 ~22:00Z reads T7 risk pilot (ledger item 83); no admt deploy before wave-26 freeze.

## Deviation ruled

Controller sandbox VM disk-full persists on FRESH tick VM post-restart (21:04Z) — restart did NOT clear it; John flagged in tick report; all reads + this dispatch routed via Lovable `query_database`/`read_file`/`send_message` per Backend-access law.

## Files changed

- `docs/pipeline-state.md` (header restamp 21:05:00Z + ledger item 84 appended)
- `docs/courier/W25-ADMT-SPLICE-ATTRIBUTION-2026-07-25.md` (this file)
