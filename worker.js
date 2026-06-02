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

function jsonError(error, status = 500) {
  return Response.json({ error }, { status });
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
    pdf_url: `/api/edinet/documents/${document.docID}/pdf`,
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
  if (!documents.length) return;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
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
  if (!response.ok) throw new Error(`Supabase EDINET document save failed (${response.status})`);
}

async function syncEdinetDocuments(request, env) {
  if (env.SYNC_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.SYNC_TOKEN}`) {
    return jsonError("Unauthorized", 401);
  }
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? jstDate();
  if (!isDate(date)) return jsonError("date must be YYYY-MM-DD", 400);

  const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date));
  await saveEdinetDocuments(env, documents);
  return Response.json({ date, saved: documents.length, documents });
}

async function fetchCompanyEdinetDocuments(request, env, companyCode) {
  if (!edinetCompanies[companyCode]) return jsonError("Company is not configured", 404);
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? jstDate();
  if (!isDate(date)) return jsonError("date must be YYYY-MM-DD", 400);

  const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date), companyCode);
  return Response.json({ companyCode, date, documents });
}

async function fetchEdinetPdf(env, docId) {
  if (!env.EDINET_API_KEY) return jsonError("EDINET_API_KEY is not configured", 503);
  if (!/^S[0-9A-Z]+$/.test(docId)) return jsonError("Document ID is invalid", 400);

  const upstream = await fetch(edinetUrl(`/documents/${docId}`, env.EDINET_API_KEY, { type: "2" }), {
    headers: { "User-Agent": "earnings-viewer/1.0" },
  });
  if (!upstream.ok) return jsonError("EDINET PDF is temporarily unavailable", 502);
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("pdf")) return jsonError("EDINET did not return a PDF", 502);

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${docId}.pdf"`,
      "Content-Type": "application/pdf",
    },
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

      const pdfMatch = url.pathname.match(/^\/api\/edinet\/documents\/(S[0-9A-Z]+)\/pdf$/);
      if (pdfMatch && request.method === "GET") return fetchEdinetPdf(env, pdfMatch[1]);

      const edinetMatch = url.pathname.match(/^\/api\/edinet\/([a-z-]+)$/);
      if (edinetMatch && request.method === "GET") return fetchCompanyEdinetDocuments(request, env, edinetMatch[1]);

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
    await saveEdinetDocuments(env, documents);
  },
};
