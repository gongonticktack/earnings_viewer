import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QuarterlyResult = {
  id: string;
  company_code: string;
  fiscal_year: number;
  quarter: number;
  period_end: string;
  revenue: number;
  operating_cost: number;
  operating_income: number;
  net_income: number;
  source_url: string;
};

type CompanySource = {
  sourcePage: string;
  results: QuarterlyResult[];
  annualFlow: AnnualProfitFlow;
};

type AnnualProfitFlow = {
  id: string;
  company_code: string;
  previous_fiscal_year: string;
  current_fiscal_year: string;
  previous_revenue: number;
  current_revenue: number;
  previous_operating_cost: number;
  current_operating_cost: number;
  previous_operating_income: number;
  current_operating_income: number;
  investing_cash_flow: number;
  expense_breakdown: { label: string; value: number }[];
  source_url: string;
};

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const sources: Record<string, CompanySource> = {
  toyota: {
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    results: [
      result("fy2026-q1", "toyota", 2026, 1, "2025-06-30", 12253326, 1166141, 841345,
        "https://global.toyota/pages/global_toyota/ir/financial-results/2026_1q_summary_jp.pdf"),
      result("fy2026-q2", "toyota", 2026, 2, "2025-09-30", 12377427, 839551, 932081,
        "https://global.toyota/pages/global_toyota/ir/financial-results/2026_2q_summary_jp.pdf"),
      result("fy2026-q3", "toyota", 2026, 3, "2025-12-31", 13456851, 1191030, 1257465,
        "https://global.toyota/pages/global_toyota/ir/financial-results/2026_3q_summary_jp.pdf"),
      result("fy2026-q4", "toyota", 2026, 4, "2026-03-31", 12597348, 569494, 817207,
        "https://global.toyota/pages/global_toyota/ir/financial-results/2026_4q_summary_jp.pdf"),
    ],
    annualFlow: {
      id: "toyota-fy2026",
      company_code: "toyota",
      previous_fiscal_year: "FY2025",
      current_fiscal_year: "FY2026",
      previous_revenue: 48036704,
      current_revenue: 50684952,
      previous_operating_cost: 43241118,
      current_operating_cost: 46918736,
      previous_operating_income: 4795586,
      current_operating_income: 3766216,
      investing_cash_flow: -1520307,
      expense_breakdown: [
        { label: "売上原価", value: 39141418 },
        { label: "金融事業に係る金融費用", value: 3079794 },
        { label: "販売費及び一般管理費", value: 4697524 },
      ],
      source_url:
        "https://global.toyota/pages/global_toyota/ir/financial-results/2026_4q_summary_jp.pdf",
    },
  },
  ntt: {
    sourcePage: "https://group.ntt/jp/ir/library/presentation/financial/",
    results: [
      result("ntt-fy2025-q1", "ntt", 2025, 1, "2025-06-30", 3262039, 405193, 259714,
        "https://group.ntt/jp/newsrelease/2025/08/06/pdf/250806ab.pdf"),
      result("ntt-fy2025-q2", "ntt", 2025, 2, "2025-09-30", 3510674, 539836, 335937,
        "https://group.ntt/jp/newsrelease/2025/11/04/pdf/251104ab.pdf"),
      result("ntt-fy2025-q3", "ntt", 2025, 3, "2025-12-31", 3648325, 512116, 330409,
        "https://group.ntt/jp/newsrelease/2026/02/05/pdf/260205ab.pdf"),
      result("ntt-fy2025-q4", "ntt", 2025, 4, "2026-03-31", 3988083, 249076, 110972,
        "https://group.ntt/jp/newsrelease/2026/05/08/pdf/260508ab.pdf"),
    ],
    annualFlow: {
      id: "ntt-fy2025",
      company_code: "ntt",
      previous_fiscal_year: "FY2024",
      current_fiscal_year: "FY2025",
      previous_revenue: 13704727,
      current_revenue: 14409121,
      previous_operating_cost: 12055156,
      current_operating_cost: 12702900,
      previous_operating_income: 1649571,
      current_operating_income: 1706221,
      investing_cash_flow: -1023424,
      expense_breakdown: [
        { label: "人件費", value: 3214887 },
        { label: "経費", value: 7207918 },
        { label: "減価償却費", value: 1790983 },
        { label: "固定資産除却費", value: 119782 },
        { label: "減損損失", value: 80189 },
        { label: "租税公課", value: 289141 },
      ],
      source_url: "https://group.ntt/jp/newsrelease/2026/05/08/pdf/260508ab.pdf",
    },
  },
};

function result(
  id: string,
  companyCode: string,
  fiscalYear: number,
  quarter: number,
  periodEnd: string,
  revenue: number,
  operatingIncome: number,
  netIncome: number,
  sourceUrl: string,
): QuarterlyResult {
  return {
    id,
    company_code: companyCode,
    fiscal_year: fiscalYear,
    quarter,
    period_end: periodEnd,
    revenue,
    operating_cost: revenue - operatingIncome,
    operating_income: operatingIncome,
    net_income: netIncome,
    source_url: sourceUrl,
  };
}

async function assertSourceAvailable(source: CompanySource) {
  const response = await fetch(source.sourcePage, {
    headers: { "User-Agent": "EarningsAtelier/1.0" },
  });
  if (!response.ok) {
    throw new Error(`IR source page returned ${response.status}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const companyCode = payload.companyCode ?? "toyota";
    const source = sources[companyCode];
    if (!source) {
      return new Response(JSON.stringify({ error: "Unsupported company code" }), {
        headers,
        status: 400,
      });
    }

    await assertSourceAvailable(source);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { error } = await supabase
      .from("quarterly_results")
      .upsert(source.results, { onConflict: "company_code,fiscal_year,quarter" });
    if (error) throw error;

    const { error: annualFlowError } = await supabase
      .from("annual_profit_flows")
      .upsert(source.annualFlow, { onConflict: "company_code,current_fiscal_year" });
    if (annualFlowError) throw annualFlowError;

    const { data, error: readError } = await supabase
      .from("quarterly_results")
      .select("*")
      .eq("company_code", companyCode)
      .order("period_end", { ascending: true });
    if (readError) throw readError;

    return new Response(JSON.stringify({
      synced: source.results.length,
      results: data,
      annualFlow: source.annualFlow,
    }), {
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected sync error";
    return new Response(JSON.stringify({ error: message }), {
      headers,
      status: 500,
    });
  }
});
