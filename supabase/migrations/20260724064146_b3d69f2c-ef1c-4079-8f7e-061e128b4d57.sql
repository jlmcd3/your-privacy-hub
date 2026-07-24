-- L5: Findings-to-Backlog Pipeline (CPPA-PRODUCT-1)
CREATE TABLE public.quality_finding_backlog (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_check_id  text NOT NULL,
  tool              text NOT NULL,
  first_seen_wave   integer,
  last_seen_wave    integer,
  occurrence_count  integer NOT NULL DEFAULT 0,
  class             text NOT NULL DEFAULT 'unclassified',
  proposed_lever    text,
  registry_key      text,
  intake_field      text,
  grader_hash       text,
  status            text NOT NULL DEFAULT 'open',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (finding_check_id, tool)
);

CREATE INDEX quality_finding_backlog_tool_class_idx
  ON public.quality_finding_backlog (tool, class, occurrence_count DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_finding_backlog TO authenticated;
GRANT ALL ON public.quality_finding_backlog TO service_role;

ALTER TABLE public.quality_finding_backlog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin quality_finding_backlog"
  ON public.quality_finding_backlog
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_quality_finding_backlog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER quality_finding_backlog_set_updated_at
BEFORE UPDATE ON public.quality_finding_backlog
FOR EACH ROW EXECUTE FUNCTION public.tg_quality_finding_backlog_updated_at();