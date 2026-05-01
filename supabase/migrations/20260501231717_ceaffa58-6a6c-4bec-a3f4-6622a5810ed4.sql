
-- Sessions
CREATE TABLE public.us_notice_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ropa_session_id   uuid REFERENCES public.ropa_sessions(id),
  mode              text NOT NULL DEFAULT 'standalone'
                      CHECK (mode IN ('ropa_powered','standalone')),
  status            text NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','review','generated','archived')),
  scope             text NOT NULL DEFAULT 'single'
                      CHECK (scope IN ('single','all_states')),
  version_number    integer NOT NULL DEFAULT 1,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  last_activity_at  timestamptz NOT NULL DEFAULT now(),
  payment_confirmed boolean NOT NULL DEFAULT false,
  paid_at           timestamptz,
  is_refresh        boolean NOT NULL DEFAULT false,
  parent_session_id uuid REFERENCES public.us_notice_sessions(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_us_notice_sessions_updated
  BEFORE UPDATE ON public.us_notice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- State selections
CREATE TABLE public.us_notice_state_selections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.us_notice_sessions(id) ON DELETE CASCADE,
  state_code     text NOT NULL,
  state_name     text NOT NULL,
  framework_type text NOT NULL CHECK (framework_type IN ('ccpa','virginia_model','maryland','florida','pending')),
  UNIQUE (session_id, state_code)
);

-- Answers
CREATE TABLE public.us_notice_answers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES public.us_notice_sessions(id) ON DELETE CASCADE,
  ropa_activity_id uuid REFERENCES public.ropa_processing_activities(id),
  question_key     text NOT NULL,
  answer_value     jsonb NOT NULL,
  answered_at      timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_us_notice_answers_universal
  ON public.us_notice_answers(session_id, question_key)
  WHERE ropa_activity_id IS NULL;
CREATE UNIQUE INDEX idx_us_notice_answers_activity
  ON public.us_notice_answers(session_id, ropa_activity_id, question_key)
  WHERE ropa_activity_id IS NOT NULL;
CREATE TRIGGER trg_us_notice_answers_updated
  BEFORE UPDATE ON public.us_notice_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents
CREATE TABLE public.us_notice_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.us_notice_sessions(id),
  client_id       uuid NOT NULL REFERENCES public.clients(id),
  state_code      text,
  framework_type  text NOT NULL,
  is_combined     boolean NOT NULL DEFAULT false,
  version_number  integer NOT NULL DEFAULT 1,
  document_format text NOT NULL CHECK (document_format IN ('pdf','docx','html','txt')),
  file_path       text NOT NULL,
  file_size_bytes integer,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  is_current      boolean NOT NULL DEFAULT true,
  UNIQUE (session_id, state_code, document_format)
);

-- State privacy laws catalog
CREATE TABLE public.us_state_privacy_laws (
  state_code        text PRIMARY KEY,
  state_name        text NOT NULL,
  law_name          text NOT NULL,
  framework_type    text NOT NULL CHECK (framework_type IN ('ccpa','virginia_model','maryland','florida','pending')),
  effective_date    date,
  is_active         boolean NOT NULL DEFAULT true,
  applicability_threshold text,
  has_opt_out_right boolean NOT NULL DEFAULT true,
  has_correction_right boolean NOT NULL DEFAULT true,
  has_appeal_right  boolean NOT NULL DEFAULT false,
  requires_gpc      boolean NOT NULL DEFAULT false,
  has_sensitive_data_category boolean NOT NULL DEFAULT true,
  notes             text,
  enforcement_body  text,
  enforcement_url   text
);

-- RLS
ALTER TABLE public.us_notice_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.us_notice_state_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.us_notice_answers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.us_notice_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.us_state_privacy_laws      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "us_notice_sessions_owner" ON public.us_notice_sessions
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "us_notice_state_sel_owner" ON public.us_notice_state_selections
  FOR ALL USING (session_id IN (
    SELECT id FROM public.us_notice_sessions WHERE public.owns_client(client_id)
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM public.us_notice_sessions WHERE public.owns_client(client_id)
  ));

CREATE POLICY "us_notice_answers_owner" ON public.us_notice_answers
  FOR ALL USING (session_id IN (
    SELECT id FROM public.us_notice_sessions WHERE public.owns_client(client_id)
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM public.us_notice_sessions WHERE public.owns_client(client_id)
  ));

CREATE POLICY "us_notice_documents_owner" ON public.us_notice_documents
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "us_state_laws_read" ON public.us_state_privacy_laws
  FOR SELECT USING (true);

-- Seed 24 state laws (20 active + 4 pending)
INSERT INTO public.us_state_privacy_laws VALUES
('CA','California','CCPA/CPRA','ccpa','2023-01-01',true,
 'Businesses that collect data from 100K+ consumers OR derive 50%+ revenue from data sale',
 true,true,false,false,true,
 'California has the most comprehensive framework — distinct from all other states',
 'California Privacy Protection Agency','cppa.ca.gov'),
('VA','Virginia','VCDPA','virginia_model','2023-01-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue from data',
 true,true,false,false,true,NULL,'Virginia Attorney General','ago.virginia.gov'),
('CO','Colorado','CPA','virginia_model','2023-07-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue from data',
 true,true,true,true,true,
 'Universal Opt-Out Mechanisms (e.g. GPC) must be honoured from July 2024',
 'Colorado AG','coag.gov'),
('CT','Connecticut','CTDPA','virginia_model','2023-07-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue from data',
 true,true,false,false,true,NULL,'Connecticut AG','portal.ct.gov/AG'),
('UT','Utah','UCPA','virginia_model','2023-12-31',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue from data',
 true,false,false,false,true,
 'No right to correction; narrower sensitive data definition',
 'Utah AG','attorneygeneral.utah.gov'),
('TX','Texas','TDPSA','virginia_model','2024-07-01',true,
 'Any business; no threshold (with exceptions)',
 true,true,false,false,true,
 'No cure period. No discrimination clause. Broad applicability.',
 'Texas AG','texasattorneygeneral.gov'),
('OR','Oregon','CPA','virginia_model','2024-07-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,false,true,true,
 'GPC required. Geolocation within 1,750 feet is sensitive data.',
 'Oregon AG','doj.state.or.us'),
('MT','Montana','CDPA','virginia_model','2024-10-01',true,
 '50,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,true,false,true,
 'Right to appeal controller decisions.',
 'Montana AG','dojmt.gov'),
('DE','Delaware','DPDPA','virginia_model','2025-01-01',true,
 '35,000+ consumers or 10,000+ if 20%+ revenue from data',
 true,true,false,false,true,NULL,'Delaware AG','attorneygeneral.delaware.gov'),
('IA','Iowa','CDPA','virginia_model','2025-01-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,false,false,false,true,
 'No right to correction. Narrower sensitive data definition.',
 'Iowa AG','iowaattorneygeneral.gov'),
('NE','Nebraska','NDPA','virginia_model','2025-01-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,false,false,true,NULL,'Nebraska AG','ago.nebraska.gov'),
('NH','New Hampshire','NHDPA','virginia_model','2025-01-01',true,
 '35,000+ consumers or 10,000+ if 25%+ revenue',
 true,true,false,false,true,NULL,'New Hampshire AG','doj.nh.gov'),
('NJ','New Jersey','NJDPA','virginia_model','2025-01-15',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,false,false,true,
 'GPC must be honoured. Broader sensitive data definition.',
 'New Jersey AG','njoag.gov'),
('TN','Tennessee','TIPA','virginia_model','2025-07-01',true,
 '175,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,false,false,true,
 'Bona fide loyalty programs exempt from sale definition.',
 'Tennessee AG','ag.tn.gov'),
('MN','Minnesota','MCDPA','virginia_model','2025-07-31',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,false,false,true,
 'Neural data specifically protected as sensitive data.',
 'Minnesota AG','ag.state.mn.us'),
('MD','Maryland','MODPA','maryland','2025-10-01',true,
 '35,000+ consumers or 10,000+ if 20%+ revenue',
 true,true,false,false,true,
 'Data minimisation requirement: collect only what is reasonably necessary.',
 'Maryland AG','marylandattorneygeneral.gov'),
('KY','Kentucky','KCDPA','virginia_model','2026-01-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,false,false,false,true,NULL,'Kentucky AG','ag.ky.gov'),
('IN','Indiana','ICDPA','virginia_model','2026-01-01',true,
 '100,000+ consumers or 25,000+ if 50%+ revenue',
 true,true,true,false,true,
 '45-day response time. Right to appeal.',
 'Indiana AG','in.gov/attorneygeneral'),
('RI','Rhode Island','RIDTPPA','virginia_model','2026-01-01',true,
 '35,000+ consumers or 10,000+ if 20%+ revenue',
 true,true,false,false,true,
 'Low applicability threshold. Strong breach notification provisions.',
 'Rhode Island AG','riag.ri.gov'),
('FL','Florida','FDBR','florida','2024-07-01',true,
 'Controllers with $1B+ global annual revenue AND meet specific data thresholds',
 true,false,false,false,true,
 'Extremely narrow scope — only large controllers.',
 'Florida AG','myfloridalegal.com'),
('IL','Illinois','Pending — IPRA','pending',NULL,false,
 'Bill re-introduced 2026. Expected Virginia model.',true,true,false,false,true,NULL,NULL,NULL),
('MA','Massachusetts','Pending — MIPSA','pending',NULL,false,
 'Bill re-introduced 2026. Expected Virginia model with enhancements.',true,true,false,false,true,NULL,NULL,NULL),
('NY','New York','Pending — NYDPA','pending',NULL,false,
 'Bill re-introduced 2026. Expected Virginia model.',true,true,false,false,true,NULL,NULL,NULL),
('PA','Pennsylvania','Pending — CDPA','pending',NULL,false,
 'Bill re-introduced 2026.',true,true,false,false,true,NULL,NULL,NULL);
