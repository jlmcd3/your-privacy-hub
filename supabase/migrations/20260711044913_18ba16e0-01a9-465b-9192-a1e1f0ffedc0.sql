CREATE OR REPLACE FUNCTION public.lock_paywall_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  locked_cols text[] := ARRAY[
    'status','purchase_price_cents','purchased_as_standalone','is_subscriber_credit',
    'stripe_payment_intent_id','stage','payment_status','fulfillment_status','amount_cents'
  ];
  col text;
  o jsonb;
  n jsonb;
  has_col boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='stripe_payment_intent_id') INTO has_col;
    IF has_col THEN NEW.stripe_payment_intent_id := NULL; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='purchased_as_standalone') INTO has_col;
    IF has_col THEN NEW.purchased_as_standalone := false; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='purchase_price_cents') INTO has_col;
    IF has_col THEN NEW.purchase_price_cents := NULL; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='amount_cents') INTO has_col;
    IF has_col THEN NEW.amount_cents := 0; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='payment_status') INTO has_col;
    IF has_col THEN NEW.payment_status := 'pending'; END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=TG_TABLE_SCHEMA AND table_name=TG_TABLE_NAME AND column_name='fulfillment_status') INTO has_col;
    IF has_col THEN NEW.fulfillment_status := 'pending'; END IF;

    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.lock_purchase_columns_full()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.status                   := OLD.status;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.purchase_price_cents     := OLD.purchase_price_cents;
  NEW.is_subscriber_credit     := OLD.is_subscriber_credit;
  NEW.purchased_as_standalone  := OLD.purchased_as_standalone;
  NEW.report_data              := OLD.report_data;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_purchase_columns_cppa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.status                   := OLD.status;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.purchase_price_cents     := OLD.purchase_price_cents;
  NEW.report_data              := OLD.report_data;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_registration_order_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  NEW.user_id                  := OLD.user_id;
  NEW.payment_status           := OLD.payment_status;
  NEW.fulfillment_status       := OLD.fulfillment_status;
  NEW.amount_cents             := OLD.amount_cents;
  NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
  NEW.stripe_session_id        := OLD.stripe_session_id;
  RETURN NEW;
END;
$$;

UPDATE public.cppa_assessments
SET status = 'error',
    report_data = jsonb_build_object(
      'error', 'stranded_by_trigger_bug',
      'message', 'Generation was blocked by the paywall column-lock trigger (SECURITY DEFINER current_user bug, fixed 2026-07-11). Safe to re-run.'
    )
WHERE id IN (
  'e8479732-0250-4bc6-86ab-4d8106312e02',
  '4d4bcc75-021c-464c-9b51-d68554d353ed'
)
AND status = 'pending';