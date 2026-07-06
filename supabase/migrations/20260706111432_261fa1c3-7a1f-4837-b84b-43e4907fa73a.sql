CREATE TABLE public.quality_loop2_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quality_loop2_notes TO authenticated;
GRANT ALL ON public.quality_loop2_notes TO service_role;

ALTER TABLE public.quality_loop2_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read quality_loop2_notes"
ON public.quality_loop2_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));