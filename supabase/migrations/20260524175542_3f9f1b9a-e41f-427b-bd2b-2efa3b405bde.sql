
-- 1) Enable RLS on eup_user_roles (lookup/label table — public read, admin write)
ALTER TABLE public.eup_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eup_user_roles_public_read" ON public.eup_user_roles;
CREATE POLICY "eup_user_roles_public_read"
  ON public.eup_user_roles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "eup_user_roles_admin_write" ON public.eup_user_roles;
CREATE POLICY "eup_user_roles_admin_write"
  ON public.eup_user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Tighten regulator_follows — keep anonymous follow allowed but enforce
--    basic shape constraints and prevent third-party abuse via length cap.
ALTER TABLE public.regulator_follows
  DROP CONSTRAINT IF EXISTS regulator_follows_email_len_chk,
  ADD CONSTRAINT regulator_follows_email_len_chk
    CHECK (char_length(email) BETWEEN 3 AND 255 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE public.regulator_follows
  DROP CONSTRAINT IF EXISTS regulator_follows_follow_key_len_chk,
  ADD CONSTRAINT regulator_follows_follow_key_len_chk
    CHECK (char_length(follow_key) BETWEEN 1 AND 128);

-- 3) Tighten report_configs similarly.
ALTER TABLE public.report_configs
  DROP CONSTRAINT IF EXISTS report_configs_email_len_chk,
  ADD CONSTRAINT report_configs_email_len_chk
    CHECK (
      email IS NULL
      OR (char_length(email) BETWEEN 3 AND 255 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    );

ALTER TABLE public.report_configs
  DROP CONSTRAINT IF EXISTS report_configs_jurisdiction_len_chk,
  ADD CONSTRAINT report_configs_jurisdiction_len_chk
    CHECK (char_length(jurisdiction) BETWEEN 1 AND 64);

-- Ensure authenticated rows are bound to the caller's user_id when present.
DROP POLICY IF EXISTS "anon_insert" ON public.report_configs;
CREATE POLICY "report_configs_insert"
  ON public.report_configs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- anon inserts: must not claim a user_id
    (auth.uid() IS NULL AND user_id IS NULL)
    -- authenticated inserts: user_id must match the caller (or be null)
    OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  );

-- Allow authenticated owners to read their own rows back.
DROP POLICY IF EXISTS "report_configs_select_owner" ON public.report_configs;
CREATE POLICY "report_configs_select_owner"
  ON public.report_configs FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 4) cppa_scope_checks — let anon retrieve their own row by the session_id
--    they supplied at insert time (no broader exposure).
DROP POLICY IF EXISTS "cppa_scope_checks_select_anon_session" ON public.cppa_scope_checks;
CREATE POLICY "cppa_scope_checks_select_anon_session"
  ON public.cppa_scope_checks FOR SELECT
  TO anon, authenticated
  USING (
    user_id IS NULL
    AND session_id IS NOT NULL
    AND session_id = current_setting('request.headers', true)::json->>'x-cppa-session'
  );

-- 5) Fix mutable search_path on the only remaining function.
ALTER FUNCTION public.prevent_personal_client_delete() SET search_path = public;
