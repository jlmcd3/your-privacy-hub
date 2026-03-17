DROP POLICY IF EXISTS "Users manage own watchlist" ON public.user_watchlist;
CREATE POLICY "Users manage own watchlist"
  ON public.user_watchlist FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);