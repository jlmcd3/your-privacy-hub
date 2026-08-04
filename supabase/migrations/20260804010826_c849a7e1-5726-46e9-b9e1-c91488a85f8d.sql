ALTER TABLE public.ropa_client_profiles
  ADD COLUMN IF NOT EXISTS registered_address text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS incorporation_jurisdiction text,
  ADD COLUMN IF NOT EXISTS rights_handling_process text;