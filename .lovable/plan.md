## Status check

**Workstream A — Intake Standard (A1–A3): already complete** from prior sessions. `src/components/intake/` exists with `ChoiceRadio`, `ChoiceWithOther`, `StatuteRail`, `RailEntry`, `IntakeLayout`, `intakePolicy`; lint script `scripts/lint-rail-entries.ts` is wired as `npm run lint:rails`; ADMT `goodAnswer` rewrite landed. Nothing to redo there.

**Workstream B — Phase 2 Quality Loop Augmentation: not started.** This is the substantive remaining work. It's significantly larger and riskier than anything in A, so I want to confirm scope before I build.

## What B requires (in order)

**B1 — DB migration**
- New table `quality_fix_deliberations` (per-check four-team verdict ledger) + unique index on `(run_id, check_id)`.
- New table `quality_autoapply_tool_state` (per-tool runs_used/cap/enabled/target_branch/circuit-breaker score).
- RLS admin-only on both, mirroring `quality_check_results`.

**B2 — New edge function `deliberate-quality-fixes`**
- Input `{ run_id }`. For each failing candidate with a `proposed_fix`:
  - 4 parallel Claude persona calls (Teams 1–4) → stance + approve + rationale.
  - GPT-4o devil's-advocate challenge.
  - Verdict = `auto_eligible` iff T3 approve ∧ T4 approve ∧ devil's-advocate agrees; else `human_review` / `reject`.
  - Upsert into `quality_fix_deliberations`. Self-reinvoke chunking (same pattern as `run-quality-batch`).

**B3 — Extend tool coverage in the loop**
- Add scenario generators + `toolToEdgeFn` + `TOOL_FILE_PATH` for: `registration`, `ask-privacy`, `weekly-brief`, `custom-brief`, `trend-report`, `state-law`.
- Editorial-rubric variant: score accuracy + citation fidelity + no-adaptive-guidance; drop structured-field checks and zero `formatting` weight. Use editorial rubric for the editorial tools.
- Pipeline-only functions explicitly excluded.

**B4 — Parameterize apply path + branch helper**
- Extract `apply-quality-fix`'s ghGet → patch → ghPut into `_shared/github-apply.ts` (`applyPatchToBranch`).
- `apply-quality-fix` accepts optional `body.branch` (default `GITHUB_BRANCH`).
- `ensureBranch(branch)` helper — creates `quality-auto` from `main` HEAD if missing; idempotent.

**B5 — New edge function `auto-apply-fixes`**
- Input `{ run_id }`. Per tool: read `quality_autoapply_tool_state`; if `enabled && runs_used<cap (15)`:
  - `ensureBranch('quality-auto')`; for each `auto_eligible` deliberation row, call `applyPatchToBranch(..., 'quality-auto')`; mark `auto_applied`, `status='auto_applied'`.
  - Increment `runs_used`; at cap → `enabled=false`.
  - Circuit breaker: if `score_overall` dropped vs `last_score_overall` after an auto-apply → `enabled=false`. Update `last_score_overall`.
- Service-role; never calls admin-gated `apply-quality-fix`; never targets `main`.

**B6 — `QualityLoop.tsx` UI**
- "Run four-team deliberation" button → `deliberate-quality-fixes`.
- Per failing check: four team stances + devil's-advocate + T3/T4 approve flags + verdict badge with disagreements highlighted.
- Per-tool auto-apply strip (runs_used/cap, enabled, target branch) with **Halt** toggle.
- Manual Apply gated on `human_review`/`reject` → requires explicit override tick (recorded in `status`).
- "Promote `quality-auto` → main" control linking to GitHub compare/PR.

## Risks / assumptions to confirm

1. **GitHub secrets** (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`) — the prompt says confirm these are set; without them B4/B5 can't run end-to-end but I can still ship the code.
2. **OpenAI key for GPT-4o devil's-advocate** — same; need `OPENAI_API_KEY` configured.
3. The B3 `toolToEdgeFn` / `TOOL_FILE_PATH` extensions will touch `run-quality-batch` and `apply-quality-fix` substantively — I'll preserve their existing tool keys.
4. I'll write B5 as a **post-deliberation step invoked from `deliberate-quality-fixes`** (the prompt allows either), so the operator workflow stays a single button press unless you'd rather I make it a separate manual trigger from the UI.
5. Tables get `GRANT`s per project convention + RLS that mirrors `quality_check_results`.

## Proceed?

This is roughly a full session of work. Want me to:
- **(a)** Implement B1–B6 end-to-end now, or
- **(b)** Land it in slices (e.g. B1+B2 first, then B3, then B4+B5, then B6) so you can review/deploy between?