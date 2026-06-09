# Remaining CPPA Build Plan

Three CPPA intake flows (Scope, Risk, Cyber), the Suite Result, Cyber Drift, and Breach Precedent Map are already shipped, plus the audit-adjacent helpers (Audit Scope Memo, Auditor Handoff Package, Auditor Independence Advisor) and the cross-link footer. This plan covers what remains to call the CPPA cluster complete.

## Sprint 6 — Subscriber utility + delivery polish

1. **CPPA Suite PDF export (PDFshift)**
   - Add "Download PDF" action on `CPPASuiteResult`, `CPPARiskAssessmentResult`, `CPPACybersecurityResult`.
   - Reuse existing PDFshift edge function pattern (same as other report PDFs). Pull rendered HTML from a print-styled route (`/cppa/suite/print/:id`) so PDFshift renders an authenticated snapshot.
   - Subscriber-only; standalone purchasers get a one-time signed URL after checkout success.

2. **CPPA Suite history & re-open**
   - New `cppa_suite_runs` table (run_id, user_id, inputs JSONB, results JSONB, scope_in_scope bool, risk_tier, cyber_tier, created_at).
   - List view at `/account/cppa-runs` with re-open + download PDF.
   - Save on completion of the Suite (gated by subscriber OR paid standalone unlock).

3. **Drift watch automation**
   - Cron (weekly) on `cppa-drift-scan` edge function: re-runs Cyber Drift against latest CCPA/CPPA regs source and flags changed citations.
   - Email subscribers whose last Cyber run pre-dates a detected change; surface `DriftReminderBanner` on their dashboard.

4. **Auditor Handoff bundle ZIP**
   - Combine Suite PDF + Scope Memo + Independence Advisor output + Handoff Package checklist into a single ZIP via the existing PDF function path (generate parts, zip in edge function, return signed URL).

## Sprint 7 — Trust, SEO & closing gaps

5. **Verification badge for CPPA citations**
   - Apply the existing 40-char verbatim verification (used for enforcement) to every CCPA/CPPA citation rendered in Suite/Cyber/Risk results.
   - Show pass/fail chip; failures route to admin review queue (reuse pattern from State Law Review page).

6. **CPPA landing hub `/cppa`**
   - Single canonical hub page linking Scope → Risk → Cyber → Drift → Breach Map, with JSON-LD `ItemList` + FAQ schema.
   - Replaces ad-hoc cross-links as the primary nav entry. Add to top nav under Tools.

7. **CPPA Pricing & access QA pass**
   - Verify trial users see standalone CPPA prices (already shipped) end-to-end through checkout.
   - Verify subscriber discount applies on Scope, Risk, Cyber individually and as a bundled Suite price.
   - Add a single "CPPA Suite" bundle SKU in `src/config/pricing.ts` + `sync-pricing` so standalone buyers can get all three at a discount.

8. **Admin: CPPA runs dashboard**
   - `/admin/cppa-runs` — counts by tier, drift-affected users, verification failures. Mirrors `/admin/trial-users` styling.

## Out of scope (explicitly excluded)
- Colorado CPA, Texas TDPSA, Quebec Law 25 — separate future modules.
- Proposed-bill tracking (already at `/legislation-tracker`).
- Any new CPPA intake questions beyond what the three flows already collect.

## Technical notes
- All new tables follow the project's GRANT + RLS pattern; `cppa_suite_runs` policies scoped to `auth.uid()`, plus admin read via `has_role`.
- All PDFs go through PDFshift edge function — no client-side PDF libs.
- Cron uses `pg_net` + `pg_cron` like `state-law-review-nudge-monthly`.
- New routes registered in `src/App.tsx`; admin routes wrapped in `AdminOnly`.

## Estimate
**2 sprints** to fully close out CPPA. After Sprint 7 the cluster is feature-complete and you can either declare done or move to the next state module.
