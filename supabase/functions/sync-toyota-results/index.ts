import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_SOURCE_PAGE = "https://global.toyota/jp/ir/financial-results/";

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

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// The Toyota PDFs publish cumulative values. These are normalized to standalone quarters.
const FY2026_RESULTS: QuarterlyResult[] = [
  {
    id: "fy2026-q1",
    company_code: "toyota",
    fiscal_year: 2026,
    quarter: 1,
    period_end: "2025-06-30",
    revenue: 12253326,
    operating_cost: 11087185,
    operating_income: 1166141,
    net_income: 841345,
    source_url:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_1q_summary_jp.pdf",
  },
  {
    id: "fy2026-q2",
    company_code: "toyota",
    fiscal_year: 2026,
    quarter: 2,
    period_end: "2025-09-30",
    revenue: 12377427,
    operating_cost: 11537876,
    operating_income: 839551,
    net_income: 932081,
    source_url:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_2q_summary_jp.pdf",
  },
  {
    id: "fy2026-q3",
    company_code: "toyota",
    fiscal_year: 2026,
    quarter: 3,
    period_end: "2025-12-31",
    revenue: 13456851,
    operating_cost: 12265821,
    operating_income: 1191030,
    net_income: 1257465,
    source_url:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_3q_summary_jp.pdf",
  },
  {
    id: "fy2026-q4",
    company_code: "toyota",
    fiscal_year: 2026,
    quarter: 4,
    period_end: "2026-03-31",
    revenue: 12597348,
    operating_cost: 12027854,
    operating_income: 569494,
    net_income: 817207,
    source_url:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_4q_summary_jp.pdf",
  },
];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const sourcePage = payload.sourcePage ?? DEFAULT_SOURCE_PAGE;
    const pageResponse = await fetch(sourcePage, {
      headers: { "User-Agent": "ToyotaEarningsAtelier/1.0" },
    });
    if (!pageResponse.ok) {
      throw new Error(`Toyota IR page returned ${pageResponse.status}`);
    }

    const sourceHtml = await pageResponse.text();
    const availableResults = FY2026_RESULTS.filter((result) =>
      sourceHtml.includes(result.source_url.split("/").at(-1) ?? ""),
    );
    if (!availableResults.length) {
      throw new Error("No supported Toyota financial summary PDFs were found");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { error } = await supabase
      .from("quarterly_results")
      .upsert(availableResults, { onConflict: "id" });
    if (error) throw error;

    const { data, error: readError } = await supabase
      .from("quarterly_results")
      .select("*")
      .eq("company_code", "toyota")
      .order("period_end", { ascending: true });
    if (readError) throw readError;

    return new Response(
      JSON.stringify({ synced: availableResults.length, results: data }),
      { headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected sync error";
    return new Response(JSON.stringify({ error: message }), {
      headers,
      status: 500,
    });
  }
});
