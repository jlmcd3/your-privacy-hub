
CREATE TABLE public.quality_batch2_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_type TEXT NOT NULL,
  assessment_id UUID NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  verdict TEXT,
  score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quality_batch2_reviews_tool_assessment_idx
  ON public.quality_batch2_reviews (tool_type, assessment_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_batch2_reviews TO authenticated;
GRANT ALL ON public.quality_batch2_reviews TO service_role;

ALTER TABLE public.quality_batch2_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_batch2_reviews admin select"
  ON public.quality_batch2_reviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "quality_batch2_reviews admin insert"
  ON public.quality_batch2_reviews FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND reviewer_id = auth.uid());

CREATE POLICY "quality_batch2_reviews admin update"
  ON public.quality_batch2_reviews FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "quality_batch2_reviews admin delete"
  ON public.quality_batch2_reviews FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER quality_batch2_reviews_updated_at
  BEFORE UPDATE ON public.quality_batch2_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
