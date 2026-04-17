
ALTER TABLE li_assessments ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE governance_assessments ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE dpia_frameworks ADD COLUMN IF NOT EXISTS pdf_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-reports', 'assessment-reports', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can read assessment reports'
  ) THEN
    CREATE POLICY "Users can read assessment reports"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'assessment-reports');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Service role can upload assessment reports'
  ) THEN
    CREATE POLICY "Service role can upload assessment reports"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'assessment-reports');
  END IF;
END $$;
