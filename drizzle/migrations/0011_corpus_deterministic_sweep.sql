CREATE TABLE IF NOT EXISTS public.corpus_sweep_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL UNIQUE REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  sweep_version text NOT NULL,
  record_class text NOT NULL,
  usable_for text[] NOT NULL DEFAULT '{}',
  content_score smallint NOT NULL DEFAULT 0,
  text_len integer NOT NULL DEFAULT 0,
  has_fine boolean NOT NULL DEFAULT false,
  has_date boolean NOT NULL DEFAULT false,
  has_subject boolean NOT NULL DEFAULT false,
  needs_ai_review boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  swept_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.corpus_sweep_results TO authenticated;
GRANT ALL ON public.corpus_sweep_results TO service_role;

ALTER TABLE public.corpus_sweep_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read corpus sweep results" ON public.corpus_sweep_results;
CREATE POLICY "Admins can read corpus sweep results"
ON public.corpus_sweep_results FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_corpus_sweep_class ON public.corpus_sweep_results(record_class);
CREATE INDEX IF NOT EXISTS idx_corpus_sweep_usable ON public.corpus_sweep_results USING gin(usable_for);

CREATE OR REPLACE FUNCTION public.run_corpus_deterministic_sweep(p_version text DEFAULT 'sweep-v1', p_limit integer DEFAULT NULL)
RETURNS TABLE(record_class text, n bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH src AS (
    SELECT e.id,
           e.subject, e.regulator, e.source_database, e.source_type, e.instrument_class,
           e.matter_type, e.decision_date, e.fine_eur, e.fine_amount,
           coalesce(e.source_url, e.primary_source_url, '') AS url,
           regexp_replace(
             coalesce(nullif(e.raw_text,''), nullif(e.source_document_text,''), nullif(e.legacy_summary_text,''), ''),
             '\s+', ' ', 'g') AS body
    FROM public.enforcement_actions e
    ORDER BY e.created_at
    LIMIT p_limit
  ), feat AS (
    SELECT s.*,
      length(btrim(s.body)) AS tlen,
      (s.fine_eur IS NOT NULL OR coalesce(s.fine_amount,'') <> '') AS has_fine,
      (s.decision_date IS NOT NULL) AS has_date,
      (coalesce(s.subject,'') <> '') AS has_subject,
      (s.url ~* '\.(jpe?g|png|gif|svg|webp|css|js|ico|woff2?)(\?|$)') AS is_asset,
      (s.url ~* '(conditions-of-use|privacy-policy|/accessibility|/sitemap|/contact|/about-us|/subscribe|/careers|cookie-policy|/search)') AS is_boilerplate_url,
      (s.url ~* '(/news|/press|/media|/blog|/story|/announcement)' OR s.source_database ~* 'news') AS is_news_url,
      (s.url ~* '(guidance|guidelines|advice|submissions|consultation|resources|opinion|toolkit|faq)') AS is_guidance_url,
      (s.body ~* '(administrative fine|imposed a fine|penalty of|civil penalty|infringement of article|enforcement notice|monetary penalty|consent order|investigation report|reprimand)') AS kw_enforcement,
      (s.body ~* '(guidance|guidelines|recommendation|advisory opinion|best practice)') AS kw_guidance,
      (s.body ~* '(lawsuit|plaintiff|class action|court of appeal|district court|complaint filed)') AS kw_litigation,
      (s.body ~* '(data breach notification|breach report|security incident)') AS kw_breach
    FROM src s
  ), classified AS (
    SELECT f.*,
      CASE
        WHEN f.is_asset THEN 'junk_asset'
        WHEN f.tlen < 200 AND NOT f.has_fine AND NOT f.has_subject THEN 'insufficient_content'
        WHEN f.is_boilerplate_url AND NOT f.has_fine THEN 'site_boilerplate'
        WHEN f.instrument_class = 'final_enforcement_decision' THEN 'enforcement_decision'
        WHEN f.matter_type = 'litigation' OR (f.kw_litigation AND NOT f.kw_enforcement) THEN 'litigation_matter'
        WHEN f.instrument_class = 'guidance' OR (f.is_guidance_url AND NOT f.kw_enforcement) THEN 'regulator_guidance'
        WHEN f.has_fine OR f.kw_enforcement THEN 'enforcement_decision'
        WHEN f.instrument_class = 'press_summary' OR f.is_news_url THEN 'news_or_press'
        WHEN f.kw_breach THEN 'breach_notification'
        WHEN f.kw_guidance THEN 'regulator_guidance'
        ELSE 'unclassified_document'
      END AS rclass
    FROM feat f
  ), scored AS (
    SELECT c.*,
      least(100,
        (CASE WHEN c.tlen >= 4000 THEN 40 WHEN c.tlen >= 1000 THEN 30 WHEN c.tlen >= 400 THEN 20 WHEN c.tlen >= 200 THEN 10 ELSE 0 END)
        + (CASE WHEN c.has_fine THEN 20 ELSE 0 END)
        + (CASE WHEN c.has_date THEN 15 ELSE 0 END)
        + (CASE WHEN c.has_subject THEN 15 ELSE 0 END)
        + (CASE WHEN c.source_type = 'regulator_primary' THEN 10 ELSE 0 END)
      )::smallint AS score
    FROM classified c
  )
  INSERT INTO public.corpus_sweep_results AS t
    (action_id, sweep_version, record_class, usable_for, content_score, text_len,
     has_fine, has_date, has_subject, needs_ai_review, evidence)
  SELECT s.id, p_version, s.rclass,
    CASE s.rclass
      WHEN 'enforcement_decision' THEN
        ARRAY['enforcement_database']::text[]
        || CASE WHEN s.score >= 60 THEN ARRAY['li_precedent_candidate'] ELSE ARRAY[]::text[] END
      WHEN 'litigation_matter' THEN ARRAY['litigation_watch','news_digest']::text[]
      WHEN 'regulator_guidance' THEN ARRAY['guidance_corpus']::text[]
      WHEN 'breach_notification' THEN ARRAY['breach_intelligence','news_digest']::text[]
      WHEN 'news_or_press' THEN ARRAY['news_digest']::text[]
      WHEN 'unclassified_document' THEN
        CASE WHEN s.score >= 40 THEN ARRAY['needs_triage'] ELSE ARRAY[]::text[] END
      ELSE ARRAY[]::text[]
    END,
    s.score, s.tlen, s.has_fine, s.has_date, s.has_subject,
    (s.rclass IN ('enforcement_decision','unclassified_document') AND NOT s.has_subject AND s.tlen >= 400),
    jsonb_build_object(
      'source_database', s.source_database,
      'source_type', s.source_type,
      'instrument_class', s.instrument_class,
      'url', left(s.url, 300),
      'kw', jsonb_build_object('enforcement', s.kw_enforcement, 'guidance', s.kw_guidance,
                               'litigation', s.kw_litigation, 'breach', s.kw_breach),
      'title_head', left(s.body, 180)
    )
  FROM scored s
  ON CONFLICT (action_id) DO UPDATE SET
    sweep_version = EXCLUDED.sweep_version,
    record_class = EXCLUDED.record_class,
    usable_for = EXCLUDED.usable_for,
    content_score = EXCLUDED.content_score,
    text_len = EXCLUDED.text_len,
    has_fine = EXCLUDED.has_fine,
    has_date = EXCLUDED.has_date,
    has_subject = EXCLUDED.has_subject,
    needs_ai_review = EXCLUDED.needs_ai_review,
    evidence = EXCLUDED.evidence,
    swept_at = now();

  RETURN QUERY
  SELECT r.record_class, count(*)::bigint
  FROM public.corpus_sweep_results r
  WHERE r.sweep_version = p_version
  GROUP BY r.record_class
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.run_corpus_deterministic_sweep(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_corpus_deterministic_sweep(text, integer) TO service_role;