const stockSymbols = new Set(["7203.T", "9432.T", "9434.T", "9984.T", "8306.T", "9983.T", "6501.T", "8316.T"]);

const edinetCompanies = {
  toyota: "7203",
  ntt: "9432",
  "softbank-group": "9984",
  mufg: "8306",
  "fast-retailing": "9983",
  hitachi: "6501",
  smfg: "8316",
};

const edinetDocumentTypes = new Set(["120", "130", "140", "150", "160", "170"]);
const edinetBaseUrl = "https://api.edinet-fsa.go.jp/api/v2";
const irSources = {
  toyota: {
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    allowedDomains: ["global.toyota"],
  },
  ntt: {
    sourcePage: "https://group.ntt/jp/ir/library/presentation/financial/",
    allowedDomains: ["group.ntt", "ntt.jp"],
  },
  "softbank-group": {
    sourcePage: "https://group.softbank/ir/financials/financial_reports",
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

function jsonError(error, status = 500) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return Response.json({ error: message }, { status });
}

function jstDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");
}

function edinetUrl(path, apiKey, params = {}) {
  const url = new URL(`${edinetBaseUrl}${path}`);
  url.searchParams.set("Subscription-Key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

async function fetchEdinetDocumentList(env, date) {
  if (!env.EDINET_API_KEY) throw new Error("EDINET_API_KEY is not configured");
  const response = await fetch(edinetUrl("/documents.json", env.EDINET_API_KEY, { date, type: "2" }), {
    headers: { "User-Agent": "earnings-viewer/1.0" },
  });
  if (!response.ok) throw new Error(`EDINET document list request failed (${response.status})`);
  const payload = await response.json();
  if (payload.metadata?.status && payload.metadata.status !== "200") {
    throw new Error(payload.metadata.message ?? "EDINET returned an error");
  }
  return payload.results ?? [];
}

function companyCodeFor(document) {
  const secCode = String(document.secCode ?? "");
  return Object.entries(edinetCompanies).find(([, stockCode]) => secCode.startsWith(stockCode))?.[0] ?? null;
}

function isFinancialDocument(document) {
  return edinetDocumentTypes.has(String(document.docTypeCode))
    && document.pdfFlag === "1"
    && document.withdrawalStatus !== "1"
    && document.disclosureStatus !== "1";
}

function serializeEdinetDocument(document, companyCode) {
  return {
    id: document.docID,
    company_code: companyCode,
    edinet_code: document.edinetCode,
    sec_code: document.secCode,
    filer_name: document.filerName,
    doc_type_code: document.docTypeCode,
    description: document.docDescription,
    period_start: document.periodStart || null,
    period_end: document.periodEnd || null,
    submitted_at: document.submitDateTime,
    synced_at: new Date().toISOString(),
  };
}

function filterEdinetDocuments(documents, requestedCompanyCode = null) {
  return documents
    .filter(isFinancialDocument)
    .map((document) => {
      const companyCode = companyCodeFor(document);
      return companyCode ? serializeEdinetDocument(document, companyCode) : null;
    })
    .filter((document) => document && (!requestedCompanyCode || document.company_code === requestedCompanyCode));
}

async function saveEdinetDocuments(env, documents) {
  if (!documents.length) return true;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/earn_edinet_documents?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(documents),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase EDINET document save failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return true;
}

async function syncEdinetDocuments(request, env) {
  if (env.SYNC_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.SYNC_TOKEN}`) {
    return jsonError("Unauthorized", 401);
  }
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? jstDate();
  if (!isDate(date)) return jsonError("date must be YYYY-MM-DD", 400);

  const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date));
  let persisted = false;
  let persistenceError = null;
  try {
    persisted = await saveEdinetDocuments(env, documents);
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : String(error);
  }
  return Response.json({ date, saved: persisted ? documents.length : 0, persisted, persistenceError, documents });
}

async function fetchCompanyEdinetDocuments(request, env, companyCode) {
  if (!edinetCompanies[companyCode]) return jsonError("Company is not configured", 404);
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? jstDate();
  if (!isDate(date)) return jsonError("date must be YYYY-MM-DD", 400);

  const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date), companyCode);
  return Response.json({ companyCode, date, documents });
}

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

function isFinancialDocumentTitle(value) {
  return /決算|四半期|financial|earnings|quarter|results|report|presentation|summary/i.test(value);
}

function discoverOfficialIrPdfs(html, source) {
  const documents = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    let url;
    try {
      url = new URL(decodeHtml(match[2]), source.sourcePage);
    } catch {
      continue;
    }
    if (
      url.protocol !== "https:"
      || !isAllowedDomain(url.hostname, source.allowedDomains)
      || !url.pathname.toLowerCase().endsWith(".pdf")
      || seen.has(url.href)
    ) continue;

    seen.add(url.href);
    const fallbackTitle = decodeURIComponent(url.pathname.split("/").at(-1));
    documents.push({
      title: textContent(match[3]) || fallbackTitle,
      url: url.href,
    });
  }

  const financialDocuments = documents.filter((document) => isFinancialDocumentTitle(`${document.title} ${document.url}`));
  return (financialDocuments.length ? financialDocuments : documents).slice(0, 30);
}

async function fetchOfficialIrDocuments(companyCode) {
  const source = irSources[companyCode];
  if (!source) return jsonError("IR source is not configured", 404);

  const upstream = await fetch(source.sourcePage, {
    headers: { "User-Agent": "earnings-viewer/1.0" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!upstream.ok) return jsonError("Official IR page is temporarily unavailable", 502);

  return Response.json({
    companyCode,
    sourcePage: source.sourcePage,
    documents: discoverOfficialIrPdfs(await upstream.text(), source),
  });
}

async function fetchStock(symbol) {
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
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/edinet/sync" && request.method === "POST") return syncEdinetDocuments(request, env);

      const edinetMatch = url.pathname.match(/^\/api\/edinet\/([a-z-]+)$/);
      if (edinetMatch && request.method === "GET") return fetchCompanyEdinetDocuments(request, env, edinetMatch[1]);

      const irMatch = url.pathname.match(/^\/api\/ir\/([a-z-]+)$/);
      if (irMatch && request.method === "GET") return fetchOfficialIrDocuments(irMatch[1]);

      const stockMatch = url.pathname.match(/^\/api\/stocks\/([A-Z0-9.]+)$/);
      if (stockMatch && request.method === "GET") return fetchStock(stockMatch[1]);

      return new Response("Not found", { status: 404 });
    } catch (error) {
      return jsonError(error.message);
    }
  },

  async scheduled(_controller, env) {
    const date = jstDate();
    const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date));
    const persisted = await saveEdinetDocuments(env, documents);
    if (!persisted) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  },
};
