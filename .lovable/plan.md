# Launch-blocker execution plan (D1–D7)

## D1 — Auth-gated, server-verified purchase
- New edge function `verify-purchase` (verify_jwt=false; validates bearer via `getClaims` in code): takes `{ session_id }`, calls Stripe with `STRIPE_SECRET_KEY`, confirms `payment_status === "paid"` and that the Stripe customer email matches the authenticated user's email. On success, writes an idempotent row to a new `purchase_ledger` table (`user_id`, `stripe_session_id UNIQUE`, `plan`, `amount_cents`, `verified_at`). Returns `{ verified: true, plan }`.
- New migration: `purchase_ledger` with GRANTs (`authenticated` SELECT own; `service_role` ALL), RLS `user_id = auth.uid()` for SELECT, no INSERT/UPDATE/DELETE policies for `authenticated` (writes only via edge function).
- `SubscribeSuccess.tsx`: if not authenticated → render "Sign in to confirm your subscription" state with a `/auth?next=/subscribe/success?...` link. If authenticated → call `verify-purchase` once, then fire the (renamed) analytics event only on `verified: true`.
- Reads `STRIPE_SECRET_KEY` from secrets (already present per stripe integration; will `add_secret` if missing).

## D2 — Static "check back shortly" copy, no polling
- Remove the 10× 1s `setInterval` profile poll in `SubscribeSuccess.tsx`.
- Replace "Activating your account…" pulse with a static line: "Activation can take a minute. If your workspace isn't live yet, check back shortly or refresh this page." No re-render loop.

## D3 — Analytics event rename (hard-cut)
- `src/lib/analyticsEvents.ts`: rename `firePurchaseCompleted` → `firePurchaseVerified`; emit event name `"purchase_verified"`. Delete the old function and event name entirely (no dual-emit, no deprecation shim — registration is paused, minimal live funnel data at risk).
- Move the call site from unconditional-on-mount to inside the `verify-purchase` success branch. Update the dedupe key.

## D4 — 90-day cadence
- `src/lib/stateReviewStatus.ts`: `REVIEW_CADENCE_DAYS` already defaults to 90 via the JSON fallback. Confirm `src/data/us_state_comparison.json` has `reviewCadenceDays: 90`; set it explicitly if absent or drifted. No other code changes needed here (all consumers read the constant).

## D5 — Qualified freshness copy (don't suppress)
- `USStateComparison.tsx`: when the current cycle is incomplete, render "Last complete review: {cycleCompletedAt or '—'}; refresh in progress ({N}/{total} states reviewed this cycle)." Keep the "as of" line for context. Extend `computeReviewRollup` return with `inProgressCount` / `totalCount` if not already surfaced.
- `StateReviewPastDueBanner.tsx`: mirror the qualified phrasing rather than the current binary state.

## D6 — Single top-level `<main>` landmark
- `WorkspaceLayout.tsx` keeps `<main id="main-content">`.
- `LegalPageLayout.tsx` and the `US/EU Notice` + `RoPA` shells also keep their `<main>` (they are top-level layouts for unauthenticated / shell routes).
- Strip `<main>` from **page components** rendered inside those layouts. Convert each to `<div>` / `<section>` preserving classes and `aria-label` where used. Scope: all `src/pages/**/*.tsx` files listed by `rg` that are children of a layout that already owns `<main>`. Public pages that are NOT wrapped by a layout (Index, About, Contact, FAQ, Enforcement, Updates, JurisdictionsHub, Horizon, Samples*, GetIntelligence, LegislationTracker, CPPAHub, NoticeBuilderLanding, RegistrationLanding, EnforcementActionDetail, UpdateDetail, OnboardingProfile) get their own `<main id="main-content">` at the page root — exactly one per rendered tree.
- Verification: after edits, `rg -c "<main" src/pages src/components/dashboard/WorkspaceLayout.tsx` must show exactly one `<main>` per route (page OR its wrapping layout, never both).

## D7 — Crawler base URL
- `scripts/generate-sitemap.mjs` already uses `https://enduserprivacy.com`. `public/robots.txt` already references that host.
- Audit remaining callers for hard-coded `.lovable.app` in canonical / og:url / structured-data emitters (`src/lib/seo*`, `index.html`, `Helmet` canonical tags). Replace any with `https://enduserprivacy.com`. Authenticated Playwright suite deferred per instruction.

## Technical details
- New table `public.purchase_ledger` schema:
  ```sql
  CREATE TABLE public.purchase_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_session_id text NOT NULL UNIQUE,
    plan text,
    amount_cents integer,
    currency text,
    verified_at timestamptz NOT NULL DEFAULT now()
  );
  GRANT SELECT ON public.purchase_ledger TO authenticated;
  GRANT ALL ON public.purchase_ledger TO service_role;
  ALTER TABLE public.purchase_ledger ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "own ledger read" ON public.purchase_ledger
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
  ```
- `verify-purchase` uses `stripe@14` npm specifier, `Stripe.checkout.sessions.retrieve(session_id, {expand:['customer','line_items']})`, and inserts with service role.
- Deploy sequence: migration → deploy `verify-purchase` → frontend edits → typecheck.
- Zero-in-flight rule: re-check `quality_loop3_batches` before deploy.
- Test surface: unit test for `computeReviewRollup` freshness qualifier; grep assertion that `purchase_completed` is gone from `src/`.

## Deviations flagged in advance
1. `SubscribeSuccess` currently fires the analytics event on every mount; the rename moves it behind server verification — this changes funnel semantics for any dashboard still watching the old event name. Hard-cut per D3.
2. `LegalPageLayout` + `USNoticeShell` + `EUNoticeShell` + `RopaShell` are treated as `<main>` owners; their child pages lose `<main>`. If any of those shells is ever rendered without wrapping a page (unlikely), the route still has one `<main>` from the shell.
3. Unauthenticated public pages get their own `<main>` at the page root because they don't share a layout wrapper today. Introducing a global layout is out of scope for this pass.
4. `verify-purchase` reads `STRIPE_SECRET_KEY` from existing secrets; if it isn't set I'll stop and request it via `add_secret` rather than fabricate.
5. Playwright/e2e credential-gated suite deferred per D7 instruction.
