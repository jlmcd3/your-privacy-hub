
# WS6 v2.1 — Supplemental capture on regeneration

Scope: capture per-ask + general supplemental input on re-runs, persist onto `intake_data`, consume in all 8 generators, guard-safe, fixture-covered, and add QC-WS6-1 in the harness.

## Pre-flight (verify, record, then proceed)

Re-verify current stamps in code (record in commit message):
- `run-dpia-framework` STAMP (expect `r1b2.3`, sectioned U1–U5)
- `run-cppa-risk-assessment` STAMP (expect `r1b1.3`)
- `run-quality-batch` STAMP (expect `r1b1.4` poll-resume)
- Grep confirm `supplemental_responses` / `supplemental_context` appear nowhere. STOP + report if found.

## Change 1 — RefinePanel (shared UI, regeneration only)

Edit `src/components/refine/RefinePanel.tsx`:
- Add optional props: `priorInformationNeeded?: Array<{ ref_field?: string; ask: string }>` and `supplementalEnabled?: boolean` (default true when prop passed).
- New section "Supplemental information for this revision" rendered ONLY when `priorInformationNeeded` is non-empty OR always the single general box.
- Per prior entry: a labeled textarea (label = entry.ask / dimensions text), local state `responses[i]`.
- One general textarea "Anything else material to this revision" → local state `generalContext`.
- On regenerate: pass to `regenerate({ supplementalResponses, supplementalContext })` alongside `editedFields`.

Edit `src/hooks/useRegenerate.ts` to forward the two new fields into the payload written to `intake_data` as:
```
intake_data.supplemental_responses: [{ ref_field, ask, response }]
intake_data.supplemental_context: string
```
Empty entries are dropped; absent fields never written (first-run parity).

Wire each of the 9 tool pages to pass `priorInformationNeeded` derived from `report_data.information_needed`. Pages already import RefinePanel; only add the prop. If a page's refine path is not user-reachable, STOP for that page and report actual structure.

## Change 2 — Generator consumption (8 generators)

Add a single shared rule block in a new helper `supabase/functions/_shared/supplemental-rule.ts` exporting:
- `SUPPLEMENTAL_RULE_TEXT` (the "SUPPLEMENTAL RESPONSES" prompt rule)
- `formatSupplementalBlock(intake)` returning the rendered intake-side block (or "" when absent), so generators inject it into their intake payload consistently.

Rule text (canonical, injected verbatim in every emitting prompt):
> SUPPLEMENTAL RESPONSES: Each entry in `supplemental_responses` is the user's answer to a specific ask from the prior revision's `information_needed`. Treat each response as intake content for the referenced field's determination. It participates in contradiction detection and the assertions/believed-basis machinery unchanged. `supplemental_context` supplements enumerated answers; it never overrides them. When a supplemental response changed a determination in this revision, include one short acknowledgment clause naming the ask that was consumed.

Per generator:
- `run-dpia-framework` (SECTIONED, r1b2.3): inject the rule into the prompt builder of every emitting unit (U1, U2, U3, U4). Confirm U5's consistency duty treats supplement-driven deltas as reconcilable (add explicit clause). Supplemental data rides `intake_data` (already read by each unit via `readRow`) — never place prompt text in `_staging`.
- `run-cppa-risk-assessment` (r1b1.3): inject rule; supplements never flip a banded/mechanical test without the referenced enumerated field being re-selected in the UI (leverages `autoEditableFromIntake` — mark banded fields editable when a supplemental references them).
- `run-cppa-cybersecurity`, `run-admt-checker`, `run-governance-assessment`, `run-li-assessment`, `check-biometric-compliance`, `generate-ir-playbook`: inject the rule at each prompt build site.
- `generate-dpa`: same rule + DPA semantic — a supplemental response referencing a `[TO BE COMPLETED]` placeholder FILLS it (user value = intake); PLACEHOLDER NEUTRALITY guarantee stays byte-identical when no fill exists.

Acknowledgment clause: single sentence, injected by prompt discipline; no code-side templating.

## Change 3 — Guard, fixtures, QL2

Guard (`_shared/insufficient-info-guard.ts`): verify `supplemental_responses` / `supplemental_context` keys count as part of intake surface (auto-repair does NOT synthesise asks from their absence). If not already, extend the schema-surface list. Add a unit-style comment note.

Fixtures: add ≥1 re-run-with-supplements variant per family — one CPPA (risk), one GDPR-side (dpia or lia), one document tool (dpa). Fixtures carry `supplemental_responses` referencing a prior ask.

QC-WS6-1 in `run-quality-batch` (r1b1.4 poll-resume): deterministic check evaluated on the completed row post-resume. Assertion: for a revision whose fixture carries a supplemental response answering a prior `information_needed` entry, the new `information_needed` MUST NOT contain that entry AND the report MUST contain the acknowledgment clause naming it. Placed in the completion-phase deterministic pass, not the dispatch step.

Run QL2/harness re-run scenarios ONLY (never a full batch). Never deploy while runs are in flight.

## Verify + report

1. Per tool: file + line where RefinePanel supplement UI wires in; storage shape written; where SUPPLEMENTAL_RULE_TEXT lands; STOPPED tools listed with actual structure. For DPIA, quote rule text as it lands in each U1–U4 prompt builder.
2. Preview end-to-end: one CPPA Risk revision on TEST card — answer a prior info-needed entry, regenerate, confirm entry does not recur and quote the acknowledgment clause.
3. Guard behavior demonstrated both directions (with/without supplements → no synthetic asks).
4. QC-WS6-1 shown passing on a re-run harness scenario.
5. Confirm scope stayed inside refine/, tool pages, generators, guard, fixtures, QL2 files. D7/D8 standing. No deploys during in-flight runs.

## Technical notes

- Storage lives on `intake_data` (jsonb); no schema migration.
- No changes to `_staging` semantics (RLS leak prevention).
- Editable banding: extend `autoEditableFromIntake` outputs so any field referenced by a supplemental becomes editable on next refine (mechanical-test re-selection path).
- Type: add `SupplementalResponse` type to `src/lib/rerunHighlighting.ts` or a new `src/lib/supplemental.ts` shared with tool pages.
- Payload shape validated in `useRegenerate` before write; empty entries pruned.

## Out of scope

- First-run intake changes.
- New purchase/paywall UI (piggybacks on existing refine paths).
- Any change to `_staging` or RLS.
- Full-batch harness runs.
