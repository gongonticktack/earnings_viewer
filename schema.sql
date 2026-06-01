create table if not exists public.companies (
  code text primary key,
  name text not null,
  stock_code text not null,
  ir_url text not null,
  active boolean not null default true,
  last_synced_at timestamptz
);

alter table public.companies
  add column if not exists last_synced_at timestamptz;

insert into public.companies (code, name, stock_code, ir_url)
values
  ('toyota', 'トヨタ自動車', '7203', 'https://global.toyota/jp/ir/financial-results/'),
  ('ntt', 'NTT', '9432', 'https://group.ntt/jp/ir/library/presentation/financial/')
on conflict (code) do update set
  name = excluded.name,
  stock_code = excluded.stock_code,
  ir_url = excluded.ir_url;

alter table public.companies enable row level security;

drop policy if exists "Companies are public" on public.companies;
create policy "Companies are public"
  on public.companies
  for select
  to anon, authenticated
  using (true);

create table if not exists public.quarterly_results (
  id text primary key,
  company_code text not null references public.companies(code),
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

create table if not exists public.annual_profit_flows (
  id text primary key,
  company_code text not null references public.companies(code),
  previous_fiscal_year text not null,
  current_fiscal_year text not null,
  previous_revenue bigint not null,
  current_revenue bigint not null,
  previous_operating_cost bigint not null,
  current_operating_cost bigint not null,
  previous_operating_income bigint not null,
  current_operating_income bigint not null,
  investing_cash_flow bigint not null,
  expense_breakdown jsonb not null default '[]'::jsonb,
  source_url text not null,
  synced_at timestamptz not null default now(),
  unique (company_code, current_fiscal_year)
);

alter table public.annual_profit_flows enable row level security;

drop policy if exists "Annual profit flows are public" on public.annual_profit_flows;
create policy "Annual profit flows are public"
  on public.annual_profit_flows
  for select
  to anon, authenticated
  using (true);
