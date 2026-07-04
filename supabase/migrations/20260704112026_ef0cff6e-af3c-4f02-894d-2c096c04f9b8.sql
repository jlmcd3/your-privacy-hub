
-- Search-vector trigger function (mirrors cppa_authorities_search_update)
CREATE OR REPLACE FUNCTION public.national_provisions_search_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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

CREATE TABLE public.national_provisions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument         text NOT NULL CHECK (instrument = ANY (ARRAY['BIPA','BDSG','UK_DPA_2018','VA_VCDPA','TX'])),
  language           text NOT NULL DEFAULT 'en',
  translation_status text NOT NULL DEFAULT 'official' CHECK (translation_status = ANY (ARRAY['official','non-official-translation'])),
  authority_type     text NOT NULL CHECK (authority_type = ANY (ARRAY['statute','regulation','guidance'])),
  source             text NOT NULL,
  citation           text NOT NULL,
  title              text NOT NULL,
  full_text          text NOT NULL,
  plain_summary      text,
  topics             text[] NOT NULL DEFAULT '{}'::text[],
  defines_terms      text[] NOT NULL DEFAULT '{}'::text[],
  binding            boolean NOT NULL DEFAULT true,
  authority_weight   integer NOT NULL DEFAULT 100,
  effective_date     date,
  status             text NOT NULL DEFAULT 'current' CHECK (status = ANY (ARRAY['current','superseded','draft','repealed','proposed','quarantined'])),
  version            integer NOT NULL DEFAULT 1,
  supersedes_id      uuid REFERENCES public.national_provisions(id),
  official_url       text,
  verified_by        text,
  verified_at        date,
  search_vector      tsvector,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.national_provisions TO anon, authenticated;
GRANT ALL    ON public.national_provisions TO service_role;

ALTER TABLE public.national_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read current national provisions"
  ON public.national_provisions
  FOR SELECT
  USING (status = 'current');

CREATE POLICY "Admins can manage national provisions"
  ON public.national_provisions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX national_provisions_current_citation_idx
  ON public.national_provisions (citation) WHERE status = 'current';
CREATE INDEX national_provisions_instrument_idx  ON public.national_provisions (instrument);
CREATE INDEX national_provisions_status_idx      ON public.national_provisions (status);
CREATE INDEX national_provisions_topics_idx      ON public.national_provisions USING gin (topics);
CREATE INDEX national_provisions_defines_idx     ON public.national_provisions USING gin (defines_terms);
CREATE INDEX national_provisions_search_idx      ON public.national_provisions USING gin (search_vector);

CREATE TRIGGER national_provisions_search_trg
  BEFORE INSERT OR UPDATE ON public.national_provisions
  FOR EACH ROW EXECUTE FUNCTION public.national_provisions_search_update();
