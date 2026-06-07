# CA Build — CCPA/CPRA Risk Assessment Enhancement Plan

## 1. Scroll-to-top on Next/Back
When the user clicks **Next** or **Back** at the bottom of any step, the page should scroll to the top so the new step content starts at the viewport top.

## 2. Clickable stepper at top of each page
Replace or supplement the static "Step X of Y" text with a clickable breadcrumb-style stepper (e.g. **Step 1 > Step 2 > Step 3**) at the top of each page. This gives users a quick way to jump between completed steps without relying only on the bottom navigation buttons.

## 3. Session persistence (draft)
Decide between:
- **Option A (localStorage)** — lightweight, survives refresh/close, no backend needed.
- **Option B (server table)** — cross-device, survives clear-cache, requires a new `assessment_drafts` table + RLS + edge function.

## 4. Per-question citation tooltips
Every question gets an info tooltip that shows:
- A **plain-English summary** of what the question is asking and why it matters.
- The **specific code section(s)** (e.g. Cal. Civ. Code § 1798.100, CPRA Regs. § 7027).
- A **short verbatim snippet** from the statute or regulation when helpful.

Use shadcn Tooltip, co-located citation map (frontend const), brand-styled trigger icon.

## 5. "Other" free-text capture
Applies to **Q3** (primary business sector), **Q4** (PI categories sold/shared), and **Q17** (legal basis for sensitive PI).

Behavior:
- When the user selects **Other**, a free-text input appears inline.
- If text is entered, it is stored in a dedicated field (`q3_sector_other`, `q4_pi_categories_other`, `q17_sensitive_basis_other`).
- If the user unselects Other, the corresponding `*_other` field is cleared.
- Validation: if Other is checked but the text field is empty, block Next with the existing toast pattern used in `stepValid()`.

Intake schema additions (frontend only, sent through existing checkout flow):
`q3_sector_other?: string`, `q4_pi_categories_other?: string`, `q17_sensitive_basis_other?: string`

## 6. Expanded Q3 sector list
Replace the current 11-item list with a more comprehensive grouped list.

Proposed sectors:
- Retail & E-Commerce
- Financial Services (incl. insurance, fintech)
- Healthcare & Life Sciences
- Technology & SaaS
- AdTech / Marketing & Advertising
- Media, Entertainment & Publishing
- Telecommunications
- Education & EdTech
- Hospitality, Travel & Tourism
- Automotive & Mobility
- Real Estate & Property
- Data Broker / Information Services
- Legal & Professional Services
- Nonprofit / NGO / Civic
- Government / Public Sector
- Utilities & Energy
- Manufacturing & Industrials
- Other

Use shadcn grouped Select (or similar) for mobile-friendliness. Rationale: downstream rule engine and future sector-aware findings need precise bucketing — e.g. data brokers (§ 1798.99.80 et seq.) and AdTech are first-class CPPA enforcement targets.

## 7. State-loss bug on validation-fail navigation
**Reported:** when the user is sent back to select a primary business sector (Q3), all previously entered data is lost.

Investigate the assessment state object and React state lifecycle. If `stepValid()` or a guard clause triggers `navigate('/cppa-risk-assessment')` without preserving the in-memory form state, that is the root cause. Fix: ensure the assessment state object never resets unless the user explicitly starts a new assessment.

**Important even after #3:** localStorage/server drafts will mask the bug rather than fix it. We want both — drafts for refresh/close resilience **and** in-session state that never drops while the component is mounted.

## 8. Q6 — Multi-select with mutual-exclusion guard
**New requirement.** Q6 should allow the user to select **more than one** option.

Exception rule: if the user selects **"No formal process in place"**, all other selections are automatically **de-selected**. Conversely, if any other option is selected while "No formal process in place" is already checked, "No formal process in place" is automatically **de-selected**.

UI: use checkboxes (or a multi-select component) instead of radio buttons. Keep the existing validation toast pattern if required.

## 9. Q7–Q10 — Multi-select, expanded answers, and exclusion guards
Apply the same review pattern from Q6 to **Q7, Q8, Q9, and Q10** in `/cppa-risk-assessment`.

For each question:
- Determine whether the current options are too narrow for real-world CPPA/CCPA compliance programs.
- Add additional answer choices where practical use cases are missing.
- Decide whether the question should support more than one selection.
- If an option such as **"Not yet implemented"**, **"No formal process"**, or equivalent is selected, automatically de-select all other choices.
- Conversely, if the user selects any substantive implementation option, automatically clear the negative/no-process option.
- Preserve clean downstream intake data so the report logic can distinguish between mature, partial, informal, outsourced, and not-yet-started controls.

## 10. Full question-by-question rigor review
Before implementation, review **every question in the CPPA Risk Assessment flow**, not only Q3–Q10.

For each question, document and decide:
- Whether the answer list should be expanded for real-world use cases.
- Whether single-select or multi-select is legally/compliance-operationally appropriate.
- Whether any answer should be mutually exclusive.
- Whether **Other** free-text is needed.
- Whether the response needs to feed any scoring, branching, or report-generation logic differently.

Output should be a review matrix before coding: question number, current control type, proposed control type, new options, mutually exclusive options, validation rules, and downstream data impact.

## 11. Pricing consistency for CPPA Risk Assessment
**Reported discrepancy:** the final assessment page states **$79**, while checkout shows **$89**.

Before implementation:
- Audit every CPPA Risk Assessment price reference in the app, checkout setup, pricing config, backend/payment function inputs, dashboard copy, and success/confirmation pages.
- Confirm the correct price by user type/subscription state.
- Ensure all stated prices match checkout exactly.
- **The CPPA Risk Assessment is a paid tool.** It is not free. The **CPPA Scope Checker** is the free lead-in tool intended to encourage purchases of other CPPA products.
- Document the price source of truth for the CPPA Risk Assessment and ensure it cannot drift between UI and checkout.
- Preserve promotion of the free CPPA Scope Checker (and other paid CPPA products) in relevant funnels.

## 12. CPPA Risk Assessment logic documentation
Create a reviewable logic document for the assessment before or alongside implementation.

It should document:
- Intake questions and normalized fields.
- Validation and branching rules.
- Single-select vs multi-select decisions.
- Mutually exclusive answer rules.
- Scoring/risk-rating assumptions.
- How answers map to report domains.
- How enforcement context is used.
- How citations and tooltips support each question.
- Any assumptions that need legal/product review before being locked into the build.

## 13. Post-purchase/document-generation status UX
**Reported issue:** after purchase, the user is stuck on a static **"PURCHASE CONFIRMED"** page and cannot tell whether the assessment report is being produced.

Improve the planned flow so the user sees active progress after payment:
- Poll for assessment/payment/report status after checkout confirmation.
- Show a clear production state such as **payment confirmed → report queued → report generating → report ready**.
- Add a polished loading indicator, e.g. Apple-style spinning lines or Google-style spinning colors.
- Consider a rolling CTA area while the report is generating that promotes related CPPA products, explaining why they are needed.
- Once ready, provide a direct CTA to open the generated report instead of requiring manual navigation back to the workspace.
- If generation takes too long or fails, show a clear fallback message and link to the workspace/reports area.

## 14. Paid report missing from dashboard/workspace bug
**Reported bug:** after paying for a CPPA Risk Assessment, no CPPA risk assessment report appears in the dashboard/workspace.

Investigate and fix during CA Build:
- Confirm whether the paid assessment row is created before checkout.
- Confirm payment confirmation updates the correct assessment/session record.
- Confirm the report-generation function runs and marks the assessment complete.
- Confirm the completed report has the correct `user_id`/ownership fields used by the dashboard.
- Confirm `/dashboard/reports` queries include CPPA Risk Assessment reports and display their status while pending/processing/complete.
- Add defensive handling for orphaned paid records or failed generation so a paid user is never left without a visible report/status.

## 15. Scope guardrail
Most UX/question changes are frontend-only unless Option B (server drafts) from #3 is chosen. Pricing/payment, post-purchase status, and missing-dashboard-report fixes may require checkout/backend/report query changes after the audit confirms the root cause.

## 16. Enforcement action detail page readability (cross-cutting, not CPPA-specific)
**Reported issue:** the CPPA Risk Assessment cites enforcement actions (e.g., FTC v. Kochava) with a **"View case"** link that navigates to `/enforcement-intelligence/:id`. The destination page is hard to read and review: the violation summary is a single wall of text, there is no at-a-glance fact box, sections are ordered conclusion-before-narrative, the reading measure is too wide, and the basic-RPC fallback for older actions leaves the scaffolding looking empty.

See **`/mnt/documents/enforcement-action-detail-page.md`** for the full breakdown of how the page is generated (data sources, structure, fallback behavior) and the prioritized list of recommended improvements.

Build scope (CA Build phase — quick wins only):
- Add an "At a glance" fact box (regulator, jurisdiction, statute, date, fine, precedent rating, status, case ID, source).
- Reorder sections to: at-a-glance → what happened → why it matters → how to avoid it → tools → related cases.
- Render `violation` / `raw_text` as real paragraphs (split on double newlines, auto-list numbered paras), constrained to `max-w-prose`.
- Add a sticky in-page TOC/anchor nav (chip row on mobile) with copy-link affordances.
- Promote the source link into the at-a-glance box.
- Polish the basic-RPC fallback so older actions don't look broken.
- Use semantic severity colors for breach / biometric / civil-litigation badges.

Deferred to a follow-up phase (tracked, not in CA Build): procedural timeline, structured statute-by-statute table, "what this means for you" panel, citations sidebar, PDF export, server-side structured enrichment of long-form fields, versioned snapshots.

## 17. Enforcement fine currency bug (data + display)
**Reported issue:** `/enforcement-intelligence/30d7994d-10cb-44c5-a22d-b454f5d97ad5` is a U.S. FTC matter (FTC v. Kochava) but the page renders the fine as **€920,000**.

**Confirmed root causes:**
- **Data layer:** the row stores `fine_eur_equivalent = 920000.00` with `fine_amount = NULL` and `fine_eur = NULL`. The enrichment pipeline populated the EUR-equivalent column for a US action without first capturing the original USD amount, so the native-currency value is lost. A scan shows **203 U.S. rows**, 6 Australian rows, and 1 Romanian row in the same state (EUR-equivalent set, native `fine_amount` null).
- **Display layer:** `src/pages/EnforcementActionDetail.tsx` formats the fine unconditionally with `formatEur(fine_eur_equivalent ?? fine_eur)` using a hard-coded `Intl.NumberFormat("en-EU", { currency: "EUR" })`. There is no branch on jurisdiction or source currency, so any populated value renders with a € sign.
- **Possible accuracy issue:** the FTC's Kochava resolution was primarily a conduct ban / data-deletion order, not a fixed monetary penalty. The 920,000 figure should be re-validated against the FTC press release before being shown anywhere.

**Build scope:**
- Frontend (immediate fix): render the fine in the **native currency for the jurisdiction** (USD for US federal + state AG actions, GBP for ICO, AUD for OAIC, EUR for EU DPAs, etc.), and show the EUR equivalent only as a secondary "≈ €X" line when both are present. Apply the same fix everywhere a fine is rendered: `EnforcementActionDetail.tsx`, `EnforcementPrecedents.tsx`, `EnforcementTracker.tsx`, dashboard rails, and any CPPA/Risk report cards that cite a fine.
- Add a `fine_currency` column to `enforcement_actions` (text, ISO 4217) so the source currency is explicit instead of inferred from jurisdiction.
- Backfill: for the 210 affected rows, re-run enrichment to recover `fine_amount` + `fine_currency` from `raw_text` / `source_url`, and verify `fine_eur_equivalent` against a published FX rate for `decision_date`.
- Re-verify the Kochava row specifically against the FTC press release; if the FTC order did not impose a monetary penalty, clear the fine fields and surface a "No monetary penalty — conduct order" badge instead.
- Add a primary-source verification check to the existing Track 3 verifier so any populated `fine_*` field must match a verbatim substring of the primary source; rows that fail get flagged in the admin verification dashboard instead of being displayed with a fabricated number.
