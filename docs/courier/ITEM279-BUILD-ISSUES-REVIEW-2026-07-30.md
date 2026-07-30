# ITEM 279 — BUILD-ISSUES REV-2 TEAM REVIEW: ADOPTED RESOLUTIONS

**Date:** 2026-07-30
**Authority:** CEO directed the four-lens review (2026-07-30). All dispositions below were unanimous and are adopted under his order.
**Scope:** frontend (`src/`) only, this courier, and ledger Item 279. No backend change, no deploy, no harness invocation, no engine change.
**Excluded:** Issue 11 (Word engine) — reserved to the CEO. The teams' recommendation is presented to him separately; no action taken here.

---

## 1. Four-lens record, per disposition

Lenses: **LEGAL** · **CS** (customer surface) · **PROMPT** (model-facing contract) · **PROSE** (register and copy).

### ISSUE 5 — grounding calibration

**Disposition (unanimous):** The Pass-1 grounded-note screen REMAINS in observe. Its lexicon calibration and the seven Pass-2R validators calibrate on the SAME flagged replay batches — no separate spend. Promotion bar for any of them is §2R.7: two consecutive replay batches at approximately zero false positives.

- **LEGAL:** An observe-mode screen creates no representation to the customer and no record risk; promoting a mis-calibrated screen to enforce would suppress accurate statements, which is the worse legal failure. The §2R.7 bar is the same bar the validators already answer to, so there is one standard, not two.
- **CS:** Nothing the customer sees changes. A screen that fires falsely would either blank content or degrade it silently — both are the failure modes CS has repeatedly refused.
- **PROMPT:** Sharing the flagged batches means the lexicon and the validators see identical inputs, so a defect can be attributed to the screen or to the generator rather than to a difference in sampling.
- **PROSE:** Connective lexicons are register-sensitive; they cannot be tuned against synthetic text. Real replay prose is the only valid corpus.

**Action this turn:** none. No code change.

### ISSUE 7R — GTM register v1.2

**Disposition (unanimous):** CLOSED as shipped. All four CEO-read material classes have live detectors — owner-name (Item-273 owner-slot PII rule), the registry-corpus pin test, cross-section duplication, and activity-count coherence. The register was verified at HEAD. The residual weighing question does not reopen this issue; it rides Issue 10.

- **LEGAL:** Each of the four classes maps to a defect that would be visible on the face of a filed record; each now has a deterministic detector rather than a reviewer's attention.
- **CS:** The four classes are exactly what a CEO-level reader notices first, which is why they were selected; nothing further is owed at the register level.
- **PROMPT:** Detectors are outside the model path, so closing the issue does not depend on model behaviour.
- **PROSE:** Cross-section duplication was the register's prose-facing item and it now has a detector.

**Action this turn:** none. No code change.

### ISSUE 9 — presence band

**Disposition (unanimous):** The provisional band [0.4375, 0.6875] and the 0.25 hard floor REMAIN. Recalibration is deferred to the first full acceptance-40 replay on the post-Item-278 build. No interim change.

- **LEGAL:** The floor is the record-sufficiency backstop; loosening it before evidence exists would be unjustifiable.
- **CS:** A band change moves what customers see; it should move once, on data, not twice on guesses.
- **PROMPT:** The post-Item-278 build changes the generation path, so any pre-278 calibration data is stale by construction.
- **PROSE:** No prose consequence until the band moves.

**Action this turn:** none. No code change.

### ISSUE 10 — weighing vs count

**Disposition (unanimous):** Firm negative verdicts are NEVER count-derived — already in force via §2R.4(3) and the Item-273 balance-verdict guard. The CLOSENESS signal that triggers hedging MAY be derived conservatively from the existing severity-tiered factor structure, used ONLY to hedge a verdict and NEVER to firm one up. Any numeric weighting redesign is deferred until the first prose-replay data exists.

- **LEGAL:** Counting factors is not weighing them, and a firm adverse conclusion reached by counting is not defensible. Hedging in the direction of reserving to counsel is the only safe asymmetry, so a closeness signal may push toward caution and never away from it.
- **CS:** A hedged conclusion the customer can act on beats a confident conclusion they cannot rely on.
- **PROMPT:** The one-directional rule is expressible as a hard constraint; a bidirectional weighting scheme is not, without data.
- **PROSE:** Hedging language already exists in the contract; no new vocabulary is introduced.

**Action this turn:** none. **No code change.**

### ISSUE 12 — viewer wiring

**Disposition (unanimous):** Adopted. Built this turn — see §2, Build 1.

### ISSUE 13 — coaching copy

**Disposition (unanimous):** Adopted. Built this turn — see §2, Build 2.

### ISSUE 11 — Word engine

**NOT decided here.** Recommendation presented to the CEO separately. No action.

---

## 2. Builds

### BUILD 1 — Issue 12: fail-loud viewer guard

**Files:** `src/lib/cppa-risk-shape.ts`, `src/components/report-bodies/CPPARiskReportBody.tsx`, `src/test/cppaRiskViewerPdfParity.test.tsx`.

`describeCppaRiskShape(report, isV4Report)` is added to the shared discriminator module and returns `{ shape: "ltp" | "v3" | "v4" | "unrecognized", recognized, reportId, schemaVersion, topLevelKeys }`. It is the single place that names the dispatch target; `isLtpRiskShape` remains THE LTP predicate and is called from inside it, so the Item-274 SINGLE DISCRIMINATOR LAW is preserved.

`CPPARiskReportBody` consumes that result instead of recomputing the three predicates inline. When `recognized` is false it short-circuits BEFORE any renderer and returns an explicit `role="alert"` card:

- heading: **"This report's format is not recognized by the viewer"**
- the report id (`id` or `report_id`, else "unavailable")
- a note to contact support with that id

and emits `console.error("[CPPARiskReportBody] Unrecognized report shape — viewer cannot render this payload.", shapeResult)`. A blank body is no longer reachable on this path.

Recognized-shape rendering is unchanged: LTP, V3, and V4 payloads take exactly the branches Item 274 wired, and the Item-274 parity assertions are untouched and green.

### BUILD 2 — Issue 13: coaching copy (verbatim)

**File:** `src/components/cppa/CPPARiskRailEntries.ts`. Two Item-275 entries. Neither restates the statute — the rail already carries § 7150(a), § 7155(a)(1), and § 7156(a) verbatim in `regulationText`. Both examples use a fictional business; no real-entity names and nothing resembling the fixtures' real-sounding entities.

#### `primary_activity`

`coachLead` (verbatim):

> Name one processing activity, not a product line or a department. Say what data you handle, whose data it is, and what you use it for. If you would need the word “and” to join two different purposes, you are naming two activities.

`goodAnswer` (verbatim):

> “Loyalty birthday coupon mailing” — “Fernbrook Grocers mails a paper coupon to loyalty members using the name, mailing address, and birth month they gave at sign-up, so the coupon arrives in their birthday month.” That is one activity: specific data, specific people, one purpose. “Marketing” or “the loyalty program” would not be.

#### `comparable_set`

`coachLead` (verbatim):

> List every other use the same data is put to, including the ones you would rather leave out, then set each one beside this activity on all five dimensions: the data, the people, the collection method, the purpose, and the privacy risk. Report the differences you find rather than smoothing them over — whether a difference matters is for you and your counsel to judge, not for this form. If a use does not line up, say so; that answer is as usable as a match.

`goodAnswer` (verbatim):

> Fernbrook Grocers notes a second use: the same loyalty records also feed a resale of shopper contact details to a regional beverage distributor. Same data, same shoppers — but a different purpose, a different recipient, and a different privacy risk, so the customer records the comparison dimension by dimension and flags the mismatch instead of folding the two together.

Reserved framing check: the `comparable_set` copy coaches an honest inventory and an honest comparison. It nowhere suggests that bundling is acceptable, nowhere suggests that separate assessments are unnecessary, and expressly leaves the significance of a difference to the customer and counsel.

---

## 3. Test output (verbatim)

Viewer parity + new guard regression:

```text
 RUN  v3.2.4 /dev-server

 ✓ src/test/cppaRiskViewerPdfParity.test.tsx (8 tests) 109ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  09:20:01
   Duration  5.39s (transform 339ms, setup 112ms, collect 810ms, tests 109ms, environment 794ms, prepare 700ms)
```

Rail parity:

```text
 RUN  v3.2.4 /dev-server

 ✓ src/lib/__tests__/intakeRailParity.test.ts (4 tests) 5ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  09:20:36
   Duration  8.90s (transform 475ms, setup 521ms, collect 353ms, tests 5ms, environment 1.84s, prepare 2.13s)
```

Rail lint (`npm run lint:rails`):

```text
> vite_react_shadcn_ts@0.0.0 lint:rails
> tsx scripts/lint-rail-entries.ts


lint-rail-entries: 1 failure(s)

  [R1] src/components/biometric/BiometricRailEntries.ts · types
         goodAnswer contains form-directive phrasing (tick/select/choose/check/enter/pick or "tick none")
```

The `BiometricRailEntries.ts` R1 failure is the pre-existing, tolerated failure. The CPPA risk rail set is clean.
