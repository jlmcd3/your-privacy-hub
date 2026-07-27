# LTP-RISK WAVE-B COMPLETION — Deploy Courier

**Turn ID:** WAVEB-COMPLETION-2026-07-27
**Dispatch:** CEO-approved 2026-07-27; deploy on `run-cppa-risk-assessment` only. NO instrument changes this turn (instrument-epoch audit follows).
**Status:** LANDED + DEPLOYED
**Build stamp:** `ltp-risk-waveb-completion@2026-07-27T02:20:00Z`
**Module:** `supabase/functions/_shared/ltp/waveb-completion.ts` (`ltp-waveb-completion@2026-07-27T02:15:00Z`, `waveb-completion-v1`)

---

## (a) Wiring completion — three Wave-B surfaces + duplicate-connective regression

Wave-B measurement (run #145, batch `fc6a8394-a265-4297-b086-805e183d2ee5`) surfaced three surfaces that ran the old path because enforce-preview never rendered them (planning-only). Root cause: the LTP shadow-mode block computed a plan but never mutated `report_data`; enforce-preview only observed telemetry. Closed this turn with a deterministic post-generation completion pass that runs AFTER the T7 pilot fix and BEFORE the LTP shadow-mode block.

**(i) `risk_assessment_by_activity[].purpose` — verbatim intake.**
Deterministically overwrites each activity's `purpose` with `intake.activity_details[i].purpose_description || intake.i1_processing_purpose`. Property test asserts model paraphrase → intake verbatim; per-activity variant asserts precedence over the intake fallback. Root cause of the skipped surface: enforce-preview constructed a `RenderPlan` but never invoked the Pass-2 renderer against this surface. Fix closes the gap by asserting intake verbatim post-render, independent of Pass-2 wiring.

**(ii) `priority_actions` template-bound; deterministic ban on first-person / meta-commentary.**
Deterministic filter drops any priority-action entry whose text matches the meta-string patterns (banned across ALL rendered surfaces via a walker):

- `we (could|cannot|can't|were unable to|are unable to|have not been able to) (verify|confirm|assess|determine|establish|validate) …`
- `(I|we) (recommend|suggest|believe|think|find|note|would recommend|would suggest) …`
- `could not verify this item from the information provided …`

Priority-action entries carrying meta-strings are DROPPED (list-level); string surfaces have the offending sentence excised in place.

**(iii) `inconsistency_flags` TEMPLATE_CUT enforced at render.**
Filter keeps only entries whose provenance is validator-derived: `template_id === "T.risk.review_items"` OR `provenance === "validator"` OR `source === "validator"` OR both `source_field_a` and `source_field_b` present (canonical intake-key pair per W3-T5(b)). Everything else — including bare strings and unstructured objects — is dropped. This complements the existing `EMPTY_ARRAY` cut ruling by enforcing the template contract on any values that survive earlier passes.

**Connective duplication regression.** Registered patterns collapse `established on the record on the current record` → `established on the current record` and the class of `on the record on the (current )?record` duplicates. Regression test asserts the exact Wave-B fragment vanishes.

---

## (b) NEW STANDING CONTENT — PII field-class rendering rule

Wave-B evidence: staff names + email + phone rendered into narrative body text (e6 correctly flagged; e6 VALIDATED and unchanged).

**Rule.** Intake fields of class **CONTACT/PERSONNEL** — `i7_internal_contributors`, `i7_external_consultees`, `i8_certifying_exec_name`, `i8_certifying_exec_title`, `i8_contact_email`, `i8_contact_phone`, and any field whose verbatim value contains an email or phone pattern — render verbatim ONLY in `attestation_block` and `document_metadata`. Narrative, actions, rationale, and summary surfaces reference roles GENERICALLY via closed tokens (`the certifying executive`, `the internal contributors identified in the record`, `the external consultees identified in the record`) — never verbatim names/emails/phones.

**Implementation.** `collectPiiVerbatim(intake)` builds regex rules for the intake's own PII values plus generic email/phone patterns. The walker applies rules to every top-level surface EXCEPT `attestation_block` / `document_metadata` / `_meta`. Post-render assertion `assertNoPiiInNarrative(report)` returns hard errors for any residual email/phone in a narrative surface; result recorded at `_meta.internal.waveb_completion.pii_narrative_assertion_errors` for observability. Test proves attestation preserved verbatim while narrative rewritten to generic role tokens.

The rule is a standing content addition consistent with `risk-surface-map.ts` intents; the surface map's `attestation_block` / `document_metadata` `deterministic` bindings remain the single verbatim-permitted surfaces.

---

## (c) NEW STANDING CONTENT — cyber-audit crosswalk (§ 7120(b) per-prong linkage)

Restores § 7120 customer value the old report carried and the surface map dropped to a boolean.

**Extension.** `extendSubmissionBasisCrosswalk(report, intake)` appends per-prong clauses to `submission_summary.submission_basis` alongside the existing `§ 7121(a) cybersecurity-audit linkage` clause (Type R, registry-anchored, ZERO LLM). Prongs and outcome resolution:

- **§ 7120(b)(1)** 50%-from-sale/share prong — derived from `computeTestStates` M5 (reads `q5_sell_share` / `q5c_share_revenue_50pct`).
- **§ 7120(b)(2)(A)** consumer-volume + revenue prong — derived from `q2_consumers` band ≥ 250,000 combined with `q1_revenue` band ≥ $25M (V2 stat-aligned; legacy V1 bands supported).
- **§ 7120(b)(2)(B)** sensitive-PI volume prong — derived from `computeTestStates` M4 (reads `q15_sensitive_pi` / `q15c_spi_volume`; renders `not applicable` when SPI processing is absent).

Each prong renders as:

`cybersecurity-audit linkage — § 7120(b)(X) (<prong label>) {met | not met | not applicable | indeterminate} on the record`

Emitter is IDEMPOTENT — an existing appended clause block is not duplicated on re-run. Precedent verified: run #145 doc 2's `submission_basis` already carried the § 7121(a) linkage clause; this turn extends the same emitter.

---

## (d) Tests + deploy + telemetry

**Tests green (10/10 passed, `waveb-completion.test.ts`):**
- purpose-verbatim property (intake fallback)
- purpose-verbatim precedence (per-activity `purpose_description` wins)
- inconsistency_flags TEMPLATE_CUT (free-prose fragments dropped, validator entries kept)
- meta-string ban (drops "We could not verify this item …" from priority_actions)
- dup-connective regression ("established on the record on the current record" → "established on the current record")
- PII narrative ban (attestation preserved verbatim; narrative rewritten; post-render assert clean)
- § 7120(b) crosswalk (all three prongs appended)
- crosswalk emitter matrix (met / not met / not applicable / indeterminate per intake case)
- crosswalk idempotence
- stamp exposed

**Deploy protocol:**
- Locks pasted (all controllers idle; campaign fd1be147 remains CEO-paused; no measurement launch this turn).
- Fresh BUILD_STAMP `ltp-risk-waveb-completion@2026-07-27T02:20:00Z` (fresh sandbox clock `2026-07-27T00:25:42Z` at authoring, deploy-guarded).
- Boot log echoes `waveb_completion=LANDED surfaces=purpose+priority_actions+inconsistency_flags+pii_narrative+crosswalk_7120b`.
- Deployed via edge-function deploy (`run-cppa-risk-assessment`) — LANDED.
- Telemetry: `_meta.internal.waveb_completion` carries `{ version, stamp, build_stamp, counters, pii_narrative_assertion_errors }`. LEAK-PREV-P2 preserves `_meta.internal` unmodified.
- No measurement launch — Wave B.2 launches after the instrument-epoch audit dispatch so it measures on the corrected instrument.

**Ledger:** `docs/pipeline-state.md` item 154 records LANDED status; header restamped.
