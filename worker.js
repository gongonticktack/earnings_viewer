const STOCK_SYMBOL_PATTERN = /^[0-9A-Z]{4}\.T$/;
const STOCK_API_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

/**
 * 概要: Yahoo Financeのチャートレスポンスを画面用の週足配列へ変換します。
 * 引数: payload - Yahoo Financeから返されたJSON。
 * 戻り値: 日付とOHLCを持つ直近52週の配列。
 */
function normalizeStockPrices(payload) {
  const chart = payload?.chart?.result?.[0];
  const quote = chart?.indicators?.quote?.[0];
  if (!chart?.timestamp || !quote) return [];

  return chart.timestamp.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: quote.open?.[index],
    high: quote.high?.[index],
    low: quote.low?.[index],
    close: quote.close?.[index],
  })).filter((row) => [row.open, row.high, row.low, row.close].every(Number.isFinite)).slice(-52);
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

export default {
  /**
   * 概要: 株価APIを処理し、それ以外は静的アセットへ渡します。
   * 引数: request - HTTPリクエスト。env - Workersのバインディング。ctx - 実行コンテキスト。
   * 戻り値: HTTPレスポンスを返すPromise。
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/stock-prices") return env.ASSETS.fetch(request);

    const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase();
    if (!STOCK_SYMBOL_PATTERN.test(symbol)) {
      return Response.json({ error: "銘柄コードが正しくありません。" }, { status: 400 });
    }

    const cache = caches.default;
    const cacheKey = new Request(`https://stock-cache.local/${symbol}`);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const prices = await fetchWeeklyStockPrices(symbol);
      const response = Response.json({ symbol, interval: "1wk", prices }, {
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return Response.json({ error: "週足株価を取得できませんでした。", detail: error.message }, { status: 502 });
    }
  },
};
