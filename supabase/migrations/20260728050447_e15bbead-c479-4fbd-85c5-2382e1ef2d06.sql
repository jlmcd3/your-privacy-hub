
-- =========================================================================
-- T-S1 SECURITY FIX MIGRATION (Item 218 chain)
-- Column-level UPDATE/INSERT revokes lock billing & payment columns to
-- service_role. Existing per-table BEFORE triggers (lock_paywall_columns,
-- lock_purchase_columns_*, protect_registration_order_payment_fields)
-- remain as defence in depth. Column-level ACLs give the security scanner
-- a static, policy-agnostic guarantee that anon/authenticated cannot
-- write these columns.
-- =========================================================================

-- ---- (1) Session tables: payment_confirmed, paid_at ---------------------
REVOKE UPDATE (payment_confirmed, paid_at) ON public.eu_notice_sessions FROM anon, authenticated;
REVOKE INSERT (payment_confirmed, paid_at) ON public.eu_notice_sessions FROM anon, authenticated;

REVOKE UPDATE (payment_confirmed, paid_at) ON public.us_notice_sessions FROM anon, authenticated;
REVOKE INSERT (payment_confirmed, paid_at) ON public.us_notice_sessions FROM anon, authenticated;

REVOKE UPDATE (payment_confirmed, paid_at) ON public.ropa_sessions FROM anon, authenticated;
REVOKE INSERT (payment_confirmed, paid_at) ON public.ropa_sessions FROM anon, authenticated;

-- ---- (2) registration_orders billing/fulfillment columns ----------------
REVOKE UPDATE (
  payment_status, fulfillment_status, amount_cents, currency,
  stripe_payment_intent_id, stripe_session_id, tier, jurisdictions,
  user_id, documents_generated_at, filed_at, next_renewal_at,
  delivery_email, delivery_sent_at, assessment_id, organization_snapshot
) ON public.registration_orders FROM anon, authenticated;
REVOKE INSERT (
  payment_status, fulfillment_status, amount_cents,
  stripe_payment_intent_id, stripe_session_id,
  documents_generated_at, filed_at, next_renewal_at, delivery_sent_at
) ON public.registration_orders FROM anon, authenticated;

-- ---- (3) Assessment tables ---------------------------------------------
-- Full-column set (all present)
REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.li_assessments FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.li_assessments FROM anon, authenticated;
-- li_assessments also has 'stage'
REVOKE UPDATE (stage) ON public.li_assessments FROM anon, authenticated;

REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.biometric_assessments FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.biometric_assessments FROM anon, authenticated;

REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.dpa_documents FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.dpa_documents FROM anon, authenticated;

REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.dpia_frameworks FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.dpia_frameworks FROM anon, authenticated;

REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.governance_assessments FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.governance_assessments FROM anon, authenticated;

REVOKE UPDATE (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id, status, user_id
) ON public.ir_playbooks FROM anon, authenticated;
REVOKE INSERT (
  is_subscriber_credit, purchased_as_standalone, purchase_price_cents,
  stripe_payment_intent_id
) ON public.ir_playbooks FROM anon, authenticated;

-- cppa_assessments: no is_subscriber_credit / purchased_as_standalone cols
REVOKE UPDATE (
  purchase_price_cents, stripe_payment_intent_id, status, user_id
) ON public.cppa_assessments FROM anon, authenticated;
REVOKE INSERT (
  purchase_price_cents, stripe_payment_intent_id
) ON public.cppa_assessments FROM anon, authenticated;

-- ---- (4) Storage: sample-reports must join to published rows ------------
DROP POLICY IF EXISTS "public read sample-reports objects" ON storage.objects;

CREATE POLICY "public read sample-reports published only"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'sample-reports'
    AND EXISTS (
      SELECT 1 FROM public.sample_reports sr
      WHERE sr.pdf_path = storage.objects.name
        AND sr.status = 'published'
    )
  );
