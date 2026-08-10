ALTER TABLE public.ropa_client_profiles ADD COLUMN IF NOT EXISTS home_base text;
ALTER TABLE public.ropa_sessions ADD COLUMN IF NOT EXISTS register_document jsonb;