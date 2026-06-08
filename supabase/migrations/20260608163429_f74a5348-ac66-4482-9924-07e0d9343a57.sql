
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.cppa_fsor_commentary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fsor_package text NOT NULL,
  regulation_citation text NOT NULL,
  related_citations text[] NOT NULL DEFAULT '{}',
  topic_tags text[] NOT NULL DEFAULT '{}',
  comment_summary text NOT NULL,
  agency_response text NOT NULL,
  page_ref text,
  source_url text,
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fsor_package, content_hash)
);

CREATE INDEX cppa_fsor_commentary_citation_idx
  ON public.cppa_fsor_commentary (regulation_citation);
CREATE INDEX cppa_fsor_commentary_topics_idx
  ON public.cppa_fsor_commentary USING gin (topic_tags);
CREATE INDEX cppa_fsor_commentary_related_idx
  ON public.cppa_fsor_commentary USING gin (related_citations);
CREATE INDEX cppa_fsor_commentary_embedding_idx
  ON public.cppa_fsor_commentary USING hnsw (embedding vector_cosine_ops);

GRANT SELECT ON public.cppa_fsor_commentary TO authenticated;
GRANT ALL ON public.cppa_fsor_commentary TO service_role;

ALTER TABLE public.cppa_fsor_commentary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read FSOR commentary"
  ON public.cppa_fsor_commentary
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER cppa_fsor_commentary_set_updated_at
  BEFORE UPDATE ON public.cppa_fsor_commentary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.match_cppa_fsor_commentary(
  query_embedding vector(1536),
  citation_filter text[] DEFAULT NULL,
  topic_filter text[] DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  fsor_package text,
  regulation_citation text,
  related_citations text[],
  topic_tags text[],
  comment_summary text,
  agency_response text,
  page_ref text,
  source_url text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.fsor_package,
    c.regulation_citation,
    c.related_citations,
    c.topic_tags,
    c.comment_summary,
    c.agency_response,
    c.page_ref,
    c.source_url,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.cppa_fsor_commentary c
  WHERE c.embedding IS NOT NULL
    AND (
      citation_filter IS NULL
      OR c.regulation_citation = ANY(citation_filter)
      OR c.related_citations && citation_filter
    )
    AND (
      topic_filter IS NULL
      OR c.topic_tags && topic_filter
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_cppa_fsor_commentary(vector, text[], text[], int)
  TO authenticated, service_role;
