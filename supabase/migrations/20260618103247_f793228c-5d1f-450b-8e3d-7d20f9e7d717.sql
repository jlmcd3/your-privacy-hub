
-- Quality Refinement Loop — complete schema
create table public.quality_runs (
  id                    uuid primary key default gen_random_uuid(),
  tool                  text not null,
  status                text not null default 'pending',
  batch_size            integer not null default 10,
  run_number            integer not null default 1,
  error                 text,
  score_accuracy        numeric,
  score_citation        numeric,
  score_hallucination   numeric,
  score_analysis        numeric,
  score_intelligence    numeric,
  score_formatting      numeric,
  score_overall         numeric,
  gpt_score_accuracy    numeric,
  gpt_score_citation    numeric,
  gpt_score_hallucination numeric,
  gpt_score_analysis    numeric,
  gpt_score_intelligence numeric,
  gpt_score_formatting  numeric,
  gpt_score_overall     numeric,
  cross_review_complete boolean not null default false,
  gpt_only_count        integer not null default 0,
  conflict_count        integer not null default 0,
  checks_total          integer default 0,
  checks_passed         integer default 0,
  checks_failed         integer default 0,
  started_at            timestamptz default now(),
  completed_at          timestamptz,
  created_by            uuid references auth.users(id) on delete set null
);

create table public.quality_run_documents (
  id                  uuid primary key default gen_random_uuid(),
  run_id              uuid not null references public.quality_runs(id) on delete cascade,
  tool                text not null,
  doc_number          integer not null,
  intake_data         jsonb not null,
  report_data         jsonb,
  source_table        text,
  source_row_id       text,
  dimension_scores    jsonb,
  overall_score       numeric,
  gpt_evaluation      jsonb,
  gpt_dimension_scores jsonb,
  gpt_overall_score   numeric,
  cross_review        jsonb,
  cross_review_status text,
  status              text not null default 'pending',
  error               text,
  created_at          timestamptz default now()
);

create table public.quality_findings (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.quality_runs(id) on delete cascade,
  doc_id      uuid references public.quality_run_documents(id) on delete cascade,
  tool        text not null,
  run_number  integer not null,
  check_id    text not null,
  check_type  text not null,
  dimension   text not null,
  severity    text not null,
  passed      boolean not null,
  evidence    text,
  created_at  timestamptz default now()
);

create table public.quality_check_results (
  id                    uuid primary key default gen_random_uuid(),
  run_id                uuid not null references public.quality_runs(id) on delete cascade,
  tool                  text not null,
  run_number            integer not null,
  check_id              text not null,
  check_type            text not null,
  dimension             text not null,
  severity              text not null,
  pass_count            integer not null default 0,
  fail_count            integer not null default 0,
  fail_rate             numeric not null default 0,
  sample_evidence       text[],
  gpt_pass_count        integer,
  gpt_fail_count        integer,
  gpt_fail_rate         numeric,
  gpt_sample_evidence   text[],
  cross_review_category text,
  cross_review_summary  text,
  proposed_fix          text,
  fix_location          text,
  fix_selected          boolean not null default false,
  fix_applied           boolean not null default false,
  fix_commit_sha        text,
  fix_applied_at        timestamptz,
  unique(run_id, check_id)
);

create table public.quality_applied_patches (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid not null references public.quality_runs(id) on delete cascade,
  check_result_id   uuid references public.quality_check_results(id) on delete set null,
  tool              text not null,
  edge_function     text not null,
  file_path         text not null,
  check_id          text not null,
  patch_description text not null,
  old_text          text not null,
  new_text          text not null,
  commit_sha        text,
  commit_url        text,
  applied_by        uuid references auth.users(id) on delete set null,
  applied_at        timestamptz default now()
);

grant select,insert,update,delete on public.quality_runs             to authenticated;
grant select,insert,update,delete on public.quality_run_documents    to authenticated;
grant select,insert,update,delete on public.quality_findings         to authenticated;
grant select,insert,update,delete on public.quality_check_results    to authenticated;
grant select,insert,update,delete on public.quality_applied_patches  to authenticated;
grant all on public.quality_runs             to service_role;
grant all on public.quality_run_documents    to service_role;
grant all on public.quality_findings         to service_role;
grant all on public.quality_check_results    to service_role;
grant all on public.quality_applied_patches  to service_role;

alter table public.quality_runs             enable row level security;
alter table public.quality_run_documents    enable row level security;
alter table public.quality_findings         enable row level security;
alter table public.quality_check_results    enable row level security;
alter table public.quality_applied_patches  enable row level security;

create policy "Admin quality_runs" on public.quality_runs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admin quality_run_documents" on public.quality_run_documents for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admin quality_findings" on public.quality_findings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admin quality_check_results" on public.quality_check_results for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admin quality_applied_patches" on public.quality_applied_patches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create index quality_docs_run     on public.quality_run_documents(run_id);
create index quality_findings_run on public.quality_findings(run_id);
create index quality_checks_run   on public.quality_check_results(run_id);
create index quality_patches_tool on public.quality_applied_patches(tool, applied_at);
