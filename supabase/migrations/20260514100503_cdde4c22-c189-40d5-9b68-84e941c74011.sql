create table if not exists public.homepage_spotlight (
  id uuid primary key default gen_random_uuid(),
  spotlight_date date not null,
  slot integer not null check (slot between 1 and 3),
  update_id uuid not null references public.updates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (spotlight_date, slot)
);

create index if not exists idx_homepage_spotlight_date
  on public.homepage_spotlight (spotlight_date desc);

alter table public.homepage_spotlight enable row level security;

drop policy if exists "Public read spotlight" on public.homepage_spotlight;
create policy "Public read spotlight"
  on public.homepage_spotlight
  for select
  using (true);

-- Daily cron: refresh the spotlight at 07:10 UTC (after morning ingestion).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'auto-select-spotlight-articles-daily') then
    perform cron.unschedule('auto-select-spotlight-articles-daily');
  end if;
end $$;

select cron.schedule(
  'auto-select-spotlight-articles-daily',
  '10 7 * * *',
  $cron$
  select net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/auto-select-spotlight-articles',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('source','cron')
  );
  $cron$
);