
-- Helper function FIRST (referenced by triggers below)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. JURISDICTION REQUIREMENTS
CREATE TABLE public.jurisdiction_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL UNIQUE,
  jurisdiction_name TEXT NOT NULL,
  region TEXT NOT NULL,
  law_name TEXT NOT NULL,
  authority_name TEXT NOT NULL,
  authority_url TEXT,
  registration_required BOOLEAN NOT NULL DEFAULT false,
  registration_threshold TEXT,
  ai_registration_required BOOLEAN NOT NULL DEFAULT false,
  ai_threshold TEXT,
  dpo_required BOOLEAN NOT NULL DEFAULT false,
  dpo_threshold TEXT,
  representative_required BOOLEAN NOT NULL DEFAULT false,
  representative_threshold TEXT,
  filing_fee_cents INTEGER,
  filing_currency TEXT,
  renewal_period_months INTEGER,
  language_requirements TEXT[],
  online_filing_available BOOLEAN NOT NULL DEFAULT false,
  filing_portal_url TEXT,
  notes TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jur_req_region ON public.jurisdiction_requirements(region);
CREATE INDEX idx_jur_req_code ON public.jurisdiction_requirements(jurisdiction_code);

-- 2. REGISTRATION ASSESSMENTS
CREATE TABLE public.registration_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  shareable_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  email TEXT,
  organization_name TEXT,
  organization_size TEXT,
  organization_country TEXT,
  industry TEXT,
  intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_jurisdictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  confidence_tier TEXT,
  result_summary JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  converted_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reg_assess_user ON public.registration_assessments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_reg_assess_token ON public.registration_assessments(shareable_token);
CREATE INDEX idx_reg_assess_email ON public.registration_assessments(email) WHERE email IS NOT NULL;

-- 3. REGISTRATION ORDERS
CREATE TABLE public.registration_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.registration_assessments(id),
  tier TEXT NOT NULL,
  jurisdictions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  organization_snapshot JSONB NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_payment',
  documents_generated_at TIMESTAMPTZ,
  filed_at TIMESTAMPTZ,
  next_renewal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reg_orders_user ON public.registration_orders(user_id);
CREATE INDEX idx_reg_orders_status ON public.registration_orders(fulfillment_status);
CREATE INDEX idx_reg_orders_renewal ON public.registration_orders(next_renewal_at) WHERE next_renewal_at IS NOT NULL;

-- 4. REGISTRATION DOCUMENTS
CREATE TABLE public.registration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  jurisdiction_code TEXT NOT NULL,
  document_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  content_text TEXT,
  pdf_url TEXT,
  generation_model TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reg_docs_order ON public.registration_documents(order_id);

-- 5. REGISTRATION FILINGS
CREATE TABLE public.registration_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  jurisdiction_code TEXT NOT NULL,
  filing_method TEXT,
  filing_reference TEXT,
  filed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmation_url TEXT,
  confirmation_pdf_url TEXT,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reg_filings_order ON public.registration_filings(order_id);
CREATE INDEX idx_reg_filings_expires ON public.registration_filings(expires_at) WHERE expires_at IS NOT NULL;

-- 6. JURISDICTION MONITORING LOG
CREATE TABLE public.jurisdiction_monitoring_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code TEXT NOT NULL,
  check_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewer_notes TEXT
);
CREATE INDEX idx_monitoring_jur ON public.jurisdiction_monitoring_log(jurisdiction_code);
CREATE INDEX idx_monitoring_unreviewed ON public.jurisdiction_monitoring_log(reviewed) WHERE reviewed = false;

-- 7. RENEWAL NOTIFICATIONS
CREATE TABLE public.renewal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  filing_id UUID REFERENCES public.registration_filings(id),
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  UNIQUE(order_id, notification_type)
);
CREATE INDEX idx_renewal_notif_order ON public.renewal_notifications(order_id);

-- 8. REGISTRATION AUDIT LOG
CREATE TABLE public.registration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.registration_orders(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.registration_assessments(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_order ON public.registration_audit_log(order_id);
CREATE INDEX idx_audit_assessment ON public.registration_audit_log(assessment_id);

-- TRIGGERS
CREATE TRIGGER trg_jur_req_updated BEFORE UPDATE ON public.jurisdiction_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reg_assess_updated BEFORE UPDATE ON public.registration_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reg_orders_updated BEFORE UPDATE ON public.registration_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reg_docs_updated BEFORE UPDATE ON public.registration_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.jurisdiction_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_monitoring_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read jurisdiction requirements"
  ON public.jurisdiction_requirements FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can create an assessment"
  ON public.registration_assessments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users see own assessments"
  ON public.registration_assessments FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users update own assessments"
  ON public.registration_assessments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own orders"
  ON public.registration_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users see own documents"
  ON public.registration_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registration_orders o WHERE o.id = registration_documents.order_id AND o.user_id = auth.uid()));

CREATE POLICY "Users see own filings"
  ON public.registration_filings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.registration_orders o WHERE o.id = registration_filings.order_id AND o.user_id = auth.uid()));
