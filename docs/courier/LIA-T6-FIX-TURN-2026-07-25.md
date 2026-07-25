# LIA-T6-FIX-TURN — Class A citation audit + Class B business-claim scrub

**Dispatch:** `LIA-T6-FIX-TURN-2026-07-25` (controller tick 2026-07-25T23:05Z)
**Discharges:** T6-NONCPPA-MEASUREMENT-BATCH-1 per-tool backlog for `li_assessment` — items 81(a) `citation_misapplied` and 81(b) `unsupported_business_claim`.
**Build stamp:** `lia-t6fix@2026-07-25T23:15:00Z` (module stamp `lia-t6fix@2026-07-25T23:10:00Z`).
**Deploy proof:** `run-li-assessment` redeployed at 2026-07-25T23:16Z (guard: `active_batches=0`; no in-flight LIA generations).
**Scope discipline:** edge function `run-li-assessment` ONLY. No rubric/grader/golden/contract/fixture/sample/registry/corpus edits. No other tools touched.

## Doctrine anchor

Every scrub follows the **whole-sentence-excision** doctrine (ledger item 84c): sentence boundaries computed from terminal punctuation, matched sentence replaced or removed in full, remaining sentences rejoined with single-space separators. No partial-token, phrase-level, or splice edits — the class of defect W25 admt attributed to (item 84) does not occur here.

## Class A — key-selection-mismatch audit (port of W24 admt Class A)

Runs AFTER `_w1_lia_wire` (registry-first pinpoint stamping). Per node:

| Node state | Action |
|---|---|
| `proposition_key` resolves in `LIA_VERIFIED_AUTHORITIES` and `citation_verified === true` | **Preserve verbatim** (already substituted by W1) |
| `proposition_key` on `LIA_UNANCHORED_PROPOSITIONS` and `write_around === true` | **Preserve** (W1 already nulled pinpoints) |
| `proposition_key` present but neither resolved nor unanchored | **Null pinpoints** (`citation`, `subsection`, `verbatim_quote`), set `citation_verified = false`, `pinpoint_omitted = true`. Omission over invention. |
| No `proposition_key`; `citation` string is syntactically truncated (unbalanced parens, trailing punctuation, bare `Art.`/`Article`/`§`) | **Null pinpoints** |
| No `proposition_key`; well-formed citation string | Leave untouched (no valid substitution candidate) |

Idempotent by `pinpoint_omitted` flag guard.

## Class B — unsupported-business-claim downgrade (port of W24 Class B)

Recursive walk of the report skipping reserved subtrees (`_meta`, `_staging`, `_drafting_record`, `_normalized_intake`, `_revision`, `deterministic_checks`, `annotations`, `lint_warnings`, `engagement_map`, `enforcement_meta`, `enforcement_precedents`, `enforcement_context`, `citation_ledger`) and identifier/anchor keys (`citation`, `subsection`, `verbatim_quote`, `governing_anchor`, `proposition_key`, `id`, `key`, `stamp`, `build_stamp`, `citation_verified`, `write_around`, `field`, `source_fields`, `provision`, `regulatory_citation`, `citations`).

For each prose string that matches `\b(confirms?|shows?|establishes?|demonstrates?|proves?|verifies)\b`:

1. Split into sentences on `[.!?]+`.
2. For each sentence containing an assertive verb:
   - Compute content tokens (≥4 chars, minus stopwords, minus assertive verbs and generic legal terms).
   - Check the flattened intake blob (recursive stringification of `liaIntakeObject`) for any token match (case-insensitive substring).
   - **Match ⇒ preserve verbatim** (intake-supported).
   - **No match ⇒ replace whole sentence** with `"The organisation should confirm whether the described position applies here."` This phrasing NEVER uses the words "information needed" (RULE 2.7 S1 preserved).
3. Rejoin sentences.

The neutral downgrade sentence itself is exempt from re-triggering on subsequent passes (idempotency guard).

## Integration point

`supabase/functions/run-li-assessment/index.ts` (~L1636): inserted between the existing `applyW1LiaWire` post-pass and `runEmitGate`. Try/catch fail-open — availability never blocked.

## Telemetry

Writes `_meta.internal.lia_t6fix = { version, stamp, build_stamp, classA_pinpoint_substitutions, classA_pinpoint_omissions, classB_downgrades, classB_preserved, sentences_excised, strings_scanned, errors }`. Preserved verbatim by the P2 serializer (schema `rs-lia-w1-2026-07-25` reduces top-level `_meta` and passes `_meta.internal` untouched — same channel as `lia_w1`).

## Tests

`supabase/functions/run-li-assessment/_lia_t6_fix.test.ts` — **15/15 green** (2026-07-25T23:14Z):

```
Class A: truncated 'Art. 6(' citation is nulled ... ok
Class A: unresolvable key nulls invented pinpoint ... ok
Class A: verified node (already substituted by W1) preserved ... ok
Class A: write-around node left alone ... ok
Class B: unsupported claim downgraded, prior sentence intact ... ok
Class B: intake-supported claim preserved ... ok
Class B: downgrade text does not use 'information needed' ... ok
Doctrine: whole-sentence excision, no splice residue ... ok
Anchor keys (citation/verbatim_quote) never treated as prose ... ok
Reserved subtrees (_meta, engagement_map, annotations) untouched ... ok
Idempotent: second pass makes no additional content changes ... ok
Fail-open on malformed input ... ok
Telemetry: _meta.internal.lia_t6fix written ... ok
_meta.internal preexisting keys preserved ... ok
isTruncatedCitation: shapes ... ok

ok | 15 passed | 0 failed
```

## Deploy guard snapshot

- Pre-deploy: `quality_runs where started_at > now()-1h and status in (running,pending,processing)` = 0.
- No active LIA quality batch; no in-flight T7 pilot batch.

## Files touched (single atomic scope)

- `supabase/functions/run-li-assessment/_lia_t6_fix.ts` — new module.
- `supabase/functions/run-li-assessment/_lia_t6_fix.test.ts` — new tests.
- `supabase/functions/run-li-assessment/index.ts` — BUILD_STAMP bump + integration seam (single try/catch block, ~10 lines).
- `docs/courier/LIA-T6-FIX-TURN-2026-07-25.md` — this file.
- `docs/pipeline-state.md` — ledger item 89 + header restamp.

## Queued (not this turn)

- Extend Class A pattern to `dpia` and `governance` (item 81(a) sibling backlog).
- Extend Class B scrub to `dpa-generator`, `dpia`, `governance`, `ir-playbook` (item 81(b) siblings).
- Emit-gate list-fragment calibration for LIA (item 81(e)).
- Post-fix measurement wave for LIA specifically (verify citation_misapplied and unsupported_business_claim counts drop).
