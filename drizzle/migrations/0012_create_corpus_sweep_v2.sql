CREATE TABLE public.corpus_sweep_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL,
  sweep_version TEXT NOT NULL DEFAULT 'sweep-v2-2026-09-07',
  -- Axis 1
  record_class TEXT NOT NULL,
  -- Axis 2
  usable_for TEXT[] NOT NULL DEFAULT '{}',
  -- Axis 3
  authority_tier TEXT,
  settledness TEXT,
  citability TEXT,
  -- Axis 4
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  li_relevance TEXT,
  li_factor_tags TEXT[] NOT NULL DEFAULT '{}',
  li_posture TEXT,
  -- Axis 5
  regulator_canonical TEXT,
  jurisdiction_code TEXT,
  forum TEXT,
  source_type TEXT,
  language_original TEXT,
  translation_state TEXT,
  -- Axis 6
  content_score SMALLINT NOT NULL DEFAULT 0,
  text_len INTEGER NOT NULL DEFAULT 0,
  has_subject BOOLEAN NOT NULL DEFAULT false,
  has_date BOOLEAN NOT NULL DEFAULT false,
  has_fine BOOLEAN NOT NULL DEFAULT false,
  has_source_document BOOLEAN NOT NULL DEFAULT false,
  has_source_hash BOOLEAN NOT NULL DEFAULT false,
  pin_ready BOOLEAN NOT NULL DEFAULT false,
  dedupe_signature TEXT,
  duplicate_of UUID,
  -- Axis 7
  confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  tagged_by TEXT NOT NULL DEFAULT 'deterministic',
  needs_ai_review BOOLEAN NOT NULL DEFAULT false,
  review_state TEXT NOT NULL DEFAULT 'auto_tagged',
  ratified_by TEXT,
  ratified_at TIMESTAMPTZ,
  ledger_ref TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  swept_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (action_id, sweep_version)
);

CREATE INDEX idx_corpus_sweep_v2_class ON public.corpus_sweep_v2 (record_class);
CREATE INDEX idx_corpus_sweep_v2_usable ON public.corpus_sweep_v2 USING GIN (usable_for);
CREATE INDEX idx_corpus_sweep_v2_topics ON public.corpus_sweep_v2 USING GIN (topic_tags);
CREATE INDEX idx_corpus_sweep_v2_li ON public.corpus_sweep_v2 (li_relevance);
CREATE INDEX idx_corpus_sweep_v2_dedupe ON public.corpus_sweep_v2 (dedupe_signature);

GRANT ALL ON public.corpus_sweep_v2 TO service_role;

ALTER TABLE public.corpus_sweep_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read corpus_sweep_v2"
ON public.corpus_sweep_v2 FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.corpus_sweep_v2 TO authenticated;