-- ITEM 348 — SHARED-TREE SLIMMING: the prose library moves out of source into data.

CREATE TABLE public.prose_frame_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  library_schema_version integer NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  provenance text NOT NULL,
  content_hash text NOT NULL,
  frames jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prose_frame_sets TO authenticated;
GRANT ALL ON public.prose_frame_sets TO service_role;
ALTER TABLE public.prose_frame_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prose frame sets"
  ON public.prose_frame_sets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prose_document_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  library_schema_version integer NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  provenance text NOT NULL,
  content_hash text NOT NULL,
  plan jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prose_document_plans TO authenticated;
GRANT ALL ON public.prose_document_plans TO service_role;
ALTER TABLE public.prose_document_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prose document plans"
  ON public.prose_document_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.prose_library_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  kind text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'prose-library',
  storage_path text NOT NULL,
  byte_size bigint NOT NULL,
  content_hash text NOT NULL,
  provenance text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prose_library_artifacts TO authenticated;
GRANT ALL ON public.prose_library_artifacts TO service_role;
ALTER TABLE public.prose_library_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prose library artifacts"
  ON public.prose_library_artifacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_prose_library_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prose_frame_sets_touch
  BEFORE UPDATE ON public.prose_frame_sets
  FOR EACH ROW EXECUTE FUNCTION public.touch_prose_library_updated_at();

CREATE TRIGGER trg_prose_document_plans_touch
  BEFORE UPDATE ON public.prose_document_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_prose_library_updated_at();

CREATE TRIGGER trg_prose_library_artifacts_touch
  BEFORE UPDATE ON public.prose_library_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_prose_library_updated_at();