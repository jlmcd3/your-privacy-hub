# SMOKE #5 — ROOT-CAUSE + FIX (Item 206)
Date: 2026-07-27
Assessment under review: `0e741ae0-a488-4d73-ab2b-a67bbac8c938`
Batch: `9d00f044-516c-4065-89c4-92f8ade816d8`

## 1. Localization result

Controller diagnosis re-verified against source and DB:

- **Persisted `report_data` for `0e741ae0`** contains **zero** whole-value
  truncation slots. Recursive JSONB scan against the closed set
  `{We,The,A,An,Our,Their,It,This,That,TODO,TBD}` (excluding any `_`-prefixed
  subtree, matching `walkStrings` semantics) returned **0 rows**.
- **`recompose` callback is NOT wired** at the wire site
  (`run-cppa-risk-assessment/index.ts:3491-3496` — `safeFinalizeComposition({
  reportData, hookValue, writeAroundEntered, mode })`). Therefore
  `driveValueScreen` cannot have executed the recompose branch on smoke #5;
  it ran `runOnce` once, threw `ValueScreenError`, and the safe-wrapper
  restored the original `reportData`.
- The safe-wrapper's `catch` path recorded only the formatted error
  message — the per-hit `path`/`context` fields on `ValueScreenError.hits`
  were dropped by `SafeFinalizeTelemetry`. **We could not tell you which
  JSON path emitted `"We"`. This turn fixes that permanently.**

## 2. Fixes shipped this turn

### (a) Fragment-omit pre-pass — root-adjacent, CEO-ruling compliant

`_shared/ltp/composition-finalize.ts` gains `omitFragmentSlots()`, invoked
as step (0) inside `finalizeComposition()`, BEFORE value-screen and the
surface-guard walk. It walks the report and, for any string value whose
entire trimmed content equals a token in `TRUNCATED_SLOT_VALUE_SET`
(exported from `value-screen.ts`), **omits the slot entirely** (object
key deleted; array entry elided). Anchor paths (`id`, `citation`, `url`,
etc.) and `_`-prefixed subtrees are exempt.

This implements the **controller directive** (Item 206 review) verbatim:
*"the slot must be filled with the full intended value or omitted
entirely (never a fragment)."* NOT a CEO ruling — the CEO rulings log
carries only the CEO's own words; this text is controller-authored
dispatch language. Where the emitter still produces a fragment, the
fragment does not ship; it disappears. Telemetry records the omission so
upstream producers remain diagnosable (see (c)).

Version stamp: `FRAGMENT_OMIT_VERSION = "fragment-omit@2026-07-27-item206"`.

### (b) Per-hit telemetry — never blind again

`SafeFinalizeTelemetry` now carries `hits: ValueScreenHit[]` on BOTH the
success and catch paths. On the catch path, `hits` is populated from
`ValueScreenError.hits` (kind + match + path + context, 120-char context
window). `FinalizeTelemetry` also gains `value_screen_hit_details`,
`fragment_omit_version`, `fragment_omit_count`, `fragment_omit_paths`.

Safe-wrapper version stamp bumped to
`safe-finalize@2026-07-27-item206-hits`.

### (c) Wire-site persists hits under `_meta.internal.composition_finalize.hits`

`run-cppa-risk-assessment/index.ts` at the finalize call site now writes:

```
_meta.internal.composition_finalize.hits = [{ kind, match, path, context }, ...]
_meta.internal.composition_finalize.fragment_omit_count = N
_meta.internal.composition_finalize.fragment_omit_paths = [...]
```

Same fields are also emitted in the `composition_finalize_ran` structured
log line for edge-log slicing.

## 3. Note on emitter attribution

Because smoke #5's persisted `report_data` no longer contains the
truncation (see §1), the exact producer of the `deadline_basis: "We"`
class cannot be attributed from this run's evidence alone. The
fragment-omit pre-pass makes that attribution unnecessary for
shipping — any future emission is silently omitted and telemetered
with an explicit `fragment_omit_paths` entry, so the next smoke that
touches this path prints the emitter's exact JSON path directly on
`_meta.internal.composition_finalize.fragment_omit_paths`. That is the
diagnostic hook the controller's next round can use to walk back to the
emitter and delete it at source without another blind cycle.

## 4. Tests

`supabase/functions/_shared/ltp/composition-finalize.test.ts`:
- **NEW** `composition-finalize: fragment-omit removes whole-value
  truncation slot (Item 206)` — proves `submission_summary.deadline_basis:
  "We"` is omitted, `real_field` retained, no value-screen throw.
- **NEW** `safeFinalize: catch-path preserves hits array with
  kind+match+path (Item 206)` — proves the missing telemetry contract.
- Version-stamp assertion updated.
- Three pre-existing tests that keyed on the removed `"We "` lexicon
  entry rewritten to key on `"Engine-B"` (still in lexicon).

Full run: `deno test _shared/ltp/composition-finalize.test.ts
_shared/ltp/value-screen.test.ts` — **29 passed | 0 failed**.

## 5. Deploy + ping

- Redeploy: `run-cppa-risk-assessment` — success.
- Build stamp on the wire: `ltp-risk-item206-fragment-omit-hits@2026-07-27T18:40:00Z`.
- `safe_finalize` on the wire: `safe-finalize@2026-07-27-item206-hits`.
- All other §16 fields unchanged (`ltp_mode=enforce`, `composition_enforce=1`,
  persist-first + clock-contract stamps intact).

## 6. Disposition

**READY-FOR-RELAUNCH. HARD STOP.** Controller relaunches smoke #6.
- If clean: standing chain rolls 9b–12 to STAGE-B COMPLETE.
- If fragment-omit fires: `_meta.internal.composition_finalize.fragment_omit_paths`
  names the emitter's exact JSON path — attribute at source without a
  further diagnostic round.

§22.1 clean-arm counter (cppa-risk): unchanged, 0/3.
