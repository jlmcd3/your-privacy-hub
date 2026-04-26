-- Create email_signups table
CREATE TABLE public.email_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX email_signups_email_unique ON public.email_signups (lower(email));

ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up
CREATE POLICY "Anyone can sign up"
ON public.email_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Service role manages
CREATE POLICY "Service role manages email_signups"
ON public.email_signups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Backfill from email_subscribers
INSERT INTO public.email_signups (email, source, created_at)
SELECT email, source, COALESCE(subscribed_at, now())
FROM public.email_subscribers
ON CONFLICT (lower(email)) DO NOTHING;