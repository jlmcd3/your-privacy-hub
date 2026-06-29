-- Deduplicate existing rows (keep latest) before adding the unique constraint.
DELETE FROM public.quality_fix_deliberations a
USING public.quality_fix_deliberations b
WHERE a.run_id = b.run_id AND a.check_id = b.check_id AND a.ctid < b.ctid;

DELETE FROM public.registry_proposals a
USING public.registry_proposals b
WHERE a.run_id = b.run_id AND a.check_id = b.check_id AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS quality_fix_deliberations_run_check_uidx
  ON public.quality_fix_deliberations (run_id, check_id);

CREATE UNIQUE INDEX IF NOT EXISTS registry_proposals_run_check_uidx
  ON public.registry_proposals (run_id, check_id);