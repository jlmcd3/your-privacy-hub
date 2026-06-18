UPDATE public.quality_runs SET cancel_requested = true, status = 'error' WHERE status IN ('pending','generating','building','evaluating');
DELETE FROM public.quality_applied_patches WHERE run_id IN (SELECT id FROM public.quality_runs);
DELETE FROM public.quality_findings WHERE run_id IN (SELECT id FROM public.quality_runs);
DELETE FROM public.quality_check_results WHERE run_id IN (SELECT id FROM public.quality_runs);
DELETE FROM public.quality_run_documents WHERE run_id IN (SELECT id FROM public.quality_runs);
DELETE FROM public.quality_runs;