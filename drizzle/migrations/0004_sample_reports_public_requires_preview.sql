-- Fail closed at the database: a published sample with no built preview is
-- not exposed publicly at all.
CREATE OR REPLACE VIEW public.sample_reports_public AS
SELECT id,
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
  WHERE status = 'published'
    AND preview_built_at IS NOT NULL
    AND (
      (preview_document_text IS NOT NULL AND btrim(preview_document_text) <> '')
      OR preview_report_data IS NOT NULL
      OR preview_pdf_path IS NOT NULL
    );