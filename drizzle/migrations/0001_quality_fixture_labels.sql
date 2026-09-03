-- Fixture labelling moves from a runtime byte-equality lookup against the
-- golden registry into persisted state written at seed time.

-- (1) Run-level: arrays aligned positionally with quality_runs.intakes.
--     NULL / shorter array ⇒ that index carries no fixture label.
ALTER TABLE public.quality_runs
  ADD COLUMN IF NOT EXISTS fixture_sets jsonb,
  ADD COLUMN IF NOT EXISTS fixture_ids  jsonb;

-- (2) Assessment-level: one row per generated document that came from a
--     pinned golden fixture. Read by grade-single-assessment, which grades an
--     arbitrary assessment_id and has no run row to consult.
CREATE TABLE IF NOT EXISTS public.quality_fixture_labels (
  assessment_id uuid PRIMARY KEY,
  source_table  text,
  tool          text,
  fixture_set   text,
  fixture_id    text,
  run_id        uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quality_fixture_labels TO authenticated;
GRANT ALL    ON public.quality_fixture_labels TO service_role;

ALTER TABLE public.quality_fixture_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read fixture labels"
ON public.quality_fixture_labels
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS quality_fixture_labels_run_id_idx
  ON public.quality_fixture_labels (run_id);
