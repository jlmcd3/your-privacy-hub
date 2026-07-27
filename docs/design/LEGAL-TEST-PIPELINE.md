# LEGAL TEST PIPELINE — Design (Risk Assessment first, product-agnostic)

> **Renamed 2026-07-26 (ledger item 136).** Formerly `TWO-PASS-ARCHITECTURE.md`. The pipeline is formally **Derive → Guide → Render → Verify**; the LEGAL-TEST conclusion inventory CONFIGURES which stages engage per product. R-dominant products (registration, biometric, dpa, governance) run the two-stage subset (Derive → Render); W-engaged products run three or four stages (adding Guide, and Verify where warranted). Section-sharded rendering (dpia unit-pipeline precedent) is the recommended Render implementation for larger reports. The old path holds a tombstone; do not re-open it.

**Status:** DESIGN COMPLETE-v2.3 — build authorized per CEO rulings (see §0 and §2.10)
**Owner:** platform / risk product
**Authored:** 2026-07-26T07:15:00Z (last amended 2026-07-26T08:43:21Z, item 136)
**Ledger:** item 129 (DONE-DESIGN) → carried through items 132, 134, 135, 136
**Predecessor evidence:** `docs/courier/PERFECT-INTAKE-EXPERIMENT-2026-07-26.md` (item 127, run `f3674428-f546-4973-b2a4-ba2b8125f904`) — decomposition of failing findings into intake-driven (VANISH) vs generator-driven (PERSIST) classes.
**Companion / interim guard:** item 128 `RISK-CITATION-DUP-FIX` — a deterministic post-pass for a subset of §2 primary target #2 (citation duplication template + q18 ADMT-consequence gate). The Legal Test Pipeline eventually **subsumes** that guard; we do not double-count it as unsolved.

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

## 2.8 Legal Test v2.2 — Authority-Weight Tiering (Q4(e) v2.2) — MANDATORY, CEO-CORRECTED 2026-07-26

**Supersedes** the v2.1 phrasing that treated FSOR-discussed non-CA analogies as CPPA authority — that phrasing is WRONG and must not appear in any product. Full methodology: `docs/design/LEGAL-TEST.md` Q4(e) v2.2.

**Principle.** Every corpus reference carries `authority_weight ∈ {binding, persuasive}`. Non-California law can NEVER be binding authority for a CPPA/California product. GDPR/UK products use ZERO U.S./California material in any role. The bridge — for CPPA products only — is FSOR-mediated at persuasive tier; it is ONE-WAY.

**Schema deltas (v2.2, build-blocking).**
- `citation_bindings[].authority_weight: "binding" | "persuasive"` — Type R proposition anchors resolve only to `binding` bindings.
- Factor-registry rows: `guidance_refs[].authority_weight: "binding"` (registry lint rejects any other value).
- `weighing_frame[].entries[].authority_weight: "binding" | "persuasive"`; when `persuasive`, entry MUST carry `fsor_mediation_ref: string` (a CPPA-domain FSOR row id that discusses the persuasive source). Persuasive entries are permitted only where domain rules allow (CPPA products only; GDPR products never).

**New / extended validators.**
- **V8 authority-weight tiering:** (a) every Type R proposition's citation bindings are `binding`; (b) every `factor_table.guidance_refs[]` is `binding`; (c) every `weighing_frame[].entries[]` with `authority_weight="persuasive"` has non-empty `fsor_mediation_ref`; (d) any GDPR-domain plan containing a `persuasive` entry, or any entry whose source-domain is US/CA, is a hard reject. Violations are hard rejects.
- **Pass-2 persuasive-marking template rule:** Type W templates rendering a persuasive frame entry MUST include one of the persuasive-marking phrases from `PERSUASIVE_MARKERS` in the same sentence/clause; post-render assertion rejects unmarked persuasive references.
- **Pass-2 sole-support ban:** no proposition (Type R, W, or J) may be supported solely by persuasive frame entries; post-render check enforces at least one binding anchor per rendered conclusion.

**Phase-1 build correction (applies immediately).** Item (5) Pass-G candidate index — non-CA analogies indexed with `authority_weight='persuasive'` and `fsor_mediation_ref`; item (2) factor-registry `guidance_refs[]` are binding-tier CA sources only (FSOR commentary on CPPA regs = CA interpretive material = binding); item (1) conclusion inventory gains the authority-weight constraint (Type R anchors + Type W factor anchors binding-only).

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
6. **Atomic-token invariant (SPEC-WRITEBACK-WAVE-B2, 2026-07-27).** Substituted token spans — `{{cite:…}}`, `{{intake:…}}`, `{{plan:…}}` and any successor token — are **atomic**. No truncation, wrapping, ellipsis, sentence-splitter, max-chars clamp, formatting operation, or downstream scrubber may split, truncate, or reshape the interior of a substituted span. Truncation operations MUST operate on token boundaries or reject and re-render. A rendered surface containing a partial/garbled substituted span is a **HARD REJECT**. (Motivating defect: run-146 `140(d)(1)(A)…` fragment; root layer is the substitution/clamp interaction, not any downstream scrubber.)
7. **No-self-contradiction invariant (SPEC-WRITEBACK-WAVE-B2, 2026-07-27).** A rendered report may never REQUEST information (via `information_needed`, `record_sufficiency`, or any product-analog surface) that the same report already STATES. A deterministic, product-agnostic post-render cross-check compares every request entry's pinpoint / fact-tokens against the rendered pinpoint / fact inventory (excluding `_meta`); overlap = drop the request. This is a structural invariant, not a per-product scrubber — it applies to every pipeline product by compilation.

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


---

## 2.9 Legal Test v2.3 — Federal-Qualification / Generalized Forum Rule (Q4(e) v2.3) — MANDATORY, CEO-CORRECTED 2026-07-26

**Qualifies** §2.8 (v2.2). Full methodology: `docs/design/LEGAL-TEST.md` Q4(e) v2.3.

**Corrected principle (CEO verbatim).** "Non-California law can never be binding authority for a California product UNLESS it is U.S. Federal law, including U.S. agency rulings." Federal law applies of its own force within California (supremacy); FTC and other federal agency rulings are U.S. law applicable in California.

**Generalized forum rule (all U.S.-state analysis units — CPPA/California, Illinois/BIPA, Texas, etc.).**
- **BINDING tier** = forum state's own law + U.S. FEDERAL law (`jurisdiction_tag: "us-federal"`; statutes, regulations, FTC and other federal agency rulings).
- **PERSUASIVE tier** = sister-state law (another U.S. state's statutes/rulings), expressly marked in output; foreign law per existing per-domain rules (CPPA: FSOR-mediated persuasive only).
- **GDPR/UK products** = UNCHANGED. No U.S. material (state OR federal) in any role. Bridge is ONE-WAY.

**Schema deltas (v2.3, build-blocking).**
- `JurisdictionTag` union gains `"us-federal"`.
- No new fields on `CitationBinding` / `WeighingFrameEntry` / `FactorTableEntry` — the existing `jurisdiction_tag` + `authority_weight` slots carry the rule.

**Validator updates.**
- **V3 authority-domain filter (relaxed):** an entry with `jurisdiction_tag: "us-federal"` and `authority_weight: "binding"` is admissible on any U.S.-forum plan (`cppa-ca` or `us-state-*`) without a cross-domain error. Persuasive entries continue to be governed by V8 (V3 skips them).
- **V8 authority-weight tiering (extended):**
  - `V8_SISTER_STATE_BINDING` — on any U.S.-forum plan, a binding-tier entry whose tag is a sister-state (`us-state-*` or `cppa-ca` different from the plan) is a hard reject; the entry must be persuasive-tier with proper marking instead.
  - `V8_GDPR_US_BRIDGE` — on any GDPR/UK plan, any entry whose tag is `us-federal`, `cppa-ca`, or `us-state-*` — at any tier — is a hard reject. The bridge is one-way.
- Pass-2 persuasive-marking (`lintPersuasiveMarking`) and sole-support ban continue to apply to sister-state persuasive entries just as to FSOR-mediated non-CA entries.

**Phase-1 build correction (v2.3).** Conclusion inventory (`_shared/legal-test/cppa-risk-conclusions.ts`), factor registry (`_shared/factors/cppa-risk-factors.ts`), and Pass-G candidate index (`_shared/pass-g/cppa-risk-candidate-index.ts`) gain header notes stating the v2.3 rule. All existing Phase-1 rows are cppa-ca and require no data change; future us-federal (e.g., FTC) rows flow in at binding tier without architecture change.

**Corpus implication.** `enforcement_actions.jurisdiction = "us-federal"` rows (once tagged) are binding-tier eligible for U.S.-forum products (subject to the CEO-adopted eligibility bar: quote-safe / row-grounded / ineligible). No architecture change required.

---

## 2.10 Pipeline Rename + No-Human-Review + Trial Plan (CEO-ORDERED 2026-07-26; ledger item 136)

**Rename.** This document is the **LEGAL TEST PIPELINE**. Prior filename `TWO-PASS-ARCHITECTURE.md` is a tombstone-only link at the old path. Do not re-open. All prose in earlier sections that refers to "two-pass" should be read as "Legal Test Pipeline"; the two-call implementation (Derive then Render) survives as the R-dominant subset of the pipeline; W-engaged products add Guide, and Verify where warranted.

**Pipeline stage table (which stages engage per product).**

| Product | Dominant type | Stages engaged |
|---|---|---|
| registration, biometric, dpa, governance (R-dominant) | R | Derive → Render |
| cppa-risk, admt, cyber, dpia, ir | R + W | Derive → Guide → Render (+ Verify during trials) |
| lia | W (Art 6(1)(f) balancing) | Derive → Guide → Render (+ Verify during trials) |

**NO HUMAN LEGAL REVIEW (CEO ruling, VERBATIM).** "Counsel checks are NOT part of any product pipeline; no human legal review is injected at any stage; the product provides the document and the analysis, and the final decision is always up to the end user and his or her counsel."

Consequences (build-blocking):
- (a) Any earlier program-level human spot-review recommendation is **ANNULLED**. Do not add human-in-the-loop review to any product pipeline.
- (b) **Pass V ("Verify") is MODEL-ONLY.** During trials, Pass V is a bounded model verification read over close-call Type W sections and persuasive-material sections. Evidence-gated: two consecutive waves of zero yield beyond deterministic assertions → retire Pass V for that product.
- (c) **Type J rendering language** must consistently frame final decisions as reserved to the customer and their counsel — never to any human reviewer within the product surface. Template lint: any Type J template naming an internal reviewer role is a hard reject.

**Section-sharded rendering (Render stage).** For larger reports, Render is implemented as unit-pipelined section shards (dpia precedent). Each section shard: constructs its RenderPlan slice from the Derive/Guide outputs scoped to that section's analysis unit, calls the model with per-section constraints, and runs post-render assertions in-shard. Cross-shard aggregation is deterministic (assembly, not model-written).

**TRIAL PLAN (program of record).**
- **Stage 1 trials** — `cppa-risk` (CPPA pilot) + `lia` (GDPR trial; purest Art 6(1)(f) balancing product).
- **Stage 2** — `admt`, `cyber` (CPPA priority), then `dpia`, `ir` (**ir gated on IR-BAND-REALIGNMENT item 114 landing first**).
- **Stage 3** — `governance`, `dpa`, `registration`, `biometric` (R-dominant, two-stage subset).

**Cross-cutting.**
- Corpus completion continues per the empty-by-finding feed + remaining P2 families + P5 drain.
- **ICO ingestion for UK users is DEFERRED** (CEO ruling) to a later stage; UK analysis units render with the standing limited-guidance disclosure meanwhile.
- Trial measurement runs on standalone s5 batches. The campaign remains CEO-paused; resume authority is CEO-reserved.

**v2.3 carry-through (verified this turn).** The federal-law qualification (binding tier for U.S. analysis units = forum state + U.S. federal, including federal agency rulings) is reflected in `docs/design/LEGAL-TEST.md` Q4(e) v2.3, in §2.9 of this pipeline document, and in the Phase-1 artifacts (`_shared/render-plan/schema.ts` comments, `_shared/render-plan/validators.ts` V3 relaxation + V8 additions, and header notes on `cppa-risk-conclusions.ts` / `cppa-risk-factors.ts` / `cppa-risk-candidate-index.ts`). No additional corrective edits required this turn.

---

## 12. Emitter law (SPEC-WRITEBACK-WAVE-B2, 2026-07-27; standing, product-agnostic)

Any deterministic emitter that evaluates statutory thresholds or enumerations (band→cohort, band→prong, trigger→prong, threshold→outcome, count→cohort, and every future analogue) MUST:

1. **Ship in the same turn** as an exhaustive **input-domain matrix test** derived from the corpus verbatim text (all authoritative band × band, trigger × prong, threshold × count combinations enumerated; no domain-subset "smoke" coverage). Corpus source must be pinpointed in the test's header — the test is a corpus witness, not a hand-written expectation.
2. **Emit an `indeterminate` (or equivalent honest) output class** whenever the input straddles a statutory edge that the corpus text does not cleanly resolve (CPI-adjusted revenue bands, "or more" open bounds, unspecified subcategories, ambiguous enumeration matches). Silent `met` / `not met` / any-collapsed-decisive output on an indeterminate input is a **DEFECT**.
3. **Render indeterminate outputs honestly** in customer-facing surfaces ("not determinable from the information provided", "the band provided straddles the statutory threshold", or the product's registry-approved analogue). Never elide the indeterminate case, never collapse it to the more favorable side, never suppress the clause.

(Motivating defect: run-146 `§ 7120(b)(2)(A) met` asserted on `$25M to under $50M` × `250,000 to under 1,000,000` — the revenue band straddles § 1798.140(d)(1)(A) CPI-adjusted; the corpus-honest outcome is `indeterminate`.)

## 13. Surface-map ownership law (SPEC-WRITEBACK-WAVE-B2, 2026-07-27; amends §6 surface-map contract)

Every surface in every product surface-map (e.g. `_shared/ltp/content/<product>-surface-map.ts`) carries an **owner** drawn from a **closed vocabulary of three**:

- `pipeline-template` — rendered by the LTP Pass-2 template registry under §4 discipline.
- `deterministic-emitter` — owner-emitted by a registry-anchored deterministic function under §12 emitter law.
- `legacy-frozen` — a pre-pipeline surface that has not yet migrated to one of the above.

The prior states `unchanged` / `unmapped` / omission are **NO LONGER PERMITTED**. Every `legacy-frozen` surface REQUIRES, in the same turn it is marked legacy-frozen:

1. A **citation-token audit** of every citation the surface may emit against the current `provision_texts` registry (status=approved only). Any unverified anchor (e.g. `§ 7156(a)` on the risk `attestation_block` — the MOTIVATING CASE) is a hard reject; the surface's citations MUST be re-anchored to registry-verified pinpoints or rendered without a statutory cite.
2. A **recorded retirement/migration target** — the owner class the surface will migrate to (`pipeline-template` or `deterministic-emitter`) and a ledger back-reference. A `legacy-frozen` surface without an audit + migration target is a spec defect.

## 14. Fix-shape law (SPEC-WRITEBACK-WAVE-B2, 2026-07-27; standing, product-agnostic)

Pipeline-product fixes are specified at the **most upstream layer the defect permits**. The ordered preference is:

1. **Authoring-time law** — registry correction, corpus re-extraction, factor/conclusion inventory amendment, surface-map ownership re-classification, template contract tightening. Preferred whenever the defect is expressible as an authoring rule.
2. **Structural invariant** — a product-agnostic invariant added to §4 render contract, §12 emitter law, or §13 surface-map law that catches the defect class by compilation across every current and future product.
3. **NEVER a new downstream string-surgery scrubber.** New string-surgery scrubbers (regex sentence-drop passes, meta-string bans, per-surface prose surgeons) are a **FORBIDDEN FIX SHAPE** for pipeline products. Existing scrubbers are grandfathered as belt-and-braces per §7 and are on a retirement path; no new ones may be added to pipeline products, and any defect proposed to be fixed by a new scrubber MUST be re-specified at layer (1) or (2).

Exception (bounded): a **transitional scrubber** may be shipped as part of the same turn that (a) writes the corresponding authoring-time or invariant law under §4/§12/§13 and (b) records the scrubber's retirement wave in the ledger. The transitional scrubber MUST carry the retirement wave in its module header.

## 15. Standing improvement-loop law (SPEC-WRITEBACK-WAVE-B2, 2026-07-27; process law)

Every defect-class closure follows the standing loop:

> **defect → root fix → generalized clause in design law → inherited by all future dispatches.**

The generalized clause MUST be written into this document (or `docs/design/LEGAL-TEST.md` when the amendment is authoring-time) in the **same turn as the root fix, or the immediately following docs-only turn** — never later. Dispatches compile from the law, so the law is where learning lives. A root fix that is not followed by its design-law writeback within one turn is a **process defect** and is called out in the ledger.

The writeback turn's courier MUST include a **defect → clause traceability table** (see `docs/courier/SPEC-WRITEBACK-2026-07-27.md` for the canonical form).

## 16. Measurement-validity law (ENFORCE-MODE-REGRESSION-2026-07-27; standing, product-agnostic)

Every measurement records and asserts the **generative configuration it claims to measure**. Silent measurement against a different configuration than the batch declared is a **defect of the measurement itself**, not the generator — scores from such a run are **non-evidential** and must be marked as such in the ledger.

Requirements (all three MUST hold for a measurement to be evidential):

1. **Generator boot log MUST print `ltp_mode=enforce|shadow` at every cold start** (dedicated line, not embedded in a wider log). Boot-log assertion is part of the deploy protocol: post-deploy, the deploy turn MUST paste the boot line as evidence.
2. **Generator MUST expose its reported mode** via a side-effect-free ping (GET `?ping=1` returning `{ltp_mode, build_stamp, ltp_version}`) AND MUST honor a request header `x-ltp-mode-expected` that aborts generation with HTTP 409 `ltp_mode_mismatch` when the caller's expectation does not match the generator's reported mode.
3. **The batch harness MUST record the generator's reported mode on the `quality_run` / `quality_batch_runs` row at dispatch AND MUST pre-assert the reported mode equals the batch's declared expectation before the first generation call.** A measurement batch whose subject generator reports a mode different from the batch's declared expectation **ABORTS at kickoff with a diagnostic** — the batch NEVER silently measures the wrong thing. The batch-wrap kicker (per §standing rule item 152) implements the pre-assertion; a bare invocation that bypasses the kicker is not a valid measurement dispatch.

**Non-evidential marking.** When a batch is discovered post-hoc to have measured against a mode different from the one it claimed (e.g., a `shadow` telemetry label on a run declared as `enforce`), the ledger MUST tag that run **NON-EVIDENTIAL** and no downstream digest, extraction, or verdict may treat its scores as a read on the declared configuration. A non-evidential run is not a regression, a pass, or a fail — it is a measurement error.

Motivating incident: run 146 (batch 127a6714) scored 72.35 with per-doc telemetry reporting `mode=shadow` while the surrounding turn intended a `enforce` read of the citation-closure fixes. The scores are non-evidential; the closure fixes remain deployed and validated by their unit tests, but the wave-C confirmation must be re-measured on an enforce-verified generator per this section.

## 17. Cancel-any-pre-execution law (harness; QBP25 / item 162, 2026-07-27; standing, product-agnostic)

Cancel requests are honored in **EVERY pre-execution state**, not only mid-loop. A batch row with `cancel_requested=true` whose `phase` has not reached `running_tool` MUST be finalized to `status='cancelled', phase='done'` on sight by the pickup automation (`batch-kickoff-pickup.decidePickup`). This holds for every non-terminal status the row can occupy before entering the orchestrator loop — `queued/starting`, `running/kickoff`, and any successor pre-execution state.

**Rationale.** The orchestrator's cancel check runs *inside* the run loop. A batch that never enters the loop (e.g. `status='queued'` due to a launch that stalled before the first tick, or a kickoff that failed to graduate) will never observe its own cancel flag. Without a pre-execution honor rule, such rows sit indefinitely and, worse, hold whatever single-launch mutex the harness enforces — blocking every subsequent measurement. This is a defect class, not an incident (motivating incidents: batch `9c1e3a8f` blocking Wave C `2a3c07a2`, item 161).

**Boundary.** Once `phase = 'running_tool'`, the orchestrator loop is the authoritative cancel-honorer; the pickup automation does not race it (returns `single_flight_skip` instead). The pickup's cancel-finalize branch and the loop's cancel-check together cover every non-terminal state exactly once.

**Ownership.** Every harness component that maintains its own pre-execution queue (kickoff pickup, delivery sentinel, translation sweep, brief chain, and any successor) MUST implement the equivalent cancel-any-pre-execution branch. New harness components ship with the branch and its unit test in the same turn; a component that fails to honor a stale cancel is a **harness defect** and is ledgered per LTP §15 (writeback due within one turn).

**Unit test contract.** The pure decision function MUST have tests covering: (a) `queued` + cancel → finalize, (b) `kickoff` + cancel → finalize, (c) `running_tool` + cancel → deferred to loop (not finalized by pickup), (d) terminal + cancel → no-op (never double-finalize), (e) cancel-finalize priority over kick eligibility when both are present, (f) regression: no cancel_requested anywhere → prior behavior unchanged.

## 18. Launch-state equivalence law (harness; QBP26 / item 163, 2026-07-27; standing, product-agnostic)

Batch measurement dispatches enter the harness in one of two canonical pre-execution row shapes; the pickup automation MUST serve them **equivalently**:

- **Shape A — born-served:** `status='running'`, `phase='kickoff'`. The form a harness-native launcher produces.
- **Shape B — controller-external:** `status='queued'`, `phase='starting'`. The form external tooling (e.g. controller `query_database` inserts under Backend-access law when the sandbox lacks direct dispatch capability) produces.

The prior invariant — pickup selects `status='running' AND phase='kickoff'` only — was a **defect** that produced silent stalls whenever an external insert used Shape B. `batch-kickoff-pickup.decidePickup` now returns `kick` (or `reap`, past REAP_STALE_MS) for either shape, and the kick branch **normalizes Shape B to Shape A** (updates `status='running', phase='kickoff'`) before invoking `quality-batch-orchestrator`, which expects the canonical shape. The `single_flight_skip` guard treats **anything past kickoff/starting** as live; two peers still in a pre-execution shape do not block each other beyond the oldest-first ordering.

**Motivating incidents.** Wave-C batch `2a3c07a2` sat in `queued/starting` for >30 minutes with 0 documents created; zombie `9c1e3a8f` had the same shape and additionally held the single-launch mutex. Both were unblocked by controller `query_database` flipping to `running/kickoff` at ~03:15Z; the very next 03:16Z pickup tick served the row and Wave C entered `running_tool` at 03:16:34Z (quality_run `110ce03a`, run #147).

**Ownership.** Every harness component with an external-insertable pre-execution queue MUST publish its canonical launch shape(s) and MUST serve every published shape from the same tick — either by picking every shape natively or by declaring one canonical shape and normalizing others at pickup. Cancel handling (§17) covers all pre-execution shapes automatically. A component that publishes one shape and serves another is a **harness defect** and is ledgered per §15 within one turn.

**Unit test contract.** The pure decision function MUST have tests covering: (a) both canonical shapes are kickoff-eligible; (b) Shape B past PICKUP_STALE_MS → `kick`; (c) Shape B does NOT trigger `single_flight_skip` against a Shape A peer; (d) a `running_tool` peer DOES block a Shape B pickup via `single_flight_skip`; (e) Shape B past REAP_STALE_MS → `reap` with parity to Shape A. See `supabase/functions/batch-kickoff-pickup/launch-state-equivalence.test.ts`.

## 19. PROCESS-RETRO-WRITEBACK — R1 canonical state machine (harness; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** The batch/run lifecycle is now formally described in `docs/design/HARNESS-STATE-MACHINE.md`. Every state, transition, primary owner, cancel path, and reap rule is enumerated there. Named laws §17 and §18 are **subsumed** by that document; they remain in force as clauses. `HARNESS-STATE-MACHINE.md` is the canonical picture; §19–§25 below are the process clauses that operate on top of it.

**Canonical born state (R1 pick).** External wrapper inserts MUST land in `(running, kickoff)`. The legacy `(queued, starting)` shape is served indefinitely by `batch-kickoff-pickup` (§18) and normalized on kick; it is a **compatibility surface**, not a preferred shape.

**Conformance test.** Every deploy touching `batch-kickoff-pickup`, `quality-batch-orchestrator`, or `delivery-sentinel` MUST include a test asserting every state × daemon pair has an owner AND a cancel path AND a reap owner. Canonical helpers live at `supabase/functions/_shared/harness/state-machine.ts` (`verifyStateMachine`, `assertStateMachineConformance`, `LEGAL_STATES`, `PRE_EXECUTION_STATES`, `OWNERSHIP`, `CANCEL_OWNERSHIP`, `REAP_OWNERSHIP`). No unserved state can exist — a state with no owner is a test-time failure.

**Boot assertion.** Daemons in scope MUST call `assertStateMachineConformance()` at import time. A failed conformance throws at boot and the deploy fails loud — same discipline as §16 (measurement-validity) applied to structural conformance.

## 20. PROCESS-RETRO-WRITEBACK — R2 guarded mutations (harness + ops; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Every state change to `public.quality_batch_runs` (or any shared harness row) — whether from code, SQL, or ops migration — MUST carry a compare-and-act predicate: `UPDATE … WHERE id = $1 AND status = <expected> AND phase = <expected>`. If the update affects zero rows, the actor MUST record the divergence and re-read the live row. The actor MUST NOT proceed as if the write succeeded, MUST NOT re-issue the same write with a broader WHERE clause, and MUST NOT act on turn-start context.

**Dispatch convention.** Every ops instruction states its **expected precondition** (which live state the row is in at dispatch time). The receiving actor **no-ops on stale precondition** and records a divergence note in the ledger rather than acting.

**Motivation.** Item 162's replacement-wrapper insertion assumed `2a3c07a2` was still in `queued/starting`; a concurrent cron tick had already transitioned it to `running_tool` at 03:16:34Z. Guarded mutations detect this at the SQL level and force a re-read before any follow-up.

## 21. PROCESS-RETRO-WRITEBACK — R3 state-ownership map (ops; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Ownership of shared harness state is:

- **Controller** owns live batch-row surgery (`query_database` UPDATEs to move a wrapper past a wedge) AND MUST record an immediate ledger note whenever it writes to `quality_batch_runs`.
- **Agent** owns code, docs, deploys, and the design-law amendments that follow from surgery.
- **Crons** (`batch-kickoff-pickup`, orchestrator self-chain, delivery-sentinel) own their canonical states per the ownership map in `HARNESS-STATE-MACHINE.md` §4.

**Live-row rule.** ANY actor mutating shared state MUST re-read the live row **immediately before the guarded WRITE**. Turn-start context is **never** sufficient for a mutation. The re-read and the WRITE are the actor's atomic unit; nothing else in the turn may separate them.

## 22. PROCESS-RETRO-WRITEBACK — R4 smoke-before-measure (harness + ops; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Any measurement batch that follows an infrastructure / config / deploy change MUST be preceded by a **`batch_size=1` SMOKE batch** carrying full §16 mode/config assertions. The measurement batch launches only on smoke pass.

**Scope.** Applies whenever ANY of the following changed since the last measurement wave: (a) a deploy to `run-*` (product tool), `quality-batch-orchestrator`, `batch-kickoff-pickup`, or a `_shared/` module imported by them; (b) an env-var flip touching `LTP_ENFORCE_ENABLED` or grader routing; (c) a `grader_context_version` bump; (d) any migration to a table read by the grader/rubric.

**Cost/benefit.** Smoke cost = 1 doc grader spend (cents). The night of 2026-07-27's cascade — enforce-mode silent-off, `queued/starting` stall, zombie mutex, placeholder-UUID replacement — is the counterfactual: any one of those would have surfaced on a smoke batch and cost minutes to unwind instead of hours.

### 22.1 SMOKE-RETIREMENT RULE (CEO-approved 2026-07-27; standing, product-agnostic)

**Scope (unchanged).** Smoke-before-measure applies ONLY after infrastructure / configuration / composition changes as enumerated in §22 Scope. It is **never** required on routine measurement waves.

**Clean arm — evidence-gated retirement.** Each smoke run MUST record, in its courier, whether it caught ANY failure class that the deterministic assertion layer did not already flag. The assertion layer comprises: §16 configuration asserts (mode/BUILD_STAMP/grader-context pre-ping), the surface-ownership write-guard, the choke-point value screen (leak lexicon + statutory-text class), count conformance, and post-render structural asserts. This is the **unique-catch counter**.

- After **THREE CONSECUTIVE** clean-arm smokes with **zero unique catches**, the clean arm **RETIRES** for that product's pipeline. Assertions carry the load thereafter.
- A retired clean arm returns **only** when a new failure class evades the assertion layer in production measurement. Per spec-writeback law, that same failure class must also be codified as a new deterministic assertion in the layer; the smoke arm is not a substitute for the assertion.
- Counter is per-product and resets to zero on any §22 Scope change that alters the composition path or assertion layer itself.

**Crash-test arm (forced degradation).** One-time-per-product: proven ONCE at that product's pipeline migration (write-around composes cleanly: registry-only degraded sections, intact trajectory elsewhere, Items-for-your-review disclosure, zero internal vocabulary, telemetry `write_around=true`). Re-proven ONLY when the write-around mechanism itself changes (composition-path hook, disclosure template, or degradation surface set). It is **not** a recurring cost on routine smokes or measurement waves.

**Courier accounting.** Every smoke courier MUST print the unique-catch counter for the clean arm in the form: `clean-arm unique-catch counter: N/3 (this smoke: {unique_catches | none})`. Retirement is declared in the courier at the third consecutive zero and echoed to the ledger.

**Current chain unaffected.** Tonight's Stage-C re-smoke proceeds as specified — load-bearing because the prior fix set failed live once (run #149 → #151). Unique-catch accounting **starts** with the Stage-C re-smoke (counter opens at 0/3).

## 23. PROCESS-RETRO-WRITEBACK — R5 ops post-conditions (ops + harness; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Every ops action MUST verify its own outcome **in the same turn** it is taken. Post-conditions are:

| Action                              | In-turn post-condition                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Launch a wrapper                    | Wrapper transitions past its born state within **2 pickup cycles** (~2×60s), else stall.     |
| Cancel a wrapper                    | Wrapper reaches a terminal state (`cancelled/done` or otherwise) before turn end.            |
| Set/flip an env var or config       | Ping the affected daemon and confirm the value via boot-line or telemetry echo.              |
| Deploy an edge function             | Boot log carries the new BUILD_STAMP (**already law**, §16-adjacent).                        |
| Insert a row (any harness table)    | Read the row back by generated id in the same turn; the read is the receipt.                 |

An ops action whose post-condition cannot be verified in-turn is **HELD** and named as such in the ledger; the turn does not close claiming success.

## 24. PROCESS-RETRO-WRITEBACK — R6 controller courier discipline (docs + ops; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Every content or ops courier MUST open with a **VERIFIED-FACTS preamble**: a short list of what was checked against the codebase or the database and when. Unverified assumptions are either (a) named explicitly as ASSUMPTIONS, or (b) omitted; the courier does not ship claims dressed as facts.

**Preamble minimum.** (i) live-state checks: which rows / files were read and their timestamps or checksums; (ii) tool used: `supabase--read_query` / `code--view` / `edge_function_logs`; (iii) turn clock (`date -u`) at read time.

Couriers that ship without a VERIFIED-FACTS preamble are **retracted** by the next controller tick and re-issued with one — no exceptions.

## 25. PROCESS-RETRO-WRITEBACK — R7 generated-ids only (harness; item 165, 2026-07-27; standing, product-agnostic)

**Ruling.** Row ids for production tables are ALWAYS generated (`gen_random_uuid()` / column default). NEVER type a literal UUID in a dispatch, migration, insert statement, or agent-authored SQL. Any table externally insertable at launch time MUST carry a DB-level `DEFAULT gen_random_uuid()`.

**Motivating incident.** Item 162's replacement wrapper id `a1b2c3d4-e5f6-4890-abcd-ef0123456789` was a hand-typed placeholder from documentation. The DB accepted it because the id column had no strict shape check; ledger accounting then had to distinguish a real UUID from a placeholder pattern. Both problems disappear when the id is generated.

**Enforcement.** Migrations touching launch-inserted tables MUST include `DEFAULT gen_random_uuid()` on the id column. Any external insert dispatch MUST omit `id` from the column list unless the caller can guarantee `gen_random_uuid()` on the value expression.

## 26. GRADER-DIVERGENCE TRIPWIRE (CEO ruling; item 169, 2026-07-27; standing, product-agnostic; measurement + extraction spec)

**CEO ruling, verbatim (2026-07-27 ~05:10Z):** "one of the answers lies somewhere between ChatGPT and Claude testing, as evidenced by the divergence".

**Rule.** Whenever `|claude_overall − gpt_overall| ≥ 12` on any run (per-doc or pooled), the extraction turn MUST automatically adjudicate the divergence **BEFORE any §5 interpretation**:

1. **List** every failing deterministic check driving the gap (per-doc, per-check id, per-rubric anchor).
2. **Classify** each failing check as one of:
   - **(a) genuine-defect** — the deterministic check has evidence the GPT grader missed (specific rubric anchor, verbatim citation, gate outcome). **Trust the check.** The run remains evidential for that class; the finding stands.
   - **(b) configuration/instrument artifact** — a shape or mode mismatch (wrong instrument version, telemetry mode ≠ declared mode, composition surface absent, stamp mismatch, unwired path). **Fix the config/instrument.** The run's affected classes are marked **non-evidential** in the ledger; they do not advance or retreat the trial verdict.
3. **Default posture on large divergence is CONFIGURATION ALARM first, quality signal second.** For `|Δ| ≥ 12` the interpretive default inverts: do not read the run as a quality outcome until every failing deterministic check has been classified.

**Class-(b) presumption pattern.** Deterministic-dominant failures + GPT ≥ 85 = **wrong machine under test**. When both hold, class-(b) is the presumption for each failing check; the extraction MUST name the config surface it suspects (wiring absence, env flag, stamp, instrument version) and either (i) prove class-(a) by citing the missed rubric anchor, or (ii) accept class-(b) and record the affected classes non-evidential.

**Motivating case (cited anchor).** Run #149 tuning docs (item 168 → item 169): pooled `score_overall=67.15` (Claude) / `gpt_overall=85` (GPT), `|Δ|=17.85`. Failing deterministic checks were composition-shaped (narrative absent); ping declared `enforce`; enforce_preview.telemetry.ran=true. Diagnosis: `composeAssessmentSummary()` was never invoked from the generator — class-(b) configuration artifact. Run #149 marked non-evidential.

**Extraction-turn checklist addition.** Every wave-extraction courier MUST include a "Divergence adjudication" section when `|Δ| ≥ 12` on any surface it reports (per-doc, tuning-pooled, holdout-pooled). Missing this section is a courier defect and the courier is retracted per §24.

## 27. NARRATIVE-PRESENT KICKOFF ASSERTION (§16 sibling; item 169, 2026-07-27; standing, product-agnostic)

**Rule.** §16 is CONFIG-SHAPED (mode label + boot + ping). It does not catch the case where mode is correctly `enforce` but a required composition surface is unwired. §27 adds a BEHAVIOR-SHAPED assertion.

**Requirement.** For every measurement launch (smoke and full), the harness MUST run a **single generation probe** against a canonical fixture BEFORE the batch spawns its full doc set, and MUST assert on the probe result:

1. `_meta.internal.legal_test_pipeline.enforce_preview.telemetry.ran === true` (enforce arm executed);
2. `assessment_summary.narrative` present and non-empty (composition executed);
3. Deployed BUILD_STAMP echoed in the doc's `_meta.internal.*.build_stamp`;
4. `write_around` false on both shadow and enforce arms.

Any failed assertion aborts the batch pre-launch with HTTP 409 `narrative_missing` / `enforce_arm_absent` / `stamp_mismatch` / `write_around_triggered` and records the abort on the batch row. The probe doc is discarded; no doc-cost accrues to the run.

**Where wired.** `batch-kickoff-pickup` (canonical pickup path per §18) and `kick-wrapped-batch` (caller-driven path per §16). Every launch path MUST route through this assertion — an unassertied launch path is a §27 defect.

**Motivating case.** Item 169: WAVE-D READINESS STEP 1 verified §16 (ping enforce, boot enforce, hash frozen) and passed all-green. STEP 2 smoke then produced 3 docs with narrative absent. §16 alone cannot catch composition-wiring gaps; §27 closes the gap by asserting on a real payload.

**Sequencing law.** §27 wiring is itself launch infrastructure. Its deployment turn is preceded by NO measurement; the next measurement turn after §27 lands uses the newly-asserted path from the first smoke.

## 28. ENGINE-B PRIMACY WITH SUBORDINATED ARTIFACTS (CEO ruling; item 177, 2026-07-27; standing, product-agnostic)

**CEO ruling, verbatim (2026-07-27):** "Engine B should always control. However, where there are any useful artifacts of Engine A, we should use them SO LONG AS THEY CANNOT OVERRIDE OR DIMINISH ENGINE B."

Engine B = the LEGAL TEST PIPELINE (derive → guide → render → verify) codified in this document. Engine A = the pre-pipeline composition path (LLM-authored assessment prose plus its Engine-A-era deterministic emitters: T7 opening, cohort/deadline, cyber crosswalk, citation-dup scrubber, intake-contradiction filter, and peers). This section is the constitutional statement of how the two engines relate for as long as any Engine-A artifact remains alive in the codebase.

### 28.1 AUTHORITY

The validated `RenderPlan` is the **single composition authority** for every customer-facing surface owned by a pipeline-adopted product. No component — deterministic emitter, LLM composer, template, post-hook, or scrubber — writes to a customer surface except **through the pipeline's render path**, bound to plan entries. A component that writes outside the render path is a §28 defect and is excised.

Corollary: surface ownership is declared in the surface map (§ per LEGAL-TEST-PIPELINE authoring conventions) with `owner=` set to `pipeline-render`, `deterministic-emitter`, or `gate-suppression`. `owner=engine-a-composer` is not a legal value.

### 28.2 ARTIFACT HARVEST

Engine-A-era deterministic emitters are **formally ADOPTED into Engine B** as plan-bound deterministic emitters. Each adopted artifact:

1. is **inventoried** in the surface map with its slot bindings and the plan/gate inputs it consumes;
2. is **bound to plan/gate outputs** (never to raw intake or raw generator prose) — its inputs are typed against `RenderPlan` entries and gate results;
3. is listed with `owner=deterministic-emitter` and a reference to the plan entry class it serves;
4. carries a manifest stamp so its version is echoed in `_meta.internal.legal_test_pipeline.deterministic_emitters[]`.

Adoption is not optional and not aspirational: an Engine-A emitter that has not been inventoried and bound is not a legal participant in the render path. Un-adopted emitters are excised, not tolerated in a "still runs but not on the surface" state.

### 28.3 SUBORDINATION MECHANICS (enforced, not aspirational)

The following four mechanics are **enforcement rules**, not guidance. Each maps to a concrete check the pipeline runs at render time or at deploy time.

**(a) Conflict rule.** Any artifact output that contradicts the plan is **rejected**. The plan is **NEVER mutated** to fit an artifact. Contradiction is defined as: the artifact would cause a slot value, citation, gate outcome, or omission decision to differ from what the validated plan entry specifies. On rejection, the pipeline records the rejection in telemetry (see (d)) and falls back to the plan's own value for that slot.

**(b) Legacy guards are SUBTRACTIVE-ONLY.** A guard, scrubber, filter, or excision utility inherited from Engine A may **excise** content or **fail loud**; it MUST NOT author new content, rewrite existing content into a different form, or reorder plan-produced content. "Rewrite" includes substitution of one phrase for another, insertion of connective prose, and normalization that changes semantic content. Whitespace normalization and pure deletion are the only permitted transforms.

**(c) NO SILENT SUPPRESSION.** Only **pipeline gates** decide omissions. An artifact MUST NOT drop a slot, section, sentence, citation, or plan entry on its own authority. If an artifact believes an item should be omitted, it raises the concern to the gate layer; the gate decides. Silent suppression by an artifact is a §28 defect and the item is restored from the plan.

**(d) Telemetry.** **Every artifact intervention is recorded** in `_meta.internal.legal_test_pipeline.artifact_interventions[]` with fields: `{artifact_id, artifact_version, intervention_type ∈ {excise, fail_loud, rejected_conflict}, slot, plan_entry_ref, evidence}`. A render pass that invoked an artifact without recording a telemetry entry is a §28 defect at extraction time (extraction retracts the run's affected classes to non-evidential, cf. §26).

### 28.4 NO FALLBACK SEAT FOR ENGINE A'S COMPOSER

Pipeline failure degrades via the **B-native conservative write-around ONLY**. Engine-A composition is **never a fallback path**. The rationale is constitutional: allowing Engine-A composition to run when Engine B fails would place Engine A in charge precisely at the moment oversight is weakest — the exact inversion of this section's authority statement.

Concretely: any code path of the shape "if pipeline fails → invoke Engine-A composer → return its output" is a §28 defect and is deleted. The permitted failure paths are (i) B-native conservative write-around (documented elsewhere in this file) and (ii) HTTP 5xx / hard abort with `_meta` diagnostics.

### 28.5 GATE-3 REDEFINITION

The Gate-3 milestone ("Engine A removal") is redefined as the conjunction of:

1. **HARVEST** — every Engine-A-era deterministic emitter still in service has been adopted per §28.2 (inventoried, bound, manifest-stamped);
2. **SUBORDINATE** — every adopted artifact satisfies §28.3 (a)-(d) with tests demonstrating conflict rejection, subtractive-only behavior, gate-mediated omission, and telemetry presence;
3. **RETIRE THE COMPOSER** — the Engine-A composition path is **deleted from the codebase** and the runtime is **switched** to Engine B as the sole composition authority.

Step (3) — the switch-and-delete — remains **CEO-reserved** and is gated by the existing evidence conditions already in force: (i) post-fix dual smoke green, (ii) Wave D success against §5 criteria, (iii) confirmation wave success, (iv) B-native conservative write-around **production-proven** (fires cleanly on real degradation with no customer-visible defect). No sub-step of (3) may be advanced by controller action; the ledger records readiness and waits.

### 28.6 CROSS-REFERENCE

§28 sits atop the standing decision gates recorded elsewhere in this document (composition-authority §, surface-ownership §, gate-authority §, measurement-validity §16, grader-divergence §26, narrative-present §27, deploy proof / harness state-machine §§20-25). Where an earlier section is silent on Engine-A/Engine-B ordering, §28 governs. Where an earlier section conflicts with §28, §28 controls and the earlier section is amended at the next docs-only turn.

## 29. PRODUCT-MIGRATION-CHECKLIST — MANDATORY (CEO-approved 2026-07-27; standing, product-agnostic)

Every product migration onto the Legal-Test Pipeline MUST consume the CEO-reviewed cross-product applicability matrix recorded at `docs/design/PRODUCT-MIGRATION-CHECKLIST.md`. The checklist is **mandatory**, not advisory: the migration turn's courier walks the checklist item-by-item (**Step 0 CEO Build-Overview Document first**, then A universal 1–4, B conditional 5–7 with trait-based N/A where applicable, C family-analog 8), records the outcome for each, and never marks any surface `unmapped`.

**Step 0 gate (CEO-ordered 2026-07-27 addendum).** Before any structural revision of a product begins, the controller delivers a codebase-verified, provenance-tagged **document-production overview** for that product as a Word document to `/mnt/documents/` for CEO download and external second-opinion review. The migration is **gated** on CEO acceptance of this document; no §A/§B/§C step executes until acceptance is recorded in the ledger. Format precedent: **CPPA-Risk overview of 2026-07-27**. First consumer: `lia`, due AFTER `cppa-risk` implementation acceptance and BEFORE `lia` Phase-2 wiring begins.

`lia` Phase 2 is the first §A/§B/§C consumer. Section D of the checklist (risk-specific fixes) is do-not-port; its generalized laws already live in this document (§§12–14, §16). Item 7's count-field intake contract turn is CEO-gated and covers `risk` + `cyber` together when authorized — it is **not** authorized by the checklist writeback itself.

