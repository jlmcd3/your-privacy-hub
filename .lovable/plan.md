# Make sample reports look identical to real results

## Problem
Sample pages under `/samples/:tool` currently use a generic renderer (`SampleReportBody`) that walks `report_data` as a plain JSON tree. Real result pages (e.g. `GovernanceAssessmentResult`) use rich, tool-specific UI — executive summary card, domain grid, accordion of findings, DPIA scope callout, enforcement precedents, etc. The two look nothing alike.

## Fix

Extract the report body from each result page into a reusable, presentation-only component that takes `report_data` (and where relevant `intake_data` / `id`) as props. Both the real result page and the sample page render the same component, so they look identical.

### New components (one per tool, in `src/components/report-bodies/`)
- `GovernanceReportBody.tsx` — 10-domain grid, findings accordion, top risks, DPIA scope, enforcement precedents
- `LIAssessmentReportBody.tsx`
- `DPIAFrameworkReportBody.tsx`
- `DPAReportBody.tsx`
- `IRPlaybookReportBody.tsx`
- `BiometricReportBody.tsx`
- `CPPARiskReportBody.tsx`
- `CPPACyberReportBody.tsx`
- Notice/RoPA samples currently have no `report_data`; keep the existing prose fallback for those two slugs.

Each body component is pure: no data fetching, no `useRunMeter`, no PDF button, no translate menu. It receives `{ report, intake?, sampleMode?: boolean }`. In `sampleMode`, deep-link CTAs (like "Open Impact Assessment Builder") point at the marketing tool page instead of `?source=<id>`.

### Result-page refactor
Each existing result page keeps its shell (Navbar, ReportShell, meter, status banners, actions) and delegates the `status === "complete"` block to the new body component. No visual change to the real result experience.

### Sample page refactor
`src/pages/SampleReport.tsx` and `src/pages/SampleReportView.tsx`:
- Look up the correct body component by `tool_slug` via a small dispatcher map.
- Render it with `report={row.report_data}` and `sampleMode`.
- Fall back to the existing prose renderer for slugs without structured `report_data` (`eu_notice`, `us_notice`, `ropa` when applicable).
- Keep the sample header (SAMPLE badge, scenario summary, verification line, "Start your own …" CTA).

### Out of scope
- No changes to the sample_reports schema or admin generator.
- No PDF download (still removed, per prior instruction).
- No changes to actual assessment result behavior — just moving JSX into a component.

## Technical notes
- Body components are presentational; they must not import `useParams`, `supabase`, or any hook that touches network/session state.
- Preserve the existing helpers (`ratingColor`, `sevColor`, etc.) by moving them alongside each body component or into `src/lib/reportStyles.ts` if shared.
- Enforcement precedent annotations exist in `report_data.annotations` on real runs and in sample fixtures — render them the same way in both.
