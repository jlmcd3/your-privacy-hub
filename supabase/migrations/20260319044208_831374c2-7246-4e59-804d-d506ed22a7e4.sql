-- REC-20 Fix 3: Replace permissive RLS write policies with scoped ones

-- 3B — user_brief_preferences: replace ALL policy with specific per-operation policies
DROP POLICY IF EXISTS "Users manage own preferences" ON user_brief_preferences;
DROP POLICY IF EXISTS "brief_prefs_insert_permissive" ON user_brief_preferences;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_brief_preferences;
DROP POLICY IF EXISTS "brief_prefs_update_permissive" ON user_brief_preferences;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_brief_preferences;

CREATE POLICY "brief_prefs_select_own" ON user_brief_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "brief_prefs_insert_own" ON user_brief_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brief_prefs_update_own" ON user_brief_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "brief_prefs_delete_own" ON user_brief_preferences FOR DELETE USING (auth.uid() = user_id);

-- 3C — custom_briefs: ensure only SELECT own, no user INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Users read own custom briefs" ON custom_briefs;
DROP POLICY IF EXISTS "custom_briefs_insert_permissive" ON custom_briefs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON custom_briefs;

CREATE POLICY "custom_briefs_select_own" ON custom_briefs FOR SELECT USING (auth.uid() = user_id);

-- 3D — weekly_briefs: remove any permissive write policies
DROP POLICY IF EXISTS "weekly_briefs_insert_permissive" ON weekly_briefs;
DROP POLICY IF EXISTS "weekly_briefs_update_permissive" ON weekly_briefs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON weekly_briefs;

-- 3G — user_watchlist: replace ALL policy with specific policies
DROP POLICY IF EXISTS "Users manage own watchlist" ON user_watchlist;

CREATE POLICY "watchlist_select_own" ON user_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_insert_own" ON user_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_update_own" ON user_watchlist FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_delete_own" ON user_watchlist FOR DELETE USING (auth.uid() = user_id);