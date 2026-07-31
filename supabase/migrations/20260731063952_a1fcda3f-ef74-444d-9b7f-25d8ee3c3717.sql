ALTER TABLE public.edpb_guidelines
  ADD COLUMN IF NOT EXISTS doc_version TEXT,
  ADD COLUMN IF NOT EXISTS version_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.edpb_guidelines.doc_version IS 'Published version identifier of the guidance document (e.g. "2.0", "1.0", "rev.01"). NULL = not yet verified against the official EDPB page; never guess.';
COMMENT ON COLUMN public.edpb_guidelines.version_verified_at IS 'UTC timestamp at which doc_version was last confirmed against the official EDPB document page (Item 301 re-check convention).';