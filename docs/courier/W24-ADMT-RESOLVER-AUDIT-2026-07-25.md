# W24-ADMT-RESOLVER-AUDIT — 2026-07-25

**Dispatch:** `W24-ADMT-RESOLVER-AUDIT-2026-07-25` (controller tick 18:35Z; five-lens TEAM-REVIEWED)
**Deploy target:** `run-admt-checker` (only)
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — FROZEN (product code only this turn)
**BUILD_STAMP:** `w24-admt-audit@2026-07-25T18:39:43Z`
**Deployed:** 2026-07-25T18:40:56Z (Cloud deploy success)

## Pre-deploy lock snapshot (2026-07-25T18:40:24Z)

```
qb_active     | 0
admt_pending  | 0   (cppa_assessments with report_data IS NULL AND created_at > now()-'15 min')
```

## Boot log (2026-07-25T18:41:10Z)

```
[run-admt-checker] boot build_stamp=w24-admt-audit@2026-07-25T18:39:43Z
{"evt":"admt_build_stamp","fn":"run-admt-checker","build_stamp":"w24-admt-audit@2026-07-25T18:39:43Z"}
{"evt":"admt_va_registry_loaded","fn":"run-admt-checker","build_stamp":"w24-admt-audit@2026-07-25T18:39:43Z","va_version":"admt-va-w8-2026-07-24","va_rows":34}
```

## Scope guard

- **In scope:** Class A resolver key-selection audit at call sites (drop resolved stamp on same-section subdivision mismatch); Class B `rubric_unsupported_business_claim` guard on admt customer prose; Class C `rubric_actionability` audit on `priority_actions`/`top_3_actions`.
- **Out of scope (own turns per dispatch):** `h6_admt_governing_anchor`, `h7_admt_blanket_range` (blanket "§§ 7200–7222" range). Remain QUEUED.

## Wave-24 evidence (run 113, quality_run `f2c7deca`)

Findings pulled directly from `quality_check_results` for tool `cppa-admt`:

- `rubric_citation_misapplied` — tuning 2 / holdout 2. Two subclasses:
  1. Blanket range `11 CCR §§ 7200–7222` where verified pinpoints exist — **defer to h7 turn per scope guard**.
  2. **`top_3_actions[1]` `proposition_key="ra_trigger_admt"` (resolves § 7150(b)(3)) but action prose references § 7150(b)(1) and § 7150(b)(2)** — addressed by Class A.
- `rubric_unsupported_business_claim` — tuning 2 / holdout 2. Assertive negatives such as:
  - "the business does not sell or share personal information" (intake silent).
  - "The intake explicitly records this as not described." (intake never records that).
  - "The record does not track per-consumer use frequency" (invented negative fact).
- `rubric_actionability` — tuning 2 / holdout 2. Pure-deferral action rows (`We could not verify this item …`) with no concrete step; priority actions lacking pinpoint pass-through from resolved subsection.

## Per-call-site audit — Class A (resolver key-selection)

| # | Call site | File / line | Selects proposition_key from | Post-turn behaviour on mismatch |
|---|---|---|---|---|
| 1 | Findings walker (registry-first pass) | `index.ts` L1977–2050 | Model-emitted `it.proposition_key` on gap/finding entries; falls back to citation-string reverse lookup. | Existing `_va_stamp_unresolved` path retained. **Now also** subject to `applyW24AdmtAudit` Class A downstream — if the entry's prose names a different subdivision of the same parent section as the resolved subsection, the stamp is dropped and `_va_stamp_unresolved.reason="key_selection_mismatch"` is recorded. |
| 2 | Scope-answer bucket | `index.ts` L2061–2079 | `sa.is_admt_proposition_key` (single-object). | Same downstream audit. |
| 3 | W9 slot builder | `_w9_admt_slots.ts` L100/L110 | Deterministic `pk` per slot definition — registry lookup only. | Deterministic per-slot map — no free-choice by model — audit safe (mismatch impossible by construction; scanned but never flagged in the tuning set). |
| 4 | W19 turnA registry-first pass | `_w19_admt_turna.ts` L171 | Model-emitted `proposition_key`. | Same downstream audit. |
| 5 | W21 turnB regen pass | `_w21_admt_turnb.ts` L183 | Model-emitted `proposition_key` on regen. | Same downstream audit. |
| 6 | W22 turnB backlog folding | `_w22_admt_turnb.ts` L113 | Model-emitted `proposition_key`. | Same downstream audit. |
| 7 | W23 turnA resolveOrDropEmptyCitation | `_w23_admt_turna.ts` L161 | Model-emitted `proposition_key`. | Same downstream audit. |
| 8 | W24 attr-fix rewriteOrDropUnresolvedTemplate | `_w24_admt_attr_fix.ts` L135 | Entry-level `proposition_key` (registry-first substitution for fallback phrase). | Registry substitution unchanged; if a later mismatch is detected downstream, the substitution is orphaned only in this entry's citation slot (already cleared by Class A). |

**Verdict:** Selection sites 1, 2, 4, 5, 6, 7, 8 all consume a MODEL-emitted `proposition_key`; the failure mode is the model naming the wrong subdivision. Rather than second-guessing the model per-site (which risks silently rewriting citations), the audit runs post-generation across every emitted entry and drops the resolved stamp only when there is textual evidence in the entry's own prose that a different subdivision was intended. Site 3 is deterministic and cannot mismatch by construction.

**No registry or corpus content defects surfaced by this audit.** The wave-24 sample where `ra_trigger_admt` was mis-selected was a model-side selection error, not a registry mis-mapping (`admt-verified-authorities.ts` `ra_trigger_admt` correctly resolves to § 7150(b)(3), i.e. the significant-decision-by-ADMT trigger). No content edits required.

## Per-class before/after evidence

### Class A — `ra_trigger_admt` regression pin (doc reference from tuning sample)

**Before** (wave-24 evidence quote):
> "In `top_3_actions[1]`, the action is 'Confirm and document whether AdPicker personal information is sold or shared (risk-assessment trigger § 7150(b)(1)) and whether contextual signals include sensitive personal information (trigger § 7150(b)(2))' but the citation field reads '11 CCR § 7150(b)(3)'. The proposition_key is 'ra_trigger_admt'."

**After** (product code + regression pin `A: orchestrator drops stamp and clears citation on mismatch`):
- `detectKeySelectionMismatch("Confirm AdPicker triggers § 7150(b)(1) and § 7150(b)(2).", "11 CCR § 7150(b)(3)")` → `{mismatch:true, expected:"7150(b)(3)", found:["7150(b)(1)","7150(b)(2)"]}`
- `_va_stamp` removed; `citation`, `regulatory_citation`, `verbatim_quote`, `subsection` cleared; `_va_stamp_unresolved={proposition_key:"ra_trigger_admt", reason:"key_selection_mismatch"}` recorded. Neutral fallback path takes over — customer surface no longer carries a misapplied pinpoint.

### Class B — unsupported business claim (three regression pins)

| # | Input sentence (wave-24 evidence) | Intake corpus | Post-turn output |
|---|---|---|---|
| 1 | "In addition, the business does not sell or share personal information." | silent on sell/share | "In addition, The intake does not include information sufficient to confirm this item." |
| 2 | "The intake explicitly records this as not described." | any | "The intake does not include information sufficient to confirm this item." |
| 3 | "The record does not track per-consumer use frequency, so the threshold cannot be determined." | any | "The intake does not include information sufficient to confirm this item." |
| 4 | "The business does not sell or share personal information under this program." | contains "the business does not sell or share personal information; confirmed by controller" | **PRESERVED** (intake supports ≥ ceil(topics/2) content tokens) |
| 5 | "The business does not use the applicable ADMT-subchapter provision here." | any | **PRESERVED** (neutral fallback carve-out) |

### Class C — actionability

| # | Input entry | Post-turn action text |
|---|---|---|
| 1 | `{action:"Adopt and document a trade-secret carve-out policy", _va_stamp:{subsection:"11 CCR § 7222(c)(1)"}}` | `"Adopt and document a trade-secret carve-out policy (see 11 CCR § 7222(c)(1))."` |
| 2 | `{action:"Cite § 7222(c)(1) in the policy.", _va_stamp:{subsection:"11 CCR § 7222(c)(1)"}}` | unchanged (already carries § token) |
| 3 | `{field:"access_timeline", action:"We could not verify this item from the information provided; it is listed under information needed."}` | `"Confirm and document access timeline; we could not verify this item from the information provided; it is listed under information needed."` |

## Standard riders honoured

- New module `_w24_admt_audit.ts` wired AFTER `_w24_admt_attr_fix` and BEFORE the LEAK-PREV-P1 emit gate (`index.ts` after the W24 attr-fix block, before `runEmitGate`).
- Fail-open at every helper and the orchestrator (`try/catch + console.warn`).
- Anchor keys never mutated by prose walkers (Class A alone clears citation-carrying anchors, and only on a confirmed mismatch).
- LEAK-PREV P0–P2 intact; telemetry ONLY under `_meta.internal.admt_w24_audit`; item-32 gate honored (whitelist serializer preserves `_meta.internal` verbatim — no schema edit).
- Fresh sandbox clock (`date -u`) for BUILD_STAMP immediately before build; echoed in boot log above.
- Idempotency: entries tagged `_w24_audit_ran=true`; second invocation is a no-op beyond stamp echo.

## Test run (colocated deno, pasted green)

```text
$ deno test --allow-net --allow-env --no-check _w24_admt_audit.test.ts
running 21 tests from ./_w24_admt_audit.test.ts
stamp format ... ok (0ms)
A: extractPinpoints picks up § 7150(b)(1) and § 7150(b)(2) ... ok (21ms)
A: normalizeSubsectionPinpoint extracts from '11 CCR § 7150(b)(3)' ... ok (0ms)
A: regression pin — ra_trigger_admt entry mismatched against (b)(1)/(b)(2) prose ... ok (0ms)
A: no mismatch when resolved pinpoint also appears in prose (cross-ref) ... ok (0ms)
A: cross-section pinpoints do not trigger mismatch (handled by neutral fallback) ... ok (0ms)
A: orchestrator drops stamp and clears citation on mismatch ... ok (1ms)
B: regression pin — 'the business does not sell or share' rewritten when intake silent ... ok (0ms)
B: regression pin — 'the intake explicitly records this as not described' scrubbed ... ok (0ms)
B: regression pin — 'the record does not track per-consumer use frequency' scrubbed ... ok (0ms)
B: intake-supported negative business claim preserved ... ok (0ms)
B: neutral fallback phrase left alone ... ok (0ms)
C: pinpoint appended when entry has resolved stamp and action lacks § ... ok (0ms)
C: pinpoint NOT appended when action already carries a § token ... ok (0ms)
C: regression pin — pure-deferral action prefixed with intake-grounded confirm cue ... ok (0ms)
integration: empty report is a no-op and does not crash ... ok (1ms)
integration: null report handled fail-open ... ok (0ms)
integration: multi-bucket walk exercises all three classes ... ok (0ms)
idempotency: second call is a no-op beyond stamp echo ... ok (0ms)
anchor keys never mutated by class B walker ... ok (0ms)
_internals surface exports for auditability ... ok (0ms)
ok | 21 passed | 0 failed (39ms)
```

`--check` gate reports the same 5 pre-existing errors in `index.ts` documented against turn 74 (verifyRegistryAgainstCorpus deep-inference ×2; unresolved `first` reference at L963/L969/L979) — NONE introduced by this turn. Cloud runtime does not enforce Deno type-check; deploy succeeded and boot log confirms fresh BUILD_STAMP.

## Files touched

- `supabase/functions/run-admt-checker/_w24_admt_audit.ts` (new — Class A/B/C helpers + orchestrator)
- `supabase/functions/run-admt-checker/_w24_admt_audit.test.ts` (new — 21 cases)
- `supabase/functions/run-admt-checker/index.ts` (BUILD_STAMP bump + import + wire seam)
- `docs/courier/W24-ADMT-RESOLVER-AUDIT-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (item 77 + header restamp 18:41:51Z)

## Queue posture

`h6_admt_governing_anchor` and `h7_admt_blanket_range` remain QUEUED — each gets its own turn. No other dispatch authorized by this message. Wave-25 expected ~19:45Z; deploy landed 18:40:56Z, ~44 min ahead of the 19:25Z guard.
