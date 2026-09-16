-- LIA master review (2026-09-15, F20) — record the acknowledgment that
-- actually occurred. tool_acknowledgments rows were written on every
-- Generate click regardless of the disclaimer checkbox, so the table could
-- not distinguish "shown and ticked" from "shown and not ticked". The new
-- column stores the checkbox state at the click; NULL means the caller did
-- not report it (rows written before this migration, and tools that have not
-- yet been updated to pass it).
ALTER TABLE public.tool_acknowledgments
  ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN;

COMMENT ON COLUMN public.tool_acknowledgments.acknowledged IS
  'Disclaimer checkbox state when the generate/purchase button was pressed; NULL = not reported by the caller. acknowledged_at is the click time, not proof of an explicit acknowledgment.';
