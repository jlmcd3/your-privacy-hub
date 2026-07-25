# T7-RISK-OPENING-PARAGRAPH-PILOT — Build Plan (pre-commit)

Authoritative spec: `docs/design/OPENING-PARAGRAPH-DESIGN.md` (ledger 82). Scope: `run-cppa-risk-assessment` ONLY. Deadline: land before ~21:45Z or stop at commit-ready.

Before I start editing, I need to confirm the surface map and the two live-contract semantics questions below — the design doc §2 verified field names on 2026-07-25 but the dispatch requires re-verification at build time, and getting S0 semantics wrong is the pilot's single highest failure mode.

## 1. Surface map (what this turn touches)

New files:
- `supabase/functions/_shared/openings/risk-opening.ts` — deterministic slot builder (S0–S6), clause-subset variants, no free-text assembly.
- `supabase/functions/_shared/openings/risk-opening.test.ts` — green tests (pin-test, semantics rejection cases, omission cases, boundary bands, verbatim quote checks).
- `supabase/functions/_shared/openings/ccpa-1798-140-pin.ts` — the verbatim (d)(1)(A)–(C) corpus quote strings, sourced from `cppa_authorities` `Cal. Civ. Code § 1798.140` (bytes 1367–3836 per ledger 80), NBSP + curly quotes preserved. Pinned at load via startup assertion (build-time constant + runtime check that `provision_texts.ccpa-1798-140` still matches).

Modified files:
- `supabase/functions/_shared/report-schemas/cppa-risk.ts` — add `opening_summary: { text: string; slots: {...}; provenance: {...} }` as a report top-level slot.
- `supabase/functions/_shared/cppa-risk-contract-fixtures.ts` — add opening_summary to fixture emit + delivery-contract shape.
- `supabase/functions/_shared/golden/cppa-risk.ts` — golden opening_summary text + slot breakdown for existing sample rows.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — (a) prompt: instruct model NOT to author the opening (state that the deterministic builder will overwrite it); (b) emit-gate hook: call `buildRiskOpening(factLedger, registryPins)` and REPLACE any model-authored opening_summary before persist; (c) telemetry via `_meta.internal.risk_t7_opening` (serializer whitelist entry required).
- `supabase/functions/_shared/emit-gate.ts` OR the risk-scoped emit pipeline — add the opening-replacement hook (risk-only for this pilot).
- `supabase/functions/_shared/report-serialize.ts` — whitelist `_meta.internal.risk_t7_opening` telemetry keys.
- `src/lib/sampleFixtureShapes.ts` — add `opening_summary` to the cppa-risk fixture shape (drift guard).
- `docs/courier/T7-RISK-OPENING-PARAGRAPH-PILOT-2026-07-25.md` — build stamp, boot-log proof, pasted green tests, pin-test results, five-lens notes.
- `docs/pipeline-state.md` — ledger item + header restamp.

Not touched (per dispatch):
- Rubrics, graders, instrument s4 (frozen — certification-reset risk).
- Any non-risk tool.
- Fact-ledger core (`_shared/intake/fact-ledger.ts`) — reader only.
- No new intake fields; criterion (C) deferred.
- No sample regeneration; goldens updated to reflect new opening text only.

## 2. S0 semantics — two open questions I need your call on

Both affect what the pilot emits on live data; the design doc doesn't fully pin them.

**Q1 — (A) revenue field polarity.** Live `li_assessments`/`cppa_assessments` intake row `q1_revenue` is a band enum (typical bands: `under_25m`, `25m_to_100m`, `over_100m`, `unknown`). Under the boundary-band rule, only `over_100m` unambiguously clears the corpus figure ("in excess of twenty-five million dollars ($25,000,000), as adjusted…"); `25m_to_100m` STRADDLES the $25M line at the low edge before CPI adjustment and definitively straddles once CPI adjustment raises the operative figure above $25M. My read: emit (A) only for `over_100m`; treat `25m_to_100m` as straddling → do not assert (A). Confirm.

**Q2 — (B) buy/sell/share semantics gate.** The (B) criterion count is on consumers/households whose PI is bought/sold/shared. `q2_consumers` bands (`under_100k`, `100k_or_more`, `unknown`) measure consumers WHOSE PI IS PROCESSED, not bought/sold/shared. Per dispatch: reject (B)-based finding when facts payload records no buy/sell/share activity. My read: emit (B) ONLY when `q2_consumers = 100k_or_more` AND `q5_sell_share ∈ {sells, shares, both}` (affirmative sell/share polarity). If either fails, OMIT (B). Confirm.

If either Q1 or Q2 gate is over-restrictive vs. what you intend, the pilot will under-emit S0 on the live fixture set and read as a regression on intake-contradiction class next wave.

## 3. Build order (once Q1/Q2 confirmed)

1. Read live contract via `supabase--read_query`: confirm `q1_revenue`/`q2_consumers`/`q5_sell_share`/`q15_sensitive_pi`/`q18_admt_use`/`q5b_profiling_observation`/`sensitive_location_basis`/`entity_name`/`q4_pi_categories`/`i1_processing_purpose`/`i4_disclosure_mechanisms`/`i1b_min_pi` field names and enum values against actual `li_assessments`/`cppa_assessments` rows. Any drift from design doc §2 → adjust builder + note in courier.
2. Extract verbatim § 7150(b)(1)–(6) clause text from corpus (`cppa_authorities` or `provision_texts.cppa-7150`) into `openings/ccpa-7150-pin.ts`.
3. Write `risk-opening.ts` builder — pure function, 7 slots, clause-subset variants for each slot's grammar, omission over invention. No free-text.
4. Write `risk-opening.test.ts` covering: (a) all-that-apply enumeration in statutory order; (b) (A) omitted on `25m_to_100m` (straddling); (c) (B) omitted when `q5_sell_share = none` even if `q2_consumers = 100k_or_more`; (d) S0 fully omitted when nothing resolves; (e) S4 omitted on silent safeguards; (f) polarity locks (negations preserved); (g) pin-test: corpus quotes byte-identical to `cppa_authorities` extraction.
5. Update contract/schema/fixtures/goldens/fixture-shape.
6. Wire emit-gate replacement in risk index.ts + telemetry whitelist.
7. Add REGEN flag on schema change.
8. Run tests (must be green — pasted verbatim into courier).
9. Deploy `run-cppa-risk-assessment` only. Capture boot-log stamp (`t7-risk-opening@<ISO>`). Update BUILD_STAMP.
10. Courier + ledger.

## 4. Deploy-window discipline

Current: 20:50Z. Deadline: 21:45Z (~55 min). Estimated effort at this scope: 60–90 min for careful commit-ready + green tests, +5 min deploy + boot-log capture. **Realistic outcome: commit-ready by ~21:40Z, deploy pushed to next clear window (post-wave, likely >22:30Z after the ~22:00Z wave completes).** If you want deploy this window, I need to skip the live-contract re-verification (Q1/Q2 answered from design doc as-is) — but that violates the dispatch's build-time re-verification requirement and risks S0 semantics.

Recommended: answer Q1/Q2 now; I build commit-ready this window (tests green, no deploy); we deploy in the first clear window after the 22:00Z wave completes, capture boot-log, and land the courier with actual deploy stamp then. Ledger records commit-ready state now and DEPLOYED state at the second turn.

## 5. Rule deviation candidates (surfacing pre-commit, per dispatch discipline)

- **Deploy-window shortfall** — see §4. Rules: report commit-ready without deploying per dispatch clause. NOT a deviation, but calling it out.
- **Emit-gate scope creep** — the opening-replacement hook is risk-only, but lives in `_shared/emit-gate.ts`. Alternative: put it in a risk-scoped file to keep `_shared/emit-gate.ts` tool-agnostic (design doc rollout order will need this for other tools anyway; a per-tool builder + one gate hook that dispatches is cleaner). Confirm placement preference.

Awaiting your answers on Q1, Q2, §4 window, and §5 placement before I write code.