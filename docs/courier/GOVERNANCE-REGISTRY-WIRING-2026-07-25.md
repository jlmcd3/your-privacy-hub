# GOVERNANCE-REGISTRY-WIRING — 2026-07-25

**Ledger item:** 62
**Dispatch:** controller 2026-07-25T14:01:11Z (five-lens TEAM-REVIEWED)
**Consumes:** `GOVERNANCE-REGISTRY-AUTHORING` (item 57) — `governance-va-w1-2026-07-25` (33 rows) + 22 write-around targets.
**Mirrors:** `DPIA-REGISTRY-WIRING` (item 51) and `LIA-REGISTRY-WIRING` (items 55/56) — architecture identical.
**Instrument:** s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` — UNTOUCHED (frozen).
**BUILD_STAMP:** `governance-registry-wiring@2026-07-25T14:03:54Z` (fresh-clock).

## Scope landed

1. **Registry post-pass** — `supabase/functions/run-governance-assessment/_w1_governance_wire.ts` `applyW1GovernanceWire`:
   - Walks the report tree; any object with `proposition_key` matching `GOVERNANCE_VERIFIED_AUTHORITIES` has `citation` / `subsection` / `verbatim_quote` / `governing_anchor` overwritten with registry-verified values + `citation_verified: true`.
   - Keys on `GOVERNANCE_UNANCHORED_PROPOSITIONS` get WRITE-AROUND: fields → `null`, `citation_verified: false`, `write_around: true`.
   - Unknown keys accumulate on `unresolved_keys[]` (never mutated).
   - RESERVED subtrees (`_meta`, `annotations`, `engagement_map`, `enforcement_*`, `deterministic_checks`, `citation_ledger`, `lint_warnings`, `_revision`, `_staging`, `_drafting_record`, `_normalized_intake`) walked-into as containers but leaf strings never treated as citation carriers.
   - Never surfaces "information needed" for citation-resolution gaps (RULE 2.7 S1 — intake gaps only).
   - Fail-visible / fail-safe: on internal error, ships unchanged with `_meta.internal.governance_w1.crashed = true`.

2. **LEAK-PREV P0 — customer messages** — `supabase/functions/_shared/customer-messages.ts`:
   - Added 25 governance-specific labels to `FIELD_LABELS` (sector, org_size, eu_uk_data, tools, special_category, special_categories_list, privacy_policy, privacy_notice_coverage, dpo_status, dpia_status, dpia_ai_coverage, incident_response, training_status, training_ai_coverage, tool_instruction, dpa_status, dpa_art28_verified, transfer_status, transfer_mechanism, technical_controls, technical_controls_list, dsr_capability, dsr_rights_tested, inventory_audit, additional_context).
   - `organization_name` / `data_categories` / `jurisdictions` reuse the pre-existing labels (removed pre-existing duplicate at line 177 that was blocking Deno type-check).
   - Added `governanceContract.fields` to `KNOWN_INTAKE_KEYS`.

3. **LEAK-PREV P1 — emit gate** — `supabase/functions/_shared/emit-gate.ts`:
   - `EmitGateTool` union extended with `"governance_assessment"`.
   - Wired in `run-governance-assessment/index.ts` AFTER wire post-pass and BEFORE P2 serializer.

4. **LEAK-PREV P2 — whitelist serializer** — `supabase/functions/_shared/report-schemas/governance.ts`:
   - New `GOVERNANCE_REPORT_SCHEMA` (id `rs-governance-w1-2026-07-25`, tool `governance_assessment`).
   - Top-level allow-list covers: assembly slots (executive_summary, top_risks, recommended_actions, top_recommendations, regulatory_hot_topics, domain_scores, domain_findings, overall_readiness_rating, readiness_rationale, interaction_effects, dpia_scope), metadata (framework_disclaimer, disclaimer, governance_metadata, jurisdiction_validation, gdpr_meta), cross-cutting arrays (annotations, information_needed, open_items, has_unresolved_placeholders, lint_warnings, deterministic_checks, citation_ledger, completion_guidance, fsor_commentary), engagement_map, enforcement_* trio, ids/timestamps (governance_id, assessment_id, generated_at, prompt_version, build_stamp), `_meta`, `_revision`.
   - Nested pruning intentionally omitted (per DPIA precedent — wide/evolving section shapes).

5. **Stamp-echo whitelist** — `_meta.internal.governance_w1` survives P2 via the serializer's `_meta.internal` reduction. Verified by test `P2-GOV: schema preserves _meta.internal.governance_w1 stamp`.

6. **Telemetry** — `applyW1GovernanceWire` writes:
   ```
   report._meta.internal.governance_w1 = {
     version:  "governance-va-w1-2026-07-25",
     stamp:    "w1-governance-wire@2026-07-25T14:02:34Z",
     walked, resolved, unanchored_scrubbed,
     unresolved_keys: string[]
   }
   ```

7. **RETRO-AUDIT** — the emit-gate H2 sweep runs on every prose surface as part of the newly-wired P1 call; findings surface into `_meta.internal.emit_gate`. Safety valve honoured (existing gate default).

## Tests

`supabase/functions/_tests/w1-governance-wire.test.ts` — **11/11 green**:
- 9× wire behaviour (registry stamp, write-around, unknown-key accumulation, telemetry, `_meta.internal` preservation, RESERVED-subtree skip, idempotency, non-object safety, nested-array walk).
- 1× P2 serializer stamp-echo (`_meta.internal.governance_w1.stamp` survives).
- 1× P1 emit-gate acceptance of `governance_assessment` tool tag.

## Deploy protocol

- Pre-dispatch lock check (14:01:11Z DB time): `locks_qb=0`, `locks_rv=0`.
- Immediately pre-deploy re-check (14:05:23Z DB time): `locks_qb=0`, `locks_rv=0`.
- BUILD_STAMP taken from fresh `date -u` at 14:03:54Z, wired into `run-governance-assessment/index.ts` L8 and echoed into boot logs.
- Deploy: `run-governance-assessment` (single-function targeted deploy).
- Wave 23 expected ~15:30Z — deploy completed well before window.

## Not changed

- No rubrics, graders, goldens, or instrument. s4 hash unchanged.
- No pricing / payment / design tokens / customer revision path / signup.
- No Fable 5. No sample regeneration.
- Registry rows (item 57) untouched. Existing DPIA/LIA wires untouched.
