-- TRUNCATED SAMPLES (2026-09-04): fail-closed staleness guard.
-- Any write that changes a sample's content clears the stored public preview,
-- so a published row can never serve an excerpt of an older document.

CREATE OR REPLACE FUNCTION public.sample_reports_invalidate_preview()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.document_text IS DISTINCT FROM OLD.document_text)
     OR (NEW.report_data IS DISTINCT FROM OLD.report_data)
     OR (NEW.pdf_path IS DISTINCT FROM OLD.pdf_path) THEN
    NEW.preview_document_text := NULL;
    NEW.preview_report_data := NULL;
    NEW.preview_toc := NULL;
    NEW.preview_pdf_path := NULL;
    NEW.withheld_section_count := NULL;
    NEW.preview_built_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sample_reports_invalidate_preview_tr ON public.sample_reports;
CREATE TRIGGER sample_reports_invalidate_preview_tr
BEFORE UPDATE ON public.sample_reports
FOR EACH ROW
EXECUTE FUNCTION public.sample_reports_invalidate_preview();