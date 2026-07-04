
CREATE TABLE public.citation_lint_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool text NOT NULL,
  run_id text,
  citation text NOT NULL,
  in_supply boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.citation_lint_events TO service_role;

ALTER TABLE public.citation_lint_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX citation_lint_events_tool_idx ON public.citation_lint_events (tool, created_at DESC);
