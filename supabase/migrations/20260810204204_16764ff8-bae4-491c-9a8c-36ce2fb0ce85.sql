alter table public.quality_batch_runs add column if not exists grader_mode text;
alter table public.quality_runs add column if not exists grader_mode text;
alter table public.quality_batch_runs add constraint quality_batch_runs_grader_mode_chk check (grader_mode is null or grader_mode = 'skeleton') not valid;
alter table public.quality_runs add constraint quality_runs_grader_mode_chk check (grader_mode is null or grader_mode = 'skeleton') not valid;