CREATE TABLE IF NOT EXISTS public.ropa_client_profiles (
  client_id         uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  legal_entity_type text,
  employee_band     text CHECK (employee_band IN ('<50','50-249','250-999','1000+')),
  is_controller     boolean NOT NULL DEFAULT true,
  is_processor      boolean NOT NULL DEFAULT false,
  dpo_name          text,
  dpo_email         text,
  dpo_phone         text,
  eu_rep_name       text,
  eu_rep_email      text,
  uk_rep_name       text,
  uk_rep_email      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ropa_client_profiles_updated
  BEFORE UPDATE ON public.ropa_client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ropa_client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ropa_client_profiles_owner" ON public.ropa_client_profiles
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));