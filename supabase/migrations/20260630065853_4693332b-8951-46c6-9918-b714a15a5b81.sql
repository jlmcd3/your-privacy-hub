
create table public.quality_loop2_baselines (
  product text primary key,
  avg_score numeric,
  captured_at timestamptz not null default now()
);
grant select on public.quality_loop2_baselines to authenticated;
grant all on public.quality_loop2_baselines to service_role;
alter table public.quality_loop2_baselines enable row level security;
create policy "admin read ql2 baselines" on public.quality_loop2_baselines for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin write ql2 baselines" on public.quality_loop2_baselines for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.quality_loop2_baselines (product, avg_score)
select product, avg(avg_score)::numeric
from public.quality_loop2_results
where avg_score is not null
group by product
on conflict (product) do update set avg_score = excluded.avg_score, captured_at = now();
