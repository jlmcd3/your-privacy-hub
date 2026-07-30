# ITEM 275 — REDESIGN STEP 1: PRIMARY-ACTIVITY INTAKE + FULL SIDE-COLUMN WIRING + FOOTPRINT PRONG FIX

Date: 2026-07-30. Authority: CEO campaign delegation; team-unanimous.
Scope discipline: FRONTEND + intake contract only. No engine/composer changes.
No harness invocation. Legacy wire/snapshot/prompts untouched.

## CEO condition (verbatim, binding)

> "there are columns to the left and right of the intake questions, and the
> columns must update according to the question... not only create the intake
> data, but also examine how the left and right columns interact with the
> intake data elements. You must look to the codebase and not assume or guess.
> You must always double-check your work."

## 1. VERIFY-FIRST — wiring contract read from the codebase

| Mechanism | File:line | What it does |
| --- | --- | --- |
| Three-column shell | `src/components/intake/BenchLayout.tsx:29-63` | Grid `280px / 1fr / 300px`; coaching column reserved whenever `INTAKE_POLICY[tool].goodAnswer === true` (COLUMN-STABILITY LAW, :44-51) |
| Coaching column | `BenchLayout.tsx:64-78` | Renders `CoachingPanel` from `railEntry.coachLead/coachBody/goodAnswer`; placeholder when the entry carries no coaching |
| Law column | `BenchLayout.tsx:84-104` | Renders `StatuteRail entry={railEntry}` plus optional corpus block |
| Rail renderer | `src/components/intake/StatuteRail.tsx` | Consumes the `RailEntry` shape (`src/components/intake/RailEntry.ts:13-41`): `fieldLabel`, `citation`, `citationUrl`, `plainSummary`, `regulationText`, `relatedCitations` |
| Scroll spy | `src/components/intake/useScrollActiveRail.ts:20-74` | Scans `[data-rail-key]`, activates the entry nearest the top threshold (200px) |
| Focus spy | `src/pages/CPPARiskAssessment.tsx` per-field `onFocus={() => focusRail(key)}` | Focus-driven activation in parallel with the scroll spy |
| Step default | `CPPARiskAssessment.tsx:448-457` | `STEP_DEFAULT_RAIL_KEY[step]` seeds the rail on step change; `[1]` now `"primary_activity"` |
| Rail table | `src/components/cppa/CPPARiskRailEntries.ts` | `CPPA_RISK_RAIL[key]` supplies verbatim statutory text |
| FSCR callouts | `CPPARiskAssessment.tsx:462-470` | `useFscrCallouts([...])` prefetch list; `11 CCR § 7156(a)` registered at :469 |
| Footprint | `CPPARiskAssessment.tsx` `regulatoryFootprint` memo | Real-time trigger lines rendered from intake state |

## 2. BUILD 1 — new Step 1 questions

Added at the TOP of Step 1 (no step renumbering):

- `primary_activity_name` (text, required)
- `primary_activity_purpose` (text, required, ≥10 chars)
- `has_secondary_uses` (radio, required) — options verbatim:
  `"No — this data is used for this activity only"` /
  `"Yes — there are other uses"`
- `secondary_activities` — repeatable rows (Add another, max 5;
  `MAX_SECONDARY_ACTIVITIES = 5`), each with name + one-line purpose + the five
  § 7156(a)(1)-derived divergence comparisons (`DIVERGENCE_DIMENSIONS`:
  data / purpose / systems / people / risks-and-safeguards), each
  Same / Different / Not sure.

Skip tolerance: unanswered divergence resolves to `"Not sure"`; an unnamed
secondary row resolves to `Additional use #N (not described)`. Only the three
primary fields gate `stepValid` for Step 1; all secondary fields are optional.

Reserved framing preserved throughout: the tool never green-lights bundling —
the comparable-set determination is stated as reserved to the user and counsel.

## 3. BUILD 2 — column wiring (the CEO condition)

New rail entries in `src/components/cppa/CPPARiskRailEntries.ts`:

- `primary_activity` (:26) — verbatim § 7150(a) and § 7155(a)(1)
  (corpus rows `cppa-7150`, `cppa-7155`). 40-char pins:
  - § 7150(a): `Every business whose processing of consum`
  - § 7155(a)(1): `A business must conduct and document a ri`
- `comparable_set` (:49) — verbatim § 7156(a) definitional sentence plus the
  § 7156(a)(1) Business E example excerpt (corpus row `cppa-7156`). 40-char pin:
  - § 7156(a): `A business may conduct a single risk asse`

`STEP_DEFAULT_RAIL_KEY[1]` → `"primary_activity"` (`CPPARiskAssessment.tsx:448`).
`11 CCR § 7156(a)` registered in the FSCR prefetch list (:469) and rendered as an
`<FscrCallout>` in the comparable-set block (:1034).
`DefPopover` term `comparable_set` added to `src/lib/definitions.ts` (the registry
supports term additions; the definition is a condensed restatement of § 7156(a),
cited).

### DOUBLE-CHECK TABLE — every new field has a row

| Field | `data-rail-key` | Rail entry | Footprint effect | Callout / popover |
| --- | --- | --- | --- | --- |
| `primary_activity_name` | `primary_activity` (:982) | §§ 7150(a), 7155(a)(1) | none (subject anchor only) | — |
| `primary_activity_purpose` | `primary_activity` (:995) | §§ 7150(a), 7155(a)(1) | none | — |
| `has_secondary_uses` | `comparable_set` (:1009) | § 7156(a) | arms the § 7156(a) line | DefPopover `comparable_set`; FscrCallout § 7156(a) (:1034) |
| secondary row name | `comparable_set` (:1043) | § 7156(a) | none | FscrCallout § 7156(a) |
| secondary row purpose | `comparable_set` | § 7156(a) | none | FscrCallout § 7156(a) |
| divergence: data | `comparable_set` | § 7156(a) | fires § 7156(a) line when Different/Not sure | FscrCallout § 7156(a) |
| divergence: purpose | `comparable_set` | § 7156(a) | same | same |
| divergence: systems | `comparable_set` | § 7156(a) | same | same |
| divergence: people | `comparable_set` | § 7156(a) | same | same |
| divergence: risks | `comparable_set` | § 7156(a) | same | same |

New footprint line (reserved framing):
`11 CCR § 7156(a)` — "Multiple distinct uses reported — separate assessments may
be required (comparable-set standard); determination reserved to you and counsel."
Trigger: `has_secondary_uses === "Yes — there are other uses"` AND any divergence
answer is `Different` or `Not sure`. Deps array extended accordingly.

## 4. BUILD 3 — footprint prong realignment (six prongs)

- Split the combined ADMT line into:
  - `(b)(3)` ADMT significant decision — triggered by q18 Yes / In-evaluation
  - `(b)(6)` ADMT training — triggered by the q18b training affirmatives
- Added `(b)(4)` systematic-observation inference (work/education) — triggered by
  the q5b profiling worker/student option or "Both"
- Added `(b)(5)` sensitive-location inference — triggered by the q5b
  sensitive-location option or "Both"
- Deps array gains `q5bProfiling` and `q18bTraining`.

CYBER CITATION VERIFICATION: corpus rows `cppa-7120` / `cppa-7121` confirm the
audit THRESHOLDS live at § 7120(b) and the TIMING at § 7121(a). The prior
"§ 7122(a)" line was stale and is corrected to `11 CCR §§ 7120(b), 7121(a)`.

## 5. BUILD 4 — contract + fixtures + tests

`supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts`:
- `HAS_SECONDARY_USES_OPTS` / `DIVERGENCE_OPTS` exported (verbatim copies of the
  page constants) near the other option lists.
- Fields appended after `subject_anchor` (:195):
  `primary_activity_name` (text, always), `primary_activity_purpose`
  (text, always), `has_secondary_uses` (enum, always),
  `secondary_activities` (structured, optional).

`LEDGER_KEYS` derivation: `supabase/functions/_shared/ltp/derive.ts:55-80` derives
the ledger keys FROM the contract field list (Item 258), so the four new keys are
picked up automatically with no second edit site.

DELIBERATE spec-of-test changes (new required fields must appear in every fixture
that flows through `validateIntake`):
- `supabase/functions/_shared/golden/cppa-risk.ts` (shared `base`)
- `supabase/functions/_shared/cppa-risk-contract-fixtures.ts` (3 scenarios)
- `src/lib/sampleFixtures.ts` (cppa_risk sample intake)

## 6. Verification

- `tsgo -p tsconfig.app.json` — clean.
- `deno test supabase/functions/_tests/{intake-contracts,golden-contract,contract-surface-audit}.test.ts` — 34 passed / 0 failed.
- `vitest run src/test/assistedInput.test.tsx src/lib/__tests__/intakeRailParity.test.ts src/lib/__tests__/cppaRiskFixturesOptionDrift.test.ts` — 25 passed / 0 failed.
- `scripts/lint-rail-entries.ts` — 1 failure, PRE-EXISTING and out of scope
  (`BiometricRailEntries.ts` R1 form-directive phrasing); zero failures on the
  CPPA risk rail including the two new entries.
- Browser render of Step 1 (1400×1800): three columns stable, rail seeded to
  §§ 7150(a)/7155(a)(1), fork reveal renders the secondary row + divergence
  matrix, rail switches to § 7156(a) on focus. No new console errors.

## 7. Four-lens record

- LEGAL: every new rail string is verbatim corpus text with a pin; the
  comparable-set determination is framed as reserved, never asserted.
- PRODUCT: three required fields only; the fork is opt-in and skip-tolerant.
- ENGINEERING: single contract edit site; ledger keys derive automatically; no
  engine change, so Step 2 can consume the fields without a rollback risk.
- RISK: the footprint realignment corrects a stale statutory citation that was
  user-visible; recorded here for the R6 law's record.
