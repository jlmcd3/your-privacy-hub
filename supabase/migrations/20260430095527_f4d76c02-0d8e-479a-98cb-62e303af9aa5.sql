ALTER TABLE public.li_assessments
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'preview',
  ADD COLUMN IF NOT EXISTS preview_signal jsonb,
  ADD COLUMN IF NOT EXISTS purpose_details jsonb,
  ADD COLUMN IF NOT EXISTS necessity_details jsonb,
  ADD COLUMN IF NOT EXISTS balancing_details jsonb;

-- Allow anonymous users to create a preview-stage assessment (no user_id yet)
-- so Stage A works pre-auth. Stage B will require auth + payment.
DROP POLICY IF EXISTS "Anyone can create preview li assessment" ON public.li_assessments;
CREATE POLICY "Anyone can create preview li assessment"
ON public.li_assessments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  stage = 'preview'
  AND (user_id IS NULL OR user_id = auth.uid())
  AND status = 'pending'
);

-- Allow reading own preview assessment by id (anonymous needs this to see preview result)
DROP POLICY IF EXISTS "Anyone can read preview li assessment by id" ON public.li_assessments;
CREATE POLICY "Anyone can read preview li assessment by id"
ON public.li_assessments
FOR SELECT
TO anon, authenticated
USING (
  stage = 'preview' AND user_id IS NULL
);