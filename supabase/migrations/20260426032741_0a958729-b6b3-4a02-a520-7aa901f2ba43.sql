-- email is already NOT NULL on email_signups; ensure it explicitly
ALTER TABLE public.email_signups ALTER COLUMN email SET NOT NULL;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS email_signups_email_idx ON public.email_signups (email);
CREATE INDEX IF NOT EXISTS email_signups_source_idx ON public.email_signups (source);