-- ============================================================
-- Regulatory Milestones: structured replacement for the
-- hand-curated regulatory_calendar.json. Additive only — the
-- existing Calendar UI continues to work from JSON until the
-- frontend is switched to read from this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regulatory_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical law name, matches src/data/lawRegistry.ts entries
  law_slug text NOT NULL,
  -- effective_date | enforcement_start | comment_deadline | review_date | deadline | key_date
  milestone_type text NOT NULL,
  milestone_date date NOT NULL,
  title text NOT NULL,
  description text,
  jurisdiction text NOT NULL,
  -- Official notice URL specific to THIS milestone (may differ from law's officialUrl)
  source_url text,
  -- When a human (or automated check) last confirmed this milestone is still accurate
  verified_at timestamptz,
  -- If this milestone has been superseded by a newer one (delay, court ruling, etc.)
  superseded_by uuid REFERENCES public.regulatory_milestones(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_milestones_date ON public.regulatory_milestones(milestone_date);
CREATE INDEX IF NOT EXISTS idx_reg_milestones_law  ON public.regulatory_milestones(law_slug);
CREATE INDEX IF NOT EXISTS idx_reg_milestones_active ON public.regulatory_milestones(milestone_date) WHERE superseded_by IS NULL;

ALTER TABLE public.regulatory_milestones ENABLE ROW LEVEL SECURITY;

-- Public read of active (non-superseded) milestones
DROP POLICY IF EXISTS "Regulatory milestones are publicly readable" ON public.regulatory_milestones;
CREATE POLICY "Regulatory milestones are publicly readable"
  ON public.regulatory_milestones FOR SELECT
  USING (superseded_by IS NULL);

-- Writes restricted to service_role (no INSERT/UPDATE/DELETE policies)

CREATE TRIGGER trg_regulatory_milestones_updated_at
  BEFORE UPDATE ON public.regulatory_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Seed with the current calendar JSON (idempotent via title+date)
-- ============================================================
INSERT INTO public.regulatory_milestones
  (law_slug, milestone_type, milestone_date, title, description, jurisdiction, verified_at)
VALUES
  ('Indiana SB 5',        'effective_date',     '2026-01-01', 'Indiana Comprehensive Privacy Law Effective', 'Indiana''s comprehensive consumer data privacy law takes effect, granting residents rights to access, delete, and opt out of the sale of personal data.', 'U.S. — Indiana', now()),
  ('Kentucky HB 15',      'effective_date',     '2026-01-01', 'Kentucky Consumer Data Protection Act Effective', 'Kentucky''s KCDPA takes effect with consumer rights modeled on Virginia''s VCDPA.', 'U.S. — Kentucky', now()),
  ('Rhode Island HB 6122','effective_date',     '2026-01-01', 'Rhode Island Data Transparency and Privacy Protection Act Effective', 'Rhode Island''s comprehensive privacy law takes effect covering consumer data rights.', 'U.S. — Rhode Island', now()),
  ('Colorado SB 24-205',  'effective_date',     '2026-02-01', 'Colorado Algorithmic Accountability Act Effective', 'Colorado''s law requiring deployers of high-risk AI systems to conduct impact assessments and provide consumer disclosures takes effect.', 'U.S. — Colorado', now()),
  ('Maryland MODPA',      'effective_date',     '2026-04-01', 'Maryland Online Data Privacy Act Effective', 'Maryland''s comprehensive privacy law takes effect with strict data minimization requirements and restrictions on targeted advertising to minors.', 'U.S. — Maryland', now()),
  ('EU AI Act',           'effective_date',     '2026-06-15', 'EU AI Act — High-Risk AI Obligations Apply', 'Obligations for providers of high-risk AI systems (Annex III) begin, including conformity assessments, risk management, and data governance requirements.', 'European Union', now()),
  ('Minnesota HF 2309',   'effective_date',     '2026-07-01', 'Minnesota Consumer Data Privacy Act Effective', 'Minnesota''s comprehensive privacy law takes effect providing consumer data rights including a private right of action provision.', 'U.S. — Minnesota', now()),
  ('EU AI Act',           'enforcement_start',  '2026-08-02', 'EU AI Act — Full Implementation (Prohibited Practices)', 'Full implementation of the EU AI Act including enforcement of prohibited AI practices such as social scoring, real-time biometric identification in public spaces, and manipulative AI systems.', 'European Union', now()),
  ('LGPD',                'effective_date',     '2026-09-01', 'ANPD International Transfer Rules Effective (Brazil)', 'Brazil''s ANPD international data transfer regulations under the LGPD take full effect, requiring standard contractual clauses for cross-border transfers.', 'Brazil', now()),
  ('Nebraska LB 1074',    'effective_date',     '2026-10-01', 'Nebraska Data Privacy Act Effective', 'Nebraska''s comprehensive privacy law takes effect with data subject access, deletion, and opt-out rights.', 'Nebraska', now()),
  ('CPRA',                'enforcement_start',  '2027-01-01', 'CPPA ADMT Regulations Enforcement Begins', 'California Privacy Protection Agency begins enforcement of Automated Decision-Making Technology regulations requiring pre-use notices and opt-out rights.', 'U.S. — California', now()),
  ('SB 362',              'effective_date',     '2027-01-01', 'California Delete Act (Opt Me Out) Effective', 'California''s Delete Act establishing a browser-level mechanism for consumers to opt out of data broker activity takes effect.', 'U.S. — California', now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- Drift alerts: stores findings from the drift-detect edge function
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regulatory_drift_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid REFERENCES public.regulatory_milestones(id) ON DELETE CASCADE,
  law_slug text NOT NULL,
  signal_keyword text NOT NULL,        -- 'delayed', 'postponed', 'enjoined', etc.
  matched_update_id uuid,              -- references public.updates(id)
  matched_update_title text,
  matched_update_url text,
  matched_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drift_alerts_unreviewed ON public.regulatory_drift_alerts(matched_at DESC) WHERE reviewed = false;
CREATE INDEX IF NOT EXISTS idx_drift_alerts_law ON public.regulatory_drift_alerts(law_slug);

ALTER TABLE public.regulatory_drift_alerts ENABLE ROW LEVEL SECURITY;
-- No SELECT policy: internal/admin only via service_role

-- ============================================================
-- Tag updates with law_slug for clean joins
-- ============================================================
ALTER TABLE public.updates ADD COLUMN IF NOT EXISTS law_slug text;
CREATE INDEX IF NOT EXISTS idx_updates_law_slug ON public.updates(law_slug);
