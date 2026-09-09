-- Account closure, banned users, and scheduled purge

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_type TEXT,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  former_user_id UUID,
  reason TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ban_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '365 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS banned_users_email_key ON public.banned_users (lower(email));

GRANT SELECT ON public.banned_users TO authenticated;
GRANT ALL ON public.banned_users TO service_role;

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read banned users" ON public.banned_users;
CREATE POLICY "Admins read banned users" ON public.banned_users
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Is an email currently banned?
CREATE OR REPLACE FUNCTION public.is_email_banned(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE lower(email) = lower(_email) AND ban_expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_banned(TEXT) TO anon, authenticated, service_role;

-- Close an account: admin-only. closure_type 'user_request' | 'tos_violation'
CREATE OR REPLACE FUNCTION public.close_account(_user_id UUID, _closure_type TEXT, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _closure_type NOT IN ('user_request', 'tos_violation') THEN
    RAISE EXCEPTION 'invalid closure_type';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;

  UPDATE public.profiles
     SET closed_at = COALESCE(closed_at, v_now),
         closure_type = _closure_type,
         termination_reason = COALESCE(_reason, termination_reason),
         closed_by = auth.uid(),
         purge_after = COALESCE(closed_at, v_now) + INTERVAL '30 days'
   WHERE id = _user_id;

  INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source, metadata)
  VALUES (_user_id, 'closed', v_now, 'admin',
          jsonb_build_object('closure_type', _closure_type, 'reason', _reason))
  ON CONFLICT DO NOTHING;

  IF _closure_type = 'tos_violation' AND v_email IS NOT NULL THEN
    INSERT INTO public.banned_users (email, former_user_id, reason, closed_at, ban_expires_at)
    VALUES (v_email, _user_id, COALESCE(_reason, 'Terms of Service violation'), v_now, v_now + INTERVAL '365 days')
    ON CONFLICT (lower(email)) DO UPDATE
      SET reason = EXCLUDED.reason,
          closed_at = EXCLUDED.closed_at,
          ban_expires_at = EXCLUDED.ban_expires_at,
          former_user_id = EXCLUDED.former_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', _user_id, 'closure_type', _closure_type, 'purge_after', v_now + INTERVAL '30 days');
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_account(UUID, TEXT, TEXT) TO authenticated, service_role;

-- Reopen an account before purge
CREATE OR REPLACE FUNCTION public.reopen_account(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  UPDATE public.profiles
     SET closed_at = NULL, closure_type = NULL, purge_after = NULL, closed_by = NULL
   WHERE id = _user_id AND terminated_at IS NULL;

  DELETE FROM public.banned_users WHERE former_user_id = _user_id;

  INSERT INTO public.account_lifecycle_events (user_id, event_type, occurred_at, source)
  VALUES (_user_id, 'reopened', now(), 'admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'user_id', _user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reopen_account(UUID) TO authenticated, service_role;

-- Purge accounts 30 days after closure: wipe all owned data, then delete the account.
CREATE OR REPLACE FUNCTION public.purge_closed_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_col RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN
    SELECT id FROM public.profiles
     WHERE closed_at IS NOT NULL
       AND terminated_at IS NULL
       AND COALESCE(purge_after, closed_at + INTERVAL '30 days') <= now()
  LOOP
    FOR v_col IN
      SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema = 'public'
         AND t.table_type = 'BASE TABLE'
         AND c.data_type = 'uuid'
         AND c.column_name IN ('user_id', 'owner_id', 'created_by')
         AND c.table_name NOT IN ('banned_users', 'profiles', 'account_lifecycle_events', 'user_roles', 'eup_user_roles')
    LOOP
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_col.table_name, v_col.column_name)
      USING v_user.id;
    END LOOP;

    DELETE FROM public.account_lifecycle_events WHERE user_id = v_user.id;
    DELETE FROM public.eup_user_roles WHERE user_id = v_user.id;
    DELETE FROM public.profiles WHERE id = v_user.id;
    DELETE FROM auth.users WHERE id = v_user.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Drop banned records once the 365-day retention has run out.
CREATE OR REPLACE FUNCTION public.purge_expired_bans()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH gone AS (
    DELETE FROM public.banned_users WHERE ban_expires_at <= now() RETURNING 1
  )
  SELECT count(*) INTO v_count FROM gone;
  RETURN v_count;
END;
$$;

-- Admin view of banned users
CREATE OR REPLACE FUNCTION public.admin_list_banned_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  reason TEXT,
  closed_at TIMESTAMPTZ,
  ban_expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.email, b.reason, b.closed_at, b.ban_expires_at
    FROM public.banned_users b
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY b.closed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_banned_users() TO authenticated, service_role;

-- Block re-registration of banned emails at sign-up
CREATE OR REPLACE FUNCTION public.block_banned_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND public.is_email_banned(NEW.email) THEN
    RAISE EXCEPTION 'This email address is not permitted to register.';
  END IF;
  RETURN NEW;
END;
$$;

-- Daily maintenance
SELECT cron.schedule(
  'account-purge-daily',
  '20 3 * * *',
  $$SELECT public.purge_closed_accounts(); SELECT public.purge_expired_bans();$$
);
