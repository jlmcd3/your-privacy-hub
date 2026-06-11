CREATE TABLE public.gdpr_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('eu','uk')),
  article_number text NOT NULL,
  article_title text,
  chapter text,
  body_text text NOT NULL,
  source_url text,
  content_hash text NOT NULL,
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, article_number)
);

CREATE TABLE public.gdpr_recitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('eu','uk')),
  recital_number int NOT NULL,
  body_text text NOT NULL,
  source_url text,
  content_hash text NOT NULL,
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, recital_number)
);

CREATE TABLE public.edpb_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_ref text NOT NULL,
  title text NOT NULL,
  adopted_date date,
  doc_version text,
  status text NOT NULL DEFAULT 'final' CHECK (status IN ('final','consultation','superseded')),
  related_articles text[] NOT NULL DEFAULT '{}',
  topic_tags text[] NOT NULL DEFAULT '{}',
  section_heading text,
  excerpt_text text NOT NULL,
  source_url text,
  content_hash text NOT NULL,
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guideline_ref, content_hash)
);

CREATE INDEX idx_gdpr_articles_lookup ON public.gdpr_articles(jurisdiction, article_number);
CREATE INDEX idx_gdpr_recitals_lookup ON public.gdpr_recitals(jurisdiction, recital_number);
CREATE INDEX idx_edpb_guidelines_ref ON public.edpb_guidelines(guideline_ref);

GRANT SELECT ON public.gdpr_articles TO anon, authenticated;
GRANT ALL ON public.gdpr_articles TO service_role;
GRANT SELECT ON public.gdpr_recitals TO anon, authenticated;
GRANT ALL ON public.gdpr_recitals TO service_role;
GRANT SELECT ON public.edpb_guidelines TO anon, authenticated;
GRANT ALL ON public.edpb_guidelines TO service_role;

ALTER TABLE public.gdpr_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_recitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edpb_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gdpr articles" ON public.gdpr_articles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gdpr recitals" ON public.gdpr_recitals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read edpb guidelines" ON public.edpb_guidelines FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role manages gdpr articles" ON public.gdpr_articles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages gdpr recitals" ON public.gdpr_recitals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages edpb guidelines" ON public.edpb_guidelines FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.match_gdpr_provisions(
  query_embedding vector(1536),
  jurisdiction_filter text DEFAULT 'eu',
  article_filter text[] DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  jurisdiction text,
  article_number text,
  article_title text,
  body_text text,
  source_url text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT
    a.id,
    a.jurisdiction,
    a.article_number,
    a.article_title,
    a.body_text,
    a.source_url,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.gdpr_articles a
  WHERE a.embedding IS NOT NULL
    AND a.jurisdiction = jurisdiction_filter
    AND (article_filter IS NULL OR a.article_number = ANY(article_filter))
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$fn$;

CREATE OR REPLACE FUNCTION public.match_edpb_guidelines(
  query_embedding vector(1536),
  article_filter text[] DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  guideline_ref text,
  title text,
  section_heading text,
  excerpt_text text,
  related_articles text[],
  source_url text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT
    g.id,
    g.guideline_ref,
    g.title,
    g.section_heading,
    g.excerpt_text,
    g.related_articles,
    g.source_url,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM public.edpb_guidelines g
  WHERE g.embedding IS NOT NULL
    AND g.status = 'final'
    AND (article_filter IS NULL OR g.related_articles && article_filter)
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_count;
$fn$;

GRANT EXECUTE ON FUNCTION public.match_gdpr_provisions(vector, text, text[], int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_edpb_guidelines(vector, text[], int) TO authenticated, service_role;