ALTER TABLE public.dpia_frameworks ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.governance_assessments ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.ir_playbooks ADD COLUMN IF NOT EXISTS organization_name TEXT;