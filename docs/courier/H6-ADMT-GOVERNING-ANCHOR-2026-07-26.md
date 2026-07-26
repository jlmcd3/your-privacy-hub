# Courier — H6-ADMT-GOVERNING-ANCHOR (2026-07-26)

**Dispatch:** H6-ADMT-GOVERNING-ANCHOR (deploy-guarded, `run-admt-checker` ONLY).
**Discharges:** long-queued `h6_admt_governing_anchor` class from ledger items 80 / 91 / 95.
**Ledger reference:** item 101 in `docs/pipeline-state.md`.
**Deployed:** 2026-07-26T01:30:44Z. **BUILD_STAMP:** `h6-admt-governing-anchor@2026-07-26T01:30:00Z`.

## Attribution

- **Class (a) — definitional-anchor-as-sole-governing-anchor.** Wave-27 doc `731689ba` cited `11 CCR § 7001(ddd)` alone for a `sig_decision` duty and `§ 7001(e)(1)` alone for an access-timeline duty. § 7001 is definitional; a definitional provision must never be the sole anchor on a duty sentence.
- **Class (b) — § 7150(b)(3) misapplied to sell/share-documentation prose.** Wave-27 doc `3746fd24` cited `§ 7150(b)(3)` on a sell/share-documentation duty. (b)(3) verifies the ADMT trigger, not sell/share recordkeeping.

## Remedy doctrine (mirrors item 88 W25 sanitizer)

Deterministic post-emitter sanitizer. The model never writes or edits customer prose. `resolveGoverningDutyAnchor(propositionKey)` consults the admt verified-anchor registry (native corpus table `cppa_authorities`, section-level rows only). If a non-definitional non-trigger anchor is returned, relabel; otherwise excise the entire entry (item-84c cross-tool doctrine analog). Fail-open everywhere. Idempotent via `_h6v2_ran` per-entry tag (LEAK-PREV strips underscore-prefixed keys downstream).

## Corpus pin (SELECT-only, 01:24:47Z)

`cppa_authorities` currently carries section-level rows for § 7002, § 7013, § 7014, § 7026, § 7027, § 7150. § 7001 definitional rows exist but are explicitly excluded from promotion by `resolveGoverningDutyAnchor`. No corpus writes.

## Shipped (`_h6_admt_anchor.ts`)

- `is7001DefinitionalOnly(v)` — matches `§ 7001` with any subdivision suffix; rejects strings that also carry a non-7001 anchor.
- `is7150B3(v)` — matches only the `§ 7150(b)(3)` pinpoint.
- `collectEntryCitations(entry)` — handles scalar strings, arrays of strings, arrays of objects with a `citation` field; recursive into nested `key_elements`.
- `applyH6AdmtAnchor(report)` — walks duty buckets (`top_3_actions`, `notice_gaps`, `opt_out_gaps`, `access_gaps`, plus their `key_elements`) and applies excision-or-relabel per class.
- Telemetry ONLY under `_meta.internal.admt_h6b` (entries_scanned, entries_relabeled, entries_excised, errors, stamp, class_counts).

## Wire (`index.ts`)

- Import added alongside H7b.
- Runs AFTER `applyH7bAdmtCitationRelabel` and BEFORE the LEAK-PREV-P1 emit gate.
- `BUILD_STAMP` bumped `h7b-admt-citation-relabel@2026-07-26T01:20:00Z` → `h6-admt-governing-anchor@2026-07-26T01:30:00Z`.
- Boot log `prior_stamps` echoes `h7b / h7 / w26 / w25` unchanged.

## Boot-log proof (live edge-function logs, post-deploy)

```
2026-07-26T01:30:44Z INFO [run-admt-checker] boot build_stamp=h6-admt-governing-anchor@2026-07-26T01:30:00Z
2026-07-26T01:30:44Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"h6-admt-governing-anchor@2026-07-26T01:30:00Z","prior_stamps":{"h7b":"h7b-admt-citation-relabel@2026-07-26T01:20:00Z","h7":"h7-admt-blanket-range@2026-07-25T23:48:00Z","w26":"w26-admt-citation-audit@2026-07-25T23:34:00Z","w25":"w25-admt-sanitizer@2026-07-25T22:44:15Z"}}
```

## Tests (pasted-green)

- `_h6_admt_anchor.test.ts` — **13/13 PASSED, 0 failed, 7ms**. Covers both regression classes, idempotence, fail-open, `_meta` preservation, unrelated-field control.
- Full admt suite — **261/262 PASSED, 1 failed, 2s**. The single failure is pre-existing `deadline_table sources from registry (>=3 rows, each stamped)` in `_w9_admt_slots.test.ts` (`buildDeadlineTable` / `access_timeline` subsection-empty registry issue; not introduced by this turn; out of H6 scope).
- Neighbors that gate on this fix (h7b / h7 / w26 / w25 / w24 / w12 leak guard / w15 fact ledger / w19 join2) all green.
- Allowlist maintenance: `_w15_admt_fl.test.ts` + `_w19_admt_join2.test.ts` BUILD_STAMP regex extended to admit accumulated lineage stamps. Pure widening; no behavior change.

## Pre-deploy guards (re-checked immediately pre-deploy, 01:30:20Z)

- `quality_batch_runs` running/in_progress/queued/pending = **0**
- `quality_runs` running/in_progress/queued/pending = **0**
- `cppa_assessments` in-flight (report_data IS NULL, created_at > now() − 15 min) = **0**
- Sandbox clock at deploy 01:30:44Z — >44-minute margin under 02:15Z soft cutoff; wave-28 launches ~02:30Z.

## Files touched (single atomic commit)

- `supabase/functions/run-admt-checker/_h6_admt_anchor.ts` (new module)
- `supabase/functions/run-admt-checker/_h6_admt_anchor.test.ts` (new, 13/13 green)
- `supabase/functions/run-admt-checker/index.ts` (import + wire hunk + BUILD_STAMP + boot log `prior_stamps`)
- `supabase/functions/run-admt-checker/_w15_admt_fl.test.ts` + `_w19_admt_join2.test.ts` (allowlist extension only)
- `docs/courier/H6-ADMT-GOVERNING-ANCHOR-2026-07-26.md` (this courier)
- `docs/pipeline-state.md` (item 101 + header restamp)

## Out of scope (guardrails held)

No rubric/grader/golden/contract/fixture(instrument)/sample/registry/corpus WRITES. Instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN. No other edge functions. T7 admt opening wiring HELD on CEO checkpoint. Doc-`d98f46e3` "45-day timeline written around" finding is generative and stays QUEUED for its own analysis turn. No Fable 5. No pricing/payment/design-token/customer-revision-path/signup changes. Stamps never carried forward.

## GATE

H6 reads clean on the next admt wave when: `_meta.internal.admt_h6b` telemetry is present; zero duty-bucket entries whose sole citation is a `§ 7001` definitional anchor; zero `§ 7150(b)(3)` citations on sell/share-documentation prose. Only then is the `h6_admt_governing_anchor` class called fixed.
