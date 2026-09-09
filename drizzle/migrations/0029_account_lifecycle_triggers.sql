CREATE OR REPLACE FUNCTION public.log_account_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pp UUID;
  v_pn UUID;
  v_tos UUID;
BEGIN
  SELECT id INTO v_pp FROM public.policy_documents WHERE kind = 'privacy_policy' AND published_at <= now() ORDER BY published_at DESC LIMIT 1;
  SELECT id INTO v_pn FROM public.policy_documents WHERE kind = 'privacy_notice' AND published_at <= now() ORDER BY published_at DESC LIMIT 1;
  SELECT id INTO v_tos FROM public.policy_documents WHERE kind = 'terms_of_service' AND published_at <= now() ORDER BY published_at DESC LIMIT 1;

  NEW.registered_at := COALESCE(NEW.registered_at, NEW.created_at, now());
  NEW.accepted_privacy_policy_id := COALESCE(NEW.accepted_privacy_policy_id, v_pp);
  NEW.accepted_privacy_notice_id := COALESCE(NEW.accepted_privacy_notice_id, v_pn);
  NEW.accepted_terms_id := COALESCE(NEW.accepted_terms_id, v_tos);
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_stamp_registration
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_account_registration();

CREATE OR REPLACE FUNCTION public.record_registration_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source)
  VALUES (NEW.id, 'registered', COALESCE(NEW.registered_at, now()), 'trigger')
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$$;

CREATE TRIGGER profiles_registration_event
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.record_registration_event();

CREATE OR REPLACE FUNCTION public.record_subscription_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_paid BOOLEAN := COALESCE(OLD.is_premium, false) OR COALESCE(OLD.is_pro, false);
  is_paid  BOOLEAN := COALESCE(NEW.is_premium, false) OR COALESCE(NEW.is_pro, false);
BEGIN
  IF NEW.stripe_trial_end IS DISTINCT FROM OLD.stripe_trial_end AND NEW.stripe_trial_end IS NOT NULL THEN
    INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source, metadata)
    VALUES (NEW.id, 'trial_started', now(), 'trigger', jsonb_build_object('trial_end', NEW.stripe_trial_end))
    ON CONFLICT DO NOTHING;
  END IF;

  IF is_paid AND NOT was_paid THEN
    IF NEW.first_subscribed_at IS NULL THEN
      NEW.first_subscribed_at := now();
    END IF;
    NEW.cancelled_at := NULL;
    INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source, metadata)
    VALUES (NEW.id,
            CASE WHEN OLD.first_subscribed_at IS NULL THEN 'subscribed' ELSE 'reactivated' END,
            now(), 'trigger',
            jsonb_build_object('subscription_type', NEW.subscription_type))
    ON CONFLICT DO NOTHING;
  END IF;

  IF was_paid AND NOT is_paid THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
    INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source)
    VALUES (NEW.id, 'cancelled', now(), 'trigger')
    ON CONFLICT DO NOTHING;
  ELSIF COALESCE(NEW.cancel_at_period_end, false) AND NOT COALESCE(OLD.cancel_at_period_end, false) THEN
    INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source, metadata)
    VALUES (NEW.id, 'cancelled', now(), 'trigger', jsonb_build_object('scheduled', true, 'effective', NEW.subscription_end_date))
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.terminated_at IS NOT NULL AND OLD.terminated_at IS NULL THEN
    INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source, metadata)
    VALUES (NEW.id, 'terminated', NEW.terminated_at, 'trigger', jsonb_build_object('reason', NEW.termination_reason))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_subscription_lifecycle
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.record_subscription_lifecycle();