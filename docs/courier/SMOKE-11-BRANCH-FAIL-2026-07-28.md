# SMOKE #11 BRANCH FAIL — Evidence Rows Only (2026-07-28 ~01:36Z)

Controller dispatch: evidence only. No code changes, no deploy, no grader edits, no batch inserts. §22.1 counter unchanged **0/3** (all smokes #153–#163 non-evidential; counter opens at Stage C).

## Rows (controller-verified)

| Object | Id | State |
|---|---|---|
| `quality_batch_runs` | `184db50b-0770-427e-bc09-eac46174fec5` | inserted ~01:27Z (§18 shape), status=complete, phase=done, completed_at=01:36:30.847Z |
| `quality_runs` #163 | `f71b3069-2d03-44c6-9916-80466c2eef7d` | status=complete, error=NULL, 01:30:03.725Z → 01:36:20.452Z, score_overall=77.15, gpt_score_overall=79, checks 21/25 |
| `cppa_assessments` | `c5bc2f7f-a4cc-4e7a-96bc-54a48a003b72` | status=complete, retry_count=0, last_error=NULL, created 01:30:04.427Z → updated 01:35:32.919Z, E2E 5m28.49s |
| Build on wire | `ltp-risk-item215-value-screen-site@2026-07-28T02:15:00Z` | Item-215 stamp proven |

C/G divergence 1.85 (series: 15 / 22.15 / 1.85 — log for Stage-C divergence check). Clock contract HELD.

## Gates (three-part, per Item 215)

### (1) `shipped_surface_guard` — CLEAN

- mode=enforce, cut_violations=[], unowned_paths=[], enforce_violation=false.
- Third consecutive clean shipped-surface guard (Items 213 → 215 → 216).

### (2) `composition_finalize` — errored=TRUE (NEW class)

Verbatim:
- version=`composition-finalize@2026-07-28-item215`
- safe_version=`safe-finalize@2026-07-28-item215-vs-site`
- mode=enforce, budget_ms=15000, budget_exceeded=false, elapsed_ms=4
- **errored=TRUE**, enforce_violation=false
- error_kind=`CompositionHookAuditError`
- error_message=`"[composition-hook-audit] write-around branch was entered but LTP_TEST_FORCE_WRITE_AROUND is not set — unauthorized degradation path."`
- hits=[], fragment_omit_count=0, fragment_omit_paths=[]

First appearance on the wire.

### (3) `shipped_value_screen` — enforce_violation=TRUE (FIRST-EVER shipped-surface truncation catch)

Verbatim:
- version=`shipped-value-screen@2026-07-28-item215`
- mode=enforce, **enforce_violation=TRUE**
- hits=[{kind:`"truncated-slot-value"`, path:`"priority_actions[2].deadline_basis"`, match:`"We"`, context:`"We"`}]

Item-215 fix (a) proven working as designed. This is a REAL defect a customer would have seen — not a false positive. First-ever catch of the A.i #178 whole-value truncation class on the shipped projection, with exact path.

**BRANCH FAIL on gates (2) and (3).**

## Class read (evidence only, no fix invented)

- **The two failures chain.** `fragment_omit_count=0` yet a whole-value "We" slot shipped. Consistent sequence:
  1. `finalizeComposition` threw `CompositionHookAuditError`.
  2. `safe-finalize` absorbed the throw and restored `originalReport`.
  3. The fragment-omit repair (step 0 inside `finalizeComposition`) was DISCARDED with the rest of the finalize output.
  4. LEAK-PREV-P2 serialized the un-repaired composed object.
  5. Truncated slot shipped.

  Evidence-level implication: the safe-finalize restore path bypasses repairs, so any finalize throw un-does fragment-omit. Recorded as attribution, not as a fix directive.

- **`CompositionHookAuditError` itself.** The write-around branch (previously observed as Pass-1 telemetry `write_around=true` after the 75s clock cap, e.g. smokes #4/#10) is now audited and treated as unauthorized without `LTP_TEST_FORCE_WRITE_AROUND`. First run on the Item-215 build to traverse it. Whether the audit's authorization model is correct for production clock-cap write-arounds is a controller/CEO question — recorded only.

- **Producer of the "We" slot.** `priority_actions[2].deadline_basis` — same field family as the `emit_gate.unterminated_sentence` residuals on #162 (6× `priority_actions[*].deadline_basis`). Stage-C truncation-emitter hunt now has a live shipped-surface specimen with exact path.

## Stage-C candidates (record, no action)

- (a) safe-finalize restore-path repair bypass.
- (b) composition-hook-audit authorization model vs production write-around.
- (c) `priority_actions.deadline_basis` truncation emitter (specimen above).
- (d) C/G divergence series 15 / 22.15 / 1.85.

## Disposition

**HARD STOP for controller review.** No relaunch, no fix, no chain roll to 9b–12.
