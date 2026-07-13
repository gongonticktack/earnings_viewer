-- Run this after the Worker has synced EDINET documents and XBRL facts.
-- It promotes reliable duration facts into the dashboard tables.
-- Q2-Q4 are inserted only when the immediately preceding cumulative period exists,
-- preventing cumulative figures from being shown as a standalone quarter.

begin;

with duration_facts as (
  select
    d.company_code,
    d.id as document_id,
    d.submitted_at,
    d.period_start,
    d.period_end,
    extract(year from d.period_end)::integer as fiscal_year,
    case
      when d.period_start is null or d.period_end is null then null
      when d.period_end - d.period_start <= 110 then 1
      when d.period_end - d.period_start <= 200 then 2
      when d.period_end - d.period_start <= 290 then 3
      else 4
    end as quarter,
    max(f.value) filter (where f.concept in (
      'Revenue', 'RevenueIFRSSummaryOfBusinessResults', 'NetSales',
      'NetSalesSummaryOfBusinessResults', 'OperatingRevenue'
    )) as cumulative_revenue,
    max(f.value) filter (where f.concept in (
      'OperatingIncome', 'OperatingIncomeLossSummaryOfBusinessResults',
      'OperatingProfitLossIFRSSummaryOfBusinessResults'
    )) as cumulative_operating_income,
    max(f.value) filter (where f.concept in (
      'ProfitLossBeforeTax', 'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults'
    )) as cumulative_pretax_income,
    max(f.value) filter (where f.concept in (
      'ProfitLossAttributableToOwnersOfParent',
      'ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults',
      'NetIncomeLoss', 'NetIncomeLossSummaryOfBusinessResults',
      'ProfitLoss', 'ProfitLossSummaryOfBusinessResults'
    )) as cumulative_net_income
  from public.earn_edinet_documents d
  join public.earn_edinet_facts f
    on f.document_id = d.id
   and f.period_end = d.period_end
   and f.period_start = d.period_start
  where d.period_start is not null
    and d.period_end is not null
  group by d.company_code, d.id, d.submitted_at, d.period_start, d.period_end
), normalized as (
  select
    *,
    case when abs(cumulative_revenue) > 1000000000 then cumulative_revenue / 1000000 else cumulative_revenue end as revenue_m,
    case when abs(cumulative_operating_income) > 1000000000 then cumulative_operating_income / 1000000 else cumulative_operating_income end as operating_income_m,
    case when abs(cumulative_pretax_income) > 1000000000 then cumulative_pretax_income / 1000000 else cumulative_pretax_income end as pretax_income_m,
    case when abs(cumulative_net_income) > 1000000000 then cumulative_net_income / 1000000 else cumulative_net_income end as net_income_m
  from duration_facts
  where quarter between 1 and 4
    and cumulative_revenue is not null
    and cumulative_net_income is not null
), deduplicated as (
  select *
  from (
    select
      normalized.*,
      row_number() over (
        partition by company_code, fiscal_year, quarter
        order by submitted_at desc, document_id desc
      ) as version_rank
    from normalized
  ) ranked
  where version_rank = 1
), with_previous as (
  select
    *,
    lag(quarter) over company_year as previous_quarter,
    lag(revenue_m) over company_year as previous_revenue_m,
    lag(operating_income_m) over company_year as previous_operating_income_m,
    lag(pretax_income_m) over company_year as previous_pretax_income_m,
    lag(net_income_m) over company_year as previous_net_income_m
  from deduplicated
  window company_year as (
    partition by company_code, fiscal_year
    order by quarter, period_end, document_id
  )
), standalone as (
  select
    *,
    case when quarter = 1 then revenue_m else revenue_m - previous_revenue_m end as revenue,
    case
      when quarter = 1 then operating_income_m
      when previous_operating_income_m is not null then operating_income_m - previous_operating_income_m
    end as operating_income,
    case
      when quarter = 1 then pretax_income_m
      when previous_pretax_income_m is not null then pretax_income_m - previous_pretax_income_m
    end as pretax_income,
    case when quarter = 1 then net_income_m else net_income_m - previous_net_income_m end as net_income
  from with_previous
  where quarter = 1 or previous_quarter = quarter - 1
)
insert into public.earn_quarterly_results (
  id, company_code, fiscal_year, quarter, period_end,
  revenue, operating_cost, operating_income, pretax_income, net_income,
  source_url, synced_at
)
select
  'edinet-' || document_id,
  company_code,
  fiscal_year,
  quarter,
  period_end,
  round(revenue)::bigint,
  case when operating_income is not null then round(revenue - operating_income)::bigint end,
  round(operating_income)::bigint,
  round(pretax_income)::bigint,
  round(net_income)::bigint,
  'https://disclosure2.edinet-fsa.go.jp/',
  now()
from standalone
where revenue is not null and net_income is not null
on conflict (company_code, fiscal_year, quarter) do update set
  period_end = excluded.period_end,
  revenue = excluded.revenue,
  operating_cost = excluded.operating_cost,
  operating_income = excluded.operating_income,
  pretax_income = excluded.pretax_income,
  net_income = excluded.net_income,
  source_url = excluded.source_url,
  synced_at = excluded.synced_at;

with annual_facts as (
  select
    d.company_code,
    d.id as document_id,
    d.submitted_at,
    extract(year from d.period_end)::integer as fiscal_year,
    max(f.value) filter (where f.period_start = d.period_start and f.period_end = d.period_end and f.concept in (
      'Revenue', 'RevenueIFRSSummaryOfBusinessResults', 'NetSales',
      'NetSalesSummaryOfBusinessResults', 'OperatingRevenue'
    )) as revenue,
    max(f.value) filter (where f.period_start = d.period_start and f.period_end = d.period_end and f.concept in (
      'OperatingIncome', 'OperatingIncomeLossSummaryOfBusinessResults',
      'OperatingProfitLossIFRSSummaryOfBusinessResults'
    )) as operating_income,
    max(f.value) filter (where f.period_start = d.period_start and f.period_end = d.period_end and f.concept =
      'NetCashProvidedByUsedInOperatingActivities') as operating_cash_flow,
    max(f.value) filter (where f.period_start = d.period_start and f.period_end = d.period_end and f.concept =
      'NetCashProvidedByUsedInInvestingActivities') as investing_cash_flow,
    max(f.value) filter (where f.period_start = d.period_start and f.period_end = d.period_end and f.concept =
      'NetCashProvidedByUsedInFinancingActivities') as financing_cash_flow,
    max(f.value) filter (where f.period_end = d.period_end and f.concept in
      ('CashAndCashEquivalents', 'CashAndCashEquivalentsIFRS')) as cash_and_cash_equivalents
  from public.earn_edinet_documents d
  join public.earn_edinet_facts f on f.document_id = d.id
  where d.period_start is not null
    and d.period_end - d.period_start > 290
  group by d.company_code, d.id, d.submitted_at, d.period_end
), annual_normalized as (
  select
    *,
    case when abs(revenue) > 1000000000 then revenue / 1000000 else revenue end as revenue_m,
    case when abs(operating_income) > 1000000000 then operating_income / 1000000 else operating_income end as operating_income_m,
    case when abs(operating_cash_flow) > 1000000000 then operating_cash_flow / 1000000 else operating_cash_flow end as operating_cash_flow_m,
    case when abs(investing_cash_flow) > 1000000000 then investing_cash_flow / 1000000 else investing_cash_flow end as investing_cash_flow_m,
    case when abs(financing_cash_flow) > 1000000000 then financing_cash_flow / 1000000 else financing_cash_flow end as financing_cash_flow_m,
    case when abs(cash_and_cash_equivalents) > 1000000000 then cash_and_cash_equivalents / 1000000 else cash_and_cash_equivalents end as cash_m
  from annual_facts
  where revenue is not null and operating_income is not null and investing_cash_flow is not null
), annual_latest as (
  select *
  from (
    select
      annual_normalized.*,
      row_number() over (
        partition by company_code, fiscal_year
        order by submitted_at desc, document_id desc
      ) as version_rank
    from annual_normalized
  ) ranked
  where version_rank = 1
), annual_with_previous as (
  select
    *,
    lag(fiscal_year) over company_window as previous_year,
    lag(revenue_m) over company_window as previous_revenue_m,
    lag(operating_income_m) over company_window as previous_operating_income_m,
    lag(cash_m) over company_window as previous_cash_m
  from annual_latest
  window company_window as (partition by company_code order by fiscal_year)
)
insert into public.earn_annual_profit_flows (
  id, company_code, previous_fiscal_year, current_fiscal_year,
  previous_revenue, current_revenue, previous_operating_cost, current_operating_cost,
  previous_operating_income, current_operating_income, operating_cash_flow,
  investing_cash_flow, financing_cash_flow, previous_cash_and_cash_equivalents,
  cash_and_cash_equivalents, expense_breakdown, source_url, synced_at
)
select
  'edinet-annual-' || document_id,
  company_code,
  'FY' || previous_year,
  'FY' || fiscal_year,
  round(previous_revenue_m)::bigint,
  round(revenue_m)::bigint,
  round(previous_revenue_m - previous_operating_income_m)::bigint,
  round(revenue_m - operating_income_m)::bigint,
  round(previous_operating_income_m)::bigint,
  round(operating_income_m)::bigint,
  round(operating_cash_flow_m)::bigint,
  round(investing_cash_flow_m)::bigint,
  round(financing_cash_flow_m)::bigint,
  round(previous_cash_m)::bigint,
  round(cash_m)::bigint,
  '[]'::jsonb,
  'https://disclosure2.edinet-fsa.go.jp/',
  now()
from annual_with_previous
where previous_year = fiscal_year - 1
  and previous_revenue_m is not null
  and previous_operating_income_m is not null
on conflict (company_code, current_fiscal_year) do update set
  previous_fiscal_year = excluded.previous_fiscal_year,
  previous_revenue = excluded.previous_revenue,
  current_revenue = excluded.current_revenue,
  previous_operating_cost = excluded.previous_operating_cost,
  current_operating_cost = excluded.current_operating_cost,
  previous_operating_income = excluded.previous_operating_income,
  current_operating_income = excluded.current_operating_income,
  operating_cash_flow = excluded.operating_cash_flow,
  investing_cash_flow = excluded.investing_cash_flow,
  financing_cash_flow = excluded.financing_cash_flow,
  previous_cash_and_cash_equivalents = excluded.previous_cash_and_cash_equivalents,
  cash_and_cash_equivalents = excluded.cash_and_cash_equivalents,
  source_url = excluded.source_url,
  synced_at = excluded.synced_at;

commit;

-- Confirm what was promoted.
select
  c.name,
  q.fiscal_year,
  q.quarter,
  q.period_end,
  q.revenue,
  q.operating_income,
  q.pretax_income,
  q.net_income
from public.earn_quarterly_results q
join public.earn_companies c on c.code = q.company_code
order by q.company_code, q.fiscal_year desc, q.quarter desc;
