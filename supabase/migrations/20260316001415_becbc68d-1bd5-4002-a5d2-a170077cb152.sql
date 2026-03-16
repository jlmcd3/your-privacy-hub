CREATE POLICY "Public can read briefs"
  ON public.weekly_briefs FOR SELECT
  TO anon
  USING (true);