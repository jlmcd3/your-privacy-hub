create table public.sample_reports (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null,
  variant text not null default 'default',
  title text not null,
  scenario_summary text not null,
  fixture jsonb not null default '{}'::jsonb,
  source_table text,
  source_row_id uuid,
  report_data jsonb,
  document_text text,
  verification jsonb,
  pdf_path text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (tool_slug, variant)
);

grant select on public.sample_reports to anon, authenticated;
grant all on public.sample_reports to service_role;

alter table public.sample_reports enable row level security;

create policy "public read published samples"
  on public.sample_reports for select
  using (status = 'published');

create trigger update_sample_reports_updated_at
  before update on public.sample_reports
  for each row execute function public.update_updated_at_column();