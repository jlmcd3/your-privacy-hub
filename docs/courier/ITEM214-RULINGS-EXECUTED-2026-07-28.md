# ITEM 214 RULINGS EXECUTED — Item 215 (2026-07-28 ~02:20Z)

CEO ruling (verbatim, 2026-07-28): *"dispatch both fixes and let's smoke another one"*.

Two fixes landed in a single turn on `run-cppa-risk-assessment`; no
grader/instrument changes; no batch inserts. §22.1 counter unchanged 0/3.

## Fix (a) — VALUE-SCREEN ENFORCEMENT SITE CONSOLIDATION

Same consolidation pattern as Items 211 (CUT) and 213 (unowned): the
value-screen ENFORCE decision (leak-lexicon + truncated-slot-value +
statutory-text) moves from the pre-serializer composed object to the
post-serializer shipped projection at the Item-209 wire-site.

- `_shared/ltp/composition-finalize.ts`:
  - `finalizeComposition` no longer throws on value-screen hits in any
    mode. The `if (mode === "enforce" && screen.finalHits > 0) throw`
    is retired.
  - New `FinalizeTelemetry.pre_serializer_value_screen_pending:
    readonly ValueScreenHit[]` mirrors the
    `pre_serializer_cut_pending` / `pre_serializer_unowned_pending`
    precedent. Fragment-omit pre-pass (Item 206) still runs — it is a
    repair, not a screen.
  - New non-throwing helper
    `evaluateShippedValueScreen(shipped, { mode, corpusSnippets })`
    returns `{ version, mode, hits[], enforce_violation }`. Wire-site
    never throws (persist invariant).
  - New `SHIPPED_VALUE_SCREEN_VERSION =
    "shipped-value-screen@2026-07-28-item215"`.
  - Bumped `COMPOSITION_FINALIZE_VERSION` →
    `composition-finalize@2026-07-28-item215`.
  - Bumped `SAFE_FINALIZE_VERSION` →
    `safe-finalize@2026-07-28-item215-vs-site`.

- `supabase/functions/run-cppa-risk-assessment/index.ts`:
  - Wire-site block after `evaluateShippedSurfaceGuard` calls
    `evaluateShippedValueScreen(report_data, { mode })` and writes
    `_meta.internal.shipped_value_screen = { build_stamp, version,
    mode, hits[{kind,match,path,context}], enforce_violation }`.
  - Structured log `shipped_value_screen_ran` emits hit count, mode,
    enforce_violation, and per-hit `{kind, match, path}`.

## Fix (b) — STALE LINT RULE

- `_shared/ltp/composition-finalize.ts`: new `isRetiredSurfacePath(p)`
  helper — true iff a lint entry's `field` targets any
  `RISK_CUT_RULINGS` top-level prefix (e.g.
  `cross_tool_recommendations.*`, mirror write removed in Item 209).
- `run-cppa-risk-assessment/index.ts`: wire-site pre-scrub of
  `report_data.lint_warnings` drops entries whose `field` matches
  `isRetiredSurfacePath`. Log `lint_warnings_retired_surface_scrub`
  telemeters dropped count. Retired surfaces are never referenced in
  lint output that could survive downstream, and the wire-site
  screen sees only live-surface entries.

## Regression tests (all in `_shared/ltp/composition-finalize.test.ts`)

- **SMOKE-#10 exact shape**: composed object with
  `lint_warnings[0].field="cross_tool_recommendations.cybersecurity_audit_rationale"`
  → `finalize errored=false, enforce_violation=false`, hit telemetered
  on `pre_serializer_value_screen_pending`.
- Shipped projection containing a genuine leak-lexicon token FAILS
  `evaluateShippedValueScreen` in enforce (`enforce_violation=true`).
- Truncated-slot-value on shipped projection FAILS in enforce; both
  directions covered.
- Fragment-omit pre-pass (Item 206) still runs pre-serializer and
  removes whole-value truncation slots — unchanged.
- Existing shipped-surface-guard tests (Items 208/211/213) stay green.
- `isRetiredSurfacePath` matches CUT prefixes, rejects live paths,
  handles undefined/empty.
- `evaluateShippedValueScreen` NEVER throws (circular-ref smoke).

**deno test result: 45/45 passed** (34 finalize + 11 value-screen).

## Deploy & §16 ping-prove

- Deployed `run-cppa-risk-assessment` with
  `BUILD_STAMP="ltp-risk-item215-value-screen-site@2026-07-28T02:15:00Z"`.
- §16 ping response verbatim:
  - `build_stamp: "ltp-risk-item215-value-screen-site@2026-07-28T02:15:00Z"`
  - `composition_enforce: "1"`
  - `ltp_mode: "enforce"`
  - `safe_finalize: "safe-finalize@2026-07-28-item215-vs-site"`
  - `report_completion_gate:
    "final-status-and-report-data@2026-07-27-smoke-latency-rootcause"`
  - `persist_first_retry: "retry-budget@2026-07-27-persistfirst"`
- All prior gates preserved.

## Scope discipline

Touched ONLY: `_shared/ltp/composition-finalize.ts`,
`_shared/ltp/composition-finalize.test.ts`,
`run-cppa-risk-assessment/index.ts`. No changes to
`value-screen.ts` / graders / instruments / batch rows.

## Branch gate expectation on next smoke

`composition_finalize.errored` will be `false` regardless of any
pre-serializer value-screen hit; enforce authority for the value-screen
class now sits on `_meta.internal.shipped_value_screen.enforce_violation`
against the shipped projection.

**Disposition: READY-FOR-RELAUNCH. HARD STOP.** Controller launches
smoke #11.
