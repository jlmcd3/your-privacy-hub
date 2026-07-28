# SECURITY-PANEL-APPENDIX-2026-07-28

Turn: **T-S1** (CEO-approved 2026-07-28 — first turn of the Item-218 rebuild chain, engineering-side, no content/grader changes). Discharges the deferred Stage-B step 11 (security appendix).

Scope discipline: touched only the four findings on the security panel via one Postgres migration. No product code, no edge-function code, no batch inserts, no grader edits. Existing `lock_paywall_columns`, `lock_purchase_columns_*`, `lock_registration_order_billing`, `protect_registration_order_payment_fields` triggers left in place as defence-in-depth.

Approach: **column-level ACL revokes** to `anon` and `authenticated`, per SEC-2 memory (Supabase's `public` default ACL grants `arwdDxtm` to those roles on every new relation, so the fix is a targeted `REVOKE (col_list)` — static, RLS-independent, service-role unaffected because `service_role` inherits from a different grant path). This is the "column-locking with CHECK equivalent" that satisfies the scanner's static analysis without introducing WITH CHECK expressions that cannot reference OLD.

---

## Finding 1 — Sessions Payment Bypass

- **Title (scanner):** eu_us_ropa_sessions_payment_bypass
- **Severity:** ERROR
- **Description (scanner verbatim, summarised):** Users can self-approve payment on `eu_notice_sessions`, `us_notice_sessions`, and `ropa_sessions` by writing `payment_confirmed = true` / `paid_at = now()` under the owner-scoped RLS `FOR ALL` policy. No BEFORE trigger existed on these tables to block the column write; RLS alone permits it.
- **Fix applied:** `REVOKE UPDATE (payment_confirmed, paid_at)` and `REVOKE INSERT (payment_confirmed, paid_at)` from `anon, authenticated` on all three tables. Edge functions and the Stripe webhook use `service_role` and are unaffected.

## Finding 2 — Registration Orders Self-Update

- **Title (scanner):** registration_orders_self_update
- **Severity:** ERROR
- **Description (scanner verbatim, summarised):** Customers can mark their own `registration_orders` rows as paid/fulfilled by updating `payment_status`, `fulfillment_status`, `amount_cents`, or `stripe_payment_intent_id`. The existing `protect_registration_order_payment_fields` and `lock_registration_order_billing` triggers already block this in code, but the scanner reports the finding because RLS alone (without column-level ACL) allows the write path to enter the trigger.
- **Fix applied:** `REVOKE UPDATE` on `payment_status, fulfillment_status, amount_cents, currency, stripe_payment_intent_id, stripe_session_id, tier, jurisdictions, user_id, documents_generated_at, filed_at, next_renewal_at, delivery_email, delivery_sent_at, assessment_id, organization_snapshot`, plus `REVOKE INSERT` on the billing/fulfillment subset, from `anon, authenticated`. Trigger-based defence retained.

## Finding 3 — Tool Assessment Tables Payment Bypass

- **Title (scanner):** tool_assessment_tables_payment_bypass
- **Severity:** ERROR
- **Description (scanner verbatim, summarised):** End users can grant themselves paid entitlements on `li_assessments`, `biometric_assessments`, `dpa_documents`, `dpia_frameworks`, `governance_assessments`, `ir_playbooks`, and `cppa_assessments` by writing `is_subscriber_credit`, `purchased_as_standalone`, `purchase_price_cents`, `stripe_payment_intent_id`, or `status` under the owner-scoped RLS. `lock_paywall_columns` and `lock_purchase_columns_*` triggers already block this in code; scanner reports because RLS alone permits the write.
- **Fix applied:** `REVOKE UPDATE (is_subscriber_credit, purchased_as_standalone, purchase_price_cents, stripe_payment_intent_id, status, user_id)` and `REVOKE INSERT (is_subscriber_credit, purchased_as_standalone, purchase_price_cents, stripe_payment_intent_id)` from `anon, authenticated` on all six subscriber-eligible tables. `li_assessments` also revokes `UPDATE (stage)`. `cppa_assessments` lacks `is_subscriber_credit`/`purchased_as_standalone` columns so those tokens were skipped for that table only. Trigger-based defence retained.

## Finding 4 — Sample-Reports Bucket All Objects Readable

- **Title (scanner):** sample_reports_bucket_all_objects_readable
- **Severity:** WARN
- **Description (scanner verbatim, summarised):** Storage policy `public read sample-reports objects` allowed anonymous SELECT on any object in the `sample-reports` bucket whose name matched `bucket_id = 'sample-reports'` — including draft/unpublished PDFs whose paths might leak.
- **Fix applied:** Dropped that policy, replaced with `public read sample-reports published only`. New policy joins `storage.objects` to `public.sample_reports` on `sr.pdf_path = storage.objects.name` and requires `sr.status = 'published'`. Draft PDFs are no longer readable via storage even if the path is known.

---

## Migration details

Single migration (T-S1) applied and confirmed complete via linter response. The 62 remaining linter warnings are the pre-existing `SECURITY DEFINER` view/function and `Extension in Public` findings which are on the 30-item ignored list; per dispatch, they were not modified this turn.

- Regression: `bunx vitest run src/test/entitlements.test.ts` — **9/9 passed** (entitlement code path uses `service_role`, unaffected by column revokes).
- Scanner rerun: `security--run_security_scan` returns the same 62 pre-existing linter findings. All four T-S1 findings absent from the persisted-findings surface (marked as fixed via `security--manage_security_finding`).

## Findings management

`security--manage_security_finding` batch call marked all four findings `mark_as_fixed` with the fix summaries above. Response: "No security findings remain active" for the T-S1 set.

## Discharges

Deferred Stage-B step 11 (security appendix) is discharged by this courier.

**Disposition: HARD STOP.** Next turn is T-M1 (authoritative Pass-1 wire) per Item 218 plan.
