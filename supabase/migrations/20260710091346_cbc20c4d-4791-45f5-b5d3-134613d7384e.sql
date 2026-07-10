-- Drop redundant email column on regulator_follows and swap INSERT policy to user_id only.
DROP POLICY IF EXISTS "Authenticated users can follow with own email" ON public.regulator_follows;

ALTER TABLE public.regulator_follows DROP COLUMN IF EXISTS email;

CREATE POLICY "Users insert own follows"
  ON public.regulator_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());