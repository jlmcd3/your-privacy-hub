CREATE UNIQUE INDEX IF NOT EXISTS ropa_sessions_id_client_id_uniq
  ON public.ropa_sessions (id, client_id);

CREATE UNIQUE INDEX IF NOT EXISTS ropa_processing_activities_id_session_id_uniq
  ON public.ropa_processing_activities (id, session_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ropa_processing_activities_session_client_match_fkey'
  ) THEN
    ALTER TABLE public.ropa_processing_activities
      ADD CONSTRAINT ropa_processing_activities_session_client_match_fkey
      FOREIGN KEY (session_id, client_id)
      REFERENCES public.ropa_sessions (id, client_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ropa_answers_activity_session_match_fkey'
  ) THEN
    ALTER TABLE public.ropa_answers
      ADD CONSTRAINT ropa_answers_activity_session_match_fkey
      FOREIGN KEY (activity_id, session_id)
      REFERENCES public.ropa_processing_activities (id, session_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ropa_flags_activity_session_match_fkey'
  ) THEN
    ALTER TABLE public.ropa_flags
      ADD CONSTRAINT ropa_flags_activity_session_match_fkey
      FOREIGN KEY (activity_id, session_id)
      REFERENCES public.ropa_processing_activities (id, session_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ropa_document_versions_session_client_match_fkey'
  ) THEN
    ALTER TABLE public.ropa_document_versions
      ADD CONSTRAINT ropa_document_versions_session_client_match_fkey
      FOREIGN KEY (session_id, client_id)
      REFERENCES public.ropa_sessions (id, client_id)
      ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "ropa_activities_owner" ON public.ropa_processing_activities;
CREATE POLICY "ropa_activities_owner" ON public.ropa_processing_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_processing_activities.session_id
        AND s.client_id = ropa_processing_activities.client_id
        AND public.owns_client(s.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_processing_activities.session_id
        AND s.client_id = ropa_processing_activities.client_id
        AND public.owns_client(s.client_id)
    )
  );

DROP POLICY IF EXISTS "ropa_answers_owner" ON public.ropa_answers;
CREATE POLICY "ropa_answers_owner" ON public.ropa_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.ropa_processing_activities a
      JOIN public.ropa_sessions s ON s.id = ropa_answers.session_id
      WHERE a.id = ropa_answers.activity_id
        AND a.session_id = ropa_answers.session_id
        AND a.client_id = s.client_id
        AND public.owns_client(s.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ropa_processing_activities a
      JOIN public.ropa_sessions s ON s.id = ropa_answers.session_id
      WHERE a.id = ropa_answers.activity_id
        AND a.session_id = ropa_answers.session_id
        AND a.client_id = s.client_id
        AND public.owns_client(s.client_id)
    )
  );

DROP POLICY IF EXISTS "ropa_flags_owner" ON public.ropa_flags;
CREATE POLICY "ropa_flags_owner" ON public.ropa_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_flags.session_id
        AND public.owns_client(s.client_id)
        AND (
          ropa_flags.activity_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.ropa_processing_activities a
            WHERE a.id = ropa_flags.activity_id
              AND a.session_id = ropa_flags.session_id
              AND a.client_id = s.client_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_flags.session_id
        AND public.owns_client(s.client_id)
        AND (
          ropa_flags.activity_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.ropa_processing_activities a
            WHERE a.id = ropa_flags.activity_id
              AND a.session_id = ropa_flags.session_id
              AND a.client_id = s.client_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "ropa_docvers_owner" ON public.ropa_document_versions;
CREATE POLICY "ropa_docvers_owner" ON public.ropa_document_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_document_versions.session_id
        AND s.client_id = ropa_document_versions.client_id
        AND public.owns_client(s.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ropa_sessions s
      WHERE s.id = ropa_document_versions.session_id
        AND s.client_id = ropa_document_versions.client_id
        AND public.owns_client(s.client_id)
    )
  );