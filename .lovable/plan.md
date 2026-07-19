
# Frontend Correctness Pass — Plan

Scope is frontend/data/tests only. No edge functions, migrations, schema, RLS, prices, Stripe IDs, route URLs, or analytics event names. Every item is verified against current source before touching it; already-resolved items are reported and skipped. Deviations from the courier are listed at the end of each item.

## Verification snapshot (already done)

- **Item 1** — profiles table has `user_role` and `brief_role` columns (types.ts L3573/L3597). No migration needed; write to `user_role`.
- **Item 3** — Confirmed present:
  - `"Two plans. One Mission."` in Subscribe.tsx L139
  - `text-sm md:text-sm` in USPrivacyLaws.tsx L262
  - "Switch to Grid view" / "Use Grid view" in JurisdictionsHub.tsx L171/L183
  - "⭐ Intelligence Intelligence" **reproduced statically** in JurisdictionPage.tsx L768, TopicHub.tsx L251, LegitimateInterestTracker.tsx L273, CategoryPage.tsx L232 → will fix (courier said "check rendered"; static hit is stronger evidence).
  - Duplicate `/enforcement-intelligence/:id` route exists in App.tsx L224; App.tsx L219 already redirects the index. Many components still link to the legacy path.
  - `text-[9px]` present in ArticleCard, HomepageSpotlight, AnonymousUpdatesCard, WorkspaceSidebar, RegulatorPage (non-admin). Admin (QualityBatch/QualityLoopAugmentation) stays untouched.
- **Item 5** — "Sign up free" CTAs still present in Navbar, NewsfeedPaywallCard, ResearchSynthesisBlock, UpdateDetail.
- **Item 8** — `ADS_ENABLED = false` in src/config/ads.ts. Legacy `AdBanner`/`InFeedAd`/`StickyRailAd` route through same flag. Need to verify no other AdSense script loader exists and that PrivacyPolicy claims match.

## Per-item execution

### 1. OnboardingModal persistence
- Write role to `user_role`; keep `industry` untouched; save `jurisdictions` to existing `jurisdictions` column; set `onboarding_complete` only inside successful update.
- Catch error → keep modal open, preserve selections, show `role="alert"` message, retry button.
- Fire onboarding analytics event once after confirmed persistence (reuse existing event name — no new names).
- Copy: remove hard-coded "20 US states"; derive count from `src/data/us_state_comparison.json` (count of state entries).
- Tests (vitest + RTL): success path writes correct columns; failure keeps modal open and does not fire analytics; role never lands in `industry`.

### 2. Dashboard H1 + describeBriefPeriod
- Read Dashboard.tsx, confirm exactly one `<h1>` (Privacy Intelligence Workspace); demote any sibling h1s to h2.
- Rewrite `describeBriefPeriod(startISO, endISO)` with explicit branches: invalid → `""`; same-month → `MMM D–D, YYYY`; cross-month same-year → `MMM D – MMM D, YYYY`; cross-year → `MMM D, YYYY – MMM D, YYYY`. Uses `Intl.DateTimeFormat` with fully-specified option objects.
- Unit tests for each branch including boundaries and invalid input.

### 3. Copy/routing verified fixes
- Subscribe: "One Mission." → "One mission."
- USPrivacyLaws: `text-sm md:text-sm` → `text-sm md:text-base` (matches nearby responsive tokens).
- JurisdictionsHub: rewrite the two lines to describe the actual list/search UI (no Grid view exists).
- "⭐ Intelligence Intelligence" → "⭐ Intelligence" at the 4 static hits.
- Enforcement links: change internal callsites (EnforcementPrecedents, AnnotationCallout, Horizon, CustomBriefDocument, Dashboard, LIAssessmentResult, EnforcementActionDetail internal `Link`s) to `/enforcement/:id`. Canonical + JSON-LD + breadcrumb URLs in EnforcementActionDetail switch to `https://enduserprivacy.com/enforcement/:id`. `App.tsx` L224 becomes a `Navigate` redirect from `/enforcement-intelligence/:id` → `/enforcement/:id` (legacy inbound preserved). Verify `/enforcement/:id` route already registered; if not, STOP and report — no new route URL invented. Sitemap script updated to emit `/enforcement/:id`.
- `text-[9px]` → `text-[11px]` on the flagged non-admin components (ArticleCard 5 hits, AnonymousUpdatesCard, HomepageSpotlight, WorkspaceSidebar, RegulatorPage). Admin surfaces untouched.
- Mid-sentence "Intelligence" audit: sweep for `\bIntelligence\b` outside product-name contexts using rg; downcase only where clearly mid-sentence and not part of "Privacy Intelligence"/"Intelligence" tier badge.

### 4. Enum label mapping
- New `src/lib/enumLabels.ts` exporting `formatEnumLabel(namespace, value)` with mappings for enforcement violation types, jurisdiction tokens, sample doc types, tool codes. Unknown → humanized fallback (`snake_case` → `Title Case`), and a `devWarnOnce` that stays silent in prod builds (courier said "console-free").
- Apply at read-sites only (enforcement cards, sample tiles, report headers). Storage/API values untouched.
- Snapshot test with the approved-label table.

### 5. Registration paused (frontend copy only)
- Replace "Sign up free" CTAs in: Navbar (desktop + mobile), NewsfeedPaywallCard, ResearchSynthesisBlock, UpdateDetail (2 sites), homepage/pricing strips → beta/waitlist language linking to `/contact` (existing route).
- Verify with rg that no paid-plan CTA lands on `/signup` without explanation; if any Subscribe/pricing CTA currently routes to `/signup`, redirect to `/contact` with beta wording.
- Email capture STOP CHECK: search codebase for an existing waitlist/capture path. If a `waitlist_signups`/`email_signups` capture exists, wire the copy to it; else STOP that sub-item and report — do NOT create a new table/function.
- Tests: nav CTAs, NewsfeedPaywallCard, ResearchSynthesisBlock, UpdateDetail render the new copy; `/signup` still loads the existing paused screen unchanged.

### 6. Entitlement helper
- New `src/lib/entitlements.ts` with typed `getEntitlement({ tier, interval })` returning `{ includedTools, perUsePrice, annualCredits, clientManagement, extraWorkspacesPurchasable, badge, sentence }`. Sourced from `src/config/pricing.ts` — no numeric/ID changes.
- Refactor Subscribe, Account, SubscribeSuccess, Navbar tier badge, SearchFirstHero, HomepagePricingStrip, tool cards, checkout previews to read from the helper.
- Enforce: Professional MONTHLY badge/sentence never mentions client workspaces; Professional ANNUAL clearly names it; Intelligence lists Layer-1 vs Smart Tool vs annual credits distinctly.
- Table-driven test: for each (tier, interval) render each surface and assert against the helper output.

### 7. Legal cleanup
- LegalPageLayout: conditionally render summary block only when a non-empty approved summary is passed; drop empty container.
- FAQ.tsx: filter out any entry whose question or answer contains "Content pending" or "TODO legal" before rendering.
- Terms.tsx: remove the Shopify-hosting sentence; do not replace it. No other substantive edits. "Last updated" untouched.
- Acceptance grep runs in a test: production build source contains none of "Summary pending", "Content pending", "TODO legal", "Shopify".

### 8. AdSense honesty
- Confirm `ADS_ENABLED=false` fully gates the legacy loader. Sweep for any direct `adsbygoogle.js` script tag outside the guarded components; if found, gate on `useAdEligibility()`.
- `useAdEligibility` already excludes EEA/UK/CH via `getAdRegion`. Add belt-and-braces: even when `ADS_ENABLED` flips true later, the loader script tag itself must not be injected in excluded regions. Refactor `AdBanner`/`InFeedAd` to early-return before touching `window.adsbygoogle` when `getAdRegion() === 'excluded'`.
- PrivacyPolicy.tsx L349/L423 area: rewrite claims to state "Non-personalized advertising outside EEA/UK/Switzerland; no advertising is served in EEA/UK/Switzerland pending a consent flow." No new legal language beyond describing deployed behavior.
- Tests: mock TZ to `Europe/Berlin` → hook returns false and no `ins.adsbygoogle` renders; mock `America/New_York` with `ADS_ENABLED=false` → still no ad; policy text matches.

### 9. Citation accessibility on /compare/us-states
- Replace hover-only line with "Hover or focus a citation marker; activate it to open the official source."
- Convert citation markers to `<a>` (or `<button>` when no URL) with `aria-label` composed of state + provision + pinpoint. Preserve all data, counts, pills, qualifiers.
- Keyboard test + axe test on rendered `USStateComparison`.

### 10. Methodology block on /compare/us-states
- Add `scopeSummary` field to `src/data/statutes.ts` entries (typed in `statutes.types.ts`). Florida entry qualifies applicability with "for-profit entities ≥$1B global revenue with specified activities". Verify Fla. Stat. §501.702 against enacted text via `websearch--web_search` before publishing; if the section number differs, use the verified section and note deviation.
- Add methodology section to USStateComparison.tsx: inclusion criteria, as-of date (max `reviewed_at` from `state_law_review_log`; if unavailable, derive from `statutes.ts` `lastVerified` field), checkmarks compare selected provisions not identical scope, definitions differ, narrow-scope treatment, correction process (link to `/contact`).
- JSON-LD emits `datePublished`/`dateModified` from the same derived date and includes methodology description.
- No new provision columns, no classification flips.

## Gates / STOP conditions

- Item 1: role column existence — **passes** (`user_role` exists).
- Item 3: `/enforcement/:id` route must already exist in App.tsx — will re-verify before rewiring; if absent, STOP and report.
- Item 5: existing email capture path — will grep; if none, STOP and report on that sub-item only.
- Item 10: Fla. Stat. §501.702 pinpoint — verify via web search; STOP and report if the section differs and no verified alternative is confirmable.

## Verification at the end

Run in order:
1. `bunx vitest run` (all frontend tests including new ones)
2. `tsgo` typecheck
3. Build (harness auto-runs)
4. Static grep acceptance for Item 7 forbidden strings
5. Report per-item: verified-still-present / fixed / already-resolved / STOPPED, files changed, tests added + pass counts, and every deviation from the courier.
