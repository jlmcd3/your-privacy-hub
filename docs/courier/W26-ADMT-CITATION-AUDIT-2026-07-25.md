# W26-ADMT-CITATION-AUDIT — Courier
**Dispatch:** W26-ADMT-CITATION-AUDIT-2026-07-25 (controller tick 23:09Z)
**Turn:** deploy-guarded fix on `run-admt-checker` ONLY
**Deployed:** 2026-07-25T23:35Z
**BUILD_STAMP:** `w26-admt-citation-audit@2026-07-25T23:34:00Z`

## Scope discharged
Ledger item-78 queued candidate (a) / WAVE-26 DIGEST (item 86) driver (i): the neutral fallback phrase `"the applicable ADMT-subchapter provision"` was leaking into customer prose (wave-26 doc `0481fc0c`, quality_run `6c06f218`, run 115, batch `aab7dd36`) even though a verified `ADMT_VERIFIED_AUTHORITIES` pinpoint was available for the resolved key.

Two defect classes, both addressed:

- **Class 1 — REGISTRY-FIRST SUBSTITUTION.** Well-formed occurrences of the fallback on entries whose `_va_stamp.subsection` or `ADMT_VERIFIED_AUTHORITIES[proposition_key].subsection` resolves to a verified pinpoint are rewritten to that pinpoint (e.g. `"under 11 CCR § 7150(b)(3)"`). Unresolved keys keep the fallback verbatim (omission over invention).
- **Class 2 — GARBLED MID-NOUN-PHRASE EXCISION.** Sentences where the fallback interpolates inside a noun phrase (e.g. `"no enumerated the applicable ADMT-subchapter provision category applies"`) are excised WHOLE per item-84c whole-sentence-excision doctrine. Deterministic rebuild is not attempted (Class 1 handles rebuild when a pinpoint exists).

## Out of scope (own turns)
- `h6_admt_governing_anchor` (own turn).
- `h7` blanket-range `11 CCR §§ 7200–7222` substitution in `notice_gaps`/`opt_out_gaps` (own turn).
- T7 step-2 admt opening wiring (HELD pending CEO checkpoint).
- All other products; instrument / rubric / grader; sample regen; harness.

## Pipeline placement
Wired AFTER `W25-ADMT-SANITIZER-FIX` (item 88) and BEFORE `LEAK-PREV-P1` emit gate so the gate + whitelist serializer see the final surface. Telemetry echoed under `_meta.internal.admt_w26_citation_audit`.

## Discipline
- Deterministic post-emitter — the model NEVER writes or edits customer prose.
- Omission over invention on unresolved keys.
- `splitSentences`/`rejoinSentences` primitives ensure no partial-sentence splice residue.
- Fail-open at every helper and the orchestrator (`try/catch` + `console.warn`).
- Anchor keys never mutated by the prose walker: `citation`, `citations`, `regulatory_citation`, `verbatim_quote`, `provision`, `proposition_key`, `id`, `element_id`, `requirement_id`, `key`, `stamp`, `build_stamp`, `subsection`, `field`, `source_fields`.
- Idempotent (entries tagged `_w26_citation_audit_ran = true`; second run is a no-op).
- No schema/contract changes.

## Green test output (18/18)
`cd supabase/functions && deno test --no-check --allow-all run-admt-checker/_w26_admt_citation_audit.test.ts`
```
running 18 tests from ./run-admt-checker/_w26_admt_citation_audit.test.ts
splitSentences preserves terminals ... ok (2ms)
isGarbledInterpolation — prefix quantifier signature (doc 0481fc0c pin) ... ok (1ms)
isGarbledInterpolation — suffix noun signature ... ok (1ms)
isGarbledInterpolation — well-formed use is NOT flagged ... ok (0ms)
isGarbledInterpolation — 'under X.' preposition form is NOT flagged ... ok (1ms)
substituteFallbackWithPinpoint substitutes only when pinpoint is truthy ... ok (0ms)
resolveEntrySubsection — via _va_stamp ... ok (0ms)
resolveEntrySubsection — via proposition_key lookup ... ok (0ms)
resolveEntrySubsection — unresolved key returns empty (omission over invention) ... ok (0ms)
processProseString — Class 1 substitutes when pinpoint exists ... ok (0ms)
processProseString — Class 2 excises garbled sentence whole ... ok (0ms)
processProseString — Class 1 + Class 2 together with pinpoint ... ok (0ms)
processProseString — unresolved key keeps well-formed fallback (omission) ... ok (0ms)
processProseString — unrelated prose is untouched ... ok (0ms)
applyW26AdmtCitationAudit — walks buckets, respects anchor keys ... ok (1ms)
applyW26AdmtCitationAudit — idempotent second run is a no-op ... ok (0ms)
applyW26AdmtCitationAudit — fail-open on malformed input ... ok (0ms)
applyW26AdmtCitationAudit — bucket-as-object with rows[] ... ok (0ms)

ok | 18 passed | 0 failed (19ms)
```

## Boot-log proof (read live via `edge_function_logs`)
```
2026-07-25T23:17:57Z INFO [run-admt-checker] boot build_stamp=w26-admt-citation-audit@2026-07-25T23:34:00Z
2026-07-25T23:17:57Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w26-admt-citation-audit@2026-07-25T23:34:00Z"}
2026-07-25T23:17:57Z INFO {"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w26-admt-citation-audit@2026-07-25T23:34:00Z","va_version":"admt-va-w8-2026-07-24","va_rows":34}
```

## Deploy-guard snapshot
Pre-deploy — `quality_runs` running+pending+processing (`started_at > now()-1h`) = 0; no in-flight customer-path generations; wave-27 launch (~00:15Z) not at risk.

## Five-lens TEAM-REVIEWED + REPORT FLOW & PLAIN LANGUAGE
Substitution-only or whole-sentence-excision; no new customer prose introduced; plain SVO preserved on surviving sentences; no rubric-only phrasing surfaced; unresolved-key path preserves the neutral fallback (omission over invention).

## Files touched (atomic commit)
- `supabase/functions/run-admt-checker/_w26_admt_citation_audit.ts` (new, ~230 lines)
- `supabase/functions/run-admt-checker/_w26_admt_citation_audit.test.ts` (new, 18 tests)
- `supabase/functions/run-admt-checker/index.ts` (BUILD_STAMP bump + import + orchestrator block, ~20 lines)
- `docs/courier/W26-ADMT-CITATION-AUDIT-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (item 90 + header restamp)

## Queued (not this turn)
- `h6_admt_governing_anchor` (own turn).
- h7 blanket-range `7200–7222` substitution (own turn).
- T7 step-2 admt opening wiring (HELD on CEO checkpoint).
- Wave-27 read to verify Class 1 substitution + Class 2 excision counts and fallback-leak reduction in the wild.
