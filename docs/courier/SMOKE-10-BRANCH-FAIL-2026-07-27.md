# SMOKE-#10 BRANCH FAIL — Item 214 (2026-07-28 ~01:10Z)

Evidence-only turn (controller dispatch). No code changes, no deploy, no grader edits.

## Rows (controller-verified against DB)

- Batch `quality_batch_runs cc1a4a7c-f00d-4779-8c64-a40995e5e204`:
  inserted 01:01:38.323Z (§18 shape, batch_size=1, declared_count=1),
  status=complete, phase=done, completed_at=2026-07-28 01:10:30.317Z.
- Run `quality_runs #162 3615fef8-c633-4b0e-812b-f09c94c2d352`:
  status=complete, error=NULL, started 01:04:02.361Z, completed
  01:10:22.703Z, score_overall=70.85, gpt_score_overall=93,
  checks_total=28 passed=22 failed=6. Mid-run poll-resume boundary at
  01:09:06 (isolate 1, 300s) worked as designed.
- Doc `quality_run_documents 7ed3c40a-70ea-4f92-acbe-c217ecdfbdcc`:
  source_row_id=`e291790c-2e6b-42f3-81a7-0558636e41d4`,
  status=complete, report present, doc-level C=70.85 / G=92.
- Assessment `cppa_assessments e291790c-2e6b-42f3-81a7-0558636e41d4`:
  status=complete, retry_count=0, last_error=NULL, created
  01:04:03.072Z → updated 01:09:33.041Z, E2E 5m29.97s — clock
  contract HELD.
- Build on wire:
  `ltp-risk-item213-unowned-site@2026-07-27T23:45:00Z` — Item-213
  stamp proven.

## Branch gate

- `shipped_surface_guard`: mode=enforce, `cut_violations=[]`,
  `unowned_paths=[]`, `enforce_violation=false` — FULLY CLEAN second
  consecutive run (Item-213 consolidation proven again).
- `composition_finalize` verbatim:
  - version=`composition-finalize@2026-07-27`
  - safe_version=`safe-finalize@2026-07-27-item206-hits`
  - mode=enforce, budget_ms=15000, budget_exceeded=false, elapsed_ms=4
  - **errored=TRUE**, **enforce_violation=TRUE**
  - error_kind=`ValueScreenError`
  - error_message=`[value-screen] 1 hit(s): leak-lexicon:cross_tool_recommendations`
  - fragment_omit_count=0, fragment_omit_paths=[]
  - hits=`[{kind:"leak-lexicon", path:"lint_warnings[0].field", match:"cross_tool_recommendations", context:"cross_tool_recommendations.cybersecurity_audit_rationale"}]`
- → **BRANCH FAIL** on `composition_finalize.errored=true`.

## Class read (evidence only — no fix)

Item-207 per-hit telemetry did its job — first run to print the exact
path. The leak-lexicon token `cross_tool_recommendations` (retained in
the Item 205 sweep) fired on `lint_warnings[0].field`, an INTERNAL
pre-serializer structure; the LEAK-PREV-P2 serializer strips
`lint_warnings` (present in this run's serializer `dropped_keys`).
The lint warning's `field` value references the legacy path
`cross_tool_recommendations.cybersecurity_audit_rationale` (whose
mirror write was removed in Item 209 — evidently a lint rule still
references it).

Same false-positive family as smokes #6 / #8 / #9: a pre-serializer
screen judging content the serializer strips from the shipped
surface. Shipped document itself conforms fully.

## Stage-C candidates (record, no action)

- C/G grader divergence on run #162 = 22.15 (70.85 vs 93). Log next
  to run #160's divergence of 15 for the Stage-C divergence check.
- Lint rule still referencing retired
  `cross_tool_recommendations.cybersecurity_audit_rationale` path.
- Non-evidential residuals: `emit_gate degraded_count=7`
  (unterminated_sentence: 6× `priority_actions[*].deadline_basis`,
  1× `benefits_outweigh_risks_conclusion` — known Stage-C
  truncation-emitter class; note `fragment_omit_paths=[]` so these
  are mid-string truncations, not whole-value slots).

## §22.1 counter

cppa-risk clean-arm counter unchanged **0/3** — smoke #10
non-evidential (all smokes #153–#162 non-evidential; counter opens
at Stage C).

## Disposition

**HARD STOP** for controller review. No relaunch, no fix, no chain
roll to 9b–12.
