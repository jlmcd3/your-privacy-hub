CREATE TABLE public.tool_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tool_type TEXT NOT NULL,
  report_id UUID,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_acknowledgments_user ON public.tool_acknowledgments(user_id);
CREATE INDEX idx_tool_acknowledgments_report ON public.tool_acknowledgments(report_id);
CREATE INDEX idx_tool_acknowledgments_tool ON public.tool_acknowledgments(tool_type);

ALTER TABLE public.tool_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon visitors before signup) can record their own acknowledgment.
-- For authenticated users, the user_id must match auth.uid(); anon may insert with NULL user_id.
CREATE POLICY "Users can record their own acknowledgment"
  ON public.tool_acknowledgments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can view their own acknowledgments"
  ON public.tool_acknowledgments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages tool acknowledgments"
  ON public.tool_acknowledgments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);