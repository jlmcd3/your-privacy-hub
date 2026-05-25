
CREATE POLICY "li_admin_delete" ON public.li_assessments FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "dpia_admin_delete" ON public.dpia_frameworks FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "gov_admin_delete" ON public.governance_assessments FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "dpa_admin_delete" ON public.dpa_documents FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ir_admin_delete" ON public.ir_playbooks FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "biometric_admin_delete" ON public.biometric_assessments FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "registration_orders_admin_delete" ON public.registration_orders FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ropa_sessions_admin_delete" ON public.ropa_sessions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "us_notice_sessions_admin_delete" ON public.us_notice_sessions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "eu_notice_sessions_admin_delete" ON public.eu_notice_sessions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));
