CREATE TABLE public.edpb_oss_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type TEXT NOT NULL DEFAULT 'oss_decision',
  case_reference TEXT NOT NULL,
  title TEXT,
  decision_date DATE,
  lead_sa TEXT,
  concerned_sas TEXT[] NOT NULL DEFAULT '{}',
  gdpr_provisions TEXT[] NOT NULL DEFAULT '{}',
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  outcomes TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  summary_text TEXT,
  source_url TEXT,
  decision_pdf_url TEXT,
  source_document_text TEXT,
  status TEXT NOT NULL DEFAULT 'final',
  content_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT edpb_oss_decisions_doc_type_chk CHECK (doc_type IN ('oss_decision','case_digest'))
);

GRANT SELECT ON public.edpb_oss_decisions TO anon;
GRANT SELECT ON public.edpb_oss_decisions TO authenticated;
GRANT ALL ON public.edpb_oss_decisions TO service_role;

ALTER TABLE public.edpb_oss_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EDPB OSS decisions are publicly readable"
  ON public.edpb_oss_decisions FOR SELECT
  USING (true);

CREATE UNIQUE INDEX edpb_oss_decisions_ref_uniq
  ON public.edpb_oss_decisions (doc_type, case_reference);
CREATE INDEX edpb_oss_decisions_date_idx ON public.edpb_oss_decisions (decision_date DESC);
CREATE INDEX edpb_oss_decisions_lead_sa_idx ON public.edpb_oss_decisions (lead_sa);
CREATE INDEX edpb_oss_decisions_provisions_idx ON public.edpb_oss_decisions USING GIN (gdpr_provisions);
CREATE INDEX edpb_oss_decisions_csa_idx ON public.edpb_oss_decisions USING GIN (concerned_sas);

CREATE TRIGGER update_edpb_oss_decisions_updated_at
  BEFORE UPDATE ON public.edpb_oss_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();