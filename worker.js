import config from "./config.json";

// 株価APIに問い合わせてよい銘柄だけをここに並べます。知らない銘柄を外へ投げないためです。
const stockSymbols = new Set([
  "285A.T", "7203.T", "8306.T", "9984.T", "8035.T", "9983.T", "8316.T", "6857.T", "6501.T", "8411.T",
  "6758.T", "6981.T", "6861.T", "6098.T", "8058.T", "8001.T", "8766.T", "4063.T", "9432.T", "8031.T",
]);

// このサイトの会社コードと、EDINETで会社を探すための証券コードを対応させています。
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

// EDINETの書類のうち、決算に関係する種類だけを対象にします。
const edinetDocumentTypes = new Set(["120", "130", "140", "150", "160", "170"]);
const edinetLegalStatuses = new Set(["1", "2"]);
const maxEdinetSyncDays = 31;
const edinetApiBaseUrl = "https://api.edinet-fsa.go.jp/api/v2";
// XBRLの中から拾いたい数字の名前です。会社によって少し名前が違うので複数用意します。
const xbrlFactDefinitions = [
  { concept: "NetSales", label: "Net sales", order: 10 },
  { concept: "NetSalesSummaryOfBusinessResults", label: "Net sales", order: 10 },
  { concept: "Revenue", label: "Revenue", order: 11 },
  { concept: "RevenueIFRS", label: "Revenue", order: 11 },
  { concept: "RevenueIFRSSummaryOfBusinessResults", label: "Revenue", order: 11 },
  { concept: "SalesRevenuesIFRS", label: "Sales revenues", order: 11 },
  { concept: "TotalNetRevenuesIFRS", label: "Total net revenues", order: 11 },
  { concept: "OperatingRevenue", label: "Operating revenue", order: 12 },
  { concept: "OrdinaryIncome", label: "Ordinary income", order: 13 },
  { concept: "OrdinaryIncomeSummaryOfBusinessResults", label: "Ordinary income", order: 13 },
  { concept: "OperatingIncome", label: "Operating income", order: 20 },
  { concept: "OperatingIncomeLossSummaryOfBusinessResults", label: "Operating income", order: 20 },
  { concept: "OperatingProfitLossIFRSSummaryOfBusinessResults", label: "Operating profit", order: 20 },
  { concept: "OperatingProfitLossIFRS", label: "Operating profit", order: 20 },
  { concept: "ProfitLossBeforeTax", label: "Profit before tax", order: 30 },
  { concept: "ProfitLossBeforeTaxIFRSSummaryOfBusinessResults", label: "Profit before tax", order: 30 },
  { concept: "ProfitLossBeforeTaxIFRS", label: "Profit before tax", order: 30 },
  { concept: "OrdinaryProfitLoss", label: "Ordinary profit", order: 31 },
  { concept: "OrdinaryProfitLossSummaryOfBusinessResults", label: "Ordinary profit", order: 31 },
  { concept: "ProfitLoss", label: "Profit or loss", order: 40 },
  { concept: "ProfitLossSummaryOfBusinessResults", label: "Profit or loss", order: 40 },
  { concept: "ProfitLossAttributableToOwnersOfParent", label: "Profit attributable to owners of parent", order: 41 },
  { concept: "ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults", label: "Profit attributable to owners of parent", order: 41 },
  { concept: "ProfitLossAttributableToOwnersOfParentIFRS", label: "Profit attributable to owners of parent", order: 41 },
  { concept: "NetIncomeLoss", label: "Net income", order: 42 },
  { concept: "NetIncomeLossSummaryOfBusinessResults", label: "Net income", order: 42 },
  { concept: "CashAndCashEquivalents", label: "Cash and cash equivalents", order: 50 },
  { concept: "CashAndCashEquivalentsIFRS", label: "Cash and cash equivalents", order: 50 },
  { concept: "CashAndCashEquivalentsIFRSSummaryOfBusinessResults", label: "Cash and cash equivalents", order: 50 },
  { concept: "NetCashProvidedByUsedInOperatingActivities", label: "Operating cash flow", order: 60 },
  { concept: "NetCashProvidedByUsedInOperatingActivitiesIFRS", label: "Operating cash flow", order: 60 },
  { concept: "CashFlowsFromUsedInOperatingActivitiesIFRSSummaryOfBusinessResults", label: "Operating cash flow", order: 60 },
  { concept: "NetCashProvidedByUsedInInvestingActivities", label: "Investing cash flow", order: 61 },
  { concept: "NetCashProvidedByUsedInInvestingActivitiesIFRS", label: "Investing cash flow", order: 61 },
  { concept: "CashFlowsFromUsedInInvestingActivitiesIFRSSummaryOfBusinessResults", label: "Investing cash flow", order: 61 },
  { concept: "NetCashProvidedByUsedInFinancingActivities", label: "Financing cash flow", order: 62 },
  { concept: "NetCashProvidedByUsedInFinancingActivitiesIFRS", label: "Financing cash flow", order: 62 },
  { concept: "CashFlowsFromUsedInFinancingActivitiesIFRSSummaryOfBusinessResults", label: "Financing cash flow", order: 62 },
  { concept: "Assets", label: "Assets", order: 70 },
  { concept: "AssetsSummaryOfBusinessResults", label: "Assets", order: 70 },
  { concept: "Liabilities", label: "Liabilities", order: 71 },
  { concept: "Equity", label: "Equity", order: 72 },
];
const xbrlFactDefinitionByConcept = new Map(xbrlFactDefinitions.map((definition) => [definition.concept, definition]));
// ここから下は、XBRLの色々な名前を「売上」「利益」「現金」などにまとめるための辞書です。
const revenueConcepts = [
  "RevenueIFRSSummaryOfBusinessResults", "RevenueIFRS", "SalesRevenuesIFRS", "TotalNetRevenuesIFRS", "Revenue",
  "NetSalesSummaryOfBusinessResults", "NetSales", "OperatingRevenue",
  "OrdinaryIncomeSummaryOfBusinessResults", "OrdinaryIncome",
];
const operatingIncomeConcepts = [
  "OperatingProfitLossIFRSSummaryOfBusinessResults", "OperatingProfitLossIFRS",
  "OperatingIncomeLossSummaryOfBusinessResults", "OperatingIncome",
];
const pretaxIncomeConcepts = [
  "ProfitLossBeforeTaxIFRSSummaryOfBusinessResults", "ProfitLossBeforeTaxIFRS", "ProfitLossBeforeTax",
  "OrdinaryProfitLossSummaryOfBusinessResults", "OrdinaryProfitLoss",
];
const netIncomeConcepts = [
  "ProfitLossAttributableToOwnersOfParentIFRSSummaryOfBusinessResults",
  "ProfitLossAttributableToOwnersOfParentIFRS",
  "ProfitLossAttributableToOwnersOfParent",
  "NetIncomeLossSummaryOfBusinessResults",
  "NetIncomeLoss",
  "ProfitLossSummaryOfBusinessResults",
  "ProfitLoss",
];
const cashConcepts = [
  "CashAndCashEquivalentsIFRSSummaryOfBusinessResults", "CashAndCashEquivalentsIFRS", "CashAndCashEquivalents",
];
const operatingCashFlowConcepts = [
  "CashFlowsFromUsedInOperatingActivitiesIFRSSummaryOfBusinessResults",
  "NetCashProvidedByUsedInOperatingActivitiesIFRS",
  "NetCashProvidedByUsedInOperatingActivities",
];
const investingCashFlowConcepts = [
  "CashFlowsFromUsedInInvestingActivitiesIFRSSummaryOfBusinessResults",
  "NetCashProvidedByUsedInInvestingActivitiesIFRS",
  "NetCashProvidedByUsedInInvestingActivities",
];
const financingCashFlowConcepts = [
  "CashFlowsFromUsedInFinancingActivitiesIFRSSummaryOfBusinessResults",
  "NetCashProvidedByUsedInFinancingActivitiesIFRS",
  "NetCashProvidedByUsedInFinancingActivities",
];
const supabaseUrl = config.supabase?.url;
const supabaseKey = config.supabase?.key;

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

/**
 * 概要: EDINET APIキーがないと数字を取りに行けないので、早めに分かりやすく止めます。
 * 引数: なし。
 * 戻り値: config.jsonに設定されたEDINET APIキー。
 */
function requireEdinetApiKey() {
  const apiKey = config.edinet?.apiKey;
  if (!apiKey) {
    throw new Error("EDINET API key is not configured. Set edinet.apiKey in config.json.");
  }
  return apiKey;
}

/**
 * 概要: Supabase REST APIにアクセスするときに毎回使うヘッダーを作ります。
 * 引数: prefer - SupabaseのPreferヘッダーに入れる値。
 * 戻り値: Supabase API用のヘッダー。
 */
function supabaseHeaders(prefer = null) {
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

// 公式IR PDFを探すための会社ごとの設定です。サイトごとにURLやPDF名の形が違います。
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

/**
 * 概要: Workerから返すエラーをJSONにそろえます。画面側で扱いやすくするためです。
 * 引数: error - エラー内容、status - HTTPステータス。
 * 戻り値: エラー情報を含むJSONレスポンス。
 */
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

/**
 * 概要: URLのdateとdaysから、EDINETへ問い合わせる日付一覧を作ります。
 * 引数: url - リクエストURL。
 * 戻り値: EDINETへ問い合わせる日付文字列の配列。
 */
function requestedEdinetDates(url) {
  const endDate = url.searchParams.get("date") ?? jstDate();
  const days = Number(url.searchParams.get("days") ?? "1");
  if (!isDate(endDate)) throw new Error("date must be YYYY-MM-DD");
  if (!Number.isInteger(days) || days < 1 || days > maxEdinetSyncDays) {
    throw new Error(`days must be an integer between 1 and ${maxEdinetSyncDays}`);
  }
  return dateRangeEndingAt(endDate, days);
}

/**
 * 概要: EDINET APIのURLを作ります。APIキーはクエリにも付けておきます。
 * 引数: path - APIパス、apiKey - EDINET APIキー、params - 追加クエリ。
 * 戻り値: EDINET APIへアクセスするURL。
 */
function edinetUrl(path, apiKey, params = {}) {
  const url = new URL(`${edinetApiBaseUrl}${path}`);
  url.searchParams.set("Subscription-Key", apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

/**
 * 概要: 指定日のEDINET提出書類一覧を取得します。まだXBRL本体は取りません。
 * 引数: _env - Worker環境、date - 取得対象日。
 * 戻り値: EDINET提出書類一覧を返すPromise。
 */
async function fetchEdinetDocumentList(_env, date) {
  const apiKey = requireEdinetApiKey();
  const response = await fetch(edinetUrl("/documents.json", apiKey, { date, type: "2" }), {
    headers: {
      "Subscription-Key": apiKey,
      "User-Agent": "earnings-viewer/1.0",
    },
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

/**
 * 概要: EDINET書類の証券コードから、このサイト内の会社コードへ変換します。
 * 引数: document - EDINET書類メタデータ。
 * 戻り値: サイト内の会社コード。対象外ならnull。
 */
function companyCodeFor(document) {
  const secCode = String(document.secCode ?? "");
  return Object.entries(edinetCompanies).find(([, stockCode]) => secCode.startsWith(stockCode))?.[0] ?? null;
}

/**
 * 概要: 取り消し・非公開などを除き、使える決算書類かどうかを判定します。
 * 引数: document - EDINET書類メタデータ。
 * 戻り値: 使える決算書類ならtrue。
 */
function isFinancialDocument(document) {
  return edinetDocumentTypes.has(String(document.docTypeCode))
    && document.withdrawalStatus === "0"
    && document.disclosureStatus === "0"
    && edinetLegalStatuses.has(String(document.legalStatus));
}

/**
 * 概要: EDINETの書類データを、Supabaseへ保存しやすい形に整えます。
 * 引数: document - EDINET書類メタデータ、companyCode - サイト内の会社コード。
 * 戻り値: DB保存用に整えた書類データ。
 */
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

/**
 * 概要: EDINETの書類IDから、XBRLが入ったZIPファイルを取得します。
 * 引数: _env - Worker環境、documentId - EDINET書類ID。
 * 戻り値: ZIPファイルのArrayBufferを返すPromise。
 */
async function fetchEdinetXbrlArchive(_env, documentId) {
  const apiKey = requireEdinetApiKey();
  const response = await fetch(edinetUrl(`/documents/${documentId}`, apiKey, { type: "1" }), {
    headers: {
      "Subscription-Key": apiKey,
      "User-Agent": "earnings-viewer/1.0",
    },
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

/**
 * 概要: ZIPの中から、必要なテキストファイルだけを取り出します。
 * 引数: buffer - ZIPファイル本体、predicate - 取り出すファイル名を選ぶ関数。
 * 戻り値: ファイル名と本文の配列を返すPromise。
 */
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

/**
 * 概要: XBRLのcontextは「この数字がいつの期間の数字か」を表します。
 * 引数: xbrl - XBRL本文。
 * 戻り値: contextRefをキーにした期間情報のMap。
 */
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

/**
 * 概要: XBRL本文から、売上や利益など表示に使う数字だけを抜き出します。
 * 引数: document - EDINET書類データ、xbrl - XBRL本文。
 * 戻り値: DB保存用のXBRL数値配列。
 */
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

/**
 * 概要: 1つのEDINET書類について、ZIP取得からXBRL数字の抜き出しまで行います。
 * 引数: env - Worker環境、document - EDINET書類データ。
 * 戻り値: XBRL数値配列を返すPromise。
 */
async function extractEdinetFacts(env, document) {
  const archive = await fetchEdinetXbrlArchive(env, document.id);
  const files = await unzipTextFiles(archive, (name) => (
    name.toLowerCase().endsWith(".xbrl")
    && name.includes("/XBRL/PublicDoc/")
    && !name.toLowerCase().includes("audit")
  ));
  const primary = files.find((file) => /jpcrp|jppfs|ifrs/i.test(file.name)) ?? files[0];
  return primary ? parseXbrlFacts(document, primary.text) : [];
}

/**
 * 概要: EDINET書類の基本情報をDBへ保存します。
 * 引数: env - Worker環境、documents - 保存する書類データ配列。
 * 戻り値: Worker側で保存できた場合はtrue、画面側保存に任せる場合はfalseを返すPromise。
 */
async function saveEdinetDocuments(env, documents) {
  if (!documents.length) return true;
  if (!hasSupabaseConfig()) {
    return false;
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/earn_edinet_documents?on_conflict=id`, {
    method: "POST",
    headers: supabaseHeaders("resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify(documents),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase EDINET document save failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return true;
}

/**
 * 概要: XBRLから抜き出した数字をDBへ保存します。
 * 引数: env - Worker環境、facts - 保存するXBRL数値配列。
 * 戻り値: Worker側で保存できた場合はtrue、画面側保存に任せる場合はfalseを返すPromise。
 */
async function saveEdinetFacts(env, facts) {
  if (!facts.length) return true;
  if (!hasSupabaseConfig()) {
    return false;
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/earn_edinet_facts?on_conflict=id`, {
    method: "POST",
    headers: supabaseHeaders("resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify(facts),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase EDINET XBRL fact save failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return true;
}

/**
 * 概要: SupabaseのREST APIは一度に読める数に限りがあるので、ページを分けて全部読みます。
 * 引数: env - Worker環境、table - テーブル名、query - REST APIのクエリ文字列。
 * 戻り値: 取得した全行を返すPromise。
 */
async function fetchAllSupabaseRows(env, table, query) {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
      headers: {
        ...supabaseHeaders(),
        Range: `${start}-${start + pageSize - 1}`,
        "Range-Unit": "items",
        Prefer: "count=exact",
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase ${table} read failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function upsertSupabaseRows(env, table, conflictColumns, rows) {
  if (!rows.length) return;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumns)}`,
    {
      method: "POST",
      headers: supabaseHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${table} promotion failed (${response.status}): ${detail.slice(0, 500)}`);
  }
}

function durationDays(start, end) {
  if (!start || !end) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

/**
 * 概要: 同じような数字が複数あるとき、連結・当期など「使いたい数字」らしいものを高得点にします。
 * 引数: contextRef - XBRLのcontextRef。
 * 戻り値: 優先度を表す点数。
 */
function contextScore(contextRef = "") {
  const value = contextRef.toLowerCase();
  let score = 0;
  if (value.includes("currentyear")) score += 20;
  if (value.includes("duration") || value.includes("instant")) score += 8;
  if (value.includes("consolidated")) score += 4;
  if (value.includes("nonconsolidated") || value.includes("non-consolidated")) score -= 30;
  if (value.includes("member") || value.includes("segment")) score -= 10;
  return score;
}

/**
 * 概要: factsの中から、指定した期間に合う売上や利益の値を1つ選びます。
 * 引数: facts - XBRL数値配列、concepts - 探すconcept名、periodStart - 期首、periodEnd - 期末、instant - 一時点の値として探すか。
 * 戻り値: 百万円単位へ変換した数値。見つからない場合はnull。
 */
function metricValue(facts, concepts, periodStart, periodEnd, instant = false) {
  for (const concept of concepts) {
    const candidates = facts
      .filter((fact) => fact.concept === concept
        && fact.period_end === periodEnd
        && (instant || fact.period_start === periodStart)
        && Number.isFinite(Number(fact.value)))
      .sort((a, b) => contextScore(b.context_ref) - contextScore(a.context_ref));
    if (candidates.length) return Number(candidates[0].value) / 1000000;
  }
  return null;
}

/**
 * 概要: EDINETの書類を、このサイトで使う「上期」または「通期」に分類します。
 * 引数: document - EDINET書類データ、facts - その書類から抜き出したXBRL数値。
 * 戻り値: 期間種別と対象期間。対象外ならnull。
 */
function effectivePeriod(document, facts) {
  const docType = String(document.doc_type_code);
  if (docType === "120") {
    return document.period_start && document.period_end
      ? { periodType: "FY", periodStart: document.period_start, periodEnd: document.period_end }
      : null;
  }
  if (docType !== "160") return null;

  const candidates = new Map();
  for (const fact of facts) {
    const days = durationDays(fact.period_start, fact.period_end);
    if (days === null || days < 120 || days > 220) continue;
    if (document.period_start && fact.period_start !== document.period_start) continue;
    const key = `${fact.period_start}:${fact.period_end}`;
    candidates.set(key, (candidates.get(key) ?? 0) + (1000 - Number(fact.display_order ?? 999)));
  }
  const selected = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!selected) return null;
  const [periodStart, periodEnd] = selected.split(":");
  return { periodType: "H1", periodStart, periodEnd };
}

/**
 * 概要: 同じ会社・同じ年度・同じ期間の書類が複数あるときは、いちばん新しい提出分を使います。
 * 引数: documents - EDINET書類配列、factsByDocument - 書類IDごとのXBRL数値Map。
 * 戻り値: 期間ごとに最新化した書類配列。
 */
function latestDocumentsByPeriod(documents, factsByDocument) {
  const fiscalEndMonths = new Map();
  for (const document of documents) {
    if (String(document.doc_type_code) === "120" && document.period_end) {
      fiscalEndMonths.set(document.company_code, Number(document.period_end.slice(5, 7)));
    }
  }
  const latest = new Map();
  for (const document of documents) {
    const documentFacts = factsByDocument.get(document.id) ?? [];
    const period = effectivePeriod(document, documentFacts);
    if (!period) continue;
    const startYear = Number(period.periodStart.slice(0, 4));
    const startMonth = Number(period.periodStart.slice(5, 7));
    const fiscalEndMonth = fiscalEndMonths.get(document.company_code) ?? 3;
    const declaredDays = durationDays(document.period_start, document.period_end);
    const fiscalYear = period.periodType === "FY" || (period.periodType === "H1" && declaredDays > 290)
      ? Number(document.period_end.slice(0, 4))
      : startYear + (fiscalEndMonth < startMonth ? 1 : 0);
    const key = `${document.company_code}:${fiscalYear}:${period.periodType}`;
    const existing = latest.get(key);
    if (!existing || `${document.submitted_at}:${document.id}` > `${existing.submitted_at}:${existing.id}`) {
      latest.set(key, { ...document, ...period, fiscalYear });
    }
  }
  return [...latest.values()];
}

/**
 * 概要: EDINETの生データから、画面で使う決算テーブル用の行を作ります。
 * 引数: documents - EDINET書類配列、facts - XBRL数値配列。
 * 戻り値: 期間決算行と年間キャッシュフロー行。
 */
function buildDashboardRows(documents, facts) {
  const factsByDocument = new Map();
  for (const fact of facts) {
    if (!factsByDocument.has(fact.document_id)) factsByDocument.set(fact.document_id, []);
    factsByDocument.get(fact.document_id).push(fact);
  }

  const cumulative = latestDocumentsByPeriod(documents, factsByDocument).map((document) => {
    const documentFacts = factsByDocument.get(document.id) ?? [];
    return {
      ...document,
      revenue: metricValue(documentFacts, revenueConcepts, document.periodStart, document.periodEnd),
      operatingIncome: metricValue(documentFacts, operatingIncomeConcepts, document.periodStart, document.periodEnd),
      pretaxIncome: metricValue(documentFacts, pretaxIncomeConcepts, document.periodStart, document.periodEnd),
      netIncome: metricValue(documentFacts, netIncomeConcepts, document.periodStart, document.periodEnd),
      operatingCashFlow: metricValue(documentFacts, operatingCashFlowConcepts, document.periodStart, document.periodEnd),
      investingCashFlow: metricValue(documentFacts, investingCashFlowConcepts, document.periodStart, document.periodEnd),
      financingCashFlow: metricValue(documentFacts, financingCashFlowConcepts, document.periodStart, document.periodEnd),
      cash: metricValue(documentFacts, cashConcepts, document.periodStart, document.periodEnd, true),
    };
  }).sort((a, b) => (
    a.company_code.localeCompare(b.company_code)
    || a.fiscalYear - b.fiscalYear
    || a.periodEnd.localeCompare(b.periodEnd)
  ));

  const periodResults = [];
  for (const row of cumulative) {
    if (row.revenue === null || row.netIncome === null
      || (row.operatingIncome === null && row.pretaxIncome === null)) continue;
    periodResults.push({
      id: `edinet-${row.id}`,
      company_code: row.company_code,
      fiscal_year: row.fiscalYear,
      period_type: row.periodType,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      revenue: Math.round(row.revenue),
      operating_cost: row.operatingIncome === null ? null : Math.round(row.revenue - row.operatingIncome),
      operating_income: row.operatingIncome === null ? null : Math.round(row.operatingIncome),
      pretax_income: row.pretaxIncome === null ? null : Math.round(row.pretaxIncome),
      net_income: Math.round(row.netIncome),
      source_url: "https://disclosure2.edinet-fsa.go.jp/",
      synced_at: new Date().toISOString(),
    });
  }

  const annualRows = cumulative.filter((row) => row.periodType === "FY");
  const annualByCompanyYear = new Map(annualRows.map((row) => [`${row.company_code}:${row.fiscalYear}`, row]));
  const annualFlows = [];
  for (const current of annualRows) {
    const previous = annualByCompanyYear.get(`${current.company_code}:${current.fiscalYear - 1}`);
    if (!previous
      || current.revenue === null || current.operatingIncome === null || current.investingCashFlow === null
      || previous.revenue === null || previous.operatingIncome === null) continue;
    annualFlows.push({
      id: `edinet-annual-${current.id}`,
      company_code: current.company_code,
      previous_fiscal_year: `FY${previous.fiscalYear}`,
      current_fiscal_year: `FY${current.fiscalYear}`,
      previous_revenue: Math.round(previous.revenue),
      current_revenue: Math.round(current.revenue),
      previous_operating_cost: Math.round(previous.revenue - previous.operatingIncome),
      current_operating_cost: Math.round(current.revenue - current.operatingIncome),
      previous_operating_income: Math.round(previous.operatingIncome),
      current_operating_income: Math.round(current.operatingIncome),
      operating_cash_flow: current.operatingCashFlow === null ? null : Math.round(current.operatingCashFlow),
      investing_cash_flow: Math.round(current.investingCashFlow),
      financing_cash_flow: current.financingCashFlow === null ? null : Math.round(current.financingCashFlow),
      previous_cash_and_cash_equivalents: previous.cash === null ? null : Math.round(previous.cash),
      cash_and_cash_equivalents: current.cash === null ? null : Math.round(current.cash),
      expense_breakdown: [],
      source_url: "https://disclosure2.edinet-fsa.go.jp/",
      synced_at: new Date().toISOString(),
    });
  }
  return { periodResults, annualFlows };
}

/**
 * 概要: 保存済みのXBRL数値を、画面が直接読むテーブルへ変換して登録します。
 * 引数: env - Worker環境、companyCodes - 対象会社コード配列。
 * 戻り値: 登録した期間決算行数と年間キャッシュフロー行数を返すPromise。
 */
async function promoteEdinetFacts(env, companyCodes) {
  if (!companyCodes.length || !hasSupabaseConfig()) {
    return { periodResults: 0, annualFlows: 0 };
  }
  const companyFilter = `(${companyCodes.join(",")})`;
  const [documents, facts] = await Promise.all([
    fetchAllSupabaseRows(env, "earn_edinet_documents", `company_code=in.${encodeURIComponent(companyFilter)}&select=*`),
    fetchAllSupabaseRows(env, "earn_edinet_facts", `company_code=in.${encodeURIComponent(companyFilter)}&select=*`),
  ]);
  const rows = buildDashboardRows(documents, facts);
  await upsertSupabaseRows(env, "earn_period_results", "company_code,fiscal_year,period_type", rows.periodResults);
  await upsertSupabaseRows(env, "earn_annual_profit_flows", "company_code,current_fiscal_year", rows.annualFlows);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/earn_companies?code=in.${encodeURIComponent(companyFilter)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders("return=minimal"),
      body: JSON.stringify({ last_synced_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase company sync timestamp update failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return { periodResults: rows.periodResults.length, annualFlows: rows.annualFlows.length };
}

/**
 * 概要: /api/edinet/sync の本体です。EDINET取得、DB保存、画面用データ作成をまとめて行います。
 * 引数: request - Workerへのリクエスト、env - Worker環境。
 * 戻り値: 同期結果を含むJSONレスポンスを返すPromise。
 */
async function syncEdinetDocuments(request, env) {
  const url = new URL(request.url);
  const requestedCompanyCode = url.searchParams.get("company");
  if (requestedCompanyCode && !edinetCompanies[requestedCompanyCode]) {
    return jsonError("Company is not configured", 404);
  }
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
    documents = filterEdinetDocuments(documentLists, requestedCompanyCode);
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
  let promoted = { periodResults: 0, annualFlows: 0 };
  let persistenceError = null;
  try {
    persisted = await saveEdinetDocuments(env, documents);
    factsPersisted = await saveEdinetFacts(env, facts);
    if (persisted && factsPersisted) {
      promoted = await promoteEdinetFacts(env, [...new Set(documents.map((document) => document.company_code))]);
    }
  } catch (error) {
    persistenceError = error instanceof Error ? error.message : String(error);
  }
  return Response.json({
    dates,
    saved: persisted ? documents.length : 0,
    factsSaved: factsPersisted ? facts.length : 0,
    persisted,
    factsPersisted,
    promoted,
    persistenceError,
    xbrlErrors,
    documents,
    facts,
  });
}

/**
 * 概要: /api/edinet/:company の本体です。指定日のEDINET書類一覧だけを返します。
 * 引数: request - Workerへのリクエスト、env - Worker環境、companyCode - 対象会社コード。
 * 戻り値: EDINET書類一覧を含むJSONレスポンスを返すPromise。
 */
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

/**
 * 概要: 会社のIRページHTMLから、決算PDFらしいリンクだけを探します。
 * 引数: html - IRページHTML、source - 会社ごとの探索設定。
 * 戻り値: 決算PDF候補の配列。
 */
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

/**
 * 概要: /api/ir/:company の本体です。公式IRページを見に行ってPDFリンクを返します。
 * 引数: companyCode - 対象会社コード。
 * 戻り値: PDF一覧を含むJSONレスポンスを返すPromise。
 */
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

/**
 * 概要: /api/stocks/:symbol の本体です。Yahoo Financeから株価チャート用データを返します。
 * 引数: symbol - 株価シンボル。
 * 戻り値: 株価JSONレスポンスを返すPromise。
 */
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
  /**
   * 概要: Workerの入口です。URLに合わせて、EDINET・IR PDF・株価の処理へ振り分けます。
   * 引数: request - ブラウザや外部から届いたリクエスト、env - Cloudflare Workerの環境情報。
   * 戻り値: 各APIの結果を表すレスポンスを返すPromise。
   */
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

};
