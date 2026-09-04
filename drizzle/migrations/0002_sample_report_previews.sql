-- Truncated public sample documents: preview columns + anon-safe view.
ALTER TABLE public.sample_reports
  ADD COLUMN IF NOT EXISTS preview_document_text text,
  ADD COLUMN IF NOT EXISTS preview_report_data jsonb,
  ADD COLUMN IF NOT EXISTS preview_toc jsonb,
  ADD COLUMN IF NOT EXISTS preview_pdf_path text,
  ADD COLUMN IF NOT EXISTS withheld_section_count integer,
  ADD COLUMN IF NOT EXISTS preview_built_at timestamptz;

-- Anon-facing projection. SECURITY DEFINER (default) so the base table can
-- stay closed to anon; the published filter is enforced here.
DROP VIEW IF EXISTS public.sample_reports_public;
CREATE VIEW public.sample_reports_public AS
SELECT
  id,
  tool_slug,
  variant,
  title,
  scenario_summary,
  verification,
  published_at,
  preview_document_text,
  preview_report_data,
  preview_toc,
  preview_pdf_path,
  withheld_section_count
FROM public.sample_reports
WHERE status = 'published';

GRANT SELECT ON public.sample_reports_public TO anon, authenticated;

-- Close the base table to anon; admins keep their authenticated policy.
REVOKE SELECT ON public.sample_reports FROM anon;
DROP POLICY IF EXISTS "public read published samples" ON public.sample_reports;

-- Storage: anon may read only the truncated preview PDFs.
DROP POLICY IF EXISTS "public read sample-reports published only" ON storage.objects;

CREATE POLICY "public read sample-reports previews only"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'sample-reports'
    AND EXISTS (
      SELECT 1 FROM public.sample_reports sr
      WHERE sr.preview_pdf_path = storage.objects.name
        AND sr.status = 'published'
    )
  );

CREATE POLICY "admins read all sample-reports objects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sample-reports'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
