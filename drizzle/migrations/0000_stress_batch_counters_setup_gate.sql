-- SETUP-GATE LAW (2026-09-02): the batch counter RPCs published
-- status='complete' as soon as completed+failed >= total_jobs, ignoring
-- whether fixture setup had finished inserting the remaining companies.
-- A batch whose first company's single job finished went terminal at
-- setup_done 1/4, detaching the panel monitor. Both RPCs now require
-- setup_done >= setup_total (setup_total > 0) before going terminal.
CREATE OR REPLACE FUNCTION public.increment_batch_completed(batch_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  update public.static_stress_batches
  set completed_jobs = completed_jobs + 1,
      status = case
                 when completed_jobs + 1 + failed_jobs >= total_jobs
                  and setup_total > 0
                  and setup_done >= setup_total then 'complete'
                 else 'running'
               end,
      completed_at = case
                       when completed_jobs + 1 + failed_jobs >= total_jobs
                        and setup_total > 0
                        and setup_done >= setup_total then now()
                       else null
                     end
  where id = batch_id;
$function$;

CREATE OR REPLACE FUNCTION public.increment_batch_failed(batch_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  update public.static_stress_batches
  set failed_jobs = failed_jobs + 1,
      status = case
                 when completed_jobs + failed_jobs + 1 >= total_jobs
                  and setup_total > 0
                  and setup_done >= setup_total then 'complete'
                 else 'running'
               end,
      completed_at = case
                       when completed_jobs + failed_jobs + 1 >= total_jobs
                        and setup_total > 0
                        and setup_done >= setup_total then now()
                       else null
                     end
  where id = batch_id;
$function$;