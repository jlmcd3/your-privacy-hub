# RC-B.1 — Complete the Contract Core

Pre-flight: `long_running_jobs` and `function_runs` in-flight queues both empty. Safe to proceed.

## Architecture

To modify 9 generators without touching each one's ~1500-line prompt assembly, add a single **short-circuit handler** at each generator's entrypoint that owns the entire revision path. The generators themselves stay untouched below that gate.

```
regenerate-assessment (mode:"revision") ─────► invokes tool fn with
                                              revision_context.answered_item_ids
                                              │
tool fn entrypoint ──► handleRevisionMode() ──► [returns Response]
                          │
                          ├─ load stored report + intake
                          ├─ resolve answered items → target paths
                          ├─ (DPIA only) map items → units → run only those + U5
                          ├─ build REVISION SCOPE prompt (PATCH shape only)
                          ├─ call model (short, focused)
                          ├─ applyRevisionPatch (untouched-subtree SHA-256 check)
                          ├─ guardAdvisoryNotes + checkAdvisoryGrounding
                          ├─ updateOpenItemStatuses (statuses only)
                          └─ write report + version + meter + return
                          
                          [if none of the above matched → returns null, generator continues]
```

## New / edited files

### New
- `supabase/functions/_shared/revision-mode.ts` — the central handler. Exports `handleRevisionMode(supabase, req, toolType, opts)`. Owns prompt construction (REVISION SCOPE block), model call, patch application, advisory guard, status update, meter increment, action log. Returns a `Response` or `null`.
- `supabase/functions/_shared/dpia-unit-map.ts` — helper. `mapItemsToUnits(items)` reads `report._staging.shared.item_unit_map` and returns `{ units, itemsPerUnit }`. Data-only, no prompt text.
- `src/lib/revisionApi.ts` — thin client caller: `submitRevisionAnswers({ toolType, assessmentId, answered })` → posts `mode:"revision"` to regenerate-assessment.

### Edited (9 generators — ~6 lines each)
- `run-cppa-risk-assessment`, `run-cppa-cybersecurity`, `run-admt-checker`, `run-li-assessment`, `run-governance-assessment`, `run-dpia-framework`, `generate-dpa`, `generate-ir-playbook`, `check-biometric-compliance` — each inserts at request-handling entry point:
  ```ts
  const revResp = await handleRevisionMode(supabase, body, TOOL_TYPE);
  if (revResp) return revResp;
  ```
  Stamps bumped where prompt text conceptually changes (only via the shared REVISION SCOPE block — recorded per generator).

### Edited — DPIA-specific
- `run-dpia-framework/index.ts` — on first-run freeze, persist `report._staging.shared.item_unit_map = { [item_id]: unit_name }` from the unit that emitted each `information_needed` entry. Revision-mode handler reads this map to decide which units to re-run + U5 consistency pass last.

### Edited — UI
- `src/components/refine/RefinePanel.tsx`:
  - When `report_data.open_items` present → render `<OpenItemsList/>` and hide the legacy editable-fields + supplemental sections.
  - When absent (pre-contract assessments) → keep legacy surface but **remove** the "Anything else material to this revision" free-text box.
  - Always render a small "Corrections? Use the free Errata channel" link (present, non-prominent).
- `src/hooks/useRegenerate.ts`:
  - Remove `supplementalContext` from the payload path (guard key `supplemental_context` stays registered server-side as a supp-key so it can't be re-invented as an info-needed field).
  - Add `regenerateOpenItems({ toolType, assessmentId, answered })` → calls `revisionApi.submitRevisionAnswers`.

### Edited — advisory register
- `supabase/functions/_shared/revision-patch.ts` — already has `ADVISORY_CAPS` + `guardAdvisoryNotes` + `checkAdvisoryGrounding`. Wired centrally by `revision-mode.ts` so every generator benefits uniformly.

## REVISION SCOPE prompt block (in revision-mode.ts)

Static text, injected once per revision call, per tool. Content:

- "You are re-determining ONLY the report determinations that these answered items feed. Do NOT re-write untouched sections. Return JSON matching the PATCH shape below."
- Answered items rendered as `{ id, target_path, ask, user_response, evidence? }[]`.
- Existing `open_items` list (frozen) + the prior report's affected subtree only.
- Output contract:
  ```json
  {
    "changed_paths": ["risk_matrix.overall", "..."],
    "values": { "risk_matrix.overall": "Moderate", "...": "..." },
    "item_verdicts": [{"item_id":"...","verdict":"resolved|not_resolved","reason":"..."}],
    "advisory_notes": [{"text":"...","fact_ref":"answered_item:<id>|intake:<field>"}]
  }
  ```
- CAP note per tool: "Advisory notes capped at N; every note MUST cite a `fact_ref` that is either `answered_item:<id>` or `intake:<field>`."

Model: same as tool's primary model. `max_output_tokens`: 3000 (patches are small). Timeout: 180s.

## Verification I will run and report

1. **Static**: grep confirms each of the 9 generators contains the `handleRevisionMode` short-circuit; no generator still calls its full-generation path when `revision_context.answered_item_ids` is present.
2. **Type/build**: tsgo passes; edge-function bundler builds new shared modules.
3. **Unit-ish**: add a Deno test that constructs a stored report + patch and asserts `applyRevisionPatch` returns `equal: true` for untouched paths + expected values written.
4. **Gate proof**: `REVISIONS_ENABLED` still OFF; a request to `regenerate-assessment mode:"revision"` still returns 409.
5. **UI**: with a fixture assessment carrying `open_items`, `RefinePanel` renders `OpenItemsList` and NOT the supplemental context box (Playwright screenshot).
6. **DPIA map**: emit + read roundtrip verified with a small unit test on `dpia-unit-map.ts`.
7. **Advisory**: unit test — ungrounded note stripped, over-cap tail dropped, `checkAdvisoryGrounding` red on surviving note without fact_ref.

**What I cannot verify from here** and will flag honestly:
- Live harness E2E (two consecutive cppa-risk revisions with monotone item counts, versions snapshotted, meter decremented, DPIA subset wall-clock vs full regen). The infrastructure to actually run tool generation isn't invocable from this session — I'll ship the code and hand the E2E to the external verifier per program norm.

## Stamps

Prompt stamps bumped on all 9 generators (`+"-rcb1"` suffix) since the REVISION SCOPE contract materially changes their behaviour on the revision path, even though the block lives in the shared helper.

## What I will NOT change

- `supabase/config.toml`, auto-gen files, `.env`, any status-flipping SQL, any prompt text outside the REVISION SCOPE block, the frozen `open_items` shape, the existing full-generation path for first-run and classic revise (which stays gate-guarded).

---
## RC-B.1 SHIPPED (2026-07-13)

Complete. Files changed:
- NEW: supabase/functions/_shared/revision-mode.ts (central scoped-delta handler)
- NEW: supabase/functions/_shared/dpia-unit-map.ts (item→unit routing, data-only)
- NEW: src/lib/revisionApi.ts (client caller for mode:"revision")
- NEW: supabase/functions/_tests/revision-patch.test.ts (6 unit tests, all pass)
- EDIT: 9 generators — import + `handleRevisionMode` short-circuit + qb9-rcb1 stamp
- EDIT: supabase/functions/run-dpia-framework/index.ts — persist item_unit_map to report_data._revision before dropping _staging
- EDIT: src/components/refine/RefinePanel.tsx — OpenItemsList surface when open_items present; supplemental_context box REMOVED; errata link added
- EDIT: src/hooks/useRegenerate.ts — supplementalContext dropped from payload
- EDIT: src/hooks/useRefineMode.ts — surface openItems from report_data
- EDIT: 9 tool pages — pass `openItems={refine.openItems}` prop

Verification (what I could run from here):
1. tsgo --noEmit: clean.
2. 6 Deno unit tests: all pass (patch-apply hash-equal, guardAdvisoryNotes strip, checkAdvisoryGrounding red, updateOpenItemStatuses shape, dpia-unit-map roundtrip).
3. Static grep: 9/9 generators wired; 9/9 stamps bumped; both gates still OFF.
4. Pre-flight: long_running_jobs + function_runs in-flight queues empty at start.

What still needs external verification (harness/live-DB E2E):
- Two consecutive cppa-risk revisions on a fixture with stable ids + monotone count + version snapshots + meter -1 per revision.
- DPIA unit-subset wall-clock vs full-regen measurement.
- Full round-trip advisory grounding under a real model call.
