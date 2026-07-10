
-- 1A: RLS-enabled, policy-less backend log tables — document service_role intent
CREATE POLICY "service_role manages citation_lint_events"
  ON public.citation_lint_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role manages edge_rate_limits"
  ON public.edge_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1B: Pin search_path (both functions verified public-only)
ALTER FUNCTION public.normalize_provisions(text[]) SET search_path = public;
ALTER FUNCTION public.sync_provisions_normalized() SET search_path = public;

-- 1C: Tighten always-true anon INSERT policies with shape/length checks
ALTER POLICY "Anyone can sign up" ON public.email_signups
  WITH CHECK (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(email) <= 254
  );

ALTER POLICY "Anyone can submit enforcement" ON public.enforcement_submissions
  WITH CHECK (
    char_length(coalesce(subject,''))    BETWEEN 1 AND 4000
    AND char_length(coalesce(source_url,'')) <= 2000
  );

-- 2A: Drop anon SELECT (list) policy on article-images bucket.
-- Public object URLs continue to work via the /object/public/ path.
DROP POLICY IF EXISTS "Public read article-images" ON storage.objects;
