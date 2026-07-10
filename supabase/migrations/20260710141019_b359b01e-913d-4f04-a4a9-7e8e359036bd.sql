
-- 1) Rewrite lock_paywall_columns to handle INSERT as well as UPDATE.
CREATE OR REPLACE FUNCTION public.lock_paywall_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  locked_cols text[] := ARRAY[
    'status',
    'purchase_price_cents',
    'purchased_as_standalone',
    'is_subscriber_credit',
    'stripe_payment_intent_id',
    'stage',
    'payment_status',
    'fulfillment_status',
    'amount_cents'
  ];
  col text;
  o jsonb;
  n jsonb;
  has_col boolean;
BEGIN
  -- service_role bypass (Stripe webhooks + admin edge functions + cron)
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force-reset any proof-of-payment / paid-status columns the caller
    -- tried to smuggle in. Row is still allowed (subscriber "pending"
    -- bookkeeping remains legal — is_subscriber_credit stays whatever
    -- the caller sent for that specific column since it is not proof of
    -- payment and is safely ignored by entitlement checks).
    --
    -- registration_orders uses a slightly different column set; we
    -- interrogate the row via to_jsonb + column_name existence to stay
    -- portable across all 8 tables in a single function body.
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'stripe_payment_intent_id'
    ) INTO has_col;
    IF has_col THEN NEW.stripe_payment_intent_id := NULL; END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'purchased_as_standalone'
    ) INTO has_col;
    IF has_col THEN NEW.purchased_as_standalone := false; END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'purchase_price_cents'
    ) INTO has_col;
    IF has_col THEN NEW.purchase_price_cents := NULL; END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'amount_cents'
    ) INTO has_col;
    IF has_col THEN NEW.amount_cents := 0; END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'payment_status'
    ) INTO has_col;
    IF has_col THEN NEW.payment_status := 'pending'; END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME
        AND column_name = 'fulfillment_status'
    ) INTO has_col;
    IF has_col THEN NEW.fulfillment_status := 'pending'; END IF;

    RETURN NEW;
  END IF;

  -- UPDATE path (unchanged): block modifications to locked columns.
  o := to_jsonb(OLD);
  n := to_jsonb(NEW);
  FOREACH col IN ARRAY locked_cols LOOP
    IF (o ? col) AND (n ? col) AND (o -> col) IS DISTINCT FROM (n -> col) THEN
      RAISE EXCEPTION 'Column % on % is read-only for role %', col, TG_TABLE_NAME, current_user
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- 2) Attach BEFORE INSERT trigger on the same 8 tables.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'li_assessments','governance_assessments','dpia_frameworks',
    'dpa_documents','ir_playbooks','biometric_assessments',
    'registration_orders','cppa_assessments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_lock_paywall_columns_insert ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_lock_paywall_columns_insert
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.lock_paywall_columns()', t);
  END LOOP;
END $$;

-- 3) Tighten the LI anon preview policy (accepted-risk path: cap payload
--    size so anonymous callers cannot dump unbounded text through the
--    preview lead-gen surface). Rate limiting deferred; the size cap
--    materially lowers the abuse ceiling without breaking the preview.
DROP POLICY IF EXISTS "Anyone can create preview li assessment" ON public.li_assessments;
CREATE POLICY "Anyone can create preview li assessment"
  ON public.li_assessments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    stage = 'preview'
    AND status = 'pending'
    AND (user_id IS NULL OR user_id = auth.uid())
    AND coalesce(length(processing_description), 0) <= 4000
    AND coalesce(length(stated_purpose), 0)         <= 2000
    AND coalesce(length(alternatives_considered),0) <= 2000
    AND coalesce(array_length(data_categories, 1), 0) <= 40
    AND coalesce(array_length(jurisdictions,   1), 0) <= 20
  );
