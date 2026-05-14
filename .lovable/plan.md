## Execution plan for EUP_Rerun_Prompts.md (15 prompts)

I'll execute the prompts in dependency order, in 5 batches. After each batch I'll do a quick build/test sanity check before moving on. Each batch is self-contained — if you want to stop after any batch, the app remains in a working state.

### Batch A — Quick fixes (low risk)
- **R1** Remove broken step indicator in `DPAGenerator.tsx`
- **R2** `PremiumGate` CTA → `bg-gold`
- **R3** Edge function `generate-ropa-document`: ensure output references "Article 30 of the GDPR"
- **R4** Move `<ClientContextBar />` from `Navbar.tsx` into `App.tsx`

### Batch B — New AppShell architecture (highest risk, biggest change)
- **R5** Create `src/components/layout/AppShell.tsx` + `index.ts` using existing shadcn Sidebar; sections, active-state logic, topbar, scroll reset, AppShellContext
- **R6** Wrap ~70 routes in `<Route element={<AppShell />}>` in `App.tsx`; strip `Navbar` / `DashboardSubnav` / `Footer` imports + JSX from ~60 page files

### Batch C — Navbar + public surface visual rework
- **R7** Navbar: navy bg, gold buttons, white text (no structure changes)
- **R8** Star-field CSS in `index.css`; add stars + gold styling to `Subscribe.tsx`
- **R9** `Updates.tsx` feed header redesign + pill jurisdiction tabs + card title class + severity badge styles

### Batch D — Ads, empty states, dashboard styling
- **R10** Dashboard: AdBanner on non-premium branch, gold upsell CTA, gold digest nudge, gold section labels, scrollable enforcement table
- **R11** ReportShell `bg-navy` header; add `<AdBanner variant="leaderboard">` above 9 result pages
- **R12** AdBanner + empty states for MyReports, Watchlist, Account cards, RegistrationMyFilings
- **R13** AdBanner on 10 tool intake pages; Illinois BIPA pre-warning in `BiometricChecker.tsx`

### Batch E — Wizard polish + CTA sweep
- **R14** Create `WizardProgress.tsx`; insert in 7 RoPA pages, 7 US Notice pages, 7 EU Notice pages, 2 Registration pages
- **R15** Gold CTAs on 4 tool landing pages + 12 research pages

### Verification
After Batch B: smoke-test `/dashboard` renders with sidebar.
After Batch E: run all 14 `/admin/test-*` routes, confirm scores per the checklist (Test 4 → 7/7, Test 10 → 10/10).

### Estimated scope
- New files: 3 (`AppShell.tsx`, `layout/index.ts`, `WizardProgress.tsx`)
- Edited files: ~110
- Edge function: 1 (`generate-ropa-document/index.ts`)

### Question before I start
Confirm one of:
1. **Run all 5 batches end-to-end** without stopping (I'll only pause if a build breaks).
2. **Run batch-by-batch**, pausing after each so you can review the preview.
3. **Run a subset** — tell me which batches/prompts to skip (e.g. skip R5/R6 if you're not ready to commit to the AppShell rewrite yet).

Option 2 is safest given the scope; option 1 is fastest. Which do you want?
