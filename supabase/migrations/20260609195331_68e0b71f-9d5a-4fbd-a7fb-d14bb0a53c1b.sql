create table if not exists public.annual_tool_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  cycle_start date not null,
  granted_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_tool text check (redeemed_tool in ('governance','lia','dpia')),
  redeemed_assessment_id uuid
);

grant select on public.annual_tool_credits to authenticated;
grant all on public.annual_tool_credits to service_role;

alter table public.annual_tool_credits enable row level security;

create policy "credits_select_own" on public.annual_tool_credits
  for select to authenticated using (auth.uid() = user_id);
-- No user INSERT/UPDATE/DELETE policies: credits are granted and redeemed
-- exclusively server-side via the service role.

create unique index if not exists annual_credit_one_per_cycle on public.annual_tool_credits
  (user_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), cycle_start);
