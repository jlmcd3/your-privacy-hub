
CREATE TABLE public.provision_texts (
  key text PRIMARY KEY,
  citation text NOT NULL,
  verbatim_excerpt text NOT NULL DEFAULT '',
  plain_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  jurisdiction text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  last_verified_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.provision_texts TO anon, authenticated;
GRANT ALL ON public.provision_texts TO service_role;

ALTER TABLE public.provision_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provision_texts public read"
  ON public.provision_texts FOR SELECT
  USING (true);

CREATE POLICY "provision_texts admin write"
  ON public.provision_texts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_provision_texts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_provision_texts_updated_at
  BEFORE UPDATE ON public.provision_texts
  FOR EACH ROW EXECUTE FUNCTION public.update_provision_texts_updated_at();

CREATE INDEX idx_provision_texts_status ON public.provision_texts(status);
