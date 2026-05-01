-- RoPA Builder schema (Document 2, Prompt 1 of 20)

CREATE TABLE public.ropa_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'in_progress'
                         CHECK (status IN ('in_progress','review','generated','archived')),
  version_number       integer NOT NULL DEFAULT 1,
  started_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  last_activity_at     timestamptz NOT NULL DEFAULT now(),
  generated_pdf_path   text,
  generated_docx_path  text,
  generated_xlsx_path  text,
  is_refresh           boolean NOT NULL DEFAULT false,
  parent_session_id    uuid REFERENCES public.ropa_sessions(id),
  total_activities     integer NOT NULL DEFAULT 0,
  completed_activities integer NOT NULL DEFAULT 0,
  open_flags_count     integer NOT NULL DEFAULT 0,
  payment_confirmed    boolean NOT NULL DEFAULT false,
  paid_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ropa_sessions_updated
  BEFORE UPDATE ON public.ropa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ropa_jurisdiction_selections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  jurisdiction_code   text NOT NULL,
  jurisdiction_name   text NOT NULL,
  jurisdiction_region text NOT NULL,
  added_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, jurisdiction_code)
);

CREATE TABLE public.ropa_processing_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.ropa_sessions(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id),
  template_key    text,
  display_name    text NOT NULL,
  category        text NOT NULL CHECK (category IN (
    'hr_employment','marketing','customer_service',
    'technology','finance_legal','third_party','operations','other'
  )),
  status          text NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started','in_progress','complete','flagged','skipped')),
  completion_pct  integer NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  is_high_risk    boolean NOT NULL DEFAULT false,
  is_public_facing boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ropa_activities_updated
  BEFORE UPDATE ON public.ropa_processing_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ropa_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   uuid NOT NULL REFERENCES public.ropa_processing_activities(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES public.ropa_sessions(id),
  question_key  text NOT NULL,
  answer_value  jsonb NOT NULL,
  answered_at   timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, question_key)
);

CREATE TABLE public.ropa_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.ropa_sessions(id) ON DELETE CASCADE,
  activity_id   uuid REFERENCES public.ropa_processing_activities(id),
  flag_type     text NOT NULL CHECK (flag_type IN (
    'missing_required','retention_undefined','basis_unclear',
    'transfer_undocumented','high_risk_activity','recommendation','cross_sell'
  )),
  severity      text NOT NULL DEFAULT 'warning'
                  CHECK (severity IN ('warning','info','recommendation')),
  question_key  text,
  flag_message  text NOT NULL,
  consequence   text,
  action_label  text,
  action_route  text,
  resolved      boolean NOT NULL DEFAULT false,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ropa_document_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid NOT NULL REFERENCES public.ropa_sessions(id),
  client_id             uuid NOT NULL REFERENCES public.clients(id),
  version_number        integer NOT NULL,
  document_format       text NOT NULL CHECK (document_format IN ('pdf','docx','xlsx')),
  file_path             text NOT NULL,
  file_size_bytes       integer,
  jurisdictions_covered text[] NOT NULL DEFAULT '{}',
  activities_count      integer NOT NULL DEFAULT 0,
  change_summary        text,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  is_current            boolean NOT NULL DEFAULT true,
  UNIQUE (session_id, document_format)
);

CREATE TABLE public.ropa_refresh_cycles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               uuid NOT NULL REFERENCES public.clients(id),
  source_session_id       uuid NOT NULL REFERENCES public.ropa_sessions(id),
  new_session_id          uuid REFERENCES public.ropa_sessions(id),
  initiated_at            timestamptz NOT NULL DEFAULT now(),
  completed_at            timestamptz,
  activities_confirmed    integer NOT NULL DEFAULT 0,
  activities_updated      integer NOT NULL DEFAULT 0,
  activities_added        integer NOT NULL DEFAULT 0
);

CREATE TABLE public.ropa_activity_templates (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key            text UNIQUE NOT NULL,
  display_name            text NOT NULL,
  description             text NOT NULL,
  category                text NOT NULL,
  sector_tags             text[] NOT NULL DEFAULT '{}',
  is_high_risk            boolean NOT NULL DEFAULT false,
  is_public_facing        boolean NOT NULL DEFAULT true,
  display_order           integer NOT NULL DEFAULT 0,
  is_active               boolean NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_ropa_sessions_client    ON public.ropa_sessions(client_id);
CREATE INDEX idx_ropa_sessions_status    ON public.ropa_sessions(status);
CREATE INDEX idx_ropa_jur_client         ON public.ropa_jurisdiction_selections(client_id);
CREATE INDEX idx_ropa_activities_session ON public.ropa_processing_activities(session_id);
CREATE INDEX idx_ropa_activities_client  ON public.ropa_processing_activities(client_id);
CREATE INDEX idx_ropa_answers_activity   ON public.ropa_answers(activity_id);
CREATE INDEX idx_ropa_answers_session    ON public.ropa_answers(session_id);
CREATE INDEX idx_ropa_flags_session      ON public.ropa_flags(session_id);
CREATE INDEX idx_ropa_flags_resolved     ON public.ropa_flags(resolved);
CREATE INDEX idx_ropa_docvers_client     ON public.ropa_document_versions(client_id, is_current);

-- RLS
ALTER TABLE public.ropa_sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_jurisdiction_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_processing_activities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_answers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_flags                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_document_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_refresh_cycles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ropa_activity_templates      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ropa_sessions_owner" ON public.ropa_sessions
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "ropa_jur_sel_owner" ON public.ropa_jurisdiction_selections
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "ropa_activities_owner" ON public.ropa_processing_activities
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "ropa_answers_owner" ON public.ropa_answers
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.ropa_sessions s WHERE public.owns_client(s.client_id)
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.ropa_sessions s WHERE public.owns_client(s.client_id)
    )
  );

CREATE POLICY "ropa_flags_owner" ON public.ropa_flags
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM public.ropa_sessions s WHERE public.owns_client(s.client_id)
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.ropa_sessions s WHERE public.owns_client(s.client_id)
    )
  );

CREATE POLICY "ropa_docvers_owner" ON public.ropa_document_versions
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "ropa_refresh_owner" ON public.ropa_refresh_cycles
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "ropa_templates_read" ON public.ropa_activity_templates
  FOR SELECT USING (true);