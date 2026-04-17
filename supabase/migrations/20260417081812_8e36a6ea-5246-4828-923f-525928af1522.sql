
-- DPA Generator documents
CREATE TABLE public.dpa_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_text TEXT,
  report_data JSONB,
  pdf_url TEXT,
  purchased_as_standalone BOOLEAN DEFAULT false,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dpa_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dpa documents"
  ON public.dpa_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages dpa documents"
  ON public.dpa_documents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- IR Playbook documents
CREATE TABLE public.ir_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  playbook_text TEXT,
  report_data JSONB,
  pdf_url TEXT,
  purchased_as_standalone BOOLEAN DEFAULT false,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ir_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ir playbooks"
  ON public.ir_playbooks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages ir playbooks"
  ON public.ir_playbooks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Biometric Compliance assessments
CREATE TABLE public.biometric_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  jurisdictions TEXT[] DEFAULT '{}'::text[],
  analysis_text TEXT,
  report_data JSONB,
  pdf_url TEXT,
  is_free_tier BOOLEAN DEFAULT false,
  purchased_as_standalone BOOLEAN DEFAULT false,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.biometric_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own biometric assessments"
  ON public.biometric_assessments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages biometric assessments"
  ON public.biometric_assessments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Indexes for user lookup
CREATE INDEX idx_dpa_documents_user ON public.dpa_documents(user_id, created_at DESC);
CREATE INDEX idx_ir_playbooks_user ON public.ir_playbooks(user_id, created_at DESC);
CREATE INDEX idx_biometric_assessments_user ON public.biometric_assessments(user_id, created_at DESC);
