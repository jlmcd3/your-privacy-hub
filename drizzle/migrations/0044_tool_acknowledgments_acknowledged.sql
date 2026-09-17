ALTER TABLE public.tool_acknowledgments
  ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN;

COMMENT ON COLUMN public.tool_acknowledgments.acknowledged IS
  'Disclaimer checkbox state when the generate/purchase button was pressed; NULL = not reported by the caller. acknowledged_at is the click time, not proof of an explicit acknowledgment.';