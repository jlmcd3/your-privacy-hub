-- ============================================================================
-- EU & Global Notice Builder — Prompt 1
-- ============================================================================

CREATE TABLE public.eu_notice_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ropa_session_id       uuid REFERENCES public.ropa_sessions(id),
  mode                  text NOT NULL DEFAULT 'standalone'
                          CHECK (mode IN ('ropa_powered','standalone')),
  status                text NOT NULL DEFAULT 'in_progress'
                          CHECK (status IN ('in_progress','review','generated','archived')),
  scope                 text NOT NULL DEFAULT 'single'
                          CHECK (scope IN ('single','suite','full_international')),
  version_number        integer NOT NULL DEFAULT 1,
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  last_activity_at      timestamptz NOT NULL DEFAULT now(),
  payment_confirmed     boolean NOT NULL DEFAULT false,
  paid_at               timestamptz,
  is_refresh            boolean NOT NULL DEFAULT false,
  parent_session_id     uuid REFERENCES public.eu_notice_sessions(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_eu_notice_sessions_updated
  BEFORE UPDATE ON public.eu_notice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_eu_notice_sessions_client ON public.eu_notice_sessions(client_id);

CREATE TABLE public.eu_notice_framework_selections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.eu_notice_sessions(id) ON DELETE CASCADE,
  framework_code    text NOT NULL,
  framework_name    text NOT NULL,
  region            text NOT NULL,
  UNIQUE (session_id, framework_code)
);
CREATE INDEX idx_eu_notice_fw_sel_session ON public.eu_notice_framework_selections(session_id);

CREATE TABLE public.eu_notice_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.eu_notice_sessions(id) ON DELETE CASCADE,
  ropa_activity_id  uuid REFERENCES public.ropa_processing_activities(id),
  question_key      text NOT NULL,
  answer_value      jsonb NOT NULL,
  answered_at       timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_eu_notice_answers_univ
  ON public.eu_notice_answers(session_id, question_key)
  WHERE ropa_activity_id IS NULL;
CREATE UNIQUE INDEX idx_eu_notice_answers_act
  ON public.eu_notice_answers(session_id, ropa_activity_id, question_key)
  WHERE ropa_activity_id IS NOT NULL;
CREATE INDEX idx_eu_notice_answers_session ON public.eu_notice_answers(session_id);

CREATE TABLE public.eu_notice_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.eu_notice_sessions(id),
  client_id         uuid NOT NULL REFERENCES public.clients(id),
  framework_code    text NOT NULL,
  is_combined       boolean NOT NULL DEFAULT false,
  version_number    integer NOT NULL DEFAULT 1,
  document_format   text NOT NULL CHECK (document_format IN ('pdf','docx','html','txt')),
  file_path         text NOT NULL,
  file_size_bytes   integer,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  is_current        boolean NOT NULL DEFAULT true,
  UNIQUE (session_id, framework_code, document_format)
);
CREATE INDEX idx_eu_notice_documents_client ON public.eu_notice_documents(client_id);
CREATE INDEX idx_eu_notice_documents_session ON public.eu_notice_documents(session_id);

CREATE TABLE public.eu_privacy_frameworks (
  framework_code    text PRIMARY KEY,
  framework_name    text NOT NULL,
  region            text NOT NULL,
  full_law_name     text NOT NULL,
  template_type     text NOT NULL
    CHECK (template_type IN ('gdpr','lgpd','appi','dpdpa','popia','pipeda','pipa','pdpa','pdpl')),
  is_active         boolean NOT NULL DEFAULT true,
  effective_date    date,
  enforcement_body  text,
  enforcement_url   text,
  notes             text
);

-- RLS
ALTER TABLE public.eu_notice_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eu_notice_framework_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eu_notice_answers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eu_notice_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eu_privacy_frameworks          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eu_notice_sessions_owner" ON public.eu_notice_sessions
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "eu_notice_fw_sel_owner" ON public.eu_notice_framework_selections
  FOR ALL USING (session_id IN (
    SELECT id FROM public.eu_notice_sessions WHERE public.owns_client(client_id)))
  WITH CHECK (session_id IN (
    SELECT id FROM public.eu_notice_sessions WHERE public.owns_client(client_id)));

CREATE POLICY "eu_notice_answers_owner" ON public.eu_notice_answers
  FOR ALL USING (session_id IN (
    SELECT id FROM public.eu_notice_sessions WHERE public.owns_client(client_id)))
  WITH CHECK (session_id IN (
    SELECT id FROM public.eu_notice_sessions WHERE public.owns_client(client_id)));

CREATE POLICY "eu_notice_docs_owner" ON public.eu_notice_documents
  FOR ALL USING (public.owns_client(client_id))
  WITH CHECK (public.owns_client(client_id));

CREATE POLICY "eu_notice_fw_read" ON public.eu_privacy_frameworks
  FOR SELECT USING (true);

-- Seed eu_privacy_frameworks (12 records)
INSERT INTO public.eu_privacy_frameworks
  (framework_code, framework_name, region, full_law_name, template_type, effective_date, is_active, enforcement_body, enforcement_url, notes)
VALUES
('EU_GDPR','EU/EEA','EU/EEA','General Data Protection Regulation (EU) 2016/679','gdpr','2018-05-25',true,'European Data Protection Board + national DPAs','https://edpb.europa.eu',NULL),
('UK_GDPR','United Kingdom','UK','UK GDPR + Data Protection Act 2018','gdpr','2021-01-01',true,'Information Commissioner''s Office (ICO)','https://ico.org.uk','Post-Brexit UK GDPR'),
('CH_FADP','Switzerland','Europe','Federal Act on Data Protection (nFADP)','gdpr','2023-09-01',true,'Federal Data Protection and Information Commissioner (FDPIC)','https://fdpic.ch','Revised FADP — significant GDPR alignment'),
('BR_LGPD','Brazil','Americas','Lei Geral de Proteção de Dados Pessoais','lgpd','2020-09-18',true,'Autoridade Nacional de Proteção de Dados (ANPD)','https://gov.br/anpd',NULL),
('JP_APPI','Japan','Asia-Pacific','Act on the Protection of Personal Information (APPI)','appi','2022-04-01',true,'Personal Information Protection Commission (PPC)','https://ppc.go.jp','Major 2022 amendments'),
('IN_DPDPA','India','Asia-Pacific','Digital Personal Data Protection Act 2023','dpdpa','2025-01-01',true,'Data Protection Board of India','https://meity.gov.in','Rules expected Q1 2025'),
('ZA_POPIA','South Africa','Africa','Protection of Personal Information Act 4 of 2013','popia','2021-07-01',true,'Information Regulator','https://inforegulator.org.za',NULL),
('CA_PIPEDA','Canada','Americas','Personal Information Protection and Electronic Documents Act','pipeda','2000-01-01',true,'Office of the Privacy Commissioner of Canada','https://priv.gc.ca','Quebec Law 25 strengthens requirements'),
('AU_PRIVACY','Australia','Asia-Pacific','Privacy Act 1988 (as amended)','pipeda','1988-12-21',true,'Office of the Australian Information Commissioner','https://oaic.gov.au','Major reform Bill introduced 2024'),
('KR_PIPA','South Korea','Asia-Pacific','Personal Information Protection Act (PIPA)','pipa','2022-09-15',true,'Personal Information Protection Commission (PIPC)','https://pipc.go.kr','PIPA 2023 amendments strengthen rights'),
('SG_PDPA','Singapore','Asia-Pacific','Personal Data Protection Act 2012','pdpa','2021-02-01',true,'Personal Data Protection Commission (PDPC)','https://pdpc.gov.sg',NULL),
('AE_PDPL','UAE','Middle East','Personal Data Protection Law (PDPL)','pdpl','2023-09-20',true,'UAE Data Office','https://uaedataoffice.gov.ae','Federal law applies to UAE mainland');

-- Storage bucket for generated EU notices (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('eu-notices', 'eu-notices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: each owner can read/write notices they own.
-- File paths are scoped as {client_id}/{session_id}/...
CREATE POLICY "eu_notices_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'eu-notices'
    AND public.owns_client((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "eu_notices_owner_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'eu-notices'
    AND public.owns_client((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "eu_notices_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'eu-notices'
    AND public.owns_client((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "eu_notices_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'eu-notices'
    AND public.owns_client((storage.foldername(name))[1]::uuid)
  );