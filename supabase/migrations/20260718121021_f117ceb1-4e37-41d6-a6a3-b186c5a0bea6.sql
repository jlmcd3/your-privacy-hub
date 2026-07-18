
ALTER TABLE public.report_translations
  ADD COLUMN IF NOT EXISTS consecutive_stall_kicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_kick_chunks_done integer NOT NULL DEFAULT 0;
