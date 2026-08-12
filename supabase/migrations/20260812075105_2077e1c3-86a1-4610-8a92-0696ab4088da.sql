alter table public.quality_findings add column if not exists filtered_from_scoring boolean not null default false;
alter table public.quality_findings add column if not exists calibration_rule text;
create index if not exists quality_findings_filtered on public.quality_findings(run_id) where filtered_from_scoring;