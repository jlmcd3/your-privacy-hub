-- v9 security hardening
-- 1) Lock down cppa_fsor_commentary: server-side corpus, edge-function-only.
DROP POLICY IF EXISTS "Authenticated can read FSOR commentary" ON public.cppa_fsor_commentary;
CREATE POLICY "Service role reads FSOR commentary"
  ON public.cppa_fsor_commentary
  FOR SELECT
  TO service_role
  USING (true);

-- 2) regulator_follows: require authenticated, bind email to identity.
--    Prevents anonymous users from subscribing arbitrary third-party emails.
DROP POLICY IF EXISTS "Anyone can follow" ON public.regulator_follows;
CREATE POLICY "Authenticated users can follow with own email"
  ON public.regulator_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (lower(email) = lower(auth.email()));

-- Let owners read back / unfollow their own follows.
DROP POLICY IF EXISTS "Users read own follows" ON public.regulator_follows;
CREATE POLICY "Users read own follows"
  ON public.regulator_follows
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.email()));

DROP POLICY IF EXISTS "Users delete own follows" ON public.regulator_follows;
CREATE POLICY "Users delete own follows"
  ON public.regulator_follows
  FOR DELETE
  TO authenticated
  USING (lower(email) = lower(auth.email()));