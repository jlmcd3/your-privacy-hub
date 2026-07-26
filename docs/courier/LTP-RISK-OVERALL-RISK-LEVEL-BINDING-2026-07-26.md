# LTP-RISK — overall_risk_level 5-tier binding LANDED (HELD-F release, item 148)

**Stamp:** 2026-07-26T20:55:38Z
**Dispatch:** CONTENT COURIER — overall_risk_level binding for the VERBATIM enum `["Low","Moderate","High","Critical","Insufficient basis"]` (supersedes the HELD-E courier's shape-conditional binding on-subject).
**Outcome:** **HELD-F item 148 RELEASED at the content layer.** Precedence-law module + missing insufficient-record opening template landed, deterministic mapping implemented, and consistency asserter authored. All 21 tests green. Items 143b/143c/145/147/148 released by name at the content layer (see "Release map" below). Part-1 index wiring, deploy, and Part-2 measurement batch remain the next engineering step; per CEO standing ruling (item 144) engineering artifacts are NOT courier-gated and no HELD is opened.

## What landed this turn

1. `supabase/functions/_shared/ltp/content/pass2-templates.ts`
   - Added `T.risk.summary.opening.insufficient` (max_chars 420) verbatim per courier.
   - Added `SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES = ["activity", "activities"]` for the singular/plural clause.

2. `supabase/functions/_shared/ltp/risk-level-map.ts` (new)
   - `mapOverallRiskLevel({outcomes, signals}) → {overall_risk_level, rule_fired, rule_note, critical_trigger_activity_ref?}`.
   - PRECEDENCE LAW implemented exactly per courier:
     - Rule 1 (absolute): any `impacts_outweigh` → `"Critical"` iff that activity has a negative-impact row with `severity === "Severe"` OR `likelihood === "Highly likely"` (verbatim literals from `src/pages/CPPARiskAssessment.enums.ts`); else `"High"`. Determined-negative beats coexisting insufficiency.
     - Rule 2 (absolute): `write_around_engaged` on any activity, OR ALL activities have `documentation_incomplete`, OR every mandatory balance factor has `no record evidence` → `"Insufficient basis"`.
     - Rule 3: any hedged/close (`closeness ≥ FIRM_VARIANT_CLOSENESS_MAX=0.6`) OR partial doc-incompleteness OR open safeguard gaps → `"Moderate"`.
     - Rule 4: all-firm, no gaps → `"Low"`.
   - `assertOpeningRiskLevelConsistency(overall, openingTemplateId)` — returns violation string or null; encodes:
     - `"Insufficient basis"` ⇔ `T.risk.summary.opening.insufficient`
     - `"High"` | `"Critical"` ⇒ `T.risk.summary.opening.any_negative`
     - `"Moderate"` ⇒ `T.risk.summary.opening.mixed_hedged`
     - `"Low"` ⇒ `T.risk.summary.opening.all_firm`
   - Verified literals imported from a named-constant surface (`T_CRITICAL_SEVERITY_LITERAL`, `T_CRITICAL_LIKELIHOOD_LITERAL`) so future enum drift is a single-point audit.

3. `supabase/functions/_shared/ltp/summary-compose.ts`
   - `ComposeInput.activity_signals?: ActivityRecordSignals[]` added; when supplied, `mapOverallRiskLevel` resolves the tier and its result flows into `structured.overall_risk_level`.
   - `selectOpeningTemplateId(outcomes, overall?)` now honors the resolved 5-tier value (courier consistency assert), including the new `Insufficient basis` → `insufficient` opening.
   - Opening render supplies both `activity_count_phrase` and the new `activity_singplural_clause` slot.
   - `telemetry.overall_risk_level_held` is now `false` when signals are supplied and the map runs; carries `overall_risk_level_rule` (1–4) and `overall_risk_level_rule_note` for observability. Back-compat: when no signals, caller value passes through as before and `held` remains `true`.

4. `supabase/functions/_shared/ltp/risk-level-map.test.ts` (new) — 15 tests.
5. `supabase/functions/_shared/ltp/summary-compose.test.ts` — pre-existing 6 tests unchanged and still green (calibration matrix, forbidden tokens, customer-question exclusion, end-to-end, sentinel).

## Test evidence (pasted)

Direct `deno test --no-check --allow-env _shared/ltp/risk-level-map.test.ts _shared/ltp/summary-compose.test.ts`:

```
running 15 tests from ./_shared/ltp/risk-level-map.test.ts
Rule 1: impacts-outweigh with Severe severity → Critical ... ok
Rule 1: impacts-outweigh with Highly likely likelihood → Critical ... ok
Rule 1: impacts-outweigh without trigger → High ... ok
Rule 1: determined negative beats coexisting insufficiency ... ok
Rule 2: write-around engaged on any activity → Insufficient basis ... ok
Rule 2: ALL activities have doc incomplete → Insufficient basis ... ok
Rule 2: every mandatory balance factor has no evidence → Insufficient basis ... ok
Rule 3: hedged outcome → Moderate ... ok
Rule 3: high closeness only → Moderate ... ok
Rule 3: partial doc incompleteness → Moderate ... ok
Rule 3: all-firm with open safeguard gaps → Moderate ... ok
Rule 4: all-firm clean record → Low ... ok
every enum member reachable via a fixture ... ok
opening/overall consistency: all 5 members map to their opening ... ok
selectOpeningTemplateId honors resolved overall when supplied ... ok
running 6 tests from ./_shared/ltp/summary-compose.test.ts
summary templates: no forbidden tokens (CCPA is template-authored, permitted) ... ok
aggregation matrix: opening variant = most-cautious outcome present ... ok
calibration assert: firm variant forbidden when any activity ≥ FIRM_VARIANT_CLOSENESS_MAX ... ok
triggered_activities: customer-question strings can never enter the array ... ok
composeAssessmentSummary: end-to-end deterministic; HELD flag carried; narrative under cap ... ok
composeAssessmentSummary: no exceptions claimed renders sentinel ... ok

ok | 21 passed | 0 failed (88ms)
```

The 114 project-wide typecheck errors flagged last turn are pre-existing in unrelated modules (`payments-webhook`, `quality-batch-orchestrator`, etc.); none touched by this content turn. Direct `deno test --no-check` remains the workaround used for the isolated LTP surface (documented in item 146).

## Release map (items released BY NAME at the content layer)

- **143 / 143b / 143c** — content set for WAVE-B is now complete: content dossier (143b), surface map + serializer cuts (143c), and now the assessment_summary composition + 5-tier precedence (this item). No further courier content required.
- **145** — HELD-D `assessment_summary composition prose` (opening + connective tissue) — released.
- **147** — HELD-E `overall_risk_level tier mapping (3-tier assumption)` — released; superseded on-subject by HELD-F which is also released here.
- **148** — HELD-F `overall_risk_level 5-value enum unmatched by courier shapes` — released; the verbatim enum is now bound by the precedence law in `_shared/ltp/risk-level-map.ts` with the sentinel `"Insufficient basis"` honestly used as the record-insufficiency outcome (rule 2).

## Not landed this turn (engineering follow-on; NOT a valid HELD per CEO ruling)

The following engineering steps are next in execution order and are NOT courier-gated:

- Part-1 index integration in `supabase/functions/run-cppa-risk-assessment/index.ts` per the surface map — thread `activity_signals` from the terminal factor tables into `composeAssessmentSummary`, replace the caller's direct `overall_risk_level` assignment with the composer's resolved value, and enable `LTP_ENFORCE_ENABLED`. Bump `BUILD_STAMP` and paste boot log at deploy.
- Deploy `run-cppa-risk-assessment` (fresh-clock stamp; locks pasted).
- Part-2 measurement batch: standalone s5, `cppa-risk` only, `batch_size 6`, `scenario_set='tuning'`, campaign-detached (single launch; launch record in ledger).

These are recorded here so the next execution step consumes this courier as its content anchor and does not re-invent the mapping. `BUILD_STAMP` unchanged this turn (`ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`); no deploy; no batch launch. Campaign `fd1be147` remains CEO-paused.

## CEO-rule compliance

- Rule 1 (verify from codebase before binding): verbatim enum re-verified at `run-cppa-risk-assessment/index.ts:654`; severity/likelihood literals verified at `src/pages/CPPARiskAssessment.enums.ts:13-14`.
- Rule 2 (double-check): consistency asserter added and unit-tested against all 5 enum members.
- Standing ruling on HELD shape: no HELD opened this turn (no missing customer-facing legal-reasoning content).
