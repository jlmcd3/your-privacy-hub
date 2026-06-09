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
      (citation_filter IS NULL AND topic_filter IS NULL)
      OR (citation_filter IS NOT NULL AND (
            c.regulation_citation = ANY(citation_filter)
            OR c.related_citations && citation_filter
          ))
      OR (topic_filter IS NOT NULL AND c.topic_tags && topic_filter)
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_cppa_fsor_commentary(vector, text[], text[], int)
  TO authenticated, service_role;