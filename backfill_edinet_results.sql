-- Run schema.sql first, then run this after EDINET documents and facts are synced.
-- The dashboard follows current EDINET filing units:
--   H1 = cumulative first-half figures from a semiannual report (doc type 160)
--   FY = cumulative full-year figures from an annual securities report (doc type 120)
-- It deliberately does not manufacture standalone quarterly figures.

begin;

with fiscal_end_months as (
  select distinct on (company_code)
    company_code,
    extract(month from period_end)::integer as fiscal_end_month
  from public.earn_edinet_documents
  where doc_type_code = '120'
    and period_end is not null
  order by company_code, submitted_at desc
), period_facts as (
  select
    d.company_code,
    d.id as document_id,
    d.doc_type_code,
    d.submitted_at,
    f.period_start,
    f.period_end,
    f.concept,
    f.value,
    f.context_ref
  from public.earn_edinet_documents d
  join public.earn_edinet_facts f on f.document_id = d.id
  where d.doc_type_code in ('120', '160')
    and f.period_start is not null
    and f.period_end is not null
    and (
      (d.doc_type_code = '120'
        and f.period_start = d.period_start
        and f.period_end = d.period_end)
      or
      (d.doc_type_code = '160'
        and f.period_end - f.period_start between 120 and 220
        and (d.period_start is null or f.period_start = d.period_start))
    )
), ranked_facts as (
  select *,
    row_number() over (
      partition by document_id, period_start, period_end, concept
      order by
        case when lower(coalesce(context_ref, '')) like '%nonconsolidated%' then 1 else 0 end,
        case when lower(coalesce(context_ref, '')) like '%member%' then 1 else 0 end,
        context_ref
    ) as context_rank
  from period_facts
), aggregated as (
  select
    company_code,
    document_id,
    doc_type_code,
    submitted_at,
    period_start,
    period_end,
    max(value) filter (where context_rank = 1 and concept in (
      'RevenueIFRSSummaryOfBusinessResults', 'RevenueIFRS', 'SalesRevenuesIFRS',
      'TotalNetRevenuesIFRS', 'Revenue', 'NetSalesSummaryOfBusinessResults',
      'NetSales', 'OperatingRevenue', 'OrdinaryIncomeSummaryOfBusinessResults', 'OrdinaryIncome'
    )) as revenue,
    max(value) filter (where context_rank = 1 and concept in (
      'OperatingProfitLossIFRSSummaryOfBusinessResults', 'OperatingProfitLossIFRS',
      'OperatingIncomeLossSummaryOfBusinessResults', 'OperatingIncome'
    )) as operating_income,
    max(value) filter (where context_rank = 1 and concept in (
      'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults', 'ProfitLossBeforeTaxIFRS', 'ProfitLossBeforeTax',
      'OrdinaryProfitLossSummaryOfBusinessResults', 'OrdinaryProfitLoss'
    )) as pretax_income,
    max(value) filter (where context_rank = 1 and concept in (
      'ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults',
      'ProfitLossAttributableToOwnersOfParentIFRS', 'ProfitLossAttributableToOwnersOfParent',
      'NetIncomeLossSummaryOfBusinessResults', 'NetIncomeLoss',
      'ProfitLossSummaryOfBusinessResults', 'ProfitLoss'
    )) as net_income
  from ranked_facts
  group by company_code, document_id, doc_type_code, submitted_at, period_start, period_end
), normalized as (
  select
    a.*,
    case when doc_type_code = '160' then 'H1' else 'FY' end as period_type,
    case
      when doc_type_code = '120' then extract(year from period_end)::integer
      when d.period_start is not null and d.period_end - d.period_start > 290
        then extract(year from d.period_end)::integer
      else extract(year from period_start)::integer
        + case when f.fiscal_end_month < extract(month from period_start) then 1 else 0 end
    end as fiscal_year
  from aggregated a
  join public.earn_edinet_documents d on d.id = a.document_id
  left join fiscal_end_months f on f.company_code = a.company_code
  where revenue is not null
    and net_income is not null
    and (operating_income is not null or pretax_income is not null)
), latest as (
  select *
  from (
    select normalized.*,
      row_number() over (
        partition by company_code, fiscal_year, period_type
        order by submitted_at desc, document_id desc
      ) as version_rank
    from normalized
  ) ranked
  where version_rank = 1
)
insert into public.earn_period_results (
  id, company_code, fiscal_year, period_type, period_start, period_end,
  revenue, operating_cost, operating_income, pretax_income, net_income,
  source_url, synced_at
)
select
  'edinet-' || document_id,
  company_code,
  fiscal_year,
  period_type,
  period_start,
  period_end,
  round(revenue / 1000000)::bigint,
  case when operating_income is not null then round((revenue - operating_income) / 1000000)::bigint end,
  round(operating_income / 1000000)::bigint,
  round(pretax_income / 1000000)::bigint,
  round(net_income / 1000000)::bigint,
  'https://disclosure2.edinet-fsa.go.jp/',
  now()
from latest
on conflict (company_code, fiscal_year, period_type) do update set
  id = excluded.id,
  period_start = excluded.period_start,
  period_end = excluded.period_end,
  revenue = excluded.revenue,
  operating_cost = excluded.operating_cost,
  operating_income = excluded.operating_income,
  pretax_income = excluded.pretax_income,
  net_income = excluded.net_income,
  source_url = excluded.source_url,
  synced_at = excluded.synced_at;

commit;

select
  c.name,
  p.fiscal_year,
  p.period_type,
  p.period_start,
  p.period_end,
  p.revenue,
  p.operating_income,
  p.pretax_income,
  p.net_income
from public.earn_period_results p
join public.earn_companies c on c.code = p.company_code
order by p.company_code, p.fiscal_year desc, p.period_type;
