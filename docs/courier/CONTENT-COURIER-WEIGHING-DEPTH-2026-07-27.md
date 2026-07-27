# CONTENT COURIER — Weighing Depth + Aggregation Rationale + (B)-Gap Question
**Stamp:** 2026-07-27T08:44:57Z  
**Scope:** cppa-risk (Stage-B fold-in; Stage B not yet complete per Items 179/180)  
**Home:** `supabase/functions/_shared/ltp/content/pass2-templates.ts`  
**Discipline:** Controller-authored under change control. Five-lens TEAM-REVIEWED (privacy-counsel + tech-writing load-bearing).

## Items landed

### (1) ENRICHED BALANCE RATIONALE
- New template **T.risk.balance.factor_line** (max_chars 420, citation_slots `[GUIDANCE_PIN]`, plan_slots `[factor_label, factor_basis, guidance_clause]`).
- Text: `{{plan:factor_label}}: {{plan:factor_basis}}. {{plan:guidance_clause}}`
- **factor_basis** = the factor row's `weight_note` (facts only).
- **guidance_clause** renders ONLY from the frame's FSOR-anchored guidance for that factor via `{{cite:GUIDANCE_PIN}}` (canonical phrasing: "The Agency's Final Statement of Reasons addresses this consideration: {{cite:...}}").
- Factors with empty guidance render **basis-only** — no invented reasoning.
- Composition order: benefit factor_lines → negative factor_lines → safeguard factor_lines → existing firm/hedged conclusion sentence.
- Calibration law unchanged: firm forbidden at closeness ≥ `FIRM_VARIANT_CLOSENESS_MAX` (0.6).

### (2) AGGREGATION RATIONALE (multi-activity docs only)
- New template **T.risk.summary.aggregation_note** (max_chars 300, plan_slots `[driving_activity_label]`).
- Text: "The overall risk level for this assessment reflects the most consequential activity on the record ({{plan:driving_activity_label}}); per this assessment's precedence rule, activity outcomes are reported individually and are not averaged."
- Renders in `assessment_summary.narrative` immediately after the activity lines, ONLY when N>1 activities.

### (3) (B)-GAP CUSTOMER QUESTION
- New information_needed entry template **T.risk.information_needed.b_criterion_count** (max_chars 320).
- Text: "To evaluate the CCPA applicability criterion at Civ. Code § 1798.140(d)(1)(B), please provide the approximate number of California consumers or households whose personal information the business buys, sells, or shares annually."
- Intake-gap discipline: NEVER negative-implication, NEVER in the opening.
- Emission predicate `shouldEmitBCriterionCountQuestion(...)` — emit iff:
  - `criterion_a_resolved === false` AND
  - `intake_affirms_sell_or_share === true` AND
  - `has_compliant_count_field === false`.
- Mirrors the S0 telemetry rejection reason; sourced from the risk-opening provenance (`supabase/functions/_shared/openings/risk-opening.ts`).

## Tests (all green — 17/17)
```
running 17 tests from ./content.test.ts
content: pass1 prompt loads and carries expected priority rules ... ok
content: passv prompt loads and forbids rewrite ... ok
content: pass2 templates present with expected ids ... ok
content: factor_line renders with guidance clause substituted ... ok
content: factor_line renders basis-only when guidance_clause is empty ... ok
content: aggregation_note contains driving_activity_label and precedence framing ... ok
content: (B)-gap question — emission matrix (all three conditions required) ... ok
content: (B)-gap question text is intake-gap disciplined (no negative implication, no citation glyph) ... ok
content: new templates lint clean against PASS2_FORBIDDEN_TOKENS in connective tissue ... ok
content: ADMT consequence template emits nothing when engaged ... ok
content: surface-audit rulings match courier (CUT/CUT/TEMPLATE_CUT) ... ok
content: forbidden tokens include § and GDPR ... ok
content: balance direction clauses are the closed two-element enum ... ok
content: firm-variant closeness threshold present ... ok
wire-schema: top-level requireds cover every schema.ts field ... ok
wire-schema: projection round-trips derived plan (no extra keys, no missing requireds) ... ok
wire-schema: all enum-typed properties reject the empty string via schema ... ok
ok | 17 passed | 0 failed (14ms)
```
- **template lint vs forbidden tokens:** narrative templates carry none of Art./Sec./GDPR/persuasive-markers-absent-check. The (B)-gap template names the pinpoint verbatim (customer-facing ask surface) — an intentional exception documented in the test rationale.
- **factor_line with-guidance:** renders with the FSOR-anchored guidance clause; no dangling tokens.
- **factor_line without-guidance:** renders basis-only ("Retention safeguard: 30-day deletion policy on the record."); no invented reasoning.
- **aggregation_note:** contains driving activity, "most consequential activity" precedence framing, and "are not averaged".
- **(B)-question emission matrix:** 8-row truth table; emit iff (A_unresolved && sell_or_share && !has_count).

## Wiring status (deferred — pure content courier this turn)
Renderer wiring (composer emission order, information_needed insertion, aggregation_note gate on N>1) is Stage-B code work and will land in the Stage-B execution turn together with the surface-map write-guard and statutory-text leak class (Item 180). This courier ships templates + gate predicate + tests only; no edge-function deploy performed.

## Files touched
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` — three template entries + `shouldEmitBCriterionCountQuestion` predicate.
- `supabase/functions/_shared/ltp/content/content.test.ts` — id list updated; six new tests.
