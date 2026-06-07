-- =========================================================================
-- CPPA Legal-Reference RAG: schema + atomic supersede RPC
-- =========================================================================

-- 1. cppa_authorities ------------------------------------------------------
CREATE TABLE public.cppa_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_type text NOT NULL CHECK (authority_type IN ('statute','regulation','guidance')),
  source text NOT NULL CHECK (source IN ('CCPA','CPPA_REGS','CPPA_GUIDANCE')),
  citation text NOT NULL,
  title text NOT NULL,
  full_text text NOT NULL,
  plain_summary text,
  topics text[] NOT NULL DEFAULT '{}',
  defines_terms text[] NOT NULL DEFAULT '{}',
  binding boolean NOT NULL DEFAULT true,
  authority_weight integer NOT NULL DEFAULT 100,
  effective_date date,
  status text NOT NULL DEFAULT 'current'
    CHECK (status IN ('current','superseded','draft','repealed','proposed','quarantined')),
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.cppa_authorities(id),
  official_url text,
  verified_by text,
  verified_at date,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX cppa_authorities_current_citation_idx
  ON public.cppa_authorities(citation) WHERE status = 'current';
CREATE INDEX cppa_authorities_topics_idx ON public.cppa_authorities USING gin(topics);
CREATE INDEX cppa_authorities_defines_idx ON public.cppa_authorities USING gin(defines_terms);
CREATE INDEX cppa_authorities_search_idx ON public.cppa_authorities USING gin(search_vector);
CREATE INDEX cppa_authorities_status_idx ON public.cppa_authorities(status);

CREATE OR REPLACE FUNCTION public.cppa_authorities_search_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.citation,'')),     'A') ||
    setweight(to_tsvector('english', coalesce(NEW.title,'')),        'A') ||
    setweight(to_tsvector('english', coalesce(NEW.plain_summary,'')),'B') ||
    setweight(to_tsvector('english', coalesce(NEW.full_text,'')),    'C');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cppa_authorities_search_trg
  BEFORE INSERT OR UPDATE ON public.cppa_authorities
  FOR EACH ROW EXECUTE FUNCTION public.cppa_authorities_search_update();

GRANT SELECT ON public.cppa_authorities TO anon, authenticated;
GRANT ALL ON public.cppa_authorities TO service_role;
ALTER TABLE public.cppa_authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read current authorities"
  ON public.cppa_authorities FOR SELECT
  USING (status = 'current');

-- 2. cppa_deadlines --------------------------------------------------------
CREATE TABLE public.cppa_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation text NOT NULL,
  trigger_condition text NOT NULL,
  effective_date date,
  compliance_deadline date,
  revenue_tier text,
  topics text[] NOT NULL DEFAULT '{}',
  primary_authority_citation text NOT NULL,
  supporting_citations text[] DEFAULT '{}',
  notes text,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current','superseded','draft')),
  verified_by text,
  verified_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cppa_deadlines_topics_idx ON public.cppa_deadlines USING gin(topics);

CREATE TRIGGER cppa_deadlines_updated_at
  BEFORE UPDATE ON public.cppa_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.cppa_deadlines TO anon, authenticated;
GRANT ALL ON public.cppa_deadlines TO service_role;
ALTER TABLE public.cppa_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read current deadlines"
  ON public.cppa_deadlines FOR SELECT
  USING (status = 'current');

-- 3. cppa_source_registry --------------------------------------------------
CREATE TABLE public.cppa_source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  url text NOT NULL UNIQUE,
  source_type text NOT NULL CHECK (source_type IN ('statute','regulation','guidance','enforcement')),
  extraction_selector text,
  last_normalised_text text,
  last_checked timestamptz,
  last_changed timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cppa_source_registry TO service_role;
ALTER TABLE public.cppa_source_registry ENABLE ROW LEVEL SECURITY;

-- 4. cppa_ingestion_log ----------------------------------------------------
CREATE TABLE public.cppa_ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('initial','update_check','reingest','manual')),
  source_url text,
  citation text,
  authorities_added integer DEFAULT 0,
  authorities_updated integer DEFAULT 0,
  change_detected boolean DEFAULT false,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cppa_ingestion_log TO service_role;
ALTER TABLE public.cppa_ingestion_log ENABLE ROW LEVEL SECURITY;

-- 5. cppa_corpus_settings --------------------------------------------------
CREATE TABLE public.cppa_corpus_settings (
  id integer PRIMARY KEY DEFAULT 1,
  verified_only_mode boolean NOT NULL DEFAULT false,
  corpus_marked_complete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.cppa_corpus_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT ALL ON public.cppa_corpus_settings TO service_role;
ALTER TABLE public.cppa_corpus_settings ENABLE ROW LEVEL SECURITY;

-- 6. Atomic supersede + insert RPC -----------------------------------------
CREATE OR REPLACE FUNCTION public.cppa_supersede_and_insert(
  p_citation text,
  p_authority_type text,
  p_source text,
  p_title text,
  p_full_text text,
  p_plain_summary text,
  p_topics text[],
  p_defines_terms text[],
  p_binding boolean,
  p_authority_weight integer,
  p_effective_date date,
  p_official_url text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_id uuid;
  old_ver integer;
  new_id uuid;
BEGIN
  SELECT id, version INTO old_id, old_ver
    FROM public.cppa_authorities
   WHERE citation = p_citation AND status = 'current'
   FOR UPDATE;

  IF old_id IS NOT NULL THEN
    UPDATE public.cppa_authorities
       SET status = 'superseded', updated_at = now()
     WHERE id = old_id;
  END IF;

  INSERT INTO public.cppa_authorities
    (authority_type, source, citation, title, full_text, plain_summary, topics,
     defines_terms, binding, authority_weight, effective_date, status, version,
     supersedes_id, official_url, verified_by, verified_at)
  VALUES
    (p_authority_type, p_source, p_citation, p_title, p_full_text, p_plain_summary,
     p_topics, p_defines_terms, p_binding, p_authority_weight, p_effective_date,
     'current', coalesce(old_ver, 0) + 1, old_id, p_official_url, NULL, NULL)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cppa_supersede_and_insert(
  text, text, text, text, text, text, text[], text[], boolean, integer, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cppa_supersede_and_insert(
  text, text, text, text, text, text, text[], text[], boolean, integer, date, text
) TO service_role;