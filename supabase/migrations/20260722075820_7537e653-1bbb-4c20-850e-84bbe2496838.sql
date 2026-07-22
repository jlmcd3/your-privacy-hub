
-- Extensions for the 15-minute campaign tick (schedule registered separately).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Campaign linkage on existing quality tables.
alter table public.quality_runs        add column if not exists campaign_id uuid;
alter table public.quality_batch_runs  add column if not exists campaign_id uuid;
create index if not exists quality_runs_campaign_id_idx       on public.quality_runs(campaign_id);
create index if not exists quality_batch_runs_campaign_id_idx on public.quality_batch_runs(campaign_id);

-- 1) quality_campaigns
create table if not exists public.quality_campaigns (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'paused'
    check (status in ('paused','active','complete','killed')),
  created_by uuid,
  wave_interval_minutes integer not null default 360,
  concurrency integer not null default 3,
  tool_state jsonb not null default '{}'::jsonb,
  wave_number integer not null default 0,
  last_wave_started_at timestamptz,
  estimated_spend_cents integer not null default 0,
  budget_cap_cents integer not null default 60000, -- $600
  progress_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select, insert, update, delete on public.quality_campaigns to authenticated;
grant all on public.quality_campaigns to service_role;
alter table public.quality_campaigns enable row level security;
create policy "Admin quality_campaigns"
  on public.quality_campaigns for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- 2) quality_campaign_digests
create table if not exists public.quality_campaign_digests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.quality_campaigns(id) on delete cascade,
  wave_number integer,
  tool text not null,
  run_id uuid,
  claude_overall numeric,
  gpt_overall numeric,
  claude_dimensions jsonb,
  gpt_dimensions jsonb,
  failing_checks jsonb,
  post_filter_drops jsonb,
  estimated_tokens jsonb,
  token_basis text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quality_campaign_digests to authenticated;
grant all on public.quality_campaign_digests to service_role;
alter table public.quality_campaign_digests enable row level security;
create policy "Admin quality_campaign_digests"
  on public.quality_campaign_digests for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger (function may already exist)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql set search_path = public;

drop trigger if exists set_updated_at_quality_campaigns on public.quality_campaigns;
create trigger set_updated_at_quality_campaigns
  before update on public.quality_campaigns
  for each row execute function public.update_updated_at_column();

-- Seed exactly one paused campaign row.
insert into public.quality_campaigns (status, wave_interval_minutes, concurrency, tool_state)
select 'paused', 360, 3, jsonb_build_object(
  'dpa-generator',      jsonb_build_object('batch_size',3,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'dpia',               jsonb_build_object('batch_size',3,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'cppa-risk',          jsonb_build_object('batch_size',3,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'cppa-cyber',         jsonb_build_object('batch_size',3,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'cppa-admt',          jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'governance',         jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'lia',                jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'biometric-checker',  jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'ir-playbook',        jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null),
  'registration',       jsonb_build_object('batch_size',2,'max_runs',10,'runs_completed',0,'consecutive_ge98',0,'active',true,'retired_reason',null)
)
where not exists (select 1 from public.quality_campaigns);
