# Responsive optimization — phased plan

Goal: the site should look intentional at **every** width from 320px to 1920px, not just at the `sm/md/lg/xl` breakpoints. This matters most for users who resize browser windows, use split-screen, or zoom.

The plan is split into 4 phases. Each phase is independently shippable — we can stop after any phase if you've gotten what you need.

---

## Phase 1 — Fluid design tokens (foundation)

Touches design tokens only. Every page benefits automatically. Lowest risk.

**`tailwind.config.ts`**
- Convert `fontSize.sm` and `fontSize.base` from hardcoded `14px`/`16px` to `rem` so they respect user zoom and OS font-size preferences.
- Add a fluid type scale using `clamp()`:
  - `text-fluid-sm`, `text-fluid-base`, `text-fluid-lg`, `text-fluid-xl`, `text-fluid-2xl`, `text-fluid-hero` — each scales smoothly between a min and max width (e.g. `clamp(1rem, 0.95rem + 0.3vw, 1.125rem)`).
- Add fluid spacing utilities: `space-fluid-sm/md/lg` using `clamp()` for section padding and gaps.
- Enable container queries plugin (`@tailwindcss/container-queries`) so cards can respond to their parent width, not just viewport width.

**`src/index.css`**
- Add CSS custom properties for fluid scales so non-Tailwind CSS (PDF templates, report shells) can use them.

**`src/components/PageContainer.tsx`**
- Replace the 4 fixed widths with fluid versions that use `clamp()` for padding (`clamp(1rem, 3vw, 2rem)` instead of stepped `px-4 sm:px-6 lg:px-8`).
- Keep the `narrow/default/wide/full` API the same — internal change only.

**Acceptance:** No visual regression at standard breakpoints; smooth scaling between them.

---

## Phase 2 — Fix the known offenders

Pages and components that visibly break at in-between widths.

1. **`SearchFirstHero`** — 3-card row collapses awkwardly between ~900–1100px. Switch to a container-query grid that goes 1 → 2 → 3 columns based on available width rather than viewport.
2. **`WorkspaceLayout` + `WorkspaceSidebar`** — Sidebar is hardcoded 220px and binary (visible on `md+`, hidden below). Add an intermediate collapsed-icon state for ~768–1024px so subscribers don't lose nav when resizing.
3. **Comparison/matrix tables** — `CookieConsent`, `CrossBorderTransfers`, `HealthDataPrivacy`, `USStateComparison`. Currently `overflow-x-auto` which is unusable on narrow widths. Implement a shared `<ResponsiveComparisonTable>` that:
   - Keeps the first column sticky horizontally
   - Collapses to a stacked card layout below a container threshold (not viewport — so it works in sidebar contexts too)
4. **`SectionShell` header** — flex row with CTA on the right wraps poorly; switch to a container query that stacks the CTA below the heading when width < ~500px.
5. **Article cards** (`ArticleCard`, `NewsfeedList`) — verify meta row (date · source · tags) wraps cleanly at narrow widths.

**Acceptance:** Manual screenshot pass of these 5 areas at 360 / 600 / 768 / 900 / 1100 / 1280 / 1600px.

---

## Phase 3 — Tables specifically (deeper)

If Phase 2's `<ResponsiveComparisonTable>` lands well, apply it consistently:

- Audit every `<table>` in `src/pages/` (there are ~15).
- Migrate the comparison-style ones to the shared component.
- Leave data-grid tables (admin pages, ingestion dashboard) alone — those legitimately need horizontal scroll.
- Add a Storybook-style page at `/dev/responsive` (admin-only) that renders all shared layout components at multiple widths for visual regression.

**Acceptance:** All public-facing comparison tables readable at 375px without horizontal scroll.

---

## Phase 4 — Tooling & guardrails

Prevent future regressions.

1. **Screenshot script** — `scripts/responsive-screenshots.mjs` using Playwright, capturing the top 10 pages at `[360, 600, 900, 1200, 1600]`px. Output to `/tmp/responsive/` for manual review.
2. **ESLint rule (or simple convention doc)** — discourage new hardcoded `w-[NNNpx]` and `text-[NNpx]` in layout components.
3. **Memory entry** — add a Core rule to `mem://index.md`: "Layout components use fluid tokens (clamp, container queries). Avoid fixed `px` widths outside icons."
4. **Playwright test** — extend existing `tests/subscribe-layout.spec.ts` pattern to assert no horizontal overflow on key pages at 5 widths.

**Acceptance:** Screenshot script runnable locally; one Playwright test guarding overflow.

---

## Technical notes

- Container queries require the `@tailwindcss/container-queries` plugin (one `bun add` away) and Tailwind v3.2+ (we're on v3 — fine).
- `clamp()` is supported in all evergreen browsers; no polyfill needed.
- Phase 1 changes are token-level and shouldn't require touching component files — that's the point. If any component overrides tokens with hardcoded values, that's a Phase 2 item.
- We can ship Phase 1 today. Phases 2–4 are roughly 1 session each.

---

## What I need from you

1. **Confirm to proceed with Phase 1** (or pick a different starting point).
2. **Optional:** any specific pages you'd like prioritized in Phase 2 beyond the 5 listed.
