create table if not exists public.quarterly_results (
  id text primary key,
  company_code text not null default 'toyota',
  fiscal_year integer not null,
  quarter integer not null check (quarter between 1 and 4),
  period_end date not null,
  revenue bigint not null,
  operating_cost bigint not null,
  operating_income bigint not null,
  net_income bigint not null,
  source_url text not null,
  synced_at timestamptz not null default now(),
  unique (company_code, fiscal_year, quarter)
);

alter table public.quarterly_results enable row level security;

drop policy if exists "Quarterly results are public" on public.quarterly_results;
create policy "Quarterly results are public"
  on public.quarterly_results
  for select
  to anon, authenticated
  using (true);

create index if not exists quarterly_results_period_end_idx
  on public.quarterly_results (period_end desc);
