import config from "./config.json";

const stockSymbols = new Set([
  "285A.T", "7203.T", "8306.T", "9984.T", "8035.T", "9983.T", "8316.T", "6857.T", "6501.T", "8411.T",
  "6758.T", "6981.T", "6861.T", "6098.T", "8058.T", "8001.T", "8766.T", "4063.T", "9432.T", "8031.T",
]);

const edinetCompanies = {
  kioxia: "285A",
  toyota: "7203",
  ntt: "9432",
  "softbank-group": "9984",
  mufg: "8306",
  "fast-retailing": "9983",
  hitachi: "6501",
  smfg: "8316",
  "tokyo-electron": "8035",
  advantest: "6857",
  mizuho: "8411",
  sony: "6758",
  murata: "6981",
  keyence: "6861",
  recruit: "6098",
  "mitsubishi-corp": "8058",
  itochu: "8001",
  "tokio-marine": "8766",
  "shin-etsu": "4063",
  mitsui: "8031",
};

const edinetDocumentTypes = new Set(["120", "130", "140", "150", "160", "170"]);
const edinetLegalStatuses = new Set(["1", "2"]);
const maxEdinetSyncDays = 31;
const edinetApiBaseUrl = "https://api.edinet-fsa.go.jp/api/v2";
const xbrlFactDefinitions = [
  { concept: "NetSales", label: "Net sales", order: 10 },
  { concept: "NetSalesSummaryOfBusinessResults", label: "Net sales", order: 10 },
  { concept: "Revenue", label: "Revenue", order: 11 },
  { concept: "RevenueIFRSSummaryOfBusinessResults", label: "Revenue", order: 11 },
  { concept: "OperatingRevenue", label: "Operating revenue", order: 12 },
  { concept: "OperatingIncome", label: "Operating income", order: 20 },
  { concept: "OperatingIncomeLossSummaryOfBusinessResults", label: "Operating income", order: 20 },
  { concept: "OperatingProfitLossIFRSSummaryOfBusinessResults", label: "Operating profit", order: 20 },
  { concept: "ProfitLossBeforeTax", label: "Profit before tax", order: 30 },
  { concept: "ProfitLossBeforeTaxIFRSSummaryOfBusinessResults", label: "Profit before tax", order: 30 },
  { concept: "ProfitLoss", label: "Profit or loss", order: 40 },
  { concept: "ProfitLossSummaryOfBusinessResults", label: "Profit or loss", order: 40 },
  { concept: "ProfitLossAttributableToOwnersOfParent", label: "Profit attributable to owners of parent", order: 41 },
  { concept: "ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults", label: "Profit attributable to owners of parent", order: 41 },
  { concept: "NetIncomeLoss", label: "Net income", order: 42 },
  { concept: "NetIncomeLossSummaryOfBusinessResults", label: "Net income", order: 42 },
  { concept: "CashAndCashEquivalents", label: "Cash and cash equivalents", order: 50 },
  { concept: "CashAndCashEquivalentsIFRS", label: "Cash and cash equivalents", order: 50 },
  { concept: "NetCashProvidedByUsedInOperatingActivities", label: "Operating cash flow", order: 60 },
  { concept: "NetCashProvidedByUsedInInvestingActivities", label: "Investing cash flow", order: 61 },
  { concept: "NetCashProvidedByUsedInFinancingActivities", label: "Financing cash flow", order: 62 },
  { concept: "Assets", label: "Assets", order: 70 },
  { concept: "AssetsSummaryOfBusinessResults", label: "Assets", order: 70 },
  { concept: "Liabilities", label: "Liabilities", order: 71 },
  { concept: "Equity", label: "Equity", order: 72 },
];
const xbrlFactDefinitionByConcept = new Map(xbrlFactDefinitions.map((definition) => [definition.concept, definition]));
const irSources = {
  kioxia: {
    sourcePage: "https://www.kioxia-holdings.com/ja-jp/ir/library/data.html",
    allowedDomains: ["kioxia-holdings.com"], includePatterns: [/決算短信|financial results/i],
  },
  toyota: {
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    allowedDomains: ["global.toyota"],
    includePatterns: [/決算要旨|financial results|financial summary|summary of consolidated financial results/i],
    urlPatterns: [/\/ir\/financial-results\/\d{4}_[1-4]q_summary_jp\.pdf$/i],
  },
  ntt: {
    sourcePage: "https://group.ntt/jp/ir/library/results/",
    allowedDomains: ["group.ntt", "ntt.jp"],
    includePatterns: [/決算短信|financial results|earnings release|summary of consolidated financial results/i],
    urlPatterns: [/\/ir\/library\/results\/\d{4}\/pdf\/fy\d{4}q[1-4]kessan\d+\.pdf$/i],
  },
  "softbank-group": {
    sourcePage: "https://group.softbank/ir/financials/financial_reports",
    allowedDomains: ["group.softbank"],
    includePatterns: [/決算短信|financial report|financial results|earnings results/i],
    urlPatterns: [/\/financial_reports\/financial-report_q[1-4]fy\d{4}_\d+_ja\.pdf$/i],
  },
  mufg: {
    sourcePage: "https://www.mufg.jp/ir/fs/index.html?link_id=ir_contents_fs",
    allowedDomains: ["mufg.jp"],
    includePatterns: [/決算短信/i],
    urlPatterns: [/\/dam\/ir\/fs\/\d{4}\/pdf\/summary\d{4}_ja\.pdf$/i],
  },
  "fast-retailing": {
    sourcePage: "https://www.fastretailing.com/jp/ir/library/tanshin.html",
    allowedDomains: ["fastretailing.com"],
    includePatterns: [/決算短信|financial results|summary of consolidated financial results/i],
    urlPatterns: [/\/jp\/ir\/library\/pdf\/tanshin\d{6}_[1-4]q\.pdf$/i],
  },
  hitachi: {
    sourcePage: "https://www.hitachi.com/ja-jp/ir/library/fr/",
    allowedDomains: ["hitachi.com", "hitachi.co.jp"],
    includePatterns: [/決算短信|financial results|earnings release|summary of consolidated financial results/i],
    urlPatterns: [/\/(?:content\/dam\/hitachi\/global\/ja_jp\/press\/files|New\/cnews\/month)\/\d{4}\/\d{2}\/\d{4}\/\d{4}_(?:[1-3]Q|An)\.pdf$/i],
  },
  smfg: {
    sourcePage: "https://www.smfg.co.jp/investor/financial/latest_statement.html",
    allowedDomains: ["smfg.co.jp"],
    includePatterns: [/決算短信|financial results|summary of consolidated financial results/i],
    urlPatterns: [/\/investor\/financial\/latest_statement\/\d{4}_3\/\d{4}_(?:[1-3]q|fy)_01\.pdf$/i],
  },
  "tokyo-electron": {
    sourcePage: "https://www.tel.co.jp/ir/", allowedDomains: ["tel.co.jp"],
    includePatterns: [/決算短信|financial results/i],
  },
  advantest: {
    sourcePage: "https://www.advantest.com/ja/investors/ir-library/result/", allowedDomains: ["advantest.com"],
    includePatterns: [/決算短信|financial results/i],
  },
  mizuho: {
    sourcePage: "https://www.mizuho-fg.co.jp/investors/financial/tanshin/index.html", allowedDomains: ["mizuho-fg.co.jp"],
    includePatterns: [/決算短信|financial results/i],
  },
  sony: {
    sourcePage: "https://www.sony.com/ja/SonyInfo/IR/library/presen/er/", allowedDomains: ["sony.com"],
    includePatterns: [/決算短信|業績説明|financial results|earnings release/i],
  },
  murata: {
    sourcePage: "https://corporate.murata.com/ja-jp/ir/library/results", allowedDomains: ["murata.com"],
    includePatterns: [/決算短信|financial results/i],
  },
  keyence: {
    sourcePage: "https://www.keyence.co.jp/investor/", allowedDomains: ["keyence.co.jp"],
    includePatterns: [/決算短信|financial results/i],
  },
  recruit: {
    sourcePage: "https://recruit-holdings.com/ja/ir/financials/", allowedDomains: ["recruit-holdings.com"],
    includePatterns: [/決算短信|financial results|earnings/i],
  },
  "mitsubishi-corp": {
    sourcePage: "https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/", allowedDomains: ["mitsubishicorp.com"],
    includePatterns: [/決算短信|financial results/i],
  },
  itochu: {
    sourcePage: "https://www.itochu.co.jp/ja/ir/financial_statements/", allowedDomains: ["itochu.co.jp"],
    includePatterns: [/決算短信|financial results/i],
  },
  "tokio-marine": {
    sourcePage: "https://www.tokiomarinehd.com/ir/financial/", allowedDomains: ["tokiomarinehd.com"],
    includePatterns: [/決算短信|financial results/i],
  },
  "shin-etsu": {
    sourcePage: "https://www.shinetsu.co.jp/jp/ir/ir-data/", allowedDomains: ["shinetsu.co.jp"],
    includePatterns: [/決算短信|financial results/i],
  },
  mitsui: {
    sourcePage: "https://www.mitsui.com/jp/ja/ir/library/meeting/index.html", allowedDomains: ["mitsui.com"],
    includePatterns: [/決算短信|financial results/i],
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateRangeEndingAt(endDate, days) {
  const date = new Date(`${endDate}T00:00:00Z`);
  return Array.from({ length: days }, (_value, index) => {
    const item = new Date(date);
    item.setUTCDate(item.getUTCDate() - index);
    return item.toISOString().slice(0, 10);
  }).reverse();
}

function requestedEdinetDates(url) {
  const endDate = url.searchParams.get("date") ?? jstDate();
  const days = Number(url.searchParams.get("days") ?? "1");
  if (!isDate(endDate)) throw new Error("date must be YYYY-MM-DD");
  if (!Number.isInteger(days) || days < 1 || days > maxEdinetSyncDays) {
    throw new Error(`days must be an integer between 1 and ${maxEdinetSyncDays}`);
  }
  return dateRangeEndingAt(endDate, days);
}

function edinetUrl(path, apiKey, params = {}) {
  const url = new URL(`${edinetApiBaseUrl}${path}`);
  url.searchParams.set("Subscription-Key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

async function fetchEdinetDocumentList(env, date) {
  const apiKey = env.EDINET_API_KEY ?? config.edinet?.apiKey;
  if (!apiKey) {
    throw new Error("EDINET API key is not configured. Set edinet.apiKey in config.json or register EDINET_API_KEY as a Cloudflare Worker secret.");
  }
  const response = await fetch(edinetUrl("/documents.json", apiKey, { date, type: "2" }), {
    headers: { "User-Agent": "earnings-viewer/1.0" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Financial Services Agency EDINET API request failed (${response.status}): ${text.slice(0, 500)}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Financial Services Agency EDINET API returned an invalid response: ${text.slice(0, 500)}`);
  }
  if (payload.metadata?.status && String(payload.metadata.status) !== "200") {
    throw new Error(payload.metadata.message ?? "Financial Services Agency EDINET API returned an error");
  }
  return payload.results ?? [];
}

function companyCodeFor(document) {
  const secCode = String(document.secCode ?? "");
  return Object.entries(edinetCompanies).find(([, stockCode]) => secCode.startsWith(stockCode))?.[0] ?? null;
}

function isFinancialDocument(document) {
  return edinetDocumentTypes.has(String(document.docTypeCode))
    && document.withdrawalStatus === "0"
    && document.disclosureStatus === "0"
    && edinetLegalStatuses.has(String(document.legalStatus));
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
  const filtered = documents
    .filter(isFinancialDocument)
    .map((document) => {
      const companyCode = companyCodeFor(document);
      return companyCode ? serializeEdinetDocument(document, companyCode) : null;
    })
    .filter((document) => document && (!requestedCompanyCode || document.company_code === requestedCompanyCode));
  return [...new Map(filtered.map((document) => [document.id, document])).values()];
}

async function fetchEdinetXbrlArchive(env, documentId) {
  const apiKey = env.EDINET_API_KEY ?? config.edinet?.apiKey;
  if (!apiKey) {
    throw new Error("EDINET API key is not configured. Set edinet.apiKey in config.json or register EDINET_API_KEY as a Cloudflare Worker secret.");
  }
  const response = await fetch(edinetUrl(`/documents/${documentId}`, apiKey, { type: "1" }), {
    headers: { "User-Agent": "earnings-viewer/1.0" },
  });
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Financial Services Agency EDINET XBRL request failed (${response.status}): ${text.slice(0, 500)}`);
  }
  if (!contentType.includes("zip") && !contentType.includes("octet-stream")) {
    const text = await response.text();
    throw new Error(`Financial Services Agency EDINET XBRL returned an unexpected response: ${text.slice(0, 500)}`);
  }
  return response.arrayBuffer();
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This runtime does not support ZIP deflate decompression");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer();
}

function findZipEndOfCentralDirectory(view) {
  const minimumOffset = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("EDINET XBRL ZIP central directory was not found");
}

async function unzipTextFiles(buffer, predicate) {
  const view = new DataView(buffer);
  const eocdOffset = findZipEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const files = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(nameBytes);
    offset += 46 + fileNameLength + extraLength + commentLength;
    if (!predicate(name)) continue;

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.slice(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) files.push({ name, text: decoder.decode(content) });
  }
  return files;
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseXbrlContexts(xbrl) {
  const contexts = new Map();
  const contextPattern = /<[^<\s:]*:?context\b([^>]*)>([\s\S]*?)<\/[^<\s:]*:?context>/gi;
  for (const match of xbrl.matchAll(contextPattern)) {
    const id = match[1].match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!id) continue;
    const body = match[2];
    const startDate = body.match(/<[^<\s:]*:?startDate>\s*([^<]+)\s*<\/[^<\s:]*:?startDate>/i)?.[1] ?? null;
    const endDate = body.match(/<[^<\s:]*:?endDate>\s*([^<]+)\s*<\/[^<\s:]*:?endDate>/i)?.[1]
      ?? body.match(/<[^<\s:]*:?instant>\s*([^<]+)\s*<\/[^<\s:]*:?instant>/i)?.[1]
      ?? null;
    contexts.set(id, { startDate, endDate });
  }
  return contexts;
}

function parseXbrlFacts(document, xbrl) {
  const contexts = parseXbrlContexts(xbrl);
  const factPattern = /<([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b([^>]*)>([^<]+)<\/\1?\2>/g;
  const facts = [];
  const seen = new Set();
  for (const match of xbrl.matchAll(factPattern)) {
    const definition = xbrlFactDefinitionByConcept.get(match[2]);
    if (!definition) continue;
    const attributes = match[3];
    const valueText = decodeXml(match[4]).trim().replaceAll(",", "");
    if (!/^-?\d+(?:\.\d+)?$/.test(valueText)) continue;
    const contextRef = attributes.match(/\bcontextRef\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const unitRef = attributes.match(/\bunitRef\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const decimals = attributes.match(/\bdecimals\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const period = contextRef ? contexts.get(contextRef) : null;
    const key = `${document.id}:${definition.concept}:${contextRef ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push({
      id: key,
      document_id: document.id,
      company_code: document.company_code,
      concept: definition.concept,
      label: definition.label,
      value: valueText,
      unit_ref: unitRef,
      decimals,
      context_ref: contextRef,
      period_start: period?.startDate ?? document.period_start ?? null,
      period_end: period?.endDate ?? document.period_end ?? null,
      submitted_at: document.submitted_at,
      display_order: definition.order,
      synced_at: new Date().toISOString(),
    });
  }
  return facts.sort((a, b) => a.display_order - b.display_order);
}

async function extractEdinetFacts(env, document) {
  const archive = await fetchEdinetXbrlArchive(env, document.id);
  const files = await unzipTextFiles(archive, (name) => (
    name.toLowerCase().endsWith(".xbrl")
    && name.includes("/XBRL/PublicDoc/")
    && !name.toLowerCase().includes("audit")
  ));
  const primary = files.find((file) => /jpcrp|jppfs|ifrs/i.test(file.name)) ?? files[0];
  return primary ? parseXbrlFacts(document, primary.text).slice(0, 80) : [];
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

async function saveEdinetFacts(env, facts) {
  if (!facts.length) return true;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/earn_edinet_facts?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(facts),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase EDINET XBRL fact save failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return true;
}

async function syncEdinetDocuments(request, env) {
  if (env.SYNC_TOKEN && request.headers.get("Authorization") !== `Bearer ${env.SYNC_TOKEN}`) {
    return jsonError("Unauthorized", 401);
  }
  const url = new URL(request.url);
  let dates;
  try {
    dates = requestedEdinetDates(url);
  } catch (error) {
    return jsonError(error, 400);
  }

  let documents;
  try {
    const documentLists = [];
    for (const date of dates) documentLists.push(...await fetchEdinetDocumentList(env, date));
    documents = filterEdinetDocuments(documentLists);
  } catch (error) {
    return Response.json({
      dates,
      saved: 0,
      persisted: false,
      edinetError: error instanceof Error ? error.message : String(error),
      documents: [],
    });
  }
  const facts = [];
  const xbrlErrors = [];
  for (const document of documents) {
    try {
      facts.push(...await extractEdinetFacts(env, document));
    } catch (error) {
      xbrlErrors.push({
        documentId: document.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let persisted = false;
  let factsPersisted = false;
  let persistenceError = null;
  try {
    persisted = await saveEdinetDocuments(env, documents);
    factsPersisted = await saveEdinetFacts(env, facts);
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : String(error);
  }
  return Response.json({
    dates,
    saved: persisted ? documents.length : 0,
    factsSaved: factsPersisted ? facts.length : 0,
    persisted,
    factsPersisted,
    persistenceError,
    xbrlErrors,
    documents,
    facts,
  });
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

function isFinancialDocumentTitle(value, source) {
  return source.includePatterns.some((pattern) => pattern.test(value));
}

function isFinancialDocumentUrl(url, source) {
  return source.urlPatterns?.some((pattern) => pattern.test(url.pathname)) ?? false;
}

function isOfficialFinancialDocument(document, source) {
  if (source.urlPatterns?.length) return isFinancialDocumentUrl(new URL(document.url), source);
  return isFinancialDocumentTitle(`${document.title} ${document.url} ${document.context}`, source);
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
    const contextStart = Math.max(0, match.index - 240);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 120);
    documents.push({
      title: textContent(match[3]) || fallbackTitle,
      url: url.href,
      context: textContent(html.slice(contextStart, contextEnd)),
    });
  }

  return documents
    .filter((document) => isOfficialFinancialDocument(document, source))
    .map(({ context: _context, ...document }) => document)
    .slice(0, 30);
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
      if (url.pathname === "/api/edinet/sync") {
        if (request.method !== "POST") return jsonError("Method not allowed. Use POST for EDINET sync.", 405);
        return syncEdinetDocuments(request, env);
      }

      const edinetMatch = url.pathname.match(/^\/api\/edinet\/([a-z-]+)$/);
      if (edinetMatch && request.method === "GET") return fetchCompanyEdinetDocuments(request, env, edinetMatch[1]);

      const irMatch = url.pathname.match(/^\/api\/ir\/([a-z-]+)$/);
      if (irMatch && request.method === "GET") return fetchOfficialIrDocuments(irMatch[1]);

      const stockMatch = url.pathname.match(/^\/api\/stocks\/([A-Z0-9.]+)$/);
      if (stockMatch && request.method === "GET") return fetchStock(stockMatch[1]);

      return new Response("Not found", { status: 404 });
    } catch (error) {
      return jsonError(error);
    }
  },

  async scheduled(_controller, env) {
    const date = jstDate();
    const documents = filterEdinetDocuments(await fetchEdinetDocumentList(env, date));
    const persisted = await saveEdinetDocuments(env, documents);
    const facts = [];
    for (const document of documents) {
      try {
        facts.push(...await extractEdinetFacts(env, document));
      } catch {
        // Keep the scheduled metadata sync alive even when an individual XBRL package is unavailable.
      }
    }
    const factsPersisted = await saveEdinetFacts(env, facts);
    if (!persisted) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    if (!factsPersisted) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
  },
};
