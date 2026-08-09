# W9-DEADLINE-REGISTRY-ACCESS-TIMELINE — 2026-07-26

**SHIPPED** — deploy-guarded turn on `run-admt-checker` ONLY. Discharges ledger item 103 QUEUED (root cause of the doc-`d98f46e3` "45-day timeline written around" HIGH and the pre-existing red test in `_w9_admt_slots.test.ts`). Registry data fix — **T7 step-2 (admt) remains HELD on CEO checkpoint**; this is NOT T7 rollout.

## Defect

`buildDeadlineTable` emitted a row for pk `access_timeline` with `subsection=""`, `verbatim_quote=""`, `information_needed=true` because the registry entry had been REMOVED in WAVE12 TURN C (prior verbatim was fabricated against § 7222(c) — the trade-secret carve-out — not against a real 45-day timeline). Downstream generator prose "wrote around" the empty slot, producing the HIGH finding on doc-`d98f46e3` (quality_run `991b2fda`).

## Fix

1. **Registry entry added** to `supabase/functions/_shared/registry/admt-verified-authorities.ts`:
   ```
   access_timeline: {
     proposition_key: "access_timeline",
     citation: "11 CCR § 7021",
     subsection: "11 CCR § 7021(b)",
     verbatim_quote: "Businesses shall respond to a request to delete, request
       to correct, and request to know, request to access ADMT, and request to
       appeal ADMT no later than 45 calendar days after receipt of the request.",
     depth_class: "subsection",
     governing_anchor: "11 CCR Art. 3 (Business Practices for Handling Consumer Requests)",
     verified_on: "2026-07-26",
     primary_source_url: CCR_URL,
   }
   ```
2. **Corpus pin:** verbatim_quote is byte-identical (post-norm) to a substring of `cppa_authorities` row id `b97c21f6-74fc-4390-aa7d-be81f732850c` (`11 CCR § 7021`, status=current). Controller-verified 03:15Z, re-verified this turn via colocated Deno test.
3. **Section-level only.** Subdivision corpus for admt deadline surfaces remains unapproved; § 7021(b) is a subsection (not sub_subsection). No subdivision pinpoints introduced.
4. **Cal. Civ. Code § 1798.130 co-anchor:** `VerifiedAuthorityRow` schema does NOT support co-anchors and the dispatch forbids schema changes this turn — single anchor § 7021(b) shipped.
5. **Slots update:** `_w9_admt_slots.ts` DEADLINE_SPECS deadline field changed from `renderMessage("unresolved.authority")` placeholder to the concrete `"Within 45 calendar days of receipt of the request"` for the access_timeline row.
6. **Registry version bump:** `ADMT_VERIFIED_AUTHORITY_VERSION` `admt-va-w8-2026-07-24` → `admt-va-w9-2026-07-26`.
7. **Omission-over-invention preserved:** keys still absent from the registry continue to emit the neutral `information_needed=true` shape — no other rows added or altered.

## Test output (pasted-green, `deno test --no-check`)

```
running 7 tests from ./run-admt-checker/_w9_admt_access_timeline_corpus.test.ts
access_timeline: registry version bumped to w9-2026-07-26 ... ok (0ms)
access_timeline: registry row shape (section-level § 7021, no subdivision-deeper pinpoint) ... ok (0ms)
access_timeline: corpus-pin — verbatim_quote is byte-identical substring of cppa_authorities § 7021 full_text (post-norm) ... ok (0ms)
BEFORE-FIXTURE (doc-d98f46e3 / quality_run 991b2fda): access_timeline row now emits subsection + verbatim quote, information_needed=false ... ok (0ms)
BEFORE-FIXTURE: no deadline_table row carries information_needed=true (red slots test flips green) ... ok (0ms)
BEFORE-FIXTURE: all deadline_table rows carry subsection + verbatim (mirrors _w9_admt_slots.test.ts red assertion) ... ok (0ms)
omission-over-invention: unknown proposition_key still emits information_needed placeholder (unchanged) ... ok (0ms)
running 12 tests from ./run-admt-checker/_w9_admt_slots.test.ts
stamp exists ... ok (0ms)
applicability: in_scope when is_admt=true & trigger=true & established ... ok (0ms)
applicability: conservative_assumption honored ... ok (0ms)
applicability: out_of_scope when is_admt=false ... ok (0ms)
applicability: insufficient_basis on null drivers ... ok (0ms)
deadline_table sources from registry (>=3 rows, each stamped) ... ok (0ms)
adequacy: A-B qualifies with all three Yes ... ok (0ms)
adequacy: A-B does_not_qualify on missing element ... ok (0ms)
adequacy: A-B insufficient_basis on silence ... ok (0ms)
adequacy: A-A adequate when how_it_works=Yes (all three inferred) ... ok (0ms)
attachAndValidate stamps all three slots + validates ok ... ok (0ms)
validator flags missing slots ... ok (0ms)

ok | 19 passed | 0 failed (133ms)
```

The pre-existing red test `deadline_table sources from registry (>=3 rows, each stamped)` in `_w9_admt_slots.test.ts` is **GREEN** without any edit to that test file — the flip is driven entirely by the registry data addition.

## Deploy-guard snapshot (03:22Z, re-verified pre-deploy)

```
 active_batches | active_qruns
----------------+--------------
              0 |            0
```

Controller-verified 0/0 at 03:20Z. This turn re-verified 0/0 at 03:22Z immediately pre-deploy. Wave-29 (~04:45Z) launch margin preserved (deployed by 03:24Z).

## Boot-log echo (live post-deploy 2026-07-26T03:23:59Z, from `run-admt-checker` logs)

```
2026-07-26T03:23:59Z INFO {"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w9-deadline-registry-access-timeline@2026-07-26T03:23:00Z","va_version":"admt-va-w9-2026-07-26","va_rows":35}
2026-07-26T03:23:59Z INFO [run-admt-checker] boot build_stamp=w9-deadline-registry-access-timeline@2026-07-26T03:23:00Z
2026-07-26T03:23:59Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w9-deadline-registry-access-timeline@2026-07-26T03:23:00Z","prior_stamps":{"h6":"h6-admt-governing-anchor@2026-07-26T01:30:00Z","h7b":"h7b-admt-citation-relabel@2026-07-26T01:20:00Z","h7":"h7-admt-blanket-range@2026-07-25T23:48:00Z","w26":"w26-admt-citation-audit@2026-07-25T23:34:00Z","w25":"w25-admt-sanitizer@2026-07-25T22:44:15Z"}}
```

Prior stamps echoed **unchanged** (h6, h7b, h7, w26, w25). Registry loaded reports `va_rows=35` (was 34 pre-turn — +1 for `access_timeline`) and `va_version=admt-va-w9-2026-07-26`.

## Files touched

- `supabase/functions/_shared/registry/admt-verified-authorities.ts` — version bump + `access_timeline` row + `ART3` governing-anchor label.
- `supabase/functions/run-admt-checker/_w9_admt_slots.ts` — DEADLINE_SPECS `access_timeline.deadline` updated from placeholder to concrete text.
- `supabase/functions/run-admt-checker/_w9_admt_access_timeline_corpus.test.ts` — NEW colocated corpus-pin + before-fixture regression tests.
- `supabase/functions/run-admt-checker/index.ts` — BUILD_STAMP bump + prior_stamps echo of h6.
- `docs/pipeline-state.md` — ledger item 110 + header restamp.
- `docs/courier/W9-DEADLINE-REGISTRY-ACCESS-TIMELINE-2026-07-26.md` — this document.

## Doctrine (unchanged)

- Model never writes citation/quote — registry/emitter only.
- Omission-over-invention preserved for every key still absent from the registry.
- Fail-open at every seam; idempotent.
- No edits to prompts, rubrics, graders, goldens (the red test flip was driven by data, not test edits), contracts, other tools, instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN), pricing / payment / design tokens / customer revision path / signup.

## Gate

**Verification read = next risk wave (~04:45Z), specifically the admt read.** The `qc` deterministic that flagged "45-day timeline written around" on doc-`d98f46e3` should read clean on any post-deploy admt document where the deadline_table access_timeline row is present. **T7 step-2 (admt) remains HELD on CEO checkpoint** — this turn does NOT release that hold.

## Out of scope

Every other edge function, wave harness, instrument, rubrics/graders/goldens/contracts/fixtures/samples, corpus DDL, other registry entries, pricing / payment / design tokens / customer revision path / signup. NO Fable 5. No sample regen.
