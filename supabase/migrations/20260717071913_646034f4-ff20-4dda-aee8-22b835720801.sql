CREATE TABLE public.qa_pdf_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  tool text NOT NULL,
  doc_number integer NOT NULL,
  file_name text NOT NULL,
  content_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.qa_pdf_exports TO service_role;

ALTER TABLE public.qa_pdf_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.qa_pdf_exports
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX qa_pdf_exports_batch_idx ON public.qa_pdf_exports (batch_id, tool, doc_number);
