# T-M9.5 — SLOT-FILL COMPLETION + FILL-OR-OMIT ENFORCEMENT

**Item:** 235
**Build stamp:** `ltp-risk-item235-t-m9.5-slot-fill@2026-07-28T09:44:03.402Z`
**Assembler stamp:** `ltp-pass2-assembler-2026-07-28-item235-fill-or-omit`
**Render stamp:** `ltp-pass2-render-2026-07-28-item235-fill-or-omit`
**Value-screen stamp:** `value-screen@2026-07-28-item235-residue`
**Resolver stamp:** `ltp-slot-resolver-2026-07-28-item235`

## Evidence (Run #169 / assessment `6caeb7cc`)

Pass-1 ok (151.8s); assembler 12ms; C=54.15 / G=57; 8 checks failed. Root
cause class: RenderPlan → plan_slot projections returned empty for several
sections, and fill-or-omit was not enforced at slot level, so blank-
slotted sentences shipped instead of being omitted. Concrete artifacts
observed on the customer surface:

- `executive_summary`: "On the record as documented, ___ were assessed…
  For ___, the benefits identified outweigh…"
- `priority_actions`: "— Deadline basis: ___ (11 CCR § 7150(b)(1))"
- `next_steps`, `record_sufficiency`, `strengthen_items`: blank forms.
- Telemetry: `write_around_origin="unknown"` on pass1-ok runs (should be
  null when write-around never entered).

## Fixes landed

### (a) Slot projections — `_shared/ltp/section-composers/cppa-risk.ts` (NEW)
Per-shard composers project RenderPlan → an ordered list of
`TemplateInstance { template_id, ctx }` with populated `SlotContext`.
Composers implemented: `executive_summary`, `priority_actions`,
`next_steps`, `strengthen_items`, `record_sufficiency`,
`information_needed`, `exception_analysis`, `scope_confirmation`,
`scope_and_triggers`. `SlotContext` extended with per-instance
passthroughs: `action_label`, `action_basis`, `deadline_basis`,
`step_label`, `step_basis`, `element_label`, `element_status_clause`,
`factor_label`, `factor_basis`, `guidance_clause`, `review_label`,
`review_basis`, `driving_activity_label`, `what_would_tip_it`,
`doc_element_label`, `customer_question`, `activity_singplural_clause`.
Assembler wires the composer path before the legacy `template_ids` loop;
when a composer returns null (unknown key), legacy behavior is preserved.

### (b) Fill-or-omit at render — `_shared/ltp/pass2-render.ts`
`renderTemplate` now accepts a `RenderOptions.fillOrOmit` flag (DEFAULT
true). `REQUIRED_PLAN_SLOTS` registry declares which slots MUST resolve
non-empty for each template; unknown templates default to "all
plan_slots required". When a required slot resolves empty the instance
returns `{ text: "", omitted: true, omit_reason: "required_slot_empty" }`,
and the assembler drops the instance. `INTERPOLATION_RESIDUE_PATTERNS`
provides defense-in-depth (matches `" For , "`, `": : ("`,
`"— "`-runs, `": ."`, `" ()"`), catching any blank artifact that
escapes required-slot registry.

### (c) Interpolation-residue shipped-surface guard — `_shared/ltp/value-screen.ts`
`ValueScreenHit.kind` extended to include `"interpolation-residue"`.
`runValueScreen` now walks strings and matches
`INTERPOLATION_RESIDUE_RES` on every non-anchor path. Any residue
promoted to a hit and (in enforce mode) an `enforce_violation` on
`_meta.internal.shipped_value_screen`.

### (d) Telemetry — `_shared/ltp/composition-finalize.ts`
`write_around_origin` returns `null` (not `"unknown"`) when
`writeAroundEntered=false`, fixing the pass1-ok telemetry bug.

### (e) Build stamp — fresh-clock (standing law)
`BUILD_STAMP = ltp-risk-item235-t-m9.5-slot-fill@${new Date().toISOString()}`.
Live ping confirms `2026-07-28T09:44:03.402Z`.

## Deploy verification (verbatim ping)

```
build_stamp=ltp-risk-item235-t-m9.5-slot-fill@2026-07-28T09:44:03.402Z
ltp_mode=enforce
pass1_timeout_enforced=abort-controller
post_lint_pass1_timeout_ms=240000
pass2_assembler=ltp-pass2-assembler-2026-07-28-item235-fill-or-omit
composition_shape.version=cppa-risk-shape@2026-07-28-tm7-retirement
```

## Deferred to a later turn (evidence-flagged, not blocking)

- **FIX (c) — `neg.e.economic_harms` pinpoint/guidance mismatch.** The
  factor row's `pinpoint` is `(a)(5)(E)` while its `guidance_refs`
  anchor to `(a)(5)(F)`. This is a registry alignment task requiring
  cross-check against `provision_texts` and the FSOR pre-modification
  labeling pathway; punting to a dedicated registry courier because the
  correct alignment is content-anchored, not structural.
- **FIX (e) — `weight_note` prompt-constraint + validator screen.** The
  AWS/Stripe benefit overreach class needs a prompt/validator round-trip
  on the Pass-1 model; deferred so this turn stays strictly structural.

## HARD STOP

READY-FOR-CONTROLLER-VERIFY. Controller wire-verifies and relaunches.
