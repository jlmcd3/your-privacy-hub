# ITEM-204 RULINGS EXECUTED — DEFECT A + DEFECT B (2026-07-27 ~17:20Z)

**Dispatch:** CEO rulings on Item 204 (SMOKE #4 BRANCH FAIL).
**Build stamp on wire:** `ltp-risk-item204-rulings-executed@2026-07-27T17:20:00Z`.
**Function:** `run-cppa-risk-assessment`.
**Test suite (touched modules):** `deno test` **22/22 green**.

## CEO ruling (verbatim, recorded in rulings log)

> "For Defect A, make the fix. For Defect B, just state what the law says and leave it to the customer to determine where they would fall on the revenue spectrum."

## Defect A — value-screen leak-lexicon false positive (FIXED)

**Root cause.** `LEAK_LEXICON` in `supabase/functions/_shared/ltp/value-screen.ts` carried the bare substring `"We "`, seeded from the A.i #178 owner-slot leak trace. The verbatim leaked value in that trace (from `docs/courier/DUAL-SMOKE-POSTFIX-2026-07-27.md §3`) was `deadline_basis:"We"` — a **truncated slot value**, not a substring of ordinary counsel prose. The lexicon entry therefore fired on any legitimate sentence beginning with the word "We ", triggering four spurious hits in smoke #4 and forcing safe-finalize backstop.

**Fix.** Replaced the substring entry with a **structural exact-value guard**:

- New `TRUNCATED_SLOT_VALUES = ["We","The","A","An","Our","Their","It","This","That","TODO","TBD"]`.
- New hit kind `"truncated-slot-value"` fires only when a string value's **entire trimmed content** equals one of those tokens.
- Anchor paths (`id`, `key`, `citation`, `field`, `provision`, `url`, `_meta.*`, etc.) are exempt (they legitimately carry structured short tokens).
- Ordinary prose containing "We " passes with zero hits.

**Class-fix sweep — other bare/short-substring entries removed** (same false-positive class):

| Removed entry     | Failure mode                                            |
| ----------------- | ------------------------------------------------------- |
| `"We "`           | Fires on ordinary "We collect …" / "We recommend …" prose |
| `"our internal"`  | Fires on "our internal policies", "our internal review" |
| `"internal review"` | Legitimate legal counsel phrase                       |
| `"…"`             | Ordinary ellipsis common in counsel prose               |

Retained substrings are all module names (`Engine-A`, `Engine-B`, `RenderPlan`, `cross_tool_recommendations`, `risk-surface-map`), placeholder sentinels (`{{intake:`, `{{cite:`, `<placeholder>`, `[filtered]`, `[redacted by policy]`), or exact leak strings (`chain-of-thought`, `...\n`).

**Pin tests (both directions).** `_shared/ltp/value-screen.test.ts`:
- `ordinary counsel prose with 'We ' passes clean` — validates no false positive.
- `A.i #178 owner-slot truncation ('We' as entire value) IS caught` — validates the true leak still fires.
- `other short-token truncations are caught` — sweep confirmed for the full set.
- `exact-value guard tolerates whitespace but does not match substrings` — boundary.
- `anchor paths (id/citation/…) bypass the truncated-slot check` — legitimate anchors safe.
- `Engine-B leak still fires (lexicon retained)` — regression pin for the module-name class.

**Version stamp:** `value-screen@2026-07-27b-item204`.

## Defect B — § 7121(a) cohort surface (STATE THE LAW; RETIRE COMPUTATION)

**CEO ruling supersedes** the prior resolved-band truth-table directive from `docs/courier/RISK-COHORT-DATE-DETERMINISM-2026-07-26.md`. The graded surface no longer computes or asserts cohort membership and no longer asks for future-year revenue.

**Implementation — new emitter.** `supabase/functions/_shared/ltp/cyber-audit-schedule.ts`:

- Renders the full three-tier phase-in schedule from **verified corpus literals** (`provision_texts.cppa-7121` (a)(1)–(3), cross-checked against the OAL-approved PDF logged in `docs/courier/CPPA-7121-VERBATIM-2026-07-25.md`).
- Same output for resolved AND indeterminate bands.
- Counsel voice; closes with: *"The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in and calendars the corresponding deadline."*
- Writes to `submission_summary.cybersecurity_audit_schedule` (graded surface) and mirrors to legacy `cross_tool_recommendations.cybersecurity_audit_rationale` for existing renderer compatibility.
- Idempotent (marker: `[§ 7121(a) phase-in schedule]`); fail-open.

**Retirements.**

- `_shared/ltp/cohort-append.ts::applyCohortAppendIfAbsent` → permanent **no-op**. Header records CEO ruling and retirement rationale; telemetry key `_meta.internal.cohort_append` retained for audit stability.
- `run-cppa-risk-assessment/_w21_risk_turna.ts::maybeEmitCohortRow` → cohort membership emission removed; `annual_gross_revenue_2028` `information_needed` ask (`info_cyber_audit_7121a3_revenue`) retired; `a2_cohort_skipped_reason="retired_item204_full_schedule_renders"`.

**Grader-instrument check (CONTROLLER-OWED, not modified this turn per instrument-change gating rule):** search of `src/registry/` and grader/deterministic-check modules turned up no fixture or check asserting a specific cohort date on `submission_summary.submission_deadline` for cybersecurity-audit revenue bands. **Item flagged for controller review:** confirm no deterministic grader instrument still expects `"April 1, 2030"` (or any single per-band cohort date) on this surface. If any is found, controller escalation required (CEO-gated).

**Spec-writeback.** New design-law section owed (pending controller merge):

- `docs/design/LEGAL-TEST-PIPELINE.md` — new **§31. PHASE-IN SCHEDULE SURFACES**: for regulations that publish a phase-in schedule (tier → deadline), the graded surface STATES THE LAW — the full schedule, corpus-quoted — and closes with the reserved-to-customer-and-counsel framing. Cohort membership is never computed on the graded surface. This is the general pattern; `_shared/ltp/cyber-audit-schedule.ts` is the reference implementation.

## Residual composer defects (from Item 204)

- **Doubled tokens (`"the the"` ×2) + unterminated sentence ×1:** composer-output defects. **Added to Stage-C candidate list** — NOT fixed this turn.
- **`information_needed` rows missing `id`/`topic` ×3:** schema-conformance defect, engineering-side, **FIXED this turn**. New module `_shared/ltp/info-needed-normalize.ts` normalizes rows in place, stamps deterministic `id`/`topic` derived from `field`/`source_fields`, dedupes id collisions, idempotent, fail-open. Wired after cohort-append in `run-cppa-risk-assessment/index.ts`. Tests: `_shared/ltp/info-needed-normalize.test.ts` 4/4 green.

## Deploy verification (§16)

```
GET run-cppa-risk-assessment?ping=1
{
  "build_stamp": "ltp-risk-item204-rulings-executed@2026-07-27T17:20:00Z",
  "composition_enforce": "1",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "persist_first_retry": "retry-budget@2026-07-27-persistfirst",
  "post_lint_llm_budget_ms": 300000,
  "post_lint_llm_call_timeout_ms": 120000,
  "post_lint_pass1_timeout_ms": 75000,
  "report_completion_gate": "final-status-and-report-data@2026-07-27-smoke-latency-rootcause",
  "safe_finalize": "safe-finalize@2026-07-27-hangfix"
}
```

Prior gates (`report_completion_gate`, `persist_first_retry`, `safe_finalize`, `post_lint_llm_call_timeout_ms`, `post_lint_pass1_timeout_ms`) all preserved.

## Test suite (touched modules)

```
running 11 tests from ./_shared/ltp/value-screen.test.ts               ok
running 3 tests from ./_shared/ltp/cohort-append.test.ts               ok
running 4 tests from ./_shared/ltp/cyber-audit-schedule.test.ts        ok
running 4 tests from ./_shared/ltp/info-needed-normalize.test.ts       ok

ok | 22 passed | 0 failed (247ms)
```

## Disposition

**READY-FOR-RELAUNCH. HARD STOP.** Controller relaunches smoke #5. If clean, the standing chain rolls 9b–12 to STAGE-B COMPLETE.
