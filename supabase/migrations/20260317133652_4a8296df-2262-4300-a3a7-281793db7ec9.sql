create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  slug text not null,
  label text not null,
  flag text,
  created_at timestamptz default now()
);
alter table public.user_watchlist enable row level security;
create policy "Users manage own watchlist"
  on public.user_watchlist for all using (auth.uid() = user_id);