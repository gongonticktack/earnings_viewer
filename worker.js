const stockSymbols = new Set(["7203.T", "9432.T", "9434.T", "9984.T", "8306.T", "9983.T", "6501.T", "8316.T"]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/stocks\/([A-Z0-9.]+)$/);

    if (!match) return new Response("Not found", { status: 404 });

    const symbol = match[1];
    if (!stockSymbols.has(symbol)) return new Response("Unsupported stock symbol", { status: 400 });

    const upstreamUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1wk`;
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "earnings-viewer/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!upstream.ok) return new Response("Stock price data is temporarily unavailable", { status: 502 });

    return new Response(upstream.body, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  },
};
