# E2E — CPPA Risk Assessment revision contract (RC-C1)

**Purpose:** manual browser walkthrough John runs once `REVISIONS_ENABLED = true`.
**Scope:** cppa-risk only (RC-C1 flagship). Confirms the input-spec fidelity fix,
§ 7157 record-register phrasing, and end-to-end payment/revision flow.

**Do not execute automatically.** Every step is a browser action + a visual
assertion. Prereqs: test-mode Stripe key active, sandboxed webhook secret,
`REVISIONS_ENABLED = true` in `_shared/revision-gate.ts`.

## Setup

1. Sign in as a customer test account (not the harness admin).
2. Open **/cppa-risk-assessment**.
3. Fill intake using the `FIXTURE_YIELD_K3` shape from
   `supabase/functions/_shared/cppa-risk-contract-fixtures.ts` (Meridian
   Health, $100M–$500M revenue, sensitive PI = Yes, SPI volume blank,
   ADMT = "In evaluation", `triggers: {}`, `impact` half-filled).
4. Submit intake; wait for report to reach `status = complete`. Note the
   `assessment_id`.

## First-pass verification (input-spec fidelity)

5. On the report page, open the **"Answer open items"** panel.
6. Confirm ≥3 open items are listed with the following spec rendering:
   - `q15c_spi_volume` → **re-select** widget showing the exact
     `SPI_VOLUME_OPTS` values (`Fewer than 50,000`, `50,000 or more`, `Unsure`).
   - `q18_admt_use` → **re-select** with `["Yes","No","In evaluation"]`.
   - `impact.severity_of_harm` (if surfaced) → **re-select** with the
     `IMPACT_SEVERITY_OPTS` values.
   - N-class items (e.g. `activity_details`, `org_context`) → bounded-narrative
     textarea, 1200-char counter visible.
7. Confirm **no** open item targets `entity_name`, `subject_anchor`,
   `q1_revenue`, `q2_consumers`, or `q3_sector` (identity/locked guard).

## Revision + payment flow

8. Answer **one T-class re-select item** (`q15c_spi_volume` → `50,000 or more`)
   and **one narrative item** (`activity_details` with a specific description).
   Leave the remaining items untouched.
9. Click **"Run revision"**. Stripe checkout opens.
10. Pay with the sandbox card `4242 4242 4242 4242`, any future expiry, any CVC.
11. After redirect, wait until `status = complete` (typically 30–90s).

## Post-revision assertions

12. On the report page:
    - Open-items count is **unchanged** (still ≥3 — monotonicity).
    - The two answered items show `status = resolved` (or `not_resolved`
      with a certifiable reason).
    - Each **resolution note** reads as a § 7157 record entry, e.g.
      `"Established the § 7152(a)(5) SPI-volume dimension at 50,000+ under
      § 7120(b)(2)(A)."` — factual, past-tense, provision-cited. **Not**
      `"You should…"` / `"We recommend…"`.
    - Report body text at `q15c_spi_volume` shows the new banded value.
    - Advisory panel: at most 5 notes, each a single suggestive sentence
      ending `"…based on your counsel's advice."`. No `gap`/`gaps` word.
13. In the meter surface, `runs_used` is incremented by 1.
14. On the versions dropdown, a new `version_n` row exists dated after the
    revision.

## Negative-path spot-checks (optional)

15. Attempt to edit `entity_name` in the refine drawer — the field must be
    locked (grey / non-editable, tooltip "identity — frozen after run 1").
16. Attempt to submit a revision with zero answered items — the "Run
    revision" button remains disabled.

## Rollback

17. If any assertion fails: flip `REVISIONS_ENABLED = false`, redeploy
    `_shared/revision-gate.ts`, and file the divergence with the row id +
    screenshot before further customer traffic hits the flow.
