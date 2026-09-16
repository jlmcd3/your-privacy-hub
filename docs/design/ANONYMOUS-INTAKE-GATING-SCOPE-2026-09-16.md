# Scope — Block anonymous users after page 1 of every paid product intake

Status: SCOPE ONLY. No code changes made. Recorded 2026-09-16 for later decision.

## 1. What exists today

Every paid intake page already imports `AuthGateModal` and pulls its wording from
`src/components/intake/intakeGateCopy.ts` (`intakeGate("<tool>")`). The current policy,
written at the top of that file, is: **gate one step before the review/summary step,
never earlier**, decided in-session, with no save-for-later.

The gate is fired today by a single line repeated on the stepped pages:

```ts
if (!user && step + 1 === totalSteps - 1) { setAuthGateOpen(true); return; }
```

Found in `CPPARiskAssessment.tsx` (~1106), `admt/ADMTChecker.tsx` (515),
`GovernanceAssessment.tsx` (239).

Two structural families:

| Product | Route | Structure today |
|---|---|---|
| CPPA Risk Assessment | `/cppa-risk-assessment` | stepped, 8 steps |
| CPPA ADMT | `/cppa-admt` | stepped, 5 steps |
| GDPR Accountability | `/governance-assessment` | stepped, 5–6 steps |
| CPPA Audit (Cyber) | `/cppa-cybersecurity` | **single long page**, no step state |
| DPIA | `/dpia-framework` | **single long page**, no step state |
| LIA preliminary | `/li-assessment` | single page (signal only) |
| LIA full | `/li-assessment/intake/:id` | **single long page** with Step 01–04 headings |
| Biometric checker | `/biometric-checker` | single page — no change wanted |
| DPA generator | `/dpa-generator` | 4 visual sections — no change wanted |

So the work splits into (a) moving the gate earlier, and (b) giving three
single-page products a real page break.

## 2. Item-by-item scope

### 2.1 Global rule — anonymous users stop after page 1

- Replace the `step + 1 === totalSteps - 1` condition with a shared helper, e.g.
  `src/components/intake/useAnonymousPageGate.ts`, exposing
  `blockIfAnonymous(nextStep)` → true when `!user && nextStep > 1`.
- `AuthGateModal` copy in `intakeGateCopy.ts` must be rewritten: today every string
  says "one section left" / "your answers are ready", which is false when the gate
  fires after page 1. New wording per tool, still Tier A (free account) vs Tier B
  (subscribe) as now.
- Registered-but-unpaid users keep today's behaviour — they proceed and hit the
  purchase/checkout step. Only anonymous visitors are blocked at page 1.
- Deep-link protection: each page restores state from `restoreStage` / `?step=`.
  Those restore paths must also clamp anonymous users to step 1, otherwise the gate
  is bypassed by URL.
- Analytics: fire the existing conversion event at the new, earlier gate point;
  expect gate-impression volume to rise sharply and completion per impression to fall.

### 2.2 CPPA Audit (`/cppa-cybersecurity`) — introduce pages

Today one form. The split point is `<h2>The eighteen cybersecurity program components</h2>`
(line ~649).

- Page 1 = "Organization profile" (h2 at ~442) and everything before line 649.
- Page 2+ = the eighteen components block. Consider splitting the eighteen into two
  or three pages (6/6/6) — the block is long and each component carries maturity,
  notes, evidence and N/A reason state.
- Add `step` / `totalSteps` state, Back/Next buttons, step label, and per-step
  validation matching the pattern in `GovernanceAssessment.tsx`.
- The per-component state maps (`maturity`, `notes`, `evidence`, `naReason`) are
  already keyed by component id, so paging is a render change only — no data model change.
- Field-error highlighting (shipped for CPPA Risk) should be wired at the same time,
  since validation moves per-step.

### 2.3 CPPA ADMT (`/cppa-admt`) — new page break

- Split point: "What significant decision(s) does this system make?" (line ~1102,
  inside the current `step === 2` block).
- This adds a step: 5 → 6. Everything downstream that hard-codes `totalSteps = 5`,
  the step-label copy, the restore logic and the summary-step check must be updated.
- Re-check the validation blocks at 436/459/473/494 and redistribute.

### 2.4 Legitimate Interests Assessment — split into two products

Largest item. Today `/li-assessment` produces a signal and hands off to
`/li-assessment/intake/:id`, with the gate already at "Step 2" of that intake.

- Product A — "Legitimate Interests — Preliminary Signal": `/li-assessment`, unchanged.
- Product B — "Full Legitimate Interests Assessment": page 1 ends after Step 01
  (Purpose test, h2 at ~597); Steps 02 Necessity (~757), 03 Balancing (~829),
  04 Attestation (~1084) become pages 2–4, blocked for anonymous users.
- Requires: step state in `LIAssessmentIntake.tsx`, per-step validation, and a decision
  on whether Product B gets its own entry route (e.g. `/li-assessment/full`) or stays
  at `/li-assessment/intake/:id` reached only from Product A. If it becomes a
  standalone product it needs a landing route that can start without a preview id.
- Registry and navigation touchpoints to update if a second product is created:
  - `src/lib/productRegistry.ts`
  - `src/components/Navbar.tsx` (Tools submenu)
  - `src/pages/Tools.tsx`, `src/components/tools/ToolsSelector.tsx`,
    `ToolAlsoAvailableRow.tsx`
  - `src/lib/workspaceNav.ts` (+ `src/test/workspaceNav.test.ts`)
  - `src/pages/StartNew.tsx`, `src/pages/MyReports.tsx`, dashboard cards
    (`PremiumToolsSection.tsx`, `RecentReportsCard.tsx`), home sections
  - `src/lib/sampleToolRoutes.ts`, `sampleFixtures.ts`, `sampleFixtureContractCheck.ts`
  - Pricing surfaces: `/pricing`, `/subscribe`, PRICING_REGISTRY entries
  - Sitemap generation (`scripts/generate-sitemap.mjs`) and canonical tags
  - Assertion/registry tests under `src/registry/__tests__/` referencing `li-assessment`
- Open question for you: do the two products get separate prices, or is Product B
  the same priced item it is today?

### 2.5 GDPR Accountability (`/governance-assessment`)

No restructuring. Only the gate condition moves from `totalSteps - 1` to step 1.
Confirm step 1 alone is a sensible free preview — it currently collects organisation
basics only.

### 2.6 DPIA (`/dpia-framework`)

- Single long page today with EDPB Section 0/1/2… content and no step state.
- Page 1 must end after Step 1; the page has no "Step 1" heading markers, so the exact
  cut line needs to be agreed against the rendered page before implementation.
- Same work as CPPA Audit: add step state, Back/Next, per-step validation, restore clamp.

### 2.7 Biometric checker and DPA generator

No changes. Both keep their existing late gate.

### 2.8 Sample reports stay open to everyone

`/samples`, `/samples/:toolSlug`, `/samples/:toolSlug/:variant` carry no auth or
subscription gate today (`SamplesHub.tsx`, `SampleReport.tsx`, `SampleReportView.tsx`).
Action is a regression guard only: add a route-guard test asserting the three sample
routes render for an anonymous session, so a later gating change cannot close them.

### 2.9 Convenience tools

No changes.

## 3. Link audit

Your expectation holds. Every internal link found points at a product's **entry**
route (`/cppa-cybersecurity`, `/cppa-admt`, `/dpia-framework`, `/governance-assessment`,
`/li-assessment`), which stays open to anonymous users. No internal link targets a
mid-intake step. The one exception is the LIA split: if Product B gets its own route,
every touchpoint in 2.4 needs updating. Re-run `scripts/qa/link-audit.mjs` and
`tests/launch/internal-links.spec.ts` after any route change.

## 4. Testing

- Extend `tests/launch/route-guards.spec.ts`: anonymous visitor can load page 1 of each
  paid product and is stopped on Next; registered user proceeds.
- New spec: anonymous deep link with a restored step falls back to step 1.
- Sample-route openness spec (2.8).
- Per-product step tests for Audit, ADMT, DPIA and LIA Product B asserting every
  validation message still resolves to a field on its new page.
- `/all-ptest` and `/all-products-test` harness intake drivers post intake payloads
  directly, so paging should not affect them — verify `src/lib/stress/runners.ts`
  and the preset packages still map to the new step numbers.

## 5. Decisions needed before implementation

1. LIA Product B — separate route and separate price, or same product renamed?
2. DPIA — exact cut line for "end of Step 1".
3. CPPA Audit — eighteen components on one second page, or split across three?
4. Gate copy — new per-tool wording for a page-1 gate (current copy is written for a
   late gate and would read as false).
5. Does the gate block on Next only, or also hide page 2+ content from view entirely?
