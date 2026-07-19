
# CPPA Scope Checker — Legal-Logic Correction Pass

Frontend/data/test files only. No edge-function deploys, no migrations. Saved sessions preserved via a compatibility layer; ambiguous legacy answers trigger confirmation, never silent reclassification.

## Verified anchors (this turn)

- **CPI-adjusted revenue threshold (Item 1):** VERIFIED at **$26,625,000**, effective 1/1/2025, per CPPA CPI-adjustment table citing **Cal. Civ. Code § 1798.140(d)(1)(A)** (source: https://cppa.ca.gov/regulations/cpi_adjustment.html). This is the figure to encode.

## Anchors NOT YET VERIFIED — gate before coding Items 2 & 3

The final-text PDF (`ccpa_updates_cyber_risk_admt_appr_text.pdf`) is 127 pages and fetch keeps truncating in this environment before it reaches § 7120 (~page 40+) and § 7150. I will not encode processing thresholds, phased deadlines, or § 7150 trigger enumerations from memory. **STOP requested** — either (a) courier the verified prose (§ 7120(b) triggers, § 7121 deadline table, § 7150 trigger list) as with prior REBUILD-* gates, or (b) confirm I may proceed using the values in the courier body ($100M/$50M/<$50M ↔ Apr 1 2028/2029/2030; ≥250,000 consumers/households; ≥50,000 sensitive-PI consumers) as authoritative.

## Item 5 verification (independent — no gate)

I will fetch NJ and TN official legislature pages to replace `law.justia.com` URLs in `src/data/statutes.ts`, and record every URL I opened and confirmed.

## Item 4 — Data-broker question (no anchor gate)

`https://cppa.ca.gov/data_brokers/` is the CPPA Delete Act registry. Current Civil Code cite is **Cal. Civ. Code §§ 1798.99.80–1798.99.89** (Delete Act; SB 362 codification). I will strip the § 22757 / AG-registration reference and split (a) meets-definition vs. (b) is-registered-with-CPPA.

## Implementation once gate clears

### `src/pages/CPPAScopeChecker.tsx`

1. **Q2 revenue** — replace band radio with:
   - Numeric field ("Prior calendar year annual gross revenue, USD") with `>= 0` validation; and/or
   - Discrete bands isolating the threshold: `Under $26.625M` / `$26.625M – $100M` / `$100M – $500M` / `Over $500M` / `Unsure`.
   - Evaluation: `revenueMet = numeric >= 26_625_000` (or band ≥ `$26.625M – $100M`).
2. **Compatibility layer** for saved sessions: legacy `$25M–$100M` straddles the new threshold → set state flag `revenueLegacyStraddle=true`, render an inline "Confirm your prior-year gross revenue was at least $26,625,000" prompt with Yes/No/Unsure. NEVER silently reclassify. Legacy `Under $25M` maps cleanly to below-threshold; legacy `$100M–$500M` / `Over $500M` map cleanly to above.
3. **New questions (added only as needed to evaluate implemented triggers):**
   - `q_processing_consumers`: "In the prior calendar year, did you process (buy/sell/share) the PI of ≥250,000 California consumers or households?" — Yes / No / Unsure.
   - `q_processing_spi`: "In the prior calendar year, did you process the sensitive PI of ≥50,000 California consumers?" — Yes / No / Unsure.
   - `q_admt_significant_decision`: "Do you use ADMT to make a significant decision about a consumer?" — Yes / No / Unsure.
   - (Sensitive-PI/sale-share fields already collected via q3/q4/q5.)
4. **Cyber audit scope (§ 7120)** — replace `cyberAuditRequired = revenue > $100M` with:
   ```
   const cyberScope = ccpaBusiness && (
     revenueOver_26_625M_and_processing_250k ||
     spi_50k ||
     sale_share_revenue_50pct
   ); // exact prongs pending gate
   const cyberScopeResult = anyUnsureInPath ? "needs_counsel_review" : cyberScope ? "in_scope" : "not_triggered_on_answers";
   ```
   - **Deadline evaluated only when scope=in_scope**, from revenue band. Show triggering answer + subsection in the result.
5. **Risk-assessment applicability (§ 7150)** — replace `= inScope` with:
   ```
   const raResult = evaluateSection7150Triggers({sellShare, spiProcessing, admtSignificant, ...});
   // returns "required" | "not_triggered_on_answers" | "needs_counsel_review"
   ```
   - Any relevant Unsure → `needs_counsel_review`. Not "not required."
   - Display triggering fact + pinpoint.
6. **Data-broker question (q8)** — split:
   ```
   q8a: "Meets data-broker definition (Civ. Code § 1798.99.80(d))?" — Yes/No/Unsure
   q8b: "Registered with CPPA under the Delete Act?" — Yes/No/N-A
   ```
   - Registration status does not decide general CCPA scope.
   - Remove all § 22757 and "Attorney General" registration copy; link to `https://cppa.ca.gov/data_brokers/`.
7. **ResultsPanel** — render tri-state outcomes ("Required" / "Not triggered on your answers" / "Review with counsel — insufficient facts on file"). Never convert Unsure into "Required" or "Not required."

### `src/components/cppa/CPPAScopeRailEntries.ts`

Update sidebar citations for revenue prong (§ 1798.140(d)(1)(A) + CPI note), § 7120(b) prongs, § 7121 deadlines, § 7150 triggers, and Delete Act cite (§§ 1798.99.80–.89).

### `src/data/statutes.ts` — Item 5

Replace `law.justia.com` URLs for NJ (NJDPA) and TN (TIPA) with official legislature/statute pages (or chapter-level enacted-act PDFs where no deep link exists). Verify each URL live; document them in the report.

### Tests

- `src/lib/__tests__/cppaScopeChecker.thresholds.test.ts`:
  - `26_624_999` → revenue prong fails.
  - `26_625_000` → revenue prong passes.
  - 100k-consumer prong and 50%-sale/share prong evaluated independently.
  - Legacy `$25M–$100M` intake → confirmation prompt triggered, NOT silent reclassification.
- `src/lib/__tests__/cppaScopeChecker.cyberScope.test.ts`:
  - Each § 7120 prong independently → in_scope.
  - >$100M business meeting neither processing prong nor sale/share → NOT auto in_scope.
  - Any Unsure in the evaluation path → `needs_counsel_review`, never `in_scope`.
  - Deadline tiers by revenue band (once anchors verified).
- `src/lib/__tests__/cppaScopeChecker.riskAssessment.test.ts`:
  - In-scope + all § 7150 triggers "No" → NOT auto-required.
  - Each trigger "Yes" → `required` with pinpoint.
  - Any relevant "Unsure" → `needs_counsel_review`.
- `src/data/statutes.test.ts` — extend URL verifier to fail on any `law.justia.com` occurrence.

## Guardrails observed

No new comparison columns; no classification changes without citation; no state added/removed; freshness layer + pill/qualifier rendering untouched; 21-state dataset preserved; CPPA-Hub marketing copy edited only where the corrected logic makes the current claim false; every changed legal mapping reported with source + pinpoint.

## What I need from you to proceed

**Confirm one of:**
1. Ship courier prose for § 7120(b), § 7121 deadline table, § 7150 trigger list — same format as REBUILD-IR gate; **or**
2. Authorize me to use the values in your task body ($100M/$50M/<$50M ↔ Apr 1 2028/2029/2030; ≥250,000 consumers/households; ≥50,000 SPI consumers; § 7150 triggers: sale/share, sensitive-PI processing/training, significant-decision ADMT) as the verified anchors, and I proceed in one pass.
