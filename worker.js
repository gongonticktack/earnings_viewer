const stockSymbols = new Set(["7203.T", "9432.T", "9434.T", "9984.T", "8306.T", "9983.T", "6501.T", "8316.T"]);
const irSources = {
  "softbank-group": {
    sourcePage: "https://group.softbank/ir/financials",
    allowedDomains: ["group.softbank"],
  },
  mufg: {
    sourcePage: "https://www.mufg.jp/ir/index.html",
    allowedDomains: ["mufg.jp"],
  },
  "fast-retailing": {
    sourcePage: "https://www.fastretailing.com/jp/ir/library/earning.html",
    allowedDomains: ["fastretailing.com"],
  },
  hitachi: {
    sourcePage: "https://www.hitachi.com/ja-jp/ir/library/fr/",
    allowedDomains: ["hitachi.com"],
  },
  smfg: {
    sourcePage: "https://www.smfg.co.jp/investor/financial/latest_statement.html",
    allowedDomains: ["smfg.co.jp"],
  },
};

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function isAllowedDomain(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function discoverIrDocuments(html, source) {
  const documents = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtml(match[2]);
    let url;
    try {
      url = new URL(href, source.sourcePage);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || !isAllowedDomain(url.hostname, source.allowedDomains)) continue;

    const extension = url.pathname.match(/\.(pdf|xlsx?|csv)$/i)?.[1]?.toLowerCase();
    if (!extension || seen.has(url.href)) continue;

    seen.add(url.href);
    const fallbackTitle = decodeURIComponent(url.pathname.split("/").at(-1));
    documents.push({
      title: textContent(match[3]) || fallbackTitle,
      type: extension === "pdf" ? "PDF" : extension.toUpperCase(),
      url: url.href,
    });
  }

  return documents.slice(0, 30);
}

async function fetchOfficialIrDocuments(companyCode) {
  const source = irSources[companyCode];
  if (!source) return Response.json({ error: "IR source is not configured" }, { status: 404 });

  const upstream = await fetch(source.sourcePage, {
    headers: { "User-Agent": "earnings-viewer/1.0" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!upstream.ok) return Response.json({ error: "Official IR page is temporarily unavailable" }, { status: 502 });

  const html = await upstream.text();
  return Response.json(
    {
      companyCode,
      sourcePage: source.sourcePage,
      documents: discoverIrDocuments(html, source),
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const irMatch = url.pathname.match(/^\/api\/ir\/([a-z-]+)$/);
    if (irMatch) return fetchOfficialIrDocuments(irMatch[1]);

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
