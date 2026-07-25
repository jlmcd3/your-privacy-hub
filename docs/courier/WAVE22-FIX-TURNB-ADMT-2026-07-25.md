# WAVE22-FIX TURN B (cppa-admt) — Courier Report

**Date:** 2026-07-25T14:10:47Z
**Tool:** `run-admt-checker`
**BUILD_STAMP:** `w22-admt-turnb@2026-07-25T14:10:47Z`
**Instrument:** `gc-2026-07-25-s4-eu-uk-ca-au-sg` (FROZEN)
**TEAM-REVIEWED:** five-lens

## Scope

Deploy turn on `run-admt-checker` closing wave-22 admt findings
(`quality_run 7acaa8ad`, run 111, batch `8a2ec9d9`, campaign
`fd1be147`) plus the T1b backlog residuals from wave-21.

## Work items

- **P1 — registry-first substitution at gap/table call sites.**
  `_w22_admt_turnb.ts::substitutePinpointFromKey` fires when a
  customer-bucket entry (`notice_gaps`, `opt_out_gaps`, `access_gaps`,
  `deadline_table`, `documentation_to_maintain`, `top_3_actions`,
  `priority_actions`) carries a `proposition_key` AND a citation
  matching the neutral blanket range `11 CCR §§ 7200–7222`. Registry
  resolution via `resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk)`;
  the row's `subsection` and `verbatim_quote` replace the neutral range
  and any empty / catalog-placeholder verbatim/subsection. When no row
  exists the neutral range is preserved (never invented).
- **P2 — unresolved-authority phrase scrub.**
  `scrubUnresolvedFromStructured` removes the catalog phrase
  ("The applicable authority is not verified in our source registry; a
  specific citation is …") from structured citation fields
  (`subsection`, `verbatim_quote`, `provision`, `governing_anchor`) on
  every customer-bucket entry. Detection regex is tolerant of the
  wave-22 truncation ("… is …"). The gap signal survives in the
  entry's `citation` (either substituted per P1 or neutral).
- **P3 — build-stamp echo key registration.**
  `_meta.internal.admt_w22b` is written unconditionally by the
  orchestrator. The LEAK-PREV P2 whitelist serializer preserves the
  `_meta.internal` subtree verbatim (schema `rs-w1-2026-07-25` already
  declares `_meta` on top-level whitelist; reduction keeps only
  `internal`). Test `Serializer preservation: _meta.internal.admt_w22b
  survives report-serialize` proves survival.
- **P4 — e6_counsel_referral body-text class.**
  `scrubCounselProse` broadens the wave-21 detector by adding
  subject-first patterns ("Your Privacy Officer should …", "The
  business's legal team must …") via `COUNSEL_SUBJECT_RE` +
  `DUTY_TAIL_RE`. Sentence-level replacement with the neutral catalog
  phrase. Anchor keys (see below) are excluded from the walker.
- **P5 — § 7155(a)(1) submission-vs-timing (broadened).**
  `guardS7155InDeadlineTable` downgrades any deadline_table row whose
  `citation` includes `7155(a)(1)` AND whose label matches the
  broadened `CONTENT_ROW_RE`
  (submission-content / content-of-submission / what-to-submit /
  submission-elements / submission-requirements / submission-format /
  submission-fields / submission-methods). Timing rows are preserved.
- **P6 — h6_admt_governing_anchor completion.**
  `guardGoverningAnchorS7001` extends the W21 B4 § 7001 sole-anchor
  duty guard to the `provision` and `governing_anchor` fields on
  customer-facing entries. Downgrade fires only when every `+`-split
  component is a § 7001 definitional subsection AND the entry carries
  a duty verb.

## Guardrails observed

- Fail-open at every helper and at the orchestrator (all `try/catch`
  with silent non-fatal recovery; the top-level wrapper in `index.ts`
  logs a `console.warn` on any throw and continues).
- Anchor keys never mutated by prose walkers:
  `field`, `source_fields`, `citation`, `citations`,
  `regulatory_citation`, `verbatim_quote`, `provision`,
  `proposition_key`, `id`, `element_id`, `requirement_id`, `key`,
  `stamp`, `build_stamp`.
- Completed / correct pinpoint citations untouched — P1 only fires on
  the neutral blanket range; P2 only on the exact catalog phrase.
- LEAK-PREV P0-P2 stays live; telemetry lands **only** at
  `_meta.internal.admt_w22b`; the P2 whitelist serializer preserves
  `_meta.internal` verbatim.
- Instrument s4 FROZEN — no rubric/grader/golden/instrument edits, no
  sample regeneration, no Fable 5, no pricing/payment/design-tokens/
  customer-revision-path/signup edits.

## Telemetry (`_meta.internal.admt_w22b`)

```
{
  version, stamp,
  strings_scanned, pinpoint_substitutions, blanket_range_rewrites,
  internal_note_scrubs, stamp_echo_registered,
  counsel_referral_items, submission_timing_fixes,
  governing_anchor_completions
}
```

## Files touched (only)

- **New:** `supabase/functions/run-admt-checker/_w22_admt_turnb.ts`.
- **New:** `supabase/functions/_tests/w22-admt-turnb.test.ts`.
- **Edited:** `supabase/functions/run-admt-checker/index.ts` —
  BUILD_STAMP bump (L11) + import (L42) + `applyW22AdmtTurnB` apply
  block inserted after the W21 turnB apply and before the LEAK-PREV
  emit gate.
- **New:** `docs/courier/WAVE22-FIX-TURNB-ADMT-2026-07-25.md` (this file).
- **Edited:** `docs/pipeline-state.md` — Item 63 append + header restamp.

## Deploy-lock snapshots

- Immediately pre-deploy re-check `2026-07-25 14:05:23.106861+00`:
  `quality_batch_runs` running/pending = **0**;
  `report_versions` <15 min with `report_data IS NULL` = **0**.
- Post-wave-22 window (wave 22 COMPLETE 13:32:57Z; wave 23 expected
  ~15:30Z). Deploy completed well before.

## Deploy proof

`supabase--deploy_edge_functions` returned
`Successfully deployed edge functions: run-admt-checker`.

Post-deploy boot-log proof:
```
2026-07-25T14:11:33Z INFO {"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w22-admt-turnb@2026-07-25T14:10:47Z","va_version":"admt-va-w8-2026-07-24","va_rows":34}
2026-07-25T14:11:33Z INFO [run-admt-checker] boot build_stamp=w22-admt-turnb@2026-07-25T14:10:47Z
2026-07-25T14:11:33Z INFO {"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w22-admt-turnb@2026-07-25T14:10:47Z"}
```

## Test proof

```
running 17 tests from ./_tests/w22-admt-turnb.test.ts
P1: registry-first substitution for optout_offer ... ok
P1: notice_howworks resolves to § 7220 pinpoint via key ... ok
P1: unresolvable keys keep the neutral range (never invented) ... ok
P1: keyless entries with neutral range are NOT substituted ... ok
P2: unresolved-authority phrase removed from subsection field ... ok
P2 regression: phrase-absence across all customer-visible structured fields ... ok
P3: build-stamp echo key registered on _meta.internal.admt_w22b ... ok
P3: stamp is well-formed w22-admt-turnb@<utc> ... ok
P4: 'Your Privacy Officer should …' is scrubbed ... ok
P4: subject-first legal-team pattern is scrubbed ... ok
P5: submission-content row with § 7155(a)(1) is downgraded to neutral ... ok
P5: timing row with § 7155(a)(1) is preserved ... ok
P6: § 7001 sole governing_anchor with duty verb is downgraded ... ok
Anchor keys are immutable across walker even if they contain counsel words ... ok
Fail-open on null / non-object / missing buckets ... ok
Serializer preservation: _meta.internal.admt_w22b survives report-serialize ... ok
Internals surfaced ... ok

ok | 17 passed | 0 failed (14ms)
```

Wave-23 read window (~15:30Z) will measure efficacy on admt residuals.
