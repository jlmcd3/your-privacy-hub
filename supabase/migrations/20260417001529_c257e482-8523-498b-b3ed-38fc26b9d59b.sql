
-- ── LI ASSESSMENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','complete','failed')),
  processing_description TEXT NOT NULL,
  data_categories TEXT[] DEFAULT '{}',
  relationship_type TEXT,
  jurisdictions TEXT[] DEFAULT '{}',
  sector TEXT,
  stated_purpose TEXT,
  alternatives_considered TEXT,
  report_data JSONB,
  purchased_as_standalone BOOLEAN DEFAULT FALSE,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT FALSE,
  report_version INTEGER DEFAULT 1
);

ALTER TABLE public.li_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own li assessments"
  ON public.li_assessments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── GOVERNANCE READINESS ASSESSMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.governance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','complete','failed')),
  intake_data JSONB NOT NULL DEFAULT '{}',
  report_data JSONB,
  dpia_scope JSONB,
  purchased_as_standalone BOOLEAN DEFAULT FALSE,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT FALSE,
  report_version INTEGER DEFAULT 1
);

ALTER TABLE public.governance_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own governance assessments"
  ON public.governance_assessments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── DPIA FRAMEWORKS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dpia_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','complete','failed')),
  source_assessment_id UUID REFERENCES public.governance_assessments(id) ON DELETE SET NULL,
  intake_data JSONB NOT NULL DEFAULT '{}',
  report_data JSONB,
  purchased_as_standalone BOOLEAN DEFAULT FALSE,
  purchase_price_cents INTEGER,
  stripe_payment_intent_id TEXT,
  is_subscriber_credit BOOLEAN DEFAULT FALSE,
  report_version INTEGER DEFAULT 1
);

ALTER TABLE public.dpia_frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dpia frameworks"
  ON public.dpia_frameworks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── ASSESSMENT PURCHASES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tool_type TEXT NOT NULL
    CHECK (tool_type IN ('li_assessment','governance_assessment','dpia_framework')),
  assessment_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded')),
  subscriber_at_time BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.assessment_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases"
  ON public.assessment_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ── INDEXES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_li_assessments_user_id
  ON public.li_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_governance_assessments_user_id
  ON public.governance_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_dpia_frameworks_user_id
  ON public.dpia_frameworks(user_id);
CREATE INDEX IF NOT EXISTS idx_dpia_frameworks_source_assessment
  ON public.dpia_frameworks(source_assessment_id);
