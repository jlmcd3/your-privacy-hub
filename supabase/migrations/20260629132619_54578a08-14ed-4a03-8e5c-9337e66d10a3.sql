
UPDATE long_running_jobs SET status='cancelled', completed_at=now(), error='cancelled by user' WHERE status IN ('pending','running');
UPDATE tool_improvement_cycles SET status='cancelled', last_error='cancelled by user', updated_at=now() WHERE status NOT IN ('completed','failed','error','cancelled');
UPDATE quality_runs SET status='cancelled' WHERE status NOT IN ('completed','failed','error','cancelled');
UPDATE static_stress_batches SET status='cancelled' WHERE status NOT IN ('completed','failed','error','cancelled');
UPDATE static_stress_jobs SET status='cancelled' WHERE status NOT IN ('completed','failed','error','cancelled');

DELETE FROM quality_fix_deliberations;
DELETE FROM registry_proposals;
DELETE FROM quality_findings;
DELETE FROM quality_reviews;
DELETE FROM quality_check_results;
DELETE FROM quality_run_documents;
DELETE FROM quality_applied_patches;
DELETE FROM quality_validate_fix_runs;
DELETE FROM golden_results;
DELETE FROM static_stress_jobs;
DELETE FROM static_stress_batches;
DELETE FROM quality_runs;
DELETE FROM tool_improvement_cycles;
DELETE FROM long_running_jobs;
DELETE FROM function_run_log;
DELETE FROM function_runs;
