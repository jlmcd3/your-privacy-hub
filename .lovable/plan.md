# Remaining CPPA Build Plan

Three CPPA intake flows (Scope, Risk, Cyber), the Suite Result, Cyber Drift, and Breach Precedent Map are already shipped, plus the audit-adjacent helpers (Audit Scope Memo, Auditor Handoff Package, Auditor Independence Advisor) and the cross-link footer.

## Sprint 6 — Subscriber utility + delivery polish — ✅ DONE

1. ✅ CPPA Suite PDF export via `generate-cppa-suite-pdf` + `CPPASuitePDFButton`.
2. ✅ CPPA runs history at `/account/cppa-runs` (pairs Risk + Cyber into Suite cards).
3. ✅ Drift watch automation — `send-cppa-drift-reminders-daily` scheduled in pg_cron.
4. ✅ Auditor Handoff bundle — `AuditorHandoffPackage` `window.print()` aggregates Suite + Scope Memo + Independence Advisor output + checklist into one printable/PDF.

## Sprint 7 — Trust, SEO & closing gaps — ✅ DONE (with caveats — see below)

5. ✅ Verification badge for CPPA citations via `useCitationVerification` + `CitationVerificationBadge`. **Caveat:** failures are NOT yet routed to an admin review queue (open item, see below).
6. ✅ Canonical `/cppa` hub with `ItemList` + `FAQ` JSON-LD; linked from `Navbar`.
7. ✅ Static pricing QA via `scripts/qa/cppa-pricing-qa.mjs` (15/15 assertions). **Caveat:** end-to-end Stripe checkout invocation was NOT performed (open item, see below).
8. ✅ Admin dashboard at `/admin/cppa-runs` (counts by module + tier, recent runs). Admin-read RLS policy added so admins see all users' runs.

## Audit fixes applied (post-Sprint 7)

- Added `cppa_assessments_admin_read` RLS policy so `/admin/cppa-runs` sees all users.
- `tierOf` now reads `risk_level` (correct field name) for risk_assessment rows.
- `useCitationVerification` fetches all current corpus citations and matches case-insensitively in JS (PostgREST `.in()` is case-sensitive; corpus is ~113 rows).
- `/cppa` hub: removed duplicate Drift Watch + Breach Map cards (both pointed at `/cppa-cybersecurity` and aren't standalone destinations); merged into the Cyber card description.
- Hub pricing now sourced from `pricing.ts` (no hard-coded `$89` / `$99`).
- Removed redundant `<link rel="canonical">` from `CPPAHub` (handled globally by `CanonicalTag`).

## Open items (deferred — need user direction)

- **Citation verification → admin review queue.** Spec called for failures to route to a State-Law-Review-style queue. Today failures only render a "Unverified" chip in-page.
- **End-to-end pricing/access QA through Stripe checkout.** Static config QA passes; live checkout flow walk-through (subscriber discount on Risk, Cyber, and Suite bundle) has not been executed.
- **Server-side normalization of citation casing.** JS match works, but storing both citations and lookups via a canonical normalizer would harden long-term.

## Out of scope (explicitly excluded)
- Colorado CPA, Texas TDPSA, Quebec Law 25 — separate future modules.
- Proposed-bill tracking (already at `/legislation-tracker`).
- Any new CPPA intake questions beyond what the three flows already collect.

## Status
**Sprints 6 + 7 complete.** Three audit caveats remain open above; resolve those before declaring the CPPA cluster fully closed.
