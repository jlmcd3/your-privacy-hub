# PROSE FRAME LIBRARY — reviewer guide (Item 338, PROSE PROGRAM 2 of 4)

Version: `prose-frames-2026-08-01-item338`

## What a frame is

A frame is a pinned narrative shape: prose with typed placeholders and nothing else.
Frames are harvested from the July quality-loop2 `sample_reports` corpus, which is a
**STYLE DONOR ONLY**. Those documents predate the corpus corrections and were scored by a
broken loop, so **no fact, citation, or legal standard from them may reach a customer.**

A frame may carry:

- prose shape, transitions, and ordering;
- typed placeholders filled from the customer's own record;
- `{{CITE:proposition_key}}` slots filled ONLY from the verified-authority registry, re-queried at build time.

A frame may NOT carry a citation, a statutory quote, a legal-standard paraphrase, or a
regulator/authority assertion. That is enforced by `lintFrame()` in
`supabase/functions/_shared/prose/frames.ts` — a hard gate with tests, not a convention.

## Placeholder types

| Type    | Rendering rule |
| ------- | -------------- |
| `text`  | record free text, reproduced VERBATIM and visibly quoted |
| `enum`  | normalised answer, rendered through the Item 337 product adapter |
| `list`  | array of record values, natural joiners with Oxford comma |
| `date`  | record date, verbatim |
| `count` | record count/band, verbatim |
| `cite`  | registry only; never a record value, never a literal |

## Laws the realizer enforces

1. **VERBATIM LAW** — record free text is never punctuation-stripped or case-folded, and is quoted so a reader can tell the company's words from ours.
2. **REGISTRY-ONLY CITES** — a `{{CITE}}` slot is filled by the caller's registry resolver. No resolver, no citation.
3. **FILL-OR-OMIT** — a frame whose *required* placeholder is silent on the record does not render half-filled. It degrades to the "not stated on the record" path and reports the missing items (MANDATORY DEGRADATION LAW).
4. **APPROVAL GATE** — `frameSetRenderable()` is false unless the set is `approved: true`, every frame is `status: "approved"`, and the whole set is lint-clean. Approval happens only after a CEO sign-off is recorded in the ledger.

## Pipeline

| Stage | Where |
| ----- | ----- |
| ALIGN + DE-FACT + STRIP LEGAL | `scripts/frames/harvest-frames.mjs <tool_slug> --write` |
| LINT (offline report) | `scripts/frames/lint-frames.ts` |
| LINT (test gate) | `supabase/functions/_shared/prose/frames.test.ts` |
| BEFORE/AFTER pair | `scripts/frames/before-after.ts <sample_report_id>` |
| RUNTIME realizer | `supabase/functions/_shared/prose/frame-render.ts` |

Candidate output lands in `supabase/functions/_shared/prose/frames/<tool>.candidates.json`
(unreviewed, never imported by runtime code). A reviewed set lands as a typed module —
today only `frames/cppa-risk.frames.ts`.

## Reviewed set — cppa-risk (status: pending_review, set approved: false)

| Frame id | Section | Placeholders | Provenance (sample_report_id → path) |
| --- | --- | --- | --- |
| `cppa-risk.processing_narrative.001` | processing_narrative | ENTITY, ACTIVITY, DATA_CATEGORIES:list, SOURCE_CLAUSE, RETENTION_PERIOD, CITE_1:cite | draft (exemplars: li_assessment, dpia) — `a7689621…` → `risk_assessment_by_activity[0].purpose` |
| `cppa-risk.record_echo.001` | record_echo | ENTITY, COUNT, VENDORS:list, SAFEGUARDS:list | `a7689621…` → `risk_assessment_by_activity[0].current_safeguards` |
| `cppa-risk.scope_notes.001` | scope_notes | ACTIVITY, VENDORS:list, CITE_1:cite | `2990f12a…` → `scope_and_triggers.scope_notes` |
| `cppa-risk.benefits_rationale.001` | benefits_rationale | BENEFITS, LIKELIHOOD:enum, SEVERITY:enum, CITE_1:cite | `36220b11…` → `risk_assessment_by_activity[0].benefits_outweigh_risks_rationale` |

Sign-off artifact: `docs/reviews/FRAMES-BEFORE-AFTER-cppa-risk-2026-08-01.md`.

## Sequencing (dispatch order, worst readers first)

1. cppa-risk — processing / record-echo — **reviewed set drafted, awaiting sign-off**
2. dpia — candidates harvested
3. governance — candidates harvested
4. registration — no donor rows; frames must be drafted fresh
5. remainder (ir_playbook, li_assessment, cppa_admt, cppa_cyber, biometric, dpa excluded)

No product's renderer flips to frames until its sign-off is recorded in the ledger.
