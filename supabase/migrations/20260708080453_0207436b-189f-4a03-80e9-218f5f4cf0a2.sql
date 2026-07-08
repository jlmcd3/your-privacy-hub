ALTER TABLE public.regulator_follows
  ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid()
  REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Users read own follows" ON public.regulator_follows;
DROP POLICY IF EXISTS "Users delete own follows" ON public.regulator_follows;
DROP POLICY IF EXISTS "Authenticated users can follow with own email" ON public.regulator_follows;

CREATE POLICY "Users read own follows"
  ON public.regulator_follows FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own follows"
  ON public.regulator_follows FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can follow with own email"
  ON public.regulator_follows FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND lower(email) = lower(auth.email()));