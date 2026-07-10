## Courier C — execution shape

Courier C spec covers 8 pages (~5,300 LOC across intake, Tools, Homepage, Subscribe, Samples, Get Intelligence, Auth). Applying it as one atomic edit risks silently regressing intake surfaces that Couriers A/B just verified green. I want to split into three verify-in-between turns, all within this Courier C build cycle.

### Approach — shared components first, then per-page injects

Build two small shared components once, then inject them across pages:

- `<ToolAboveFoldHero />` — renders the intake formula (obligation sentence, sample preview thumb, registry price + est. time, "View sample" secondary, "Start" primary, disclaimer line, "Also available" row).
- `<HomeGeographyPaths />` — two equal cards (California CPPA / EU GDPR) + trust line.

All prices from `PRICING` registry. All CTAs already-wired analytics wrappers from `analyticsEvents.ts`. No new copy uses the banned word "gap". Brand tokens only.

### Turn split

**Turn 1 (this turn) — Pages 1, 2, 3, 4** (intake + Tools + Homepage)
- Build `<ToolAboveFoldHero />` + `<HomeGeographyPaths />`.
- Inject hero on: `GovernanceAssessment`, `DPIAFramework`, `DPAGenerator`, `LIAssessment`, `IRPlaybook`.
- `Tools.tsx`: add `?region=us|eu` toggle above card grid, normalize card price badge + sample link + Start.
- `Index.tsx`: inject `<HomeGeographyPaths />` between hero and CPPA deadline strip.
- Typecheck, report per-page diff.

**Turn 2 — Pages 5, 6, 7, 8**
- `Subscribe.tsx`: sticky monthly/annual toggle, ROI block (registry-computed), 4-item FAQ, one sample link per tier, `checkout_started` on plan click.
- `SamplesHub.tsx` + `SampleReportView.tsx`: "Generate your own report" above-fold CTA, metadata sidebar (tool/juris/length + citation count when present), sticky Start CTA on long bodies.
- `GetIntelligence.tsx`: instant on-page truncated preview after selection; email required for full delivery; fires `email_captured` source=`get_intelligence`.
- `Login.tsx` + `Signup.tsx`: one value line.
- Typecheck.

**Turn 3 — Publish + live spot-checks**
- Security scan check → `preview_ui--publish`.
- Playwright against live: homepage geography paths (both CTAs route correctly, `View sample` links land), `/tools?region=eu` filters, `/tools?region=us` filters, default shows all. Screenshots.

### Guardrails
- No changes to intake question logic, submission flow, or pricing values — only presentation adds above the existing fold.
- Additive components; existing sections stay unless the spec explicitly replaces them.
- If any target page's structure diverges from the formula in a way that would require restructuring the intake itself, I stop and report rather than force-fit.

Confirm and I start Turn 1 immediately.