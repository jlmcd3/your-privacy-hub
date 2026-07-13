
-- report_versions: prior report snapshots (A2)
CREATE TABLE public.report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_type text NOT NULL,
  assessment_id uuid NOT NULL,
  owner_user_id uuid,
  version_n int NOT NULL,
  report_data jsonb NOT NULL,
  open_items_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tool_type, assessment_id, version_n)
);
CREATE INDEX idx_report_versions_assessment ON public.report_versions (tool_type, assessment_id, version_n DESC);
CREATE INDEX idx_report_versions_owner ON public.report_versions (owner_user_id);

GRANT SELECT ON public.report_versions TO authenticated;
GRANT ALL ON public.report_versions TO service_role;

ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their report versions"
  ON public.report_versions FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete report versions"
  ON public.report_versions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- api_usage: per-call spend metering (A7)
CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  product text,
  model text,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_creation_tokens int,
  duration_ms int,
  source_row_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_usage_created_at ON public.api_usage (created_at DESC);
CREATE INDEX idx_api_usage_product_day ON public.api_usage (product, created_at DESC);
CREATE INDEX idx_api_usage_source_row ON public.api_usage (source_row_id);

GRANT SELECT ON public.api_usage TO authenticated;
GRANT ALL ON public.api_usage TO service_role;

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api_usage"
  ON public.api_usage FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
