# CP5 ADDENDUM — CUSTOMER-FIRST OPENING (docs-only, CEO-directed 2026-07-28)

**Ledger:** Item 240 CP5 ADDENDUM. **Stamp:** 2026-07-28T13:01Z. **Scope:** docs-only; no code, no deploy.

## 1. CEO directive of record (verbatim)
> "The PDF should lead with the customer, not the laws of the test."

Folded into CP5(e) prose-panel scope. Recorded as a standing design law in `docs/design/OPENING-PARAGRAPH-DESIGN.md` §4 for every product's opening AND every section opener.

## 2. What changed in the design doc
- **§4 (new).** Standing cross-product law: customer-facts first (S2/S3/S4-class), legal frame second (S0/S1/S5/S6-class). No paragraph may open with a code section, rule number, framework name, or "This assessment is required under …" clause. Statutory anchors attach to the customer's facts, not the other way around. Same rule extends into every section opener (scope, balance, actions, guidance, etc.).
- **§2 cppa-risk.** Slot render order reordered to **S2 → S3 → S4 → S0 → S1 → S5 → S6** as the pilot application. Slot sources, provenance, polarity locks, omit-over-invent, all-that-apply enumeration, and boundary-band rule are UNCHANGED — only render order is constrained.

## 3. Content-anchored reordering (for CEO review before any wiring)

### 3.1 cppa-risk — opening paragraph, reordered
**Current (S0 → S1 → S2 → S3 → S4 → S5 → S6):** opens with "As a business subject to the CCPA (Cal. Civ. Code § 1798.140) that triggers a risk assessment under 11 CCR § 7150(b)(…), {entity_name} …"

**Reordered (S2 → S3 → S4 → S0 → S1 → S5 → S6), CEO-directive shape:**
> "{entity_name} processes {q4_pi_categories} to {i1_processing_purpose}. {S3 qualifiers trio — sell-share / targeted-ads / profiling, polarity-locked, non-silent}. {S4 safeguards clause — omit if silent}. This risk assessment documents that processing under the California Consumer Privacy Act (Cal. Civ. Code § 1798.140) and is required by 11 CCR § 7150(b): {all-that-apply triggers, statutory order, each with its own pinpoint}. It follows the content frame set out in 11 CCR § 7152. As of {as-of date}."

### 3.2 Section-opener audit — pilot rewrites for cppa-risk

Each section states the customer's facts relevant to that section first, then the legal frame that governs them.

- **Scope & Triggers.** Current opener leads with "The following § 7150(b) prongs are engaged …". **Reordered:** "{entity_name}'s processing of {q4_pi_categories} for {i1_processing_purpose} engages the following review prongs. Each is a distinct trigger under 11 CCR § 7150(b): {prong list with individual pinpoints}."
- **Balance.** Current opener leads with "Under the 11 CCR § 7152 balancing frame …". **Reordered:** "Weighing {entity_name}'s stated purpose against the risks to consumers whose {q4_pi_categories} is processed, {balance outcome sentence}. The 11 CCR § 7152 balancing frame governs this assessment."
- **Actions / Recommendations.** Current opener leads with "The Regulations require …". **Reordered:** "Given {customer-fact — e.g., sell/share posture, ADMT posture, sensitive-PI posture}, {entity_name} should {action}. This action is required by {§ pinpoint}."
- **Compliance Guidance.** Current opener leads with the registry sentence. **Reordered:** "For {customer-fact clause}, the regulation requires the following: {registry `compliance_guidance` sentence with its pinpoint}."
- **Executive Summary.** Current opener leads with "This assessment finds …". **Reordered:** "{entity_name} processes {q4_pi_categories} for {i1_processing_purpose}. This assessment finds {aggregateBalance outcome}. It is required by {§ 7150(b) pinpoint(s)} and follows 11 CCR § 7152."

### 3.3 Other products — held for CEO review before wiring
Per-product reorderings for cppa-admt, cppa-cyber, dpia, lia, governance, dpa, ir_playbook, registration, biometric will ship as courier addenda in the CP5(e) prose-panel pass, each drafted content-anchored (as above) before any template edits. Slot inventories and sources UNCHANGED — the reorderings are render-order only.

## 4. Provenance & law integrity
- Slot sources unchanged: ledger row (customer intake, verbatim, polarity locked) or registry row (verbatim quote pin-tested against the product's native corpus table).
- Deterministic emitter unchanged; emit-gate wire unchanged; per-proposition citation binding unchanged (CP4); coherence invariant unchanged (CP3/CP5); shape contract unchanged (CP3).
- "Omission over invention," all-that-apply enumeration, boundary-band rule, semantic-honesty rule (S0 §6/§9/§10 in the design doc) — UNCHANGED.

## 5. Disposition
- **Docs written:** `docs/design/OPENING-PARAGRAPH-DESIGN.md` §4 + §2 cppa-risk reorder; this courier; ledger item 240 CP5 ADDENDUM + "Last updated" header.
- **No code / no deploy this turn.** CP5(e) prose-panel template wiring for cppa-risk and per-product opener rewrites are held for a follow-up wiring turn pending CEO approval of §3 content-anchored reorderings.
- **HARD STOP.**
