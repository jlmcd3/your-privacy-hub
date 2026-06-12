
-- Extend ropa_sessions.status to support background generation lifecycle
ALTER TABLE public.ropa_sessions DROP CONSTRAINT IF EXISTS ropa_sessions_status_check;
ALTER TABLE public.ropa_sessions
  ADD CONSTRAINT ropa_sessions_status_check
  CHECK (status = ANY (ARRAY['in_progress'::text, 'review'::text, 'processing'::text, 'generated'::text, 'failed'::text, 'archived'::text]));

ALTER TABLE public.ropa_sessions
  ADD COLUMN IF NOT EXISTS generation_error text;

-- Persist the most recent signed download URL on each document version so
-- callers can reach the PDF/DOCX/XLSX after polling the session to
-- terminal status, replacing the inline download_url that the synchronous
-- response used to return.
ALTER TABLE public.ropa_document_versions
  ADD COLUMN IF NOT EXISTS last_signed_url text,
  ADD COLUMN IF NOT EXISTS last_signed_url_expires_at timestamptz;
