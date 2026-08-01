-- Item 332 FIX 1: remove client-side UPDATE on paid assessment tables.
-- Verified: no frontend code issues UPDATE against these tables; all writes
-- happen in edge functions using service_role, which bypasses RLS.

-- li_assessments
DROP POLICY IF EXISTS "Users can manage own li assessments" ON public.li_assessments;
CREATE POLICY "li_owner_select" ON public.li_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "li_owner_insert" ON public.li_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "li_owner_delete" ON public.li_assessments FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.li_assessments FROM anon, authenticated;

-- governance_assessments
DROP POLICY IF EXISTS "Users can manage own governance assessments" ON public.governance_assessments;
CREATE POLICY "gov_owner_select" ON public.governance_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gov_owner_insert" ON public.governance_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gov_owner_delete" ON public.governance_assessments FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.governance_assessments FROM anon, authenticated;

-- dpia_frameworks
DROP POLICY IF EXISTS "Users can manage own dpia frameworks" ON public.dpia_frameworks;
CREATE POLICY "dpia_owner_select" ON public.dpia_frameworks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dpia_owner_insert" ON public.dpia_frameworks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dpia_owner_delete" ON public.dpia_frameworks FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.dpia_frameworks FROM anon, authenticated;

-- dpa_documents
DROP POLICY IF EXISTS "Users can manage own dpa documents" ON public.dpa_documents;
CREATE POLICY "dpa_owner_select" ON public.dpa_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dpa_owner_insert" ON public.dpa_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dpa_owner_delete" ON public.dpa_documents FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.dpa_documents FROM anon, authenticated;

-- ir_playbooks
DROP POLICY IF EXISTS "Users can manage own ir playbooks" ON public.ir_playbooks;
CREATE POLICY "ir_owner_select" ON public.ir_playbooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ir_owner_insert" ON public.ir_playbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ir_owner_delete" ON public.ir_playbooks FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.ir_playbooks FROM anon, authenticated;

-- biometric_assessments
DROP POLICY IF EXISTS "Users can manage own biometric assessments" ON public.biometric_assessments;
CREATE POLICY "bio_owner_select" ON public.biometric_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bio_owner_insert" ON public.biometric_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bio_owner_delete" ON public.biometric_assessments FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.biometric_assessments FROM anon, authenticated;

-- cppa_assessments
DROP POLICY IF EXISTS "cppa_assessments_owner" ON public.cppa_assessments;
CREATE POLICY "cppa_owner_select" ON public.cppa_assessments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cppa_owner_insert" ON public.cppa_assessments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cppa_owner_delete" ON public.cppa_assessments FOR DELETE USING (user_id = auth.uid());
REVOKE UPDATE ON public.cppa_assessments FROM anon, authenticated;

-- registration_orders: only the renewal-reminder preference may be changed
-- client-side (src/pages/RegistrationMyFilings.tsx). Everything else is
-- service_role-only.
DROP POLICY IF EXISTS "Users update own orders limited" ON public.registration_orders;
CREATE POLICY "registration_orders_owner_update_pref"
  ON public.registration_orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
REVOKE UPDATE ON public.registration_orders FROM anon, authenticated;
GRANT UPDATE (renewal_reminders_enabled, updated_at) ON public.registration_orders TO authenticated;