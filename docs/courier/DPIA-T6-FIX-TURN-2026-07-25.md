# DPIA-T6-FIX-TURN — 2026-07-25

**Dispatch id:** DPIA-T6-FIX-TURN-2026-07-25 (controller tick 23:26Z)
**Function:** `run-dpia-framework` (deploy-guarded, single-function turn)
**BUILD_STAMP:** `dpia-t6fix@2026-07-25T23:31:00Z` (sandbox clock re-read `2026-07-25T23:31:03Z` immediately pre-stamp; strictly-earlier doctrine honored per items 51/52)
**Ledger:** discharges T6-NONCPPA-MEASUREMENT-BATCH-1 (item 81) DPIA per-tool backlog items (a) `citation_misapplied` and (b) `unsupported_business_claim`; recorded as pipeline-state item 92.

## Scope

Two classes, one new module + colocated tests + minimal `index.ts` wire — nothing else.

- **Class A — key-selection-mismatch citation audit** (port of W24 admt Class A as adapted in item 89(A)). Runs AFTER `_w1_dpia_wire`, BEFORE the LEAK-PREV-P1 emit gate + P2 serializer. Verified / write-around nodes preserved; nodes with unresolvable `proposition_key` get `citation` / `subsection` / `verbatim_quote` nulled with `pinpoint_omitted=true`; keyless nodes with syntactically-truncated citation strings (unbalanced parens, trailing punctuation, bare `Art.` / `Article` / `§`) nulled. **Omission over invention** throughout — the module NEVER invents or completes a citation.

- **Class B — unsupported-business-claim scrub** (port of item 89(B)). Recursive walker; SKIPs reserved `_`-prefixed subtrees; `ANCHOR_KEYS` (`field`, `source_fields`, `citation`, `citations`, `regulatory_citation`, `verbatim_quote`, `provision`, `proposition_key`, `id`, `element_id`, `requirement_id`, `key`, `stamp`, `build_stamp`, `subsection`, `governing_anchor`, `citation_verified`, `write_around`) never treated as prose. Sentences containing `\b(confirms?|shows?|establishes?|demonstrates?|proves?|verifies)\b` downgraded to `"The organisation should confirm whether the described position applies here."` UNLESS a content token (≥4 chars, minus DPIA-tuned stopwords) appears in the flattened DPIA intake blob. Neutral downgrade phrase NEVER uses "information needed". Idempotent via neutral-sentence guard.

## Doctrine

Whole-sentence excision (item 84c) via `splitSentences` + `rejoin` — no partial excision, no splice residue. Regression-pinned by test "Doctrine: whole-sentence excision, no splice residue".

Fail-open try/catch at every helper, at module entry (`applyDpiaT6Fix`), and on the guarded dynamic `import()` in `index.ts`. Availability is never blocked.

## Telemetry

`_meta.internal.dpia_t6fix = { version, stamp, build_stamp, classA_pinpoint_substitutions, classA_pinpoint_omissions, classB_downgrades, classB_preserved, sentences_excised, strings_scanned, errors }` — survives the DPIA P2 whitelist serializer via the `_meta.internal` verbatim rule (schema unchanged).

## Tests — 15/15 green (verbatim)

```
running 15 tests from ./_dpia_t6_fix.test.ts
Class A: truncated 'Art. 35(' citation is nulled ... ok (1ms)
Class A: unresolvable key nulls invented pinpoint ... ok (0ms)
Class A: verified node (already substituted by W1) preserved ... ok (0ms)
Class A: write-around node left alone ... ok (0ms)
Class B: unsupported claim downgraded, prior sentence intact ... ok (1ms)
Class B: intake-supported claim preserved ... ok (0ms)
Class B: downgrade text does not use 'information needed' ... ok (0ms)
Doctrine: whole-sentence excision, no splice residue ... ok (0ms)
Anchor keys (citation/verbatim_quote) never treated as prose ... ok (0ms)
Reserved subtrees (_meta, engagement_map, annotations) untouched ... ok (0ms)
Idempotent: second pass makes no additional content changes ... ok (0ms)
Fail-open on malformed input ... ok (0ms)
Telemetry: _meta.internal.dpia_t6fix written ... ok (0ms)
_meta.internal preexisting keys preserved ... ok (0ms)
isTruncatedCitation: shapes ... ok (0ms)

ok | 15 passed | 0 failed (13ms)
```

## Deploy-guard snapshot (pre-deploy 2026-07-25T23:31:03Z)

- `quality_batch_runs (running/in_progress/queued)` = **0**
- `quality_runs (running/in_progress/queued)` = **0**
- `cppa_assessments (running/in_progress/processing/queued)` = **0**

Wave-27 (CPPA campaign) launches ~00:15Z; this deploy touches only `run-dpia-framework` (non-CPPA). Landed with ~44-minute margin.

## Boot-log proof (live edge-function logs)

```
2026-07-25T23:32:07Z INFO [qb9-rcb1] run-dpia-framework build active · core=3.10.3-w3-t4-inference-discipline · dpia=r1b2.4-ws6v21 · build_stamp=dpia-t6fix@2026-07-25T23:31:00Z
2026-07-25T23:32:07Z INFO {"evt":"dpia_build_stamp","build_stamp":"dpia-t6fix@2026-07-25T23:31:00Z"}
2026-07-25T23:32:07Z INFO [run-dpia-framework] boot dpia-t6fix@2026-07-25T23:31:00Z
```

All prior stage stamps (`W1_DPIA_WIRE_STAMP=w1-dpia-wire@2026-07-25T12:36:00Z`, emit-gate `eg-w1-2026-07-25`, serializer `rs-w1-2026-07-25`) echoed unchanged.

## Five-lens TEAM-REVIEWED + REPORT FLOW & PLAIN LANGUAGE

- **Correctness:** Class A preserves W1-verified and write-around nodes verbatim; only unresolvable / truncated pinpoints are nulled. Class B replaces one canonical neutral sentence; no invented content.
- **Safety:** No customer prose is authored; all edits are drop-only or single-sentence swaps.
- **Availability:** Fail-open at every layer; guarded import; module never throws.
- **Determinism:** Regex-and-set-driven; idempotent (neutral-sentence and `pinpoint_omitted` guards); regression-pinned.
- **Blast radius:** One function; telemetry additive; schema unchanged; serializer whitelist not edited.
- **REPORT FLOW & PLAIN LANGUAGE:** rejoin trims interstitial whitespace so no `"  "` / hanging-punctuation residue survives; plain SVO preserved on surviving sentences; no "information needed" phrasing added anywhere; anchor keys and reserved subtrees provably immune (regression-pinned by tests "Anchor keys never treated as prose" and "Reserved subtrees untouched").

## Prohibited surfaces — confirmed untouched

- Instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN — no rubric / grader / golden / contract / fixture / sample / registry / corpus edits; no sample regeneration.
- No Fable 5 anywhere.
- No CPPA functions (`run-admt-checker`, `run-cppa-risk-assessment`, `run-cyber-checker`).
- No T7 opening surfaces.
- No `_w1_dpia_wire` modification (composed downstream only).
- No other edge functions; no wave harness; no T6 measurement pipeline.
- No pricing / payment / design-tokens / customer-revision-path / signup changes.

## Files touched (single atomic commit)

- `supabase/functions/run-dpia-framework/_dpia_t6_fix.ts` (new, ~300 lines)
- `supabase/functions/run-dpia-framework/_dpia_t6_fix.test.ts` (new, 15 tests)
- `supabase/functions/run-dpia-framework/index.ts` (BUILD_STAMP bump + guarded import/wire, minimal lines)
- `docs/courier/DPIA-T6-FIX-TURN-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (item 92 + header restamp)

## Queue posture (unchanged by this turn)

- Governance Class A citation-audit sibling — QUEUED (own turn).
- Class B business-claim scrub siblings for `generate-dpa`, `run-governance-assessment`, `generate-ir-playbook` — each QUEUED (own turn).
- `h6_admt_governing_anchor` — QUEUED (own turn).
- T5 residual for § 7220 / § 7221 subdivision approval — OPEN.
- T7 step-2 admt opening wiring — HELD on CEO checkpoint + wave-27 pilot verification.

## Sandbox

Controller VM disk-full posture persists (per items 84–91); backend access routed via Lovable tools per Backend-access law.
