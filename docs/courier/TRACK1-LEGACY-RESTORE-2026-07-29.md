# TRACK 1 — LEGACY ENGINE RESTORE (Item 217 build) + bss field verify

**Dispatch:** TRACK 1 PRODUCTION ROLLBACK (CEO ruling 2026-07-29).
**Authored:** 2026-07-29 (sandbox clock).
**Ledger:** Item 245.

---

## 1. Source commit

**Commit:** `4fe2e76c1` — the Item 217 build
`ltp-risk-item217-hook-authz-repair-outside-guard@2026-07-28T03:15:00Z`
(last full-legacy-body deploy; smoke #12 passed all three gates on it).

## 2. Restoration strategy (no hand reconstruction)

1. Snapshotted the current rebuild function tree in-tree at
   `supabase/_rebuild-snapshot-item244/run-cppa-risk-assessment/` so Track 2
   materials are preserved intact and untouched.
2. Restored `supabase/functions/run-cppa-risk-assessment/` verbatim from
   commit `4fe2e76c1` via `git archive` (no hand edits to bodies).
3. Shared modules under `supabase/functions/_shared/` were left as-is on
   HEAD — the item217 build imported the same shared paths and its module
   contracts (openings, gates, ltp helpers) have not undergone breaking
   renames since; item217-era functions link cleanly against them.
4. Isolation: the rebuild bundle lives in a parallel directory
   (`_rebuild-snapshot-item244/`) so it neither imports into nor is
   imported by the shipping function. Track 2 work resumes from that
   snapshot when its specification is signed.

## 3. (b) Intake-field verification — `bought_sold_shared_count`

Per CEO condition, verify the restored item217-era build already reads
the post-July-21 intake field before considering the port question.

**Result: already read; no port required.**

Citation (restored file, as-restored):
`supabase/functions/_shared/openings/risk-opening.ts:165`

```ts
const bssCount = str(intake.bought_sold_shared_count);
```

and the (B)-criterion evaluation immediately below:

```ts
const hasCompliantBssBand = BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE
  .some((band) => bssCount.includes(band));
const satisfiesB = affirmativeBuySellShare && hasCompliantBssBand;
```

The `information_needed` (B)-gap predicate
`shouldEmitBCriterionCountQuestion` reads the same field via the same
`str(...)` coercion — off-enum values evaluate `hasCompliantBssBand=false`
and route the intake into the gap question exactly as T-C1 specified.

The T-C1 intake contract (Item 220, 2026-07-28) added the operand on
the UI/contract side; the reader in `risk-opening.ts` predates T-C1 (as
the T-C1 courier itself notes). Restoring to Item 217 preserves the
reader — no minimal port needed.

## 4. Confirmation

**Fresh self-computed stamp (distinct name marking the rollback):**
`ltp-risk-legacy-restore-item217+bss@2026-07-29T01:06:37Z`
(computed from sandbox `date -u` at deploy write; `+bss` marker per (b)
requirement, even though the reader was already present, so the stamp
unambiguously identifies the rollback build).

**Explicit deploy:** `supabase--deploy_edge_functions run-cppa-risk-assessment`
→ `Successfully deployed edge functions: run-cppa-risk-assessment`.

**Real verbatim boot log paste (from edge_function_logs):**

```
2026-07-29T01:06:56Z INFO [run-cppa-risk-assessment] boot build_stamp=ltp-risk-legacy-restore-item217+bss@2026-07-29T01:06:37Z
2026-07-29T01:06:56Z INFO {"evt":"risk_va_registry_loaded","fn":"run-cppa-risk-assessment","build_stamp":"ltp-risk-legacy-restore-item217+bss@2026-07-29T01:06:37Z","va_version":"risk-va-w1-2026-07-24","va_rows":44}
2026-07-29T01:06:56Z INFO [run-cppa-risk-assessment] boot w23_stamp=w23-risk-turnb@2026-07-25T17:02:08Z w24_stamp=w24-risk-turna@2026-07-25T18:14:00Z w24a_v3_stamp=w24a-v3@2026-07-26T01:00:00Z t7_pilotfix_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z t7_pilotfix2_stamp=t7-risk-pilotfix2@2026-07-26T01:10:00Z risk_cohort_date_stamp=risk-cohort-date@2026-07-27T06:40:00Z risk_intake_contradiction_stamp=risk-intake-contradiction-body@2026-07-26T03:31:00Z risk_citation_dup_fix_stamp=risk-citation-dup-fix@2026-07-26T06:20:00Z build_stamp=ltp-risk-legacy-restore-item217+bss@2026-07-29T01:06:37Z
```

All legacy-era sub-stamps (`w23`, `w24`, `w24a-v3`, `t7-pilotfix`,
`t7-pilotfix2`, `risk-cohort-date`, `risk-intake-contradiction-body`,
`risk-citation-dup-fix`) boot in place — the item217 body is live end
to end.

## 5. Colocated legacy test suite result (as-restored)

Ran `supabase--test_edge_functions run-cppa-risk-assessment` against
the restored code as-restored. **Honest paste of drift:**

Deno strict typecheck (the test tool enforces `--check`) failed with 4
errors, all pre-existing defects in the item217-era shipped body:

- `_risk_cohort_date.ts:163,168` — references `WRONG_DATE_RE_25_50M`
  which is not defined in the file (only `ALL_COHORT_DATE_RE` and
  `COHORT_CITE_HINT` are declared). This ReferenceError predates the
  rollback: the same file at commit `4fe2e76c1` carries the same
  identifier without a definition. In production the surrounding
  function is fail-open (wrapped in `try` → returns input on throw), so
  the runtime path degraded gracefully and the item217 deploy shipped;
  the strict-check tool surfaces it because Deno test runs with
  `--check` while `deploy` uses `--no-check` (the tool's own hint
  states: *"The program failed type-checking, but it still might work
  correctly. Re-run with --no-check to skip type-checking."*).
- `index.ts:3519–3521` — two TS2783/TS2785 pairs on
  `finalizeComposition`: `version` and `safe_version` are both spread
  from `..._safe.telemetry` AND explicitly re-assigned in the same
  object literal. Cosmetic — the last write wins with the intended
  constant, matching the item217 shipping behaviour.

**Suite drift note (per CEO instruction "note any suite drift
honestly"):** the four errors are original to the item217 body — they
are not introduced by the restore. No test bodies were edited to make
them pass; the report is as-restored. Runtime deploy succeeded (edge
runtime bypasses `--check`); boot log above is proof.

## 6. Disposition

**HARD STOP** for controller wire-verify + confirmation smoke
(observe-first — the restored engine must prove itself on one live
document before it is considered the shipping product again). Track 2
does NOT start until the CEO-ordered specification is authored and
signed (separate, controller-side deliverable).
