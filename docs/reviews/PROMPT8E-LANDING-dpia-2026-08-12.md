# PROMPT 8E — DPIA 8D byte-conformance + CEO-ruled fixes — LANDING REPORT
Date: 2026-08-12. Spine: **UNTOUCHED** (`_shared/prose/plans/dpia.spine.ts` — zero bytes changed; no item required it).

## Per-item diff summary

**1. buildRiskCountNote ratified bytes** (`build.ts`). Both variants replaced verbatim; counts via `nWord()`; the lead-in "This assessment reviews N risks." and the "register is the count this assessment works from" clause deleted.
- Normal: `The company self-identified two of these risks; this assessment surfaces two more. The company's own account is recorded in its own words in the sign-off section.`
- Reversed: `The company self-identified five risks in its own account; this assessment carries three after consolidation, and the company's own account is recorded in its own words in the sign-off section.`
- `skeleton-calibration.ts`: `tmpl_risk_count_note` kept ("The company self-identified" + "this assessment surfaces"); new sibling id `tmpl_risk_count_note_reversed` ("The company self-identified" + "after consolidation") — the registry matcher requires ALL spans, so a second id was the only correct shape.

**2. ASK_ART5_TABLE** — replaced with the ratified bytes ("…stated principle by principle, and whether each measure has been deployed."). The stale BEFORE assertion in `dpia-section2-coverage.test.ts` was updated to the ratified text.

**3. buildArt36Consultation rawWhy** — `(s)` purged on both branches via the 13a seam: `one risk — X — is deemed a high risk` / `three risks — X; Y; Z — are deemed high risks`; undetermined: `the remaining risk level for one risk — X —` / `…for three risks — …`. `${a.verbatim}` prefix and all legal content byte-untouched.

**4. statedResidualRiskCount hardening** — all three landed. (a) digits preceded by Art./Article/§/Section/Recital (whitespace tolerated) or embedded in a larger token are ignored, and the sentence splitter no longer breaks after "Art."; (b) an enumerated list ("1. … 2. …", contiguous from 1, ≥2 items) wins over any in-sentence number; (c) `buildRiskCountNote` emits NO note when stated > 3× register (so `reconcileRiskCountNote`, which delegates, is covered).

**5. r5_third_country_transfer** — `RiskFacts` gains `transferLeavesRegime`; the trigger is now `f.transferLeavesRegime`. `destination_country` is primary (EU: outside the EEA; UK: outside the UK); mechanism/notes text is corroboration only where no destination is recorded.

**6. ToA regime prefix** — new `regimePrefixed()` applied to the legal-basis anchor and the Art. 5(1)(a) lawfulness anchor. Prefix-only rewrite of a bare `GDPR` to `UK GDPR` under the UK regime; pinpoints untouched.

**7. Art. 36 / DPO advice** — DORMANT plumbing only. `Art36Consultation.dpo_recommends_consultation?: boolean` added to the typed surface and populated from `dpo_advice`. Determination logic unchanged; no renderer reads it. Proposed sentence below awaits ratification.

**8. Tests and pins** — (a) `tests/edge/so5/skeleton.test.ts` DELETED. (b) `dpia-spine-v4.test.ts` gains `sha256(serializeDpiaSpine()) === DPIA_SPINE_HASH` — the v4.2 pin now has a consumer and passes. (c) `dpia-vocabulary-fidelity.test.ts` gains the `(s)` bar over composed prose, both risk_count_note byte assertions, and the item-4 fixtures (doc-4 verbatim, "Art. 35" citation-only, bound case). New battery `dpia-8e-triggers.test.ts` covers items 5 and 6.

**9. Harness** — `alternatives_considered` (processing_operation / alternative / rejection_reason, "NEVER reason_rejected") and `residual_risks` added to the dpia generator spec.

## Test counts
- `_shared/so-final-test/`: **136 passed / 0 failed**.
- Full `so-final-test/` + `tests/edge/`: before **3583 passed / 31 failed**, after **3585 passed / 29 failed**. The two closed are the item-1 and item-2 byte assertions. The 29 remaining are pre-existing and untouched by this prompt: stamp/version pins, DB-backed conformance fixtures (item357/358), and three `tests/edge/run-dpia-framework/prompt8a-prose.test.ts` assertions that still expect the retired 8D vocabulary ("proposed until the company re-scores it"). Flagged, not changed — no 8E item authorised editing them.

## Item 7 — proposed Section 6 disclosure sentence (for CEO ratification)
Branch condition: `art36_consultation.dpo_recommends_consultation === true` AND `determination !== "consultation_required"`. Renders as ONE sentence immediately after the typed determination in Section 6; the determination itself is never altered.

> "The company's data protection officer has advised that the supervisory authority be consulted on this processing; that advice is recorded here alongside this assessment's own determination on Article 36(1), which is stated above and is unchanged by it."

Where the determination IS `consultation_required`, no sentence is added (the advice and the determination agree, and the consultation obligation already carries the point).

## Item 9 — cross-check of the dpia generator spec against dpiaFrameworkContract
Gaps found (reported, NOT silently added):
1. `transfer_flows` — spec declares it a **string** ("describes cross-border flows or 'None'"); the contract kind is `structured` and the register/coverage builders read an array of flow objects with `destination_country`. This is the direct cause of thin Chapter V fixtures and it now also bears on the item-5 regime test.
2. Sign-off block absent from the spec entirely: `dpia_prepared_by`, `dpia_approved_by_name`, `dpia_approved_by_title`, `dpia_approval_date`, `dpia_signoff_basis`. The rescorer slot falls back to "the company" on every generated fixture as a result.
3. `source_assessment_id` — absent (revision-mode only; likely correct to omit, listed for completeness).
No misnamed keys otherwise; `organization_sector` and `sector` in the spec are both accepted upstream.

No batch was run.
