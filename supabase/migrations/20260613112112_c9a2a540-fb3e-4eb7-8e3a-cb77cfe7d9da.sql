alter table public.static_stress_batches
  add column if not exists setup_total integer not null default 0,
  add column if not exists setup_done  integer not null default 0,
  add column if not exists selected_tools text[],
  add column if not exists companies jsonb not null default '[]'::jsonb;