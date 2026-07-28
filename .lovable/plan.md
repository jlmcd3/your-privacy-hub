
# ITEM 242 — BATCH-OF-THREE FIX SET — EXECUTION PLAN

Requesting controller sign-off on the split before wiring. Seven independent defect classes; two require content/registry decisions that outrun a single autonomous turn. Proposing three checkpoints so each ships with verify-first evidence, joint tests, and the courier text CEO expects verbatim.

## Verify-first findings (already surveyed this turn)

- **Defect 1 (submission_summary § 7120(b) posture):** `harvest-guard.ts` has a `submission_summary` harvest key; `waveb-completion.ts` populates `submission_basis` with the § 7121(a) cyber-audit linkage from M4/M5; `cyber-audit-schedule.ts` writes `cybersecurity_audit_schedule`. **Neither writes a § 7120(b)(1)/(b)(2)(B) resolved posture per M4/M5 state.** Root cause: no composer for `submission_summary` in `section-composers/cppa-risk.ts` and no template in `pass2-templates.ts` for the § 7120(b) prong posture. Regression source: never wired.
- **Defect 3 (neg.e economic_harms guidance_refs):** `cppa-risk-factors.ts:244-252` — row anchor is `(a)(5)(E)`; the sole guidance_ref is `(a)(5)(F)` p.36 with anchor_hint “‘based upon profiling’ added to clarify economic injury.” Comment already flags the mismatch. FSOR sweep needed to decide: (i) re-key guidance to `(a)(5)(E)` if provision_texts confirms the p.36 commentary discusses (E), or (ii) retag the row honestly. **Requires reading cppa_fsor_commentary row on p.36 to decide honestly.**
- **Defect 4 (gap-applicability):** `composePriorityActions` in `section-composers/cppa-risk.ts:307-380` emits an action for every absent factor and every non-passing factual gate, with no applicability filter. ADMT actions leak when `q18=No`. Fix: gate emission on `plan.gate_outcomes` (block/not_applicable on the governing applicability gate suppresses the action).
- **Defect 6 (record_sufficiency closer):** template `T.risk.record_sufficiency.prose` in `pass2-templates.ts` — closer sentence hardcoded; opener conditional on `sufficiency_clause`. Fix: single sufficiency slot drives both.
- **Defect 7 (action mechanics):**
  - Owner slot missing entirely from `T.risk.priority_action.golden` context (`section-composers/cppa-risk.ts:365-379`).
  - `deadlineForAction()` returns `d.ongoing_processing` for everything except ADMT and documentation gates → all `neg.*`/`safe.*` actions collapse to “ongoing.” Fix: cohort-aware selector reading § 7155(a)/(b)/(c) rows for assessment-record actions.
  - Factual-gate actions use `label = g.gate_id.replace(/^G\.documentation\./,'')` and hardcoded `11 CCR § 7152(a)` — must use gate registry display + per-gate pinpoints `(a)(1)/(a)(2)/(a)(3)/(a)(9)`.
- **Defect 2 (action diversity):** `composePriorityActions` emits identical `T.risk.priority_action.golden` for every source with `element_is not present` phrasing. Need per-kind variants and family-consolidation (one action per absent-harm family, one per absent-safeguard family).
- **Defect 5 (Pass-1 judgment hygiene):** field-semantics glossary is prompt content requiring CEO courier gating; present/note coherence screen is a validator layer; invented-characterization patterns are value-screen additions. Purely additive; safe in a later checkpoint.

## Proposed split

### Checkpoint 242.A — Deterministic composer & registry fixes (this turn if approved)

Scope: defects **4, 6, 7** plus the **defect 3 verify-first read** (report finding; fix only if provision_texts confirms).

Files:
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` — gap-applicability filter (defect 4); owner slot from `i7_internal_contributors` (defect 7a); cohort-aware `deadlineForAction()` consuming § 7155 rows (defect 7b); gate-registry display + per-gate pinpoints (defect 7c).
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` — record_sufficiency closer bound to single `sufficiency_clause` (defect 6).
- `supabase/functions/_shared/ltp/slot-resolver.ts` — owner slot resolver; sufficiency_clause exposed to closer.
- `supabase/functions/_shared/legal-test/cppa-risk-factors.ts` — defect 3 fix conditional on provision_texts read.
- `supabase/functions/_shared/legal-test/registry-anchor-consistency.test.ts` — extend to guidance_refs subsection family match.
- New joint tests: `item242-gap-applicability.test.ts` (q18=No → zero ADMT actions), `item242-record-sufficiency.test.ts` (contradiction assert), `item242-action-mechanics.test.ts` (owner present, deadline per cohort, pinpoints from gate).

### Checkpoint 242.B — Submission prong posture + action diversity (next dispatch)

Scope: defects **1, 2**.

Files:
- New `submission_summary` composer emitting a template instance per resolved § 7120(b)(1) and § 7120(b)(2)(B) marker (met / not_met / not_applicable).
- New templates `T.risk.submission.b1_posture`, `T.risk.submission.b2b_posture` — text needs CEO verbatim in courier before wiring.
- `composePriorityActions` per-kind variants + family-consolidation targeting ~11 diverse actions; move-2 renders real ledger `display` verbatim.
- Joint tests per marker state; intra-section repeated-opener assert (loop2 L4).

### Checkpoint 242.C — Pass-1 judgment hygiene (docs-anchored)

Scope: defect **5**.

Files:
- `supabase/functions/_shared/ltp/content/pass1-derive-prompt.ts` — field-semantics glossary (courier §5.1 verbatim).
- New validator `pass1-present-note-coherence.ts` — flag present_in_intake=true with weight_note naming only contradicting evidence.
- `supabase/functions/_shared/ltp/value-screen.ts` — invented-characterization patterns where structurally detectable.
- Courier text for glossary + patterns must be CEO-signed before wiring (mirrors 241.2→241.3 protocol).

## Rationale for the split

- 242.A is fully deterministic; every change is registry/composer/template mechanics against verifiable current-state evidence.
- 242.B needs new template text (§ 7120(b) posture prose × 3 states × 2 markers = 6 sentences) and action-diversity template families — CEO expects verbatim review, not agent-authored prose landing in shipped documents (per Item 241.2→241.3 protocol).
- 242.C is docs-first for the same reason: the derive-prompt glossary is change-controlled content anchored to the courier.

## Deliverables per checkpoint

Each checkpoint: verify-first citations, full diff, verbatim new registry/template text in the courier for CEO review, full suite ZERO failures with new asserts pasted, fresh stamp, EXPLICIT deploy, REAL verbatim boot ping, ledger + courier files.

## HARD STOP

Awaiting controller ruling: (a) approve the A/B/C split and release 242.A now, or (b) direct that 242.A + 242.B + 242.C ship in a single turn (with the understanding that new template prose lands without CEO pre-review), or (c) revise the split.
