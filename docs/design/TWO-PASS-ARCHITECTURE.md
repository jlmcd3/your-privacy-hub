# Two-Pass Architecture — Design (Risk Assessment first, product-agnostic)

**Status:** DESIGN COMPLETE — build awaits CEO review
**Owner:** platform / risk product
**Authored:** 2026-07-26T07:15:00Z
**Ledger:** item 129 (DONE-DESIGN)
**Predecessor evidence:** `docs/courier/PERFECT-INTAKE-EXPERIMENT-2026-07-26.md` (item 127, run `f3674428-f546-4973-b2a4-ba2b8125f904`) — decomposition of failing findings into intake-driven (VANISH) vs generator-driven (PERSIST) classes.
**Companion / interim guard:** item 128 `RISK-CITATION-DUP-FIX` — a deterministic post-pass for a subset of §2 primary target #2 (citation duplication template + q18 ADMT-consequence gate). The two-pass architecture eventually **subsumes** that guard; we do not double-count it as unsolved.

---

## 0. OPEN QUESTIONS FOR CEO — **ANSWERED 2026-07-26 (item 132)**

CEO agreed with controller recommendations across the board. Answers below stand as CEO rulings.

1. **Rollout order — Risk-first.** (Aligned with pilot doctrine; PERFECT-INTAKE baseline exists.)
2. **Pass-1 retry budget — N=2**, then conservative write-around. (Never a blocked customer.)
3. **Model routing — same model, two calls, for pilot.** Cheaper Pass-1 routing (structured-output model) is revisited post-pilot-success, not before.
4. **Interim guard retirement — two consecutive clean s5 waves → assertion-only → removed one wave later.** `_risk_citation_dup_fix` is the first candidate.
5. **Surface-audit default — CUT unless a finding-class history or CEO-required disclosure defends the template.** (Inverse of the pre-answer proposal; CEO tightened.)
6. **Write-around disclosure — silent + telemetry for pilot.** Customer-visible banner decision is DEFERRED to pre-launch review.

Build is now **UNBLOCKED** subject to the v1 + v2 + v2.1 amendment set (see §§2.5, 2.6, 2.7). No architecture questions remain open for CEO on the pilot path.



---

## 1. Motivation (empirical, from PERFECT-INTAKE-EXPERIMENT)

Under **PERFECT intake** (complete, consistent, facts-only fixtures against V2 band scaffold), Risk still produced 6 failing findings across 2 classes on 2 documents:

| Class | Count | Vanish under perfect intake? | Ownership |
|---|---|---|---|
| Citation duplication / misapplication (§ 7150(b) same-pinpoint both sides; § 7001(ddd) on q18=NO) | 4 | NO (persist) | **Generator** |
| Mid-prose intake-value drift (`sensitive_location_basis` misquote — fabricated language not present in intake) | 2 | NO (persist) | **Generator** |
| ADMT-consequence over-reach on negative-ADMT fixtures | (also counted above) | YES (would VANISH with a q18 gate) | Intake shape → gate |

The **mid-prose intake-value drift** class is the **existence proof** for two-pass: four generations of string-guards have not closed it, because the defect is not string-shaped — the model invents a value that is topologically valid prose but factually unmoored from the intake ledger. No post-pass scrubber can safely rewrite a fabricated fact; it can only excise, which degrades the document. **The only structural fix is to prevent the model from typing intake-referencing prose at all.**

## 2. PRIMARY TARGETS (define §5 success)

1. **Mid-prose intake-value drift** — every intake-referencing claim in the final render must be resolvable to a Pass-1 ledger row with polarity and verbatim source span. Model prose in Pass-2 is rendered **only** from the validated plan; free-form intake references are unrepresentable.
2. **Citation binding** — Pass-1 binds `proposition → pinpoint` via the verified-authority registry; the model **never types a citation string**. Pass-2 substitutes citation tokens deterministically. Interim `_risk_citation_dup_fix.ts` remains until §7 retirement criterion is met.
3. **Logical-consequence gating** — q18-style rules ("trigger engaged, consequence suppressed") are enforced **structurally at derivation** as `gate_rules[]`, generalised beyond ADMT (see §3.3). If the plan says "gated", Pass-2 has no seam to render the ungated consequence.

Everything else in this document exists to make the three primary targets achievable and measurable.

---

## 2.5 Legal Test compliance (MANDATORY, CEO-ordered 2026-07-26)

This section is **build-blocking** and governs every subsequent §. Full methodology: `docs/design/LEGAL-TEST.md` (CEO-adopted standing program law). The joint privacy-law + CS review (2026-07-26) established that outcomes the cited laws commit to weighing (11 CCR § 7152(a)(5) benefit/harm; GDPR Art 6(1)(f) balancing; Art 35(7)(b) necessity/proportionality; Art 33 risk-to-rights) MUST NOT be forced into false polarity determinism.

**Conclusion classification (R/W/J).** Before any product's two-pass migration begins, its `_shared/legal-test/<product>-conclusions.ts` inventory MUST exist, tagging every assertable conclusion:

- **Type R (Rule).** Bright-line rule → ascertainable fact. Deterministic. Polarity-determinism validation applies.
- **Type W (Weighing).** Statutory factors → weighed judgment. Factor-table validated for completeness + anchoring; conclusion NOT polarity-validated.
- **Type J (Reserved Judgment).** Present analysis, pose the decision — never assert it.

**RenderPlan schema deltas (build-blocking).** Every proposition MUST carry `epistemic_type: "R" | "W" | "J"`. Type W propositions MUST carry a `factor_table` structure: `{ factors: [{ id, statutory_anchor, supporting_ledger_ids[], registry_pinpoint_ref, weight: "supports" | "opposes" | "neutral", note?: string }], closeness: "lopsided" | "close", proposed_conclusion?: string, reasoning_ref: string }`. Type J propositions carry `posed_question: string` and no `engaged` field. Factor registries live at `_shared/factors/<product>-factors.ts` (corpus-quoted, pin-tested like verified-authority registries).

**Validator scope corrections (see §3.2).** Validator #6 (polarity determinism) is **scoped to Type R propositions only**. New Type W validators are added: (a) factor completeness (every statutorily required factor in the registry appears in the factor_table), (b) factor anchoring (every factor resolves to a ledger row or registry pinpoint), (c) conclusion consistency (proposed_conclusion cites only validated factors), (d) closeness heuristic recorded (Pass-1 evaluates lopsided-vs-close by deterministic weight tally; recorded, not rejected).

**Pass-2 Type W templates (see §4).** Type W templates ship in firm+hedged variants; variant selection is deterministic on `factor_table.closeness`. Every Type W template carries a `what_would_tip_it` slot required on `closeness: "close"`. **Flat certainty on a close balance = post-render hard reject.** Type J propositions render via counsel-voice analysis-then-question templates (analysis body + posed question, no assertion).

**Success criteria addendum (see §5).** Type W tools add: **factor completeness = 100%** across pilot waves; **zero flat-certainty renders on close-balance factor tables**. Deterministic expected-answer checks in the grader are valid ONLY for Type R conclusions.

**Grader audit (CEO-gated future work).** A grader-audit turn — for each product, cross-check every deterministic expected-answer check against the R/W/J inventory; any check enforcing a Type W outcome as Type R is flagged for CEO ruling — is queued as CEO-gated future work (measurement correction, not loosening). No product's two-pass migration begins until its conclusion inventory + factor registries exist.

The seven §4 amendments in `docs/design/LEGAL-TEST.md` are incorporated here by reference and are build-blocking for the risk build turn and every subsequent product turn.

---

## 2.6 Legal Test v2 — Corpus Engagement (Question 4) — MANDATORY, CEO-ordered 2026-07-26

This section is **build-blocking** and additive to §2.5. Full methodology: `docs/design/LEGAL-TEST.md` Q4 (CEO-adopted standing law). The corpus is a GUIDE wherever a test or balancing of interests is required — a role in BOTH passes and, when Type W tests engage, a DEDICATED ADDITIONAL PASS (Pass G).

**Revised pass structure (three passes + one optional).** The pass structure defined in §§3-4 is revised as follows; §§3-4 remain accurate for Pass 1 and Pass 2 mechanics with the deltas below layered on.

- **Pass 1 — Derivation.** As specified in §3, extended: `factor_table` guidance columns are filled deterministically from the factor-registry `guidance_refs[]` binding (no model choice; authored refs resolve to pinpointed corpus text at Pass-1 build time).
- **Pass G — Guidance & Analogy (NEW; conditional).** Runs ONLY when at least one Type W proposition is engaged in the RenderPlan. Inputs: the validated Pass-1 RenderPlan + a PRE-INDEXED candidate set of interpretive authorities keyed by test id (FSOR rows for CPPA tests; EDPB guideline rows for GDPR tests; enforcement_actions rows tiered per the eligibility bar). Model job: SELECT from the candidate set only — candidate-set closure is a hard validator (model may not introduce authority outside the candidates); attach analogy entries from eligible tiers (quote-safe or row-grounded) with tier labels; emit a `weighing_frame[]` structure with per-entry corpus anchors + pin-tests + tier labels + closeness contributions. Empty-by-finding path: if the candidate set is empty for a test, Pass G emits an `empty_by_finding` record for that test, the Pass-2 Type W template renders on statutory factors alone with the required disclosure ("guidance on this balance is limited"), and the event auto-emits telemetry feeding the T5 ingestion backlog as a ranked work item (rank = product weight × Type W frequency × recency).
- **Pass 2 — Rendering.** As specified in §4, extended: Type W sections render from BOTH the `factor_table` (Pass 1) AND the `weighing_frame[]` (Pass G); guidance and enforcement citations flow through `{{cite:…}}` tokens exactly like statutory pinpoints; the closeness heuristic (Pass-2 template variant selection: firm vs hedged) consumes BOTH the Pass-1 factor tally and the Pass-G guidance-weighted closeness contribution, combined deterministically into a single `closeness` value on the rendered proposition.
- **Pass V — Verification (NEW; OPTIONAL; behind a flag).** Bounded model counsel-read over close-call Type W sections only. Pilot measures yield across 2 waves. **Zero yield = drop.** Default off; pilot decides whether it ships.

**RenderPlan schema deltas (v2, build-blocking).** Add `weighing_frame: WeighingFrameEntry[]` at the plan root:

```jsonc
"weighing_frame": [
  {
    "test_id": "T.risk.7152a5.benefit_harm",           // matches a Type W proposition's factor_table
    "candidate_set_hash": "…",                          // hash of the pre-indexed candidate set for closure validation
    "entries": [
      {
        "kind": "guidance" | "analogy",
        "source": "fsor" | "fsor_callout" | "edpb" | "enforcement_action",
        "ref_id": "…",                                  // registry pinpoint / row id
        "pinpoint": "…",
        "quote_hash": "…",                              // pin-test key
        "tier": "quote_safe" | "row_grounded" | null,   // analogies only; null for guidance
        "closeness_contribution": "supports" | "opposes" | "neutral",
        "rendering_ref": "{{cite:CORPUS.…}}"
      }
    ],
    "empty_by_finding": false                           // true → statutory-only render + disclosure + T5 feed
  }
]
```

Factor-registry rows (`_shared/factors/<product>-factors.ts`) MUST carry `guidance_refs[]` per LEGAL-TEST §Q4(a). Per-product enforcement-eligibility index `_shared/analogy/<product>-eligibility.ts` is authored alongside the factor registry.

**New validators (Pass G).** (a) Candidate-set closure: every `weighing_frame[].entries[].ref_id` MUST appear in the candidate set for `test_id`; unknown ref = hard reject. (b) Eligibility-bar closure: analogy entries MUST carry a `tier`; INELIGIBLE-tier rows are absent from the candidate set by construction; a Pass 2 render referencing an entry not in the frame is a hard reject. (c) Pin-test: every `quote_hash` MUST match the current corpus row (freshness). (d) Empty-by-finding integrity: when `empty_by_finding=true`, `entries` MUST be empty AND Pass-2 template MUST render the "guidance on this balance is limited" disclosure slot AND the telemetry sink MUST record the T5-feed event.

**§5 success criteria (v2 addendum).** Add: **100% weighing_frame-entry anchoring** (every rendered guidance/analogy citation resolves to a frame entry with pin-test pass); **zero eligibility-bar violations** across pilot waves; **zero authority improvisation on empty frames** (empty-by-finding disclosure present whenever guidance is absent). The interim `_risk_citation_dup_fix` guard is extended to also reject any `§`/citation form referencing an authority not present in the frame for a Type W section.

**Cost/latency note.** Pass G is **conditional** on Type W engagement. Expected wall-clock impact: ~1.2-1.4× single-pass baseline for **W-heavy products** (cppa-risk, lia, dpia); **unchanged** for R-dominant products (registration, biometric, most of dpa). Pass V, if piloted, adds ~1.1× on close-call sections only (bounded scope, small fraction of documents).

**Build-blocking amendment list (v1 + v2).** The seven v1 amendments from `docs/design/LEGAL-TEST.md` remain in force. Added v2 deltas (all build-blocking, additive):

1. **guidance_refs[] authoring** in factor registries — includes NEW FSOR mapping work for CPPA products where Type W engages (cppa-risk, cppa-cyber § 7122, admt human-involvement adequacy, governance adequacy characterizations).
2. **weighing_frame[] schema** added to RenderPlan (as above).
3. **Pass G (Guidance & Analogy)** added — with candidate-set closure, eligibility-bar closure, and pin-test validators.
4. **Combined closeness heuristic** — Pass-1 factor tally + Pass-G guidance-weighted closeness contribution → deterministic combined `closeness` consumed by Pass-2 variant selection.
5. **Empty-by-finding → T5 feed** — telemetry sink + rank formula + standing input to T5 sequencing when the program resumes.
6. **Pass V (Verification) stub** — optional, flag-gated; pilot yield-measured over 2 waves; zero yield = drop.
7. **Extended success criteria** — 100% frame-entry anchoring, zero eligibility-bar violations, zero authority improvisation on empty frames.

No product's two-pass migration begins until v1 (LEGAL-TEST §4) AND v2 (this §2.6) AND v2.1 (§2.7 below) amendments are implemented — including factor-registry guidance mapping AND jurisdiction-domain scoping for that product.

---

## 2.7 Legal Test v2.1 — Authority-Domain Matching (Question 4(e)) — MANDATORY, CEO-ordered 2026-07-26

This section is **build-blocking** and additive to §§2.5-2.6. Full methodology: `docs/design/LEGAL-TEST.md` Q4(e). Every test / analysis-unit / proposition carries a **JURISDICTION TAG**; all corpus candidates (statutory anchors, `guidance_refs`, Pass-G candidate sets, analogies) are FILTERED to the matching domain. **Cross-domain authority in customer-facing analysis = HARD REJECT** at BOTH authoring review AND Pass-G candidate-set construction.

**Domain definitions.**

- **`cppa-ca`** — `cppa_authorities`; `provision_texts` CA/ccpa rows; `cppa_fsor_commentary` and `cppa_fsor_callouts`; `cppa_deadlines`; California statutes (Civ. Code) (CPPA-domain corpus is BINDING-tier CA interpretive material; FSOR-mediated non-CA discussion is PERSUASIVE tier only per §2.8 v2.2 — never authority).
- **`gdpr-eu`** / **`gdpr-uk`** — `gdpr_articles` for the matching sub-jurisdiction (UK falls back to EU per existing `getGdprContext` behaviour, which is a within-domain fallback); `edpb_guidelines`; `provision_texts` EU / UK rows; `enforcement_actions` tagged GDPR (eligibility bar applies).
- **`us-state-<code>`** (e.g. `us-state-il-bipa`, breach-notification states) — the respective state statutes when present in corpus.

**Hybrid products** (ir-playbook, governance, registration, biometric): scoping is **per analysis unit**. A GDPR section uses GDPR corpus only; a California section uses CA corpus only; **never blended within a unit.** The product's conclusion inventory (`_shared/legal-test/<product>-conclusions.ts`) tags each unit with its `jurisdiction_tag`.

**Schema deltas (v2.1, build-blocking).** Add `jurisdiction_tag: string` to every proposition (see §3.1 propositions[]), every factor-registry row, every `weighing_frame[].entries[]`, and every candidate-set entry. Analysis-unit boundaries carry the tag; renderers assemble per-unit output without cross-domain seams.

**New / extended validators.**

- **Pass-1 guidance-closure (extended):** every `factor.registry_pinpoint_ref` and every `factor.guidance_refs[].ref_id` MUST match the factor's `jurisdiction_tag`. Cross-domain ref = hard reject.
- **Pass-G candidate-set closure (extended):** the pre-indexed candidate set for a test is **domain-filtered at construction time**; a candidate whose source-row jurisdiction does not match the test's `jurisdiction_tag` is absent from the set. Hard reject if any `weighing_frame[].entries[].ref_id` fails the domain check at Pass-G output.
- **Pass-2 post-render (extended):** any `{{cite:…}}` substitution whose resolved authority belongs to a different domain than the enclosing analysis unit = hard reject.
- **Authoring review:** factor-registry lint (CI) rejects a row whose `guidance_refs[]` include a ref from a foreign domain; conclusion-inventory lint rejects a unit missing `jurisdiction_tag`.

**Comparative cross-domain commentary is BANNED** from customer-facing output ("GDPR practice suggests…", "California has taken a similar view…"). Any future comparative feature is a **separate CEO decision**, not a runtime capability. `forbidden_tokens` for every Type W template include cross-domain framing phrases; violation = hard reject.

**Future-proofing.** `enforcement_actions.jurisdiction` tags mean future CPPA enforcement rows automatically flow into the `cppa-ca` candidate sets once they exist and pass the eligibility bar — **no architecture change** required.

---

## 3. Pass-1: Derivation

Pass-1 is a **structured-output-only** call. The model receives the intake + registry-projected law surface and returns a JSON `RenderPlan` — no prose, no citations-as-strings, no free text outside enumerated `note` fields with strict length caps.

### 3.1 Pass-1 JSON schema (RenderPlan v1)

```jsonc
{
  "schema_version": "render-plan/v1",
  "generated_at": "2026-07-26T07:15:00Z",
  "product": "cppa-risk-assessment",
  "instrument": "gc-2026-07-26-s5-eu-uk-ca-au-sg",

  "intake_ledger": [
    // Every intake field the plan will reference. Verbatim only.
    {
      "field_id": "q5b_sensitive_location",
      "polarity": "yes" | "no" | "unknown" | "not_applicable",
      "verbatim_value": "<byte-exact substring of intake payload>",
      "source_span": { "path": "intake.answers.q5b_sensitive_location", "start": 0, "end": 42 },
      "normalized_label": "Sensitive location processing"  // from FIELD_LABELS
    }
  ],

  "propositions": [
    // Each claim the render will assert. NEVER free prose.
    {
      "id": "P.risk.7150b1",
      "jurisdiction_tag": "cppa-ca",                 // v2.1: authority-domain scope for this proposition
      "kind": "trigger" | "gate" | "obligation" | "recommendation" | "scope_note",
      "engaged": true | false | "conditional",
      "pinpoint_ref": "REG.risk.7150b.1",           // key into verified-authority-resolver
      "supporting_ledger_ids": ["q5b_sensitive_location", "q3_annual_revenue"],
      "polarity_dependencies": [
        { "ledger_id": "q18_admt_use", "required": "yes" | "no" | "any" }
      ],
      "template_id": "T.risk.trigger.single",       // key into Pass-2 template registry
      "template_slots": {
        "band_label": "Over $100M",                  // must equal REVENUE_BANDS_V2 canonical
        "prong_count": 2
      },
      "gated_by": ["G.q18.admt_consequence"] | []
    }
  ],

  "gate_rules": [
    // §3.3 — structural consequence gates
    {
      "id": "G.q18.admt_consequence",
      "when": { "ledger_id": "q18_admt_use", "polarity": "no" },
      "suppresses": ["P.risk.7001ddd.consequence", "T.risk.admt.decision_effects.*"],
      "preserves": ["P.risk.7150b4"],               // trigger stays, consequence suppressed
      "rationale_key": "R.q18.no_admt_no_consequence"
    }
  ],

  "citation_bindings": [
    // Pass-1 output only. Pass-2 substitutes; model never types.
    { "token": "{{cite:REG.risk.7150b.1}}", "pinpoint_ref": "REG.risk.7150b.1" }
  ],

  "render_order": [
    { "section_id": "opening", "kind": "opening_paragraph" },   // deterministic emitter (T7)
    { "section_id": "triggers", "propositions": ["P.risk.7150b1", "P.risk.7150b2"] },
    { "section_id": "obligations", "propositions": ["..."] }
  ],

  "conservative_write_around": {
    // Populated only when validators reject Pass-1 after N retries. §8.
    "engaged": false,
    "reason": null,
    "degraded_sections": []
  },

  "_meta": {
    "pass1_model": "…",
    "pass1_latency_ms": 0,
    "pass1_retries": 0,
    "validator_report": { "hard": [], "soft": [] }
  }
}
```

### 3.2 Pass-1 validators (hard reject = retry)

1. **Ledger closure.** Every `propositions[].supporting_ledger_ids[]` and every `polarity_dependencies[].ledger_id` MUST exist in `intake_ledger[]`. No dangling references.
2. **Verbatim closure.** Every `intake_ledger[].verbatim_value` MUST be a byte-exact substring of the intake payload at `source_span.path[start:end]`. Byte-mismatch = hard reject.
3. **Pinpoint closure.** Every `pinpoint_ref` MUST resolve in `verified-authority-resolver`. Unknown pinpoint = hard reject.
4. **Gate closure.** Every proposition listing `gated_by[]` MUST have those `gate_rules[].id`s present. Every `gate_rules[].when.ledger_id` MUST resolve.
5. **Slot vocabulary.** `template_slots.band_label` MUST equal a `REVENUE_BANDS_V2` / `CONSUMER_BANDS_V2` canonical (or a resolved-legacy value via `resolveRevenueBand/resolveConsumerBand`). Free-text bands = hard reject.
6. **Polarity determinism.** For any proposition with `polarity_dependencies`, the `engaged` field MUST equal the deterministic evaluation of those dependencies against the ledger. Model disagreement with the deterministic evaluation = hard reject (this is the structural defense of primary target #3).
7. **No prose leak.** No property outside enumerated `notes` may contain more than one `.` character or exceed 240 chars. Hard reject.

Soft-reject validators emit `_meta.validator_report.soft[]` but do not retry (e.g., missing optional `rationale_key`).

### 3.3 Gate-rule generalisation

`gate_rules` is the product-agnostic replacement for one-off checks like `_risk_intake_contradiction`. Each rule is a **(when, suppresses, preserves, rationale)** tuple whose `when` is a deterministic evaluation over the ledger. This subsumes:

- **q18 ADMT-consequence** (interim guard, item 128 target B).
- **W9 deadline-registry access-timeline** (deadline surfaced only when registry-key present).
- **RISK-COHORT-DATE** (band → cohort-date binding — restructured as gate with `preserves: [trigger] / suppresses: [wrong-cohort prose]`).
- Future gates that today would ship as bespoke post-passes.

Rules are stored in a **product-scoped gate registry** (`_shared/gates/<product>-gates.ts`, versioned).

## 4. Pass-2: Rendering

Pass-2 receives the validated `RenderPlan` and renders prose. The model's job shrinks to: given a template ID and slot values, produce the narrative connective tissue in the template's fixed vocabulary. Pass-2 is a **template-bounded** call.

### 4.1 Rendering contract

1. **Template registry.** `_shared/templates/<product>/*.ts`. Each template declares `{id, allowed_slots, forbidden_tokens, max_chars, citation_slots[]}`. Templates ship with unit tests over the finding-class regressions they replace.
2. **Citation substitution.** Pass-2 output contains `{{cite:PINPOINT_REF}}` tokens; the framework substitutes registry text after Pass-2 returns. **The model never types a `§` character** — a post-render assertion rejects any `§` outside a substituted citation span.
3. **Intake-value channel.** Any prose referencing an intake value MUST render from `intake_ledger[].verbatim_value` via `{{intake:LEDGER_ID}}` tokens. **Free-typed intake values = post-render hard reject** (rendered document is discarded, one Pass-2 retry, then conservative write-around).
4. **Gate enforcement (post-render).** For every `gate_rules[]` entry that fired (`suppresses`), the rendered prose is scanned for `forbidden_tokens` associated with the suppressed templates. Hit = hard reject.
5. **Whole-sentence discipline.** All existing whole-sentence-excision guards (W22, W23, W24, W24a-V3, LEAK-PREV P1, `_risk_citation_dup_fix`) remain wired for the pilot as **belt-and-braces** post-passes; each guard's telemetry gains a `subsumed_by_two_pass: bool` field to track retirement readiness.

### 4.2 What Pass-2 can NOT do

- Type any `§`, `Art.`, `Sec.`, or citation form outside `{{cite:…}}` substitution slots.
- Type any intake value outside `{{intake:…}}` substitution slots.
- Emit any proposition ID not present in `render_plan.render_order`.
- Emit prose associated with a template ID whose `gated_by` gate fired.

Each restriction is enforced by a post-render deterministic assertion, not by prompt discipline.

---

## 5. Success Criteria (§2 primary targets)

| Target | Pilot success (Risk, 2 consecutive s5 waves ≥ batch_size=3) |
|---|---|
| Mid-prose intake-value drift | **0** findings of class `sensitive_location_basis` (or equivalent verbatim-drift) across pilot waves. |
| Citation binding | **0** findings of class citation-duplication or citation-misapplication; interim `_risk_citation_dup_fix` telemetry reports `dup_sentence_excisions=0` and `admt_consequence_excisions=0` in Pass-2 output (guard becomes noop → retire per §7). |
| Logical-consequence gating | **0** findings of class ADMT-consequence-on-negative-ADMT; **0** findings of any new gate-rule violation surfaced by the gate registry. |

Secondary (informational): pooled headline score does not regress vs. current s5 baseline by more than 2 points; per-doc variance narrows (Pass-1 determinism should tighten distribution).

---

## 6. Surface Audit — `scope_notes` / `inconsistency_flags` / `cross_tool_recommendations`

Each of these three fields carries a template block today. For the pilot, we produce a **finding-class histogram** per template across the last N=20 waves and emit one of three recommendations per template:

- **KEEP** — template defends ≥1 finding class or CEO-required disclosure; migrate to Pass-2 template registry.
- **CUT** — template contributes ≥1 finding class and defends none; remove pre-pilot.
- **TEMPLATE-CUT** — template's *specific slot vocabulary* is finding-adjacent; keep the block, tighten the slot enum.

Recommendations land in `docs/design/TWO-PASS-SURFACE-AUDIT-<date>.md` (authored during build turn, not this design turn) and are gated by CEO §0 Open Question 5.

---

## 7. Interim guard subsumption + retirement

- All existing risk-generator guards remain wired at pilot start (defense in depth).
- Each guard's telemetry gains `subsumed_by_two_pass: bool`; a guard is `subsumed` when its trip counter is **0 across 2 consecutive s5 waves under Pass-2**.
- Retirement sequence: `subsumed` → **assertion-only** (guard flips from excise to `throw` on trip, one wave) → **removed** (next wave).
- `_risk_citation_dup_fix` is the pilot's first retirement candidate (§0 Q4).

## 8. Failure modes

| Failure | Response |
|---|---|
| Pass-1 model returns malformed JSON | Retry (up to N, §0 Q2). |
| Pass-1 hard-validator reject | Retry with validator report appended to system message (bounded prompt growth). |
| Pass-1 exhausts retries | **Conservative write-around report.** `RenderPlan.conservative_write_around.engaged=true`; Pass-2 renders only sections whose propositions survived validation; degraded sections replaced by registry-only statutory summary (no intake-derived prose). **Never a blocked customer.** |
| Pass-2 post-render hard reject (free `§`, free intake value, gate leak) | One Pass-2 retry with rejection reason. If still failing: mark that section `degraded` in the write-around, render its registry-only fallback. |
| Registry pinpoint referenced but resolver returns empty | Hard reject at Pass-1 validation (§3.2 #3). |
| Gate rule references an unknown ledger_id | Hard reject at Pass-1 validation (§3.2 #4). |

Telemetry `_meta.internal.two_pass` records: `{plan_version, pass1_latency_ms, pass1_retries, pass2_latency_ms, pass2_retries, conservative_write_around, forbidden_token_trips, guard_subsumption_counters}`.

## 9. Measurement Plan (post CEO campaign resume)

Baseline is Perfect-Intake run `f3674428-…` on s5 (Item 127).

- **Wave A (pilot):** batch_size ≥ 3, s5, Risk-only. Report per-doc + pooled scores, findings by class, gate-rule trip counts, guard subsumption counters.
- **Wave B (pilot repeat):** identical shape, ≤ 72h after Wave A. §5 success requires both waves.
- **Wave C (canary):** batch_size ≥ 3 on PROD intake shapes (non-perfect). Compare to prior s5 non-perfect baseline.
- **Cost/Latency analog:** dpia unit-pipeline `api_usage` rows (already recorded per doc) serve as the empirical basis for the Pass-1+Pass-2 latency projection; expect ~1.7× single-pass wall clock at Pass-1 model parity, ~1.3× if Pass-1 uses a cheaper structured-output model (§0 Q3).
- **Instrument re-key:** none for pilot (s5 remains). A re-key ONLY if surface audit (§6) mandates a rubric change; otherwise the two-pass architecture is evaluated on the same scoreboard as the single-pass generator.

## 10. Rollout Criteria (product-by-product)

1. §5 success in Risk (two waves).
2. Surface audit CUT recommendations executed and greened.
3. `_risk_citation_dup_fix` retired to assertion-only.
4. CEO green-light per product for adoption order. Suggested order: **Risk → DPIA → LIA → Governance → ADMT-suite → IR-Playbook → DPA-generator** (weighting: instrumentation density × finding-class residue × registry maturity).

## 11. Non-goals

- Not a prompt refactor. Prompts change only as needed to elicit Pass-1 JSON.
- Not a rubric change. §5 success is measured on the current s5 rubric.
- Not a corpus change. Registry is the pinpoint source of truth; no new corpus rows required for the pilot.
- Not a UX change. Customer path is unchanged unless CEO answers §0 Q6 in favor of disclosure.

---

**End of design. Build awaits CEO review of §0 Open Questions.**
