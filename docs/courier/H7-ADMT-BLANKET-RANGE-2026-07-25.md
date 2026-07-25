# H7-ADMT-BLANKET-RANGE — Courier
**Dispatch:** H7-ADMT-BLANKET-RANGE-2026-07-25 (controller tick 23:22Z)
**Turn:** deploy-guarded fix on `run-admt-checker` ONLY
**Deployed:** 2026-07-25T23:22:23Z (boot-log-confirmed)
**BUILD_STAMP:** `h7-admt-blanket-range@2026-07-25T23:48:00Z`

## Scope discharged
Queued `h7_admt_blanket_range` per WAVE-26 DIGEST (ledger item 86, admt citation-69 driver (ii)): blanket-range citation `"11 CCR §§ 7200–7222"` was leaking into `notice_gaps` / `opt_out_gaps` prose (quality_run docs `2a8f5bda` and `f140f3c6`, run 115, quality_run `6c06f218`) where a specific section-level authority is verified corpus.

## Corpus constraint (BINDING — controller-verified 23:14Z)
- Subdivision-level texts for § 7220 / § 7221 are NOT verified corpus (`provision_texts.cppa-7220` / `cppa-7221` are `status=pending`, unapproved).
- Verified corpus is section-level only: `cppa_authorities` rows `11 CCR § 7220` (Pre-use Notice Requirements) and `11 CCR § 7221` (Requests to Opt-Out of ADMT), both `current`.
- **This turn NEVER emits subdivision pinpoints** like § 7221(a) / (c) / (e). Omission over invention.

## Context routing
| Bucket | Action | Pinpoint |
|---|---|---|
| `notice_gaps` | Relabel | `11 CCR § 7220` |
| `opt_out_gaps` | Relabel | `11 CCR § 7221` |
| `access_gaps`, `documentation_to_maintain`, `top_3_actions`, `priority_actions`, `information_needed`, `annotations` | Strip parenthetical; if load-bearing mid-sentence, whole-sentence excision (item 84c) | — |

## Pipeline placement
Wired AFTER `_w25_admt_sanitizer_fix` (item 88) and AFTER `_w26_admt_citation_audit` (item 90) and BEFORE the LEAK-PREV-P1 emit gate — so the gate + whitelist serializer see the final surface.

## Discipline
- Deterministic post-emitter — the model NEVER writes/edits customer prose.
- Fail-open at every helper and orchestrator (`try/catch` + `console.warn`; guarded import in `index.ts`).
- Anchor keys and `_`-prefixed reserved subtrees are NEVER mutated.
- Idempotent (entries tagged `_h7_blanket_range_ran = true`; second run is a no-op).
- No schema/contract changes.

## Green test output (18/18)
`cd supabase/functions && deno test --no-check --allow-all run-admt-checker/_h7_admt_blanket_range.test.ts`
```
running 18 tests from ./run-admt-checker/_h7_admt_blanket_range.test.ts
hasBlanketRange detects hyphen, en-dash, em-dash, and spacing variants ... ok (0ms)
BLANKET_RANGE_RE resets lastIndex safely for repeated use ... ok (0ms)
relabelBlanketRange substitutes to § 7220 for notice context ... ok (0ms)
relabelBlanketRange substitutes to § 7221 for opt-out context ... ok (0ms)
stripBlanketCitation removes whole parenthetical without residue ... ok (17ms)
stripBlanketCitation whole-sentence excises when citation is load-bearing ... ok (0ms)
splitSentences handles trailing fragments ... ok (0ms)
applyH7AdmtBlanketRange — notice_gaps entry relabels to § 7220 (doc-2a8f5bda pin) ... ok (0ms)
applyH7AdmtBlanketRange — opt_out_gaps entry relabels to § 7221 (doc-f140f3c6 pin) ... ok (0ms)
applyH7AdmtBlanketRange — elsewhere buckets strip parenthetical ... ok (0ms)
applyH7AdmtBlanketRange — never emits subdivision pinpoints ... ok (0ms)
applyH7AdmtBlanketRange — recursion into nested objects and arrays ... ok (0ms)
applyH7AdmtBlanketRange — anchor keys and _-prefixed subtrees are NOT mutated ... ok (0ms)
applyH7AdmtBlanketRange — idempotent second run ... ok (0ms)
applyH7AdmtBlanketRange — fail-open on malformed input ... ok (0ms)
applyH7AdmtBlanketRange — unrelated fields untouched ... ok (0ms)
applyH7AdmtBlanketRange — bucket-as-object with rows[] ... ok (0ms)
applyH7AdmtBlanketRange — _meta.internal.admt_h7_blanket_range written with stamp ... ok (0ms)

ok | 18 passed | 0 failed (26ms)
```

## Boot-log proof (live edge-function logs)
```
2026-07-25T23:22:23Z INFO [run-admt-checker] boot build_stamp=h7-admt-blanket-range@2026-07-25T23:48:00Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_sanitizer_w25_stamp=w25-admt-sanitizer@2026-07-25T22:43:00Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_attr_w24_stamp=w24-admt-attr@2026-07-25T18:28:00Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_turna_w23_stamp=w23-admt-turna@2026-07-25T16:42:27Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_turnb_w22_stamp=w22-admt-turnb@2026-07-25
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_turnb_w21_stamp=w21-admt-turnb@2026-07-25T12:20:33Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_turna_w20_stamp=w20-admt-turna@2026-07-25T09:36:35Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_turna_stamp=w19-admt-turna@2026-07-25T07:55:00Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_join2_stamp=w19-admt-fallbackjoin2@2026-07-25
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_slots_stamp=w9-admt-turn2-slots@2026-07-25T05:22:00Z
2026-07-25T23:22:23Z INFO [run-admt-checker] boot admt_pre_emit_stamp=w9-admt-preemit@2026-07-24T12:30:00Z
2026-07-25T23:22:23Z LOG booted (time: 63ms)
```

## Deploy-guard snapshot
Pre-deploy 2026-07-25T23:22:00Z:
- `quality_batch_runs (started_at > now()-2h, status in running/pending/processing)` = **0**
- `cppa_assessments (report_data IS NULL AND created_at > now()-15min)` = **0**

Wave-27 launch ~00:15Z — landed with 50+ minute margin.

## Five-lens TEAM-REVIEWED + REPORT FLOW & PLAIN LANGUAGE
Relabel-only (well-formed pinpoint substitution) or drop-only (whole-parenthetical strip / whole-sentence excision). No new customer prose introduced. No "information needed" phrasing added anywhere. Plain SVO preserved on surviving sentences. Punctuation tidy after paren strip so no `" ,"` / `"  "` residue survives.

## Files touched (atomic commit)
- `supabase/functions/run-admt-checker/_h7_admt_blanket_range.ts` (new, ~320 lines)
- `supabase/functions/run-admt-checker/_h7_admt_blanket_range.test.ts` (new, 18 tests)
- `supabase/functions/run-admt-checker/index.ts` (BUILD_STAMP bump `w26-admt-citation-audit@2026-07-25T23:34:00Z → h7-admt-blanket-range@2026-07-25T23:48:00Z` + import/wire block, ~20 lines)
- `docs/courier/H7-ADMT-BLANKET-RANGE-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (item 90 back-fill + item 91 + header restamp)

## T5 residual opened
Approve/ingest `provision_texts` subdivision texts for § 7220 and § 7221 (currently `status=pending`, unapproved) so a future turn can upgrade the H7 relabels from section-level to subdivision-level pinpoints where the specific defect context calls for it. Until then, section-level is the correct floor per omission-over-invention.

## Queued (not this turn)
- `h6_admt_governing_anchor` (own turn).
- Post-fix admt measurement (wave-27) to verify blanket-range hit count drops to 0 in `notice_gaps` / `opt_out_gaps` and remaining `rubric_invented_admt_section` / `rubric_citation_misapplied` counts on doc-2a8f5bda / doc-f140f3c6 shapes.
