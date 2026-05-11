-- Step 1: Create clients table
CREATE TABLE public.clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  sector       text,
  notes        text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clients_owner ON public.clients(owner_id);
CREATE INDEX idx_clients_owner_active ON public.clients(owner_id, is_active);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_owner_all" ON public.clients
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Step 2: Auto-create default client on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _name text;
BEGIN
  _name := split_part(NEW.email, '@', 1);
  IF _name IS NULL OR _name = '' THEN
    _name := 'My Organisation';
  END IF;
  INSERT INTO public.clients (owner_id, name) VALUES (NEW.id, _name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_client
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_client();

-- Step 3: Add client_id to all 8 existing work product tables
ALTER TABLE public.li_assessments
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.governance_assessments
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.dpia_frameworks
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.dpa_documents
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.ir_playbooks
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.biometric_assessments
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.registration_assessments
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.registration_orders
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_li_assess_client ON public.li_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_gov_assess_client ON public.governance_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_dpia_client ON public.dpia_frameworks(client_id);
CREATE INDEX IF NOT EXISTS idx_dpa_docs_client ON public.dpa_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_ir_client ON public.ir_playbooks(client_id);
CREATE INDEX IF NOT EXISTS idx_biometric_client ON public.biometric_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_reg_assess_client ON public.registration_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_reg_orders_client ON public.registration_orders(client_id);

-- Step 4: Backfill existing users + work product rows
INSERT INTO public.clients (owner_id, name)
SELECT u.id, COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'My Organisation')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.owner_id = u.id);

UPDATE public.li_assessments la
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = la.user_id LIMIT 1)
WHERE la.client_id IS NULL AND la.user_id IS NOT NULL;

UPDATE public.governance_assessments ga
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = ga.user_id LIMIT 1)
WHERE ga.client_id IS NULL AND ga.user_id IS NOT NULL;

UPDATE public.dpia_frameworks df
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = df.user_id LIMIT 1)
WHERE df.client_id IS NULL AND df.user_id IS NOT NULL;

UPDATE public.dpa_documents dd
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = dd.user_id LIMIT 1)
WHERE dd.client_id IS NULL AND dd.user_id IS NOT NULL;

UPDATE public.ir_playbooks ir
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = ir.user_id LIMIT 1)
WHERE ir.client_id IS NULL AND ir.user_id IS NOT NULL;

UPDATE public.biometric_assessments ba
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = ba.user_id LIMIT 1)
WHERE ba.client_id IS NULL AND ba.user_id IS NOT NULL;

UPDATE public.registration_assessments ra
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = ra.user_id LIMIT 1)
WHERE ra.client_id IS NULL AND ra.user_id IS NOT NULL;

UPDATE public.registration_orders ro
SET client_id = (SELECT c.id FROM public.clients c WHERE c.owner_id = ro.user_id LIMIT 1)
WHERE ro.client_id IS NULL AND ro.user_id IS NOT NULL;

-- Step 5: Helper functions
CREATE OR REPLACE FUNCTION public.my_client_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  FROM public.clients
  WHERE owner_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.owns_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = _client_id AND owner_id = auth.uid()
  );
$$;