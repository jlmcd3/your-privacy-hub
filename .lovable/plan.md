## Site-wide content organization audit

Scope: every file in `src/pages/` and `src/components/`. Apply 6 rules; touch only structure/spacing, no copy/routing/logic changes.

### Rules to enforce

1. **Heading hierarchy** — Ensure ≥1 `<h1>` per page. No level skips (h1→h2→h3). Strip `text-*xl*`, `font-bold`, `font-semibold`, `font-medium` etc. from `<h1>/<h2>/<h3>` (sizing comes from `index.css`).
2. **Eyebrow labels** — Small uppercase labels → `.text-eyebrow` class, placed directly above their heading with nothing between, never orphaned.
3. **Section spacing** — Major sections use `<section className="py-8 md:py-12">`. Heading→first paragraph = `mt-3`. Consecutive paragraphs = `mt-4`. No `<br />` for spacing.
4. **Reading width** — Prose wrapped in `max-w-[72ch]`. Excludes tables, cards, grids, feeds.
5. **Lists** — `ul` → `list-disc list-outside pl-5 space-y-2 text-body`; `ol` → `list-decimal ...`. No bold-as-pseudo-heading items; convert to `<dl>/<dt>/<dd>`.
6. No business logic, copy, routing, or data-fetching changes.

### Execution approach

Given the volume (~250 files), I'll work in passes by area, batching parallel edits within each pass and running ripgrep audits to find violators before editing.

**Pass A — Audit scripts (read-only)**
Run ripgrep queries to enumerate violations across the codebase:
- Pages with no `<h1>` (`rg -L '<h1' src/pages/`)
- Sized headings (`rg '<h[123][^>]*className="[^"]*text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)' src`)
- Weighted headings (`rg '<h[123][^>]*className="[^"]*font-(bold|semibold|medium|light|thin|normal)' src`)
- `<br />` usage (`rg '<br\s*/?>' src`)
- Eyebrow candidates missing class (`rg 'uppercase tracking' src`)
- `list-disc|list-decimal` without required classes
- Long-prose containers missing `max-w-[72ch]`

**Pass B — Layout primitives first**
Fix shared shells where one edit cascades to many pages:
- `PageContainer`, `SectionShell`, `ReportShell`, `PillarPage`, `RopaShell`, `EUNoticeShell`, `USNoticeShell`, `PillarPage`, `Navbar`, `Footer`

**Pass C — High-traffic pages**
`Index`, `Updates`, `UpdateDetail`, `Subscribe`, `Tools`, `About`, `FAQ`, `PrivacyPolicy`, `Terms`, `Contact`, `Dashboard`, `Account`, `JurisdictionsHub`, `GlobalAuthorities`, jurisdiction/topic/regulator pages, glossary, timeline pages.

**Pass D — Tool pages**
LIA, DPA, DPIA, CPPA suite, IR Playbook, Biometric, Governance, Registration, RoPA, EU/US Notice flows, Result pages.

**Pass E — Admin pages**
All `src/pages/admin/*` and admin-named pages (lower priority but still in scope).

**Pass F — Components**
All `src/components/**` not already covered (cards, panels, modals, feed widgets).

**Pass G — Verification**
- Re-run audit ripgrep queries; confirm zero violators (or document intentional exceptions).
- Build check (auto by harness).
- Spot-check 3–5 routes via preview.

### Edit guidelines

- Use targeted `code--line_replace` over rewrites.
- When a heading has only `text-xl font-semibold text-foreground` → strip size+weight, keep color. When wrapped in custom serif/utility classes I'll preserve color-only utilities.
- For eyebrow candidates: any `<p>`/`<div>` with `uppercase tracking-* text-xs/sm` immediately preceding a heading → swap to `<p className="text-eyebrow">…</p>`.
- For prose width: only wrap pure text blocks (intro paragraphs, policy/terms/about bodies). Skip cards, grids, dashboards.
- For `<br/>`-as-spacer: replace with `mt-4` on the following block.
- Lists: only retrofit standard prose lists, not menu/nav/checkbox lists with custom rendering.

### What I will NOT touch

- Copy text, links, route definitions, data fetching, business logic, pricing, auth, RLS.
- `src/components/ui/*` shadcn primitives (kept generic).
- Generated/auto files: `supabase/*`, `integrations/supabase/*`.
- Test files.

### Expected outcome

A site where every page has a proper h1, no skipped heading levels, no hand-sized headings, consistent eyebrows, consistent section rhythm, capped reading widths on prose, and uniform list styling — with zero functional change.

### Risk / caveats

- This is a large edit set. I'll proceed in passes and pause if I hit ambiguous cases (e.g. a heading whose custom size is intentional for a hero) and ask before stripping.
- I won't add `max-w-[72ch]` inside layouts that already constrain width via `PageContainer` width=`narrow`/`default` — that would double-constrain.
