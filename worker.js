import { discoverIrDocuments } from "./ir.js";
import { normalizeQuote, normalizeFinancials } from "./market.js";
import { selectStatementDocuments } from "./report-metadata.js";

const STOCK_SYMBOL_PATTERN = /^[0-9A-Z]{4}\.T$/;
const COMPANY_CODE_PATTERN = /^[a-z0-9-]+$/;
const STOCK_API_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const STOCK_CACHE_PREFIX = "stock-prices:";
const IR_CACHE_PREFIX = "ir-documents:";
const STOCK_CRON = "30 7 * * 1-5";
const IR_CRON = "0 10 * * *";

/** 概要: 入力を検証し、追加希望をSupabaseへ保存します。引数: request - POSTリクエスト、env - アセット設定。戻り値: 受付結果のHTTPレスポンスを返すPromise。 */
async function saveCompanyRequest(request, env) {
  const reply = (body, status) => Response.json(body, {status, headers:{"Cache-Control":"no-store"}});
  if (request.method !== 'POST') return new Response(null, {status:405,headers:{Allow:'POST'}});
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply({error:'送信元が正しくありません。'},403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply({error:'JSONを送信してください。'},415);
  let values;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 2048) return reply({error:'入力が長すぎます。'},413);
    values = JSON.parse(body);
  } catch { return reply({error:'入力形式が正しくありません。'},400); }
  const name = typeof values?.company_name === 'string' ? values.company_name.trim() : '';
  const code = typeof values?.stock_code === 'string' ? values.stock_code.trim().normalize('NFKC').toUpperCase() : '';
  if (!name || [...name].length > 120 || /[\u0000-\u001f\u007f]/.test(name)
    || (values?.stock_code != null && typeof values.stock_code !== 'string')
    || (code && !/^[0-9A-Z]{4}$/.test(code))) return reply({error:'企業名・証券コードを確認してください。'},400);
  try {
    const config = await env.ASSETS.fetch('https://assets.local/config.json');
    const {supabase} = await config.json();
    if (!config.ok || !supabase?.url || !supabase?.key) throw new Error('config unavailable');
    const response = await fetch(new URL('/rest/v1/earn_company_requests',supabase.url), {
      method:'POST', headers:{apikey:supabase.key, Authorization:`Bearer ${supabase.key}`,
        'Content-Type':'application/json', Prefer:'return=minimal'},
      body:JSON.stringify({company_name:name,stock_code:code || null}), signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('database unavailable');
    return reply({saved:true},201);
  } catch { return reply({error:'追加希望を保存できませんでした。'},503); }
}

/**
 * 概要: 公式原本から事前解析した内訳を、現在の公式一覧に一致する資料だけ返します。
 * 引数: company - 会社コード。documents - 確認済み公式資料。env - アセットのバインディング。
 * 戻り値: 出典付き損益内訳の配列を返すPromise。保存値がない場合は空配列。
 */
async function preparedStatementReports(company, documents, env) {
  try {
    const response = await env.ASSETS.fetch(new Request("https://assets.local/statement-data.json"));
    if (!response.ok) return [];
    const manifest = await response.json();
    const reports = manifest.version === 1 ? manifest.reportsByCompany?.[company] : null;
    if (!Array.isArray(reports)) return [];
    const sources = new Set(documents.map((document) => document.url));
    return reports.filter((report) => report.companyCode === company && sources.has(report.sourceUrl)
      && Number.isFinite(report.revenue) && Number.isFinite(report.netIncome)
      && Array.isArray(report.statementRows) && report.statementRows.length
      && report.statementRows.every((row) => typeof row.label === "string" && Number.isFinite(row.value) && Number.isInteger(row.page) && row.page > 0));
  } catch { return []; }
}

/**
 * 概要: 公式アーカイブで確認し、原本の解析に成功した履歴資料を読み込みます。
 * 引数: company - 会社コード。env - 静的アセットのバインディング。
 * 戻り値: 発見元の公式ページ・対象会社・解析済み原本が一致する資料配列を返すPromise。
 */
async function archivedStatementDocuments(company, env) {
  try {
    const response = await env.ASSETS.fetch(new Request("https://assets.local/statement-data.json"));
    if (!response.ok) return [];
    const manifest = await response.json();
    if (manifest.version !== 1) return [];
    const reports = manifest.reportsByCompany?.[company] ?? [];
    return (manifest.documentsByCompany?.[company] ?? []).filter((document) => {
      try {
        return document.companyCode === company && new URL(document.url).protocol === "https:"
          && /\.(?:pdf|ashx)(?:$|[?#])/i.test(document.url)
          && new URL(document.discoveredFrom).protocol === "https:"
          && new URL(document.discoveredFrom).origin === new URL(document.officialIrUrl).origin
          && reports.some((report) => report.companyCode === company && report.sourceUrl === document.url
            && report.fiscalYear >= 2022 && Number.isFinite(report.revenue) && Number.isFinite(report.netIncome));
      } catch { return false; }
    });
  } catch { return []; }
}

/**
 * 概要: 無料市場データを取得します。ホスト障害時は代替先へ切り替えます。
 * 引数: path - APIパス。params - 検索条件。
 * 戻り値: 取得したJSONを返すPromise。
 */
async function fetchMarketData(path, params) {
  for (const host of STOCK_API_HOSTS) {
    try {
      const endpoint = new URL(`https://${host}${path}`);
      endpoint.search = new URLSearchParams(params);
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; EarningsAtelier/1.0)" } });
      if (!response.ok) throw new Error(`upstream ${response.status}`);
      return await response.json();
    } catch (error) {
      if (host === STOCK_API_HOSTS.at(-1)) throw new Error("市場データの配信元に接続できません");
    }
  }
}

/**
 * 概要: 有効期限内の市場データを返し、期限切れを更新します。障害時は古い値と状態を返します。
 * 引数: env - バインディング。key - 保存キー。ttl - 有効秒数。load - 取得関数。
 * 戻り値: 市場データのHTTPレスポンスを返すPromise。
 */
async function marketResponse(env, key, ttl, load) {
  let cached = null;
  try {
    cached = await env.STOCK_PRICES.get(key, "json");
    if (cached && Date.now() - Date.parse(cached.updatedAt) < ttl * 1000) {
      return Response.json({ ...cached, stale: false }, { headers: { "Cache-Control": "no-store" } });
    }
    const data = { ...await load(), updatedAt: new Date().toISOString() };
    await env.STOCK_PRICES.put(key, JSON.stringify(data));
    return Response.json({ ...data, stale: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (cached) return Response.json({ ...cached, stale: true, warning: "更新失敗・前回取得値を表示" },
      { headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: "市場データを取得できませんでした。" },
      { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

/**
 * 概要: Yahoo Financeのチャートレスポンスを画面用の週足配列へ変換します。
 * 引数: payload - Yahoo Financeから返されたJSON。
 * 戻り値: 日付とOHLCを持つ直近52週の配列。
 */
function normalizeStockPrices(payload) {
  return normalizeDailyPrices(payload,0).slice(-52);
}

/** 概要: OHLCを指定時差の日付で整え、欠損を除きます。引数: payload - 配信JSON、offsetHours - UTCからの時差（既定は日本時間）。戻り値: 株価配列。 */
function normalizeDailyPrices(payload, offsetHours = 9) {
  const chart = payload?.chart?.result?.[0];
  const quote = chart?.indicators?.quote?.[0];
  if (!chart?.timestamp || !quote) return [];

  return chart.timestamp.map((timestamp, index) => ({
    date: new Date((timestamp + offsetHours * 3600) * 1000).toISOString().slice(0, 10),
    open: quote.open?.[index],
    high: quote.high?.[index],
    low: quote.low?.[index],
    close: quote.close?.[index],
  })).filter((row) => [row.open, row.high, row.low, row.close].every(Number.isFinite));
}

/** 概要: MA100の計算に必要な過去分を含む2年の日足を取得します。引数: symbol - 銘柄コード。戻り値: 日足配列のPromise。 */
async function fetchDailyStockPrices(symbol) {
  const prices = normalizeDailyPrices(await fetchMarketData(`/v8/finance/chart/${symbol}`, {range:"2y",interval:"1d",events:"history"}));
  if (!prices.length) throw new Error("日足株価がありません");
  return [...new Map(prices.map((row) => [row.date,row])).values()].sort((a,b) => a.date.localeCompare(b.date));
}

/**
 * 概要: 利用可能なYahoo Financeホストから週足株価を取得します。
 * 引数: symbol - Yahoo Finance形式の銘柄コード。
 * 戻り値: 週足株価の配列を返すPromise。
 */
async function fetchWeeklyStockPrices(symbol) {
  let lastError = null;
  for (const host of STOCK_API_HOSTS) {
    try {
      const endpoint = new URL(`https://${host}/v8/finance/chart/${symbol}`);
      endpoint.search = new URLSearchParams({ range: "1y", interval: "1wk", events: "history" });
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; EarningsAtelier/1.0)",
        },
      });
      if (!response.ok) throw new Error(`upstream ${response.status}`);
      const prices = normalizeStockPrices(await response.json());
      if (!prices.length) throw new Error("upstream returned no prices");
      return prices;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("stock price service is unavailable");
}

/**
 * 概要: 公開設定と会社マスタから定期更新の対象会社を取得します。
 * 引数: env - Workersのバインディング。
 * 戻り値: 有効な会社の配列を返すPromise。
 */
async function fetchActiveCompanies(env) {
  const configResponse = await env.ASSETS.fetch("https://assets.local/config.json");
  if (!configResponse.ok) throw new Error(`config.json ${configResponse.status}`);
  const { supabase } = await configResponse.json();
  if (!supabase?.url || !supabase?.key) throw new Error("Supabaseの公開設定がありません");

  const endpoint = new URL("/rest/v1/earn_companies", supabase.url);
  endpoint.search = new URLSearchParams({ select: "code,stock_code,ir_url", active: "eq.true" });
  const response = await fetch(endpoint, {
    headers: { apikey: supabase.key, Authorization: `Bearer ${supabase.key}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`earn_companies ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("会社マスタの形式が正しくありません");
  return rows.filter((row) => COMPANY_CODE_PATTERN.test(row.code ?? ""));
}

/**
 * 概要: 週足株価を取得し、Cloudflare KVへ保存します。
 * 引数: symbol - 銘柄コード。env - Workersのバインディング。
 * 戻り値: 保存した株価データを返すPromise。
 */
async function updateStockPrices(symbol, env) {
  const prices = await fetchWeeklyStockPrices(symbol);
  const data = { symbol, interval: "1wk", prices, updatedAt: new Date().toISOString() };
  await env.STOCK_PRICES.put(`${STOCK_CACHE_PREFIX}${symbol}`, JSON.stringify(data));
  return data;
}

/**
 * 概要: 会社の公式IRページから決算PDFを探し、見つかった一覧をKVへ保存します。
 * 引数: company - 会社マスタの行。env - Workersのバインディング。
 * 戻り値: 保存した資料件数を返すPromise。
 */
async function updateIrDocuments(company, env) {
  const documents = await discoverIrDocuments(company);
  if (!documents.length) throw new Error("決算PDFが見つかりませんでした");
  await env.IR_DOCUMENTS.put(`${IR_CACHE_PREFIX}${company.code}`, JSON.stringify({
    documents,
    updatedAt: new Date().toISOString(),
  }));
  return documents.length;
}

/**
 * 概要: 公式IRの資料一覧を1日ごとに再確認し、初回にも最新の原本を発見します。
 * 引数: companyCode - 会社コード。env - バインディング。
 * 戻り値: 公式決算書の一覧と取得状態を返すPromise。
 */
async function officialReports(companyCode, env) {
  const key = `${IR_CACHE_PREFIX}${companyCode}`;
  const cached = await env.IR_DOCUMENTS.get(key, "json");
  if (cached?.documents?.length && Date.now() - Date.parse(cached.updatedAt) < 86400000) {
    return { ...cached, documents: selectStatementDocuments(cached.documents), stale: false };
  }
  try {
    const companies = await fetchActiveCompanies(env);
    const company = companies.find((row) => row.code === companyCode);
    if (!company?.ir_url) throw new Error("公式IRが登録されていません");
    await updateIrDocuments(company, env);
    const data = await env.IR_DOCUMENTS.get(key, "json");
    return { ...data, documents: selectStatementDocuments(data.documents), stale: false };
  } catch (error) {
    if (cached?.documents?.length) return { ...cached, documents: selectStatementDocuments(cached.documents), stale: true };
    throw error;
  }
}

/**
 * 概要: 対象項目を小分けにして更新し、一部失敗しても残りを処理します。
 * 引数: items - 更新対象。update - 1件分の更新関数。
 * 戻り値: 失敗内容の配列を返すPromise。
 */
async function updateInBatches(items, update) {
  const failures = [];
  for (let index = 0; index < items.length; index += 5) {
    const batch = items.slice(index, index + 5);
    const results = await Promise.allSettled(batch.map(update));
    results.forEach((result, offset) => {
      if (result.status === "rejected") failures.push(`${batch[offset].code ?? batch[offset]}: ${result.reason?.message ?? result.reason}`);
    });
  }
  return failures;
}

export default {
  /**
   * 概要: 株価・公表済み業績・公式IR資料のAPIを処理し、それ以外は静的アセットへ渡します。
   * 引数: request - HTTPリクエスト。env - Workersのバインディング。ctx - 実行コンテキスト。
   * 戻り値: HTTPレスポンスを返すPromise。
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/company-requests") return saveCompanyRequest(request, env);
    if (url.pathname === "/api/daily-stock-prices") {
      const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
      if (!STOCK_SYMBOL_PATTERN.test(symbol)) return Response.json({error:"銘柄コードが正しくありません。"},{status:400});
      return marketResponse(env, `daily-stock-prices:${symbol}`, url.searchParams.get("refresh") === "1" ? 60 : 3600,
        async () => ({symbol,interval:"1d",prices:await fetchDailyStockPrices(symbol)}));
    }
    if (["/api/official-reports", "/api/report-pdf"].includes(url.pathname)) {
      const company = url.searchParams.get("company") ?? "";
      if (!COMPANY_CODE_PATTERN.test(company)) return Response.json({ error: "会社コードが正しくありません" }, { status: 400 });
      try {
        if (url.pathname === "/api/official-reports") {
          const archived = await archivedStatementDocuments(company, env);
          let metadata;
          try { metadata = await officialReports(company, env); }
          catch (error) {
            if (!archived.length) throw error;
            metadata = { documents: [], updatedAt: null, stale: true };
          }
          metadata.documents = selectStatementDocuments([...metadata.documents, ...archived]);
          const reports = await preparedStatementReports(company, metadata.documents ?? [], env);
          return Response.json({ ...metadata, reports }, { headers: { "Cache-Control": "no-store" } });
        }
        // 任意URLのプロキシにはせず、公式ページから発見・保存した決算書だけを許可します。
        const sourceUrl = url.searchParams.get("url");
        const saved = await env.IR_DOCUMENTS.get(`${IR_CACHE_PREFIX}${company}`, "json");
        const archived = await archivedStatementDocuments(company, env);
        if (!selectStatementDocuments([...(saved?.documents ?? []), ...archived]).some((document) => document.url === sourceUrl)) {
          return Response.json({ error: "確認済みの公式決算書ではありません" }, { status: 403 });
        }
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/pdf" } });
        if (!response.ok) throw new Error("決算書の取得に失敗しました");
        if (Number(response.headers.get("Content-Length")) > 12 * 1024 * 1024) throw new Error("決算書のサイズが上限を超えています");
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 12 * 1024 * 1024 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
          throw new Error("対応できない決算書です");
        }
        return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Cache-Control": "public, max-age=86400" } });
      } catch (error) {
        return Response.json({ error: "公式決算書を取得できませんでした。" }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }
    if (["/api/stock-quote", "/api/financial-results"].includes(url.pathname)) {
      const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
      if (!STOCK_SYMBOL_PATTERN.test(symbol)) return Response.json({ error: "銘柄コードが正しくありません。" }, { status: 400 });
      if (url.pathname === "/api/stock-quote") {
        return marketResponse(env, `stock-quote:${symbol}`, 3600, async () => ({ symbol,
          ...normalizeQuote(await fetchMarketData(`/v8/finance/chart/${symbol}`, { range: "1d", interval: "1m" })) }));
      }
      return marketResponse(env, `financial-results:${symbol}`, 86400, async () => ({ symbol, source: "Yahoo Finance",
        ...normalizeFinancials(await fetchMarketData(`/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}`, {
          type: "quarterlyTotalRevenue,quarterlyOperatingIncome,quarterlyPretaxIncome,quarterlyNetIncome,annualTotalRevenue,annualOperatingIncome,annualPretaxIncome,annualNetIncome",
          period1: String(Math.floor(Date.now() / 1000) - 3 * 366 * 86400),
          period2: String(Math.floor(Date.now() / 1000)),
        })) }));
    }
    if (url.pathname === "/api/ir-documents") {
      const company = url.searchParams.get("company") ?? "";
      if (!COMPANY_CODE_PATTERN.test(company)) {
        return Response.json({ error: "会社コードが正しくありません。" }, { status: 400 });
      }
      try {
        const data = await env.IR_DOCUMENTS.get(`${IR_CACHE_PREFIX}${company}`, "json");
        const archived = await archivedStatementDocuments(company, env);
        const payload = data ?? { documents: [], updatedAt: null };
        if (archived.length) payload.documents = [...new Map([...payload.documents, ...archived].map((document) => [document.url, document])).values()];
        return Response.json(payload, {
          headers: { "Cache-Control": "public, max-age=300" },
        });
      } catch (error) {
        return Response.json({ error: "IR資料を取得できませんでした。" }, { status: 502 });
      }
    }
    if (url.pathname !== "/api/stock-prices") return env.ASSETS.fetch(request);

    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    if (!STOCK_SYMBOL_PATTERN.test(symbol)) {
      return Response.json({ error: "銘柄コードが正しくありません。" }, { status: 400 });
    }

    try {
      const cached = await env.STOCK_PRICES.get(`${STOCK_CACHE_PREFIX}${symbol}`, "json");
      const ttl = url.searchParams.get("refresh") === "1" ? 60 : 21600;
      const fresh = cached?.prices?.length && Date.now() - Date.parse(cached.updatedAt) < ttl * 1000;
      let data;
      try { data = fresh ? cached : await updateStockPrices(symbol, env); }
      catch (error) {
        if (!cached?.prices?.length) throw error;
        return Response.json({ ...cached, stale: true }, { headers: { "Cache-Control": "no-store" } });
      }
      return Response.json({ ...data, stale: false }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return Response.json({ error: "週足株価を取得できませんでした。", detail: error.message }, { status: 502 });
    }
  },

  /**
   * 概要: Cronの種類に応じて株価または公式IR資料を更新します。
   * 引数: controller - Cronイベント。env - Workersのバインディング。ctx - 実行コンテキスト。
   * 戻り値: 更新完了を示すPromise。
   */
  async scheduled(controller, env, ctx) {
    const companies = await fetchActiveCompanies(env);
    if (!companies.length) throw new Error("更新対象の会社がありません");
    if (controller.cron === IR_CRON) {
      const failures = await updateInBatches(companies, (company) => updateIrDocuments(company, env));
      if (failures.length) throw new Error(`IR資料更新失敗: ${failures.join(", ")}`);
      return;
    }
    if (controller.cron === STOCK_CRON || !controller.cron) {
      const symbols = [...new Set(companies.map((row) => `${String(row.stock_code ?? "").toUpperCase()}.T`)
        .filter((symbol) => STOCK_SYMBOL_PATTERN.test(symbol)))];
      if (!symbols.length) throw new Error("更新対象の銘柄がありません");
      const failures = await updateInBatches(symbols, (symbol) => updateStockPrices(symbol, env));
      if (failures.length) throw new Error(`株価更新失敗: ${failures.join(", ")}`);
    }
  },
};
