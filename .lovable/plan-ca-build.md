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

## 9. Scope guardrail
All of the above are frontend-only changes unless Option B (server drafts) from #3 is chosen.
