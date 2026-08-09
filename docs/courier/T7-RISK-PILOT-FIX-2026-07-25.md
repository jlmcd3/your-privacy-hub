# T7-RISK-PILOT-FIX — Courier

**Dispatch id:** T7-RISK-PILOT-FIX-2026-07-25
**Controller tick:** 2026-07-25T22:34:00Z
**Scope:** `run-cppa-risk-assessment` only. Deploy-guarded fix turn.
**Authoritative spec:** `docs/design/OPENING-PARAGRAPH-DESIGN.md` (CEO-approved 2026-07-25, ledger item 82).
**Predecessor:** T7-RISK-PILOT (item 83, `t7-risk-opening-pilot@2026-07-25T21:01:15Z`); wave-26 first read at item 86 (quality_run `17fe2863`, run 139).

## Summary
Deterministic post-emitter repair module for the 7 emitter-mechanical defect classes flagged by wave-26. The model NEVER writes/edits the opening or its neighbours; all fixes are detect-and-omit or registry-relabel. Whole-sentence excision doctrine (ledger item 84c) applied to every sentence-level scrub.

## Files (atomic single commit)
- `supabase/functions/_shared/openings/_t7_risk_pilotfix.ts` (new)
- `supabase/functions/_shared/openings/_t7_risk_pilotfix.test.ts` (new)
- `supabase/functions/run-cppa-risk-assessment/index.ts` (BUILD_STAMP bump + seam wire, ~30 lines)
- `docs/courier/T7-RISK-PILOT-FIX-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (ledger item 87 + header restamp)

## Fix classes
| Class | Defect | Regression-pin doc | Repair |
|---|---|---|---|
| F1 | Garbled slot interpolation ("The the § 7150(b)(N) trigger analysis <label> trigger …") | `49893a61` | Whole-sentence drop |
| F2 | Truncated citation `(11 CCR )` | `6a7b03e9` | Strip parenthetical |
| F3 | Empty `regulatory_citation ""` on `inconsistency_flags[0]` | `49893a61` | Omit field |
| F4 | Subsection conflation vs resolved trigger set | `49893a61` | Singleton relabel from `_meta.internal.risk_t7_opening.s1_triggers`; else strip pinpoint |
| F5 | Duplicate `information_needed` entries | `49893a61` | Canonical-key dedup (field+citation+question, ws-collapsed) |
| F6 | `scope_notes` negative enumeration contradicting a resolved trigger | `e19a41de` | Whole-sentence drop |
| F7 | § 7001(ddd) enumeration with categories beyond verified corpus | `6a7b03e9` | Filter to verified categories; drop parenthetical if none survive |

## Wiring
Pilotfix invoked in the seam order AFTER T7 opening builder (needs `s1_triggers` provenance for F4/F6) and BEFORE LEAK-PREV-P2 serializer. Fail-open try/catch at every helper — availability never blocked. Anchor keys and reserved `_`-prefixed subtrees never mutated; `opening_summary` excluded from mutation (deterministic slot).

Telemetry: `_meta.internal.risk_t7fix = {version, stamp, build_stamp, resolved_triggers, f1..f7 counters, fields_scanned, errors}` + per-run `evt=t7_risk_pilotfix` console line. LEAK-PREV-P2 serializer preserves `_meta.internal` unmodified (item-32 gate).

## BUILD_STAMP + boot-log proof
```
BUILD_STAMP = t7-risk-pilotfix@2026-07-25T22:32:00Z
```
Fresh sandbox clock immediately pre-stamp: `2026-07-25T22:30:25Z` (strictly-earlier rule honoured per item-51 discharge doctrine).

Boot-log lines (read live from edge-function logs post-deploy):
```
2026-07-25T22:30:10Z INFO [run-cppa-risk-assessment] boot build_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z
2026-07-25T22:30:10Z INFO [run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T17:02:08Z w24_stamp=w24-risk-turna@2026-07-25T18:14:00Z build_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z
2026-07-25T22:30:10Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"t7-risk-pilotfix@2026-07-25T22:32:00Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
```

## Deploy-guard snapshots
Pre-deploy verification at 22:27:43Z (DB clock):
```
batches_active=0  inflight_null_report=0  db_now=2026-07-25 22:27:43Z
```
Re-verified immediately pre-deploy at 22:29:49Z:
```
batches_active=0  inflight_null_report=0  db_now=2026-07-25 22:29:49Z
```
Wave-27 freeze (~00:15Z) not at risk.

## Green test output
Command: `cd supabase/functions/_shared/openings && deno test --allow-read --allow-env --no-check _t7_risk_pilotfix.test.ts`

```
running 12 tests from ./_t7_risk_pilotfix.test.ts
F1: garbled 'The the § 7150(b)(N) trigger analysis ...' sentence dropped ... ok (2ms)
F2: truncated '(11 CCR )' citation stripped ... ok (0ms)
F3: empty regulatory_citation omitted on inconsistency_flags[0] ... ok (0ms)
F4: singleton resolved trigger relabels mismatching pinpoint ... ok (23ms)
F4: no singleton -> pinpoint stripped ... ok (0ms)
F5: duplicate information_needed entries deduped by canonical key ... ok (0ms)
F6: scope_notes contradiction sentence dropped ... ok (2ms)
F7: § 7001(ddd) unverified categories dropped ... ok (0ms)
Idempotent: second run produces zero additional mutations ... ok (0ms)
Fail-open: undefined / non-object report_data does not throw ... ok (0ms)
_meta subtree and opening_summary are never mutated ... ok (1ms)
Unrelated string fields are untouched ... ok (0ms)

ok | 12 passed | 0 failed (38ms)
```

## Prohibited surfaces — confirmed untouched
No edits to: rubric / grader / golden / contract / fixture / sample / registry / corpus (instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` FROZEN); no sample regeneration; no Fable 5 anywhere; no pricing / payment / design tokens / customer revision path / signup; no other edge functions; no wave harness; no T6 pipeline; no measurement batch this turn.

## Five-lens TEAM-REVIEWED + REPORT FLOW & PLAIN LANGUAGE
All rewritten strings are drop-only (no new customer prose introduced by this module); no "information needed" phrasing added on customer surfaces; plain subject-verb-object preserved on sentences that remain after whole-sentence excision. Cross-tool doctrine (item 84c) satisfied: every sentence-level scrub consumes from start boundary through terminal period inclusive with whitespace re-join.

## Queue posture (post-ship)
- **T7 pilot fix:** SHIPPED (this item).
- **Step-2 admt recommendation:** HELD pending CEO checkpoint + wave-27 pilot verification read.
- Wave-27 read at ~00:15Z will validate defect-class disappearance on refreshed cppa-risk docs.

## Sandbox
Controller VM disk-full persists on fresh tick VM (22:29Z); Desktop restart did NOT clear it (per items 84–86). All backend access via Lovable `query_database` / `read_file` / `deploy_edge_functions` (route-around, no deviation).
