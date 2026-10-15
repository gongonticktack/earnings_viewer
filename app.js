import { mergeFinancialResults, fiscalYearFromPeriod, fiscalPeriodLabel } from "./market.js";
import { buildIncomeFlow, sankeyHubSize } from "./sankey.js";
import { sortIrDocuments } from "./report-metadata.js";
import { buildCashFlow } from "./cash-flow.js";
import { extractStatement, mergeOfficialStatements } from "./financial-reports.js";
import { translateText, readLanguage, saveLanguage } from "./i18n.js";
import { chartPoint, hitChart } from "./chart-interaction.js";
import { stockIndicators } from "./stock-indicators.js";

const STOCK_REFRESH_MS = 60 * 60 * 1000;
const FINANCIAL_REFRESH_MS = 24 * 60 * 60 * 1000;

/** 概要: 古いWebViewでも取得タイムアウトを設定します。引数: milliseconds - 制限時間。戻り値: 中断用のAbortSignal。 */
function requestTimeout(milliseconds) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") return AbortSignal.timeout(milliseconds);
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), milliseconds);
  return controller.signal;
}

const defaultAppConfig = {
};

/**
 * 概要: config.jsonを読み込みます。読めなかったときは、空の初期設定で画面だけ動かします。
 * 引数: なし。
 * 戻り値: 画面とAPIで使う設定オブジェクトを返すPromise。
 */
async function loadAppConfig() {
  try {
    const response = await fetch(new URL("./config.json", import.meta.url));
    if (!response.ok) throw new Error(`config.json could not be loaded (${response.status})`);
    const data = await response.json();
    return {
      ...defaultAppConfig,
      ...data,
    };
  } catch (error) {
    console.warn("config.jsonの読み込みに失敗したため、既定値を使用します。", error);
    return defaultAppConfig;
  }
}

const appConfig = await loadAppConfig();

/**
 * 概要: Supabase REST APIから公開テーブルのデータを取得します。
 * 引数: table - テーブル名。query - PostgRESTへ渡す検索条件。
 * 戻り値: 取得した行の配列を返すPromise。
 */
async function fetchSupabaseRows(table, query = {}) {
  const { url, key } = appConfig.supabase ?? {};
  if (!url || !key) throw new Error("config.jsonにSupabaseのurlとkeyを設定してください。");

  const endpoint = new URL(`/rest/v1/${table}`, url);
  Object.entries(query).forEach(([name, value]) => endpoint.searchParams.set(name, value));
  const response = await fetch(endpoint, {
    cache: "no-store",
    signal: requestTimeout(12000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${table}の取得に失敗しました (${response.status}): ${detail}`);
  }
  return response.json();
}

// サイドバーに出す会社の基本情報です。画面表示や株価取得で同じ情報を使います。
const companies = {
  kioxia: {
    code: "kioxia", name: "KIOXIA HOLDINGS CORPORATION", sourceName: "KIOXIA IR",
    sourcePage: "https://www.kioxia-holdings.com/ja-jp/ir/library/data.html", stockSymbol: "285A.T",
  },
  toyota: {
    code: "toyota",
    name: "TOYOTA MOTOR CORPORATION",
    sourceName: "TOYOTA IR",
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    stockSymbol: "7203.T",
  },
  "tokyo-electron": {
    code: "tokyo-electron", name: "TOKYO ELECTRON LIMITED", sourceName: "TOKYO ELECTRON IR",
    sourcePage: "https://www.tel.co.jp/ir/", stockSymbol: "8035.T",
  },
  ntt: {
    code: "ntt",
    name: "NTT, INC.",
    sourceName: "NTT IR",
    sourcePage: "https://group.ntt/jp/ir/library/results/",
    stockSymbol: "9432.T",
  },
  "softbank-group": {
    code: "softbank-group",
    name: "SOFTBANK GROUP CORP.",
    sourceName: "SOFTBANK GROUP IR",
    sourcePage: "https://group.softbank/ir/financials/financial_reports",
    stockSymbol: "9984.T",
  },
  mufg: {
    code: "mufg",
    name: "MITSUBISHI UFJ FINANCIAL GROUP",
    sourceName: "MUFG IR",
    sourcePage: "https://www.mufg.jp/ir/fs/index.html?link_id=ir_contents_fs",
    stockSymbol: "8306.T",
  },
  "fast-retailing": {
    code: "fast-retailing",
    name: "FAST RETAILING CO., LTD.",
    sourceName: "FAST RETAILING IR",
    sourcePage: "https://www.fastretailing.com/jp/ir/library/tanshin.html",
    stockSymbol: "9983.T",
  },
  hitachi: {
    code: "hitachi",
    name: "HITACHI, LTD.",
    sourceName: "HITACHI IR",
    sourcePage: "https://www.hitachi.com/ja-jp/ir/library/fr/",
    stockSymbol: "6501.T",
  },
  smfg: {
    code: "smfg",
    name: "SUMITOMO MITSUI FINANCIAL GROUP",
    sourceName: "SMFG IR",
    sourcePage: "https://www.smfg.co.jp/investor/financial/latest_statement.html",
    stockSymbol: "8316.T",
  },
  advantest: {
    code: "advantest", name: "ADVANTEST CORPORATION", sourceName: "ADVANTEST IR",
    sourcePage: "https://www.advantest.com/ja/investors/ir-library/result/", stockSymbol: "6857.T",
  },
  mizuho: {
    code: "mizuho", name: "MIZUHO FINANCIAL GROUP, INC.", sourceName: "MIZUHO FG IR",
    sourcePage: "https://www.mizuho-fg.co.jp/investors/financial/tanshin/index.html", stockSymbol: "8411.T",
  },
  sony: {
    code: "sony", name: "SONY GROUP CORPORATION", sourceName: "SONY GROUP IR",
    sourcePage: "https://www.sony.com/ja/SonyInfo/IR/library/presen/er/", stockSymbol: "6758.T",
  },
  murata: {
    code: "murata", name: "MURATA MANUFACTURING CO., LTD.", sourceName: "MURATA IR",
    sourcePage: "https://corporate.murata.com/ja-jp/ir/library/results", stockSymbol: "6981.T",
  },
  keyence: {
    code: "keyence", name: "KEYENCE CORPORATION", sourceName: "KEYENCE IR",
    sourcePage: "https://www.keyence.co.jp/investor/", stockSymbol: "6861.T",
  },
  recruit: {
    code: "recruit", name: "RECRUIT HOLDINGS CO., LTD.", sourceName: "RECRUIT HOLDINGS IR",
    sourcePage: "https://recruit-holdings.com/ja/ir/financials/", stockSymbol: "6098.T",
  },
  "mitsubishi-corp": {
    code: "mitsubishi-corp", name: "MITSUBISHI CORPORATION", sourceName: "MITSUBISHI CORP. IR",
    sourcePage: "https://www.mitsubishicorp.com/jp/ja/ir/library/earnings/", stockSymbol: "8058.T",
  },
  itochu: {
    code: "itochu", name: "ITOCHU CORPORATION", sourceName: "ITOCHU IR",
    sourcePage: "https://www.itochu.co.jp/ja/ir/financial_statements/", stockSymbol: "8001.T",
  },
  "tokio-marine": {
    code: "tokio-marine", name: "TOKIO MARINE HOLDINGS, INC.", sourceName: "TOKIO MARINE IR",
    sourcePage: "https://www.tokiomarinehd.com/ir/financial/", stockSymbol: "8766.T",
  },
  "shin-etsu": {
    code: "shin-etsu", name: "SHIN-ETSU CHEMICAL CO., LTD.", sourceName: "SHIN-ETSU CHEMICAL IR",
    sourcePage: "https://www.shinetsu.co.jp/jp/ir/ir-data/", stockSymbol: "4063.T",
  },
  mitsui: {
    code: "mitsui", name: "MITSUI & CO., LTD.", sourceName: "MITSUI & CO. IR",
    sourcePage: "https://www.mitsui.com/jp/ja/ir/library/meeting/index.html", stockSymbol: "8031.T",
  },
};

// DBからまだ読めないときに使う予備データです。画面が空っぽにならないための保険です。
// 公式PDFは累計で出ることが多いので、ここでは四半期ごとの数字に直した値を置いています。
const fallbackResults = {
  kioxia: [],
  toyota: [
  {
    id: "fy2025-q1", fiscalYear: 2025, quarter: 1, periodEnd: "2024-06-30",
    revenue: 11837879, operatingCost: 10529417, operatingIncome: 1308462, netIncome: 1333347,
    sourceUrl: "https://global.toyota/pages/global_toyota/ir/financial-results/2025_1q_summary_jp.pdf",
  },
  {
    id: "fy2025-q2", fiscalYear: 2025, quarter: 2, periodEnd: "2024-09-30",
    revenue: 11444571, operatingCost: 10288816, operatingIncome: 1155755, netIncome: 573766,
    sourceUrl: "https://global.toyota/pages/global_toyota/ir/financial-results/2025_2q_summary_jp.pdf",
  },
  {
    id: "fy2025-q3", fiscalYear: 2025, quarter: 3, periodEnd: "2024-12-31",
    revenue: 12391095, operatingCost: 11175821, operatingIncome: 1215274, netIncome: 2193276,
    sourceUrl: "https://global.toyota/pages/global_toyota/ir/financial-results/2025_3q_summary_jp.pdf",
  },
  {
    id: "fy2025-q4", fiscalYear: 2025, quarter: 4, periodEnd: "2025-03-31",
    revenue: 12363159, operatingCost: 11247064, operatingIncome: 1116095, netIncome: 664697,
    sourceUrl: "https://global.toyota/pages/global_toyota/ir/financial-results/2025_4q_summary_jp.pdf",
  },
  {
    id: "fy2026-q1",
    fiscalYear: 2026,
    quarter: 1,
    periodEnd: "2025-06-30",
    revenue: 12253326,
    operatingCost: 11087185,
    operatingIncome: 1166141,
    netIncome: 841345,
    sourceUrl:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_1q_summary_jp.pdf",
  },
  {
    id: "fy2026-q2",
    fiscalYear: 2026,
    quarter: 2,
    periodEnd: "2025-09-30",
    revenue: 12377427,
    operatingCost: 11537876,
    operatingIncome: 839551,
    netIncome: 932081,
    sourceUrl:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_2q_summary_jp.pdf",
  },
  {
    id: "fy2026-q3",
    fiscalYear: 2026,
    quarter: 3,
    periodEnd: "2025-12-31",
    revenue: 13456851,
    operatingCost: 12265821,
    operatingIncome: 1191030,
    netIncome: 1257465,
    sourceUrl:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_3q_summary_jp.pdf",
  },
  {
    id: "fy2026-q4",
    fiscalYear: 2026,
    quarter: 4,
    periodEnd: "2026-03-31",
    revenue: 12597348,
    operatingCost: 12027854,
    operatingIncome: 569494,
    netIncome: 817207,
    sourceUrl:
      "https://global.toyota/pages/global_toyota/ir/financial-results/2026_4q_summary_jp.pdf",
  },
  ],
  ntt: [
    {
      id: "ntt-fy2024-q1", fiscalYear: 2024, quarter: 1, periodEnd: "2024-06-30",
      revenue: 3240023, operatingCost: 2804206, operatingIncome: 435817, netIncome: 274136,
      sourceUrl: "https://group.ntt/jp/newsrelease/2025/08/06/pdf/250806ab.pdf",
    },
    {
      id: "ntt-fy2024-q2", fiscalYear: 2024, quarter: 2, periodEnd: "2024-09-30",
      revenue: 3350602, operatingCost: 2866164, operatingIncome: 484438, netIncome: 280656,
      sourceUrl: "https://group.ntt/jp/newsrelease/2025/11/04/pdf/251104ab.pdf",
    },
    {
      id: "ntt-fy2024-q3", fiscalYear: 2024, quarter: 3, periodEnd: "2024-12-31",
      revenue: 3459099, operatingCost: 2980121, operatingIncome: 478978, netIncome: 295899,
      sourceUrl: "https://group.ntt/jp/newsrelease/2026/02/05/pdf/260205ab.pdf",
    },
    {
      id: "ntt-fy2024-q4", fiscalYear: 2024, quarter: 4, periodEnd: "2025-03-31",
      revenue: 3655003, operatingCost: 3404665, operatingIncome: 250338, netIncome: 149325,
      sourceUrl: "https://group.ntt/jp/newsrelease/2026/05/08/pdf/260508ab.pdf",
    },
    {
      id: "ntt-fy2025-q1",
      fiscalYear: 2025,
      quarter: 1,
      periodEnd: "2025-06-30",
      revenue: 3262039,
      operatingCost: 2856846,
      operatingIncome: 405193,
      netIncome: 259714,
      sourceUrl: "https://group.ntt/jp/newsrelease/2025/08/06/pdf/250806ab.pdf",
    },
    {
      id: "ntt-fy2025-q2",
      fiscalYear: 2025,
      quarter: 2,
      periodEnd: "2025-09-30",
      revenue: 3510674,
      operatingCost: 2970838,
      operatingIncome: 539836,
      netIncome: 335937,
      sourceUrl: "https://group.ntt/jp/newsrelease/2025/11/04/pdf/251104ab.pdf",
    },
    {
      id: "ntt-fy2025-q3",
      fiscalYear: 2025,
      quarter: 3,
      periodEnd: "2025-12-31",
      revenue: 3648325,
      operatingCost: 3136209,
      operatingIncome: 512116,
      netIncome: 330409,
      sourceUrl: "https://group.ntt/jp/newsrelease/2026/02/05/pdf/260205ab.pdf",
    },
    {
      id: "ntt-fy2025-q4",
      fiscalYear: 2025,
      quarter: 4,
      periodEnd: "2026-03-31",
      revenue: 3988083,
      operatingCost: 3739007,
      operatingIncome: 249076,
      netIncome: 110972,
      sourceUrl: "https://group.ntt/jp/newsrelease/2026/05/08/pdf/260508ab.pdf",
    },
  ],
  softbank: [
    {
      id: "softbank-fy2024-q1", fiscalYear: 2024, quarter: 1, periodEnd: "2024-06-30",
      revenue: 1535722, operatingCost: 1231795, operatingIncome: 303927, netIncome: 162510,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20250805.pdf",
    },
    {
      id: "softbank-fy2024-q2", fiscalYear: 2024, quarter: 2, periodEnd: "2024-09-30",
      revenue: 1616357, operatingCost: 1334395, operatingIncome: 281962, netIncome: 161347,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20251105.pdf",
    },
    {
      id: "softbank-fy2024-q3", fiscalYear: 2024, quarter: 3, periodEnd: "2024-12-31",
      revenue: 1659384, operatingCost: 1423412, operatingIncome: 235972, netIncome: 112753,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20260209.pdf",
    },
    {
      id: "softbank-fy2024-q4", fiscalYear: 2024, quarter: 4, periodEnd: "2025-03-31",
      revenue: 1732886, operatingCost: 1565731, operatingIncome: 167155, netIncome: 89523,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20260511.pdf",
    },
    {
      id: "softbank-fy2025-q1", fiscalYear: 2025, quarter: 1, periodEnd: "2025-06-30",
      revenue: 1658615, operatingCost: 1367881, operatingIncome: 290734, netIncome: 145310,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20250805.pdf",
    },
    {
      id: "softbank-fy2025-q2", fiscalYear: 2025, quarter: 2, periodEnd: "2025-09-30",
      revenue: 1742220, operatingCost: 1404060, operatingIncome: 338160, netIncome: 203445,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20251105.pdf",
    },
    {
      id: "softbank-fy2025-q3", fiscalYear: 2025, quarter: 3, periodEnd: "2025-12-31",
      revenue: 1794564, operatingCost: 1539314, operatingIncome: 255250, netIncome: 136768,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20260209.pdf",
    },
    {
      id: "softbank-fy2025-q4", fiscalYear: 2025, quarter: 4, periodEnd: "2026-03-31",
      revenue: 1843281, operatingCost: 1684849, operatingIncome: 158432, netIncome: 65236,
      sourceUrl: "https://www.softbank.jp/corp/set/data/ir/documents/financial_reports/fy2025/pdf/sbkk_financial_report_20260511.pdf",
    },
  ],
  "softbank-group": [],
  mufg: [],
  "fast-retailing": [],
  hitachi: [],
  smfg: [],
  "tokyo-electron": [],
  advantest: [],
  mizuho: [],
  sony: [],
  murata: [],
  keyence: [],
  recruit: [],
  "mitsubishi-corp": [],
  itochu: [],
  "tokio-marine": [],
  "shin-etsu": [],
  mitsui: [],
};

/**
 * 概要: 予備データの四半期情報を、画面で使いやすい順番と形に整えます。
 * 引数: resultsByCompany - 会社ごとの四半期予備データ。
 * 戻り値: 会社ごとの四半期データ。
 */
function normalizeFallbackQuarterlyResults(resultsByCompany) {
  return Object.fromEntries(Object.entries(resultsByCompany).map(([companyCode, rows]) => [
    companyCode,
    rows
      .map((row) => ({
        ...row,
        fiscalYear: fiscalYearFromPeriod(row.periodEnd, row.quarter),
        companyCode,
        periodType: `Q${row.quarter}`,
        periodStart: null,
        pretaxIncome: row.pretaxIncome ?? null,
      }))
      .sort((a, b) => a.fiscalYear - b.fiscalYear || a.quarter - b.quarter),
  ]));
}

const fallbackQuarterlyResults = normalizeFallbackQuarterlyResults(fallbackResults);

/**
 * 概要: 四半期データのsourceUrlから、DB障害時に表示する資料一覧を作ります。
 * 引数: resultsByCompany - 会社ごとの四半期データ。
 * 戻り値: 会社ごとのIR資料一覧。
 */
function buildFallbackDocuments(resultsByCompany) {
  return Object.fromEntries(Object.entries(resultsByCompany).map(([companyCode, rows]) => [
    companyCode,
    [...new Map(rows.filter((row) => row.sourceUrl).map((row) => [row.sourceUrl, {
      fiscalYear: row.fiscalYear,
      quarter: row.quarter,
      title: `FY${row.fiscalYear} Q${row.quarter} financial results`,
      url: row.sourceUrl,
      sourceName: "official_ir",
      publishedAt: row.periodEnd,
    }])).values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  ]));
}

const fallbackDocumentsByCompany = buildFallbackDocuments(fallbackQuarterlyResults);
const englishCompanyNames = Object.fromEntries(Object.entries(companies).map(([code, company]) => [code, company.name]));

// 画面の今の状態を1か所に集めています。会社を変えたり、PDF一覧を読んだりするとここが変わります。
const state = {
  flowMode: 'income',
  language: readLanguage(),
  companyCode: "toyota",
  resultsByCompany: { ...fallbackQuarterlyResults },
  officialIrDocumentsByCompany: { ...fallbackDocumentsByCompany },
  results: fallbackQuarterlyResults.toyota,
  activeId: fallbackQuarterlyResults.toyota.at(-1).id,
  lastUpdatedAtByCompany: {},
  stockChartSymbol: companies.toyota.stockSymbol,
  renderedStockChartSymbol: null,
  stockPrices: [],
  stockPricesBySymbol: {},
  stockPayloadBySymbol: {},
  quoteBySymbol: {},
  lastQuoteCheckBySymbol: {},
  lastFinancialCheckByCompany: {},
  quoteErrorsBySymbol: {},
  financialByCompany: {},
  financialErrorsByCompany: {},
  officialReportsByCompany: {},
  officialReportErrorsByCompany: {},
  officialReportLoading: new Set(),
  officialReportChecked: new Set(),
  parsedReportCache: new Map(),
  cumulativeFlow: false,
  sankeyExpanded: false,
  statementSelectedEnd: null,
  refreshingCompanies: new Set(),
  databaseError: null,
  stockChartStatus: "idle",
  stockChartError: "",
  databaseLoaded: false,
};

// HTMLの部品を先に探しておきます。あとで何度もdocument.querySelectorを書かなくて済みます。
const elements = {
  stockIndicatorStatus: document.querySelector("#stock-indicator-status"),
  chartTooltip: document.querySelector("#chart-tooltip"),
  chartTooltipContent: document.querySelector("#chart-tooltip-content"),
  chartTooltipClose: document.querySelector("#chart-tooltip-close"),
  sankeyZoom: document.querySelector("#sankey-zoom"),
  languageToggle: document.querySelector("#language-toggle"),
  yearSelect: document.querySelector("#year-select"),
  quarterSelect: document.querySelector("#quarter-select"),
  periodCaption: document.querySelector("#period-caption"),
  latestUpdate: document.querySelector("#latest-update"),
  refreshButton: document.querySelector("#refresh-button"),
  refreshButtonLabel: document.querySelector("#refresh-button-label"),
  metricCostCaption: document.querySelector("#metric-cost-caption"),
  metricProfitTitle: document.querySelector("#metric-profit-title"),
  metricProfitCaption: document.querySelector("#metric-profit-caption"),
  profitChartLabel: document.querySelector("#profit-chart-label"),
  marginChartTitle: document.querySelector("#margin-chart-title"),
  documentsBody: document.querySelector("#documents-body"),
  toast: document.querySelector("#toast"),
  marginValue: document.querySelector("#margin-value"),
  marginChange: document.querySelector("#margin-change"),
  companyName: document.querySelector("#company-name"),
  sourceName: document.querySelector("#source-name"),
  irLink: document.querySelector("#ir-link"),
  companyButtons: document.querySelectorAll(".company-button"),
  flowPeriod: document.querySelector("#flow-period"),
  flowCostCaption: document.querySelector("#flow-cost-caption"),
  previousCashAndCashEquivalents: document.querySelector("#previous-cash-and-cash-equivalents"),
  annualRevenue: document.querySelector("#annual-revenue"),
  annualOperatingCost: document.querySelector("#annual-operating-cost"),
  investmentCashFlow: document.querySelector("#investment-cash-flow"),
  financingCashFlow: document.querySelector("#financing-cash-flow"),
  otherCashFlowAdjustment: document.querySelector("#other-cash-flow-adjustment"),
  cashAndCashEquivalents: document.querySelector("#cash-and-cash-equivalents"),
  stockChart: document.querySelector("#stock-chart"),
  stockChartStatus: document.querySelector("#stock-chart-status"),
  livePrice: document.querySelector("#live-price"),
  liveChange: document.querySelector("#live-change"),
  quoteStatus: document.querySelector("#quote-status"),
  dataStatus: document.querySelector("#data-status"),
  autoRefresh: document.querySelector("#auto-refresh"),
  annualSummaryPeriod: document.querySelector("#annual-summary-period"),
  annualSummarySource: document.querySelector("#annual-summary-source"),
  annualSummaryRevenue: document.querySelector("#annual-summary-revenue"),
  annualSummaryProfit: document.querySelector("#annual-summary-profit"),
  annualSummaryProfitLabel: document.querySelector("#annual-summary-profit-label"),
  annualSummaryNet: document.querySelector("#annual-summary-net"),
  statementBody: document.querySelector("#statement-body"),
  statementStatus: document.querySelector("#statement-status"),
  cumulativeFlow: document.querySelector("#cumulative-flow"),
  statementSelect: document.querySelector("#statement-select"),
};

const metricIds = ["revenue", "cost", "operating", "net"];
const chartModels = new Map();
let inspectedCanvas = null;

/** 概要: 選択したグラフの値の表示を閉じます。引数: なし。戻り値: なし。 */
function closeChartInspection() {
  elements.chartTooltip.hidden = true;
  inspectedCanvas = null;
}

/** 概要: 決算グラフの科目・期間・出典をまとめます。引数: title - 科目名、result - 損益データ、rows - 数値の配列。戻り値: 表示用データ。 */
function financialInspection(title, result, rows) {
  const range = result.periodStart ? `${result.periodStart}〜${result.periodEnd}` : `決算期間末 ${result.periodEnd}`;
  return { title, period: `${fiscalPeriodLabel(result)} / ${periodTypeLabel(result)} / ${range}${result.basis === "cumulative" ? "（累計）" : "（単独四半期）"}`,
    source: result.basis === "quarter-difference" ? `${result.sourceName} / 累計差分` : result.sourceName,
    sourceUrl: result.sourceUrl, rows };
}

/** 概要: 選択位置の数値を単位付きで表示します。引数: canvas - 操作対象、datum - 選択データ、position - クリック位置（任意）。戻り値: なし。 */
function showChartInspection(canvas, datum, position = {}) {
  const locale = state.language === "en" ? "en-US" : "ja-JP";
  const format = (row) => {
    if (row.format === "text") return t(row.value);
    if (!Number.isFinite(row.value)) return t(row.emptyLabel ?? "開示なし");
    if (row.format === "percent") return `${row.value.toLocaleString(locale, { maximumFractionDigits: 2 })}%`;
    if (row.format === "yen") return `¥${row.value.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
    return `${row.value.toLocaleString(locale, { maximumFractionDigits: 6 })} ${state.language === "en" ? "JPY million" : "百万円"}`;
  };
  const sourceLink = /^https:\/\//.test(datum.sourceUrl ?? "")
    ? ` <a class="pdf-link" href="${escapeHtml(datum.sourceUrl)}" target="_blank" rel="noreferrer">${t("原本")} ↗</a>` : "";
  elements.chartTooltipContent.innerHTML = `<h4>${escapeHtml(t(datum.title))}</h4><p>${escapeHtml(t(datum.period))}${datum.source ? `<br>${escapeHtml(t(datum.source))}` : ""}${sourceLink}</p><dl>${datum.rows.map((row) => `<dt>${escapeHtml(t(row.label))}</dt><dd>${escapeHtml(format(row))}</dd>`).join("")}</dl>`;
  const viewportWidth = document.documentElement?.clientWidth ?? 800;
  const viewportHeight = document.documentElement?.clientHeight ?? 600;
  elements.chartTooltip.style.left = `${Math.max(12, Math.min((position.clientX ?? viewportWidth / 2) + 16, viewportWidth - 352))}px`;
  elements.chartTooltip.style.top = `${Math.max(12, Math.min((position.clientY ?? 80) + 16, viewportHeight - 320))}px`;
  elements.chartTooltipClose.ariaLabel = t("閉じる");
  elements.chartTooltip.hidden = false;
  inspectedCanvas = canvas;
}
const staticLanguageNodes = [...document.querySelectorAll('[data-language], h1, h2, h3:not([id]), h4, .eyebrow:not([id]), .hero-description, .panel-description:not([id]), .flow-note, th, label[for], .investment-card small:not([id]), .metric-heading > span:first-child:not([id]), .metric-footer small:not([id]), .live-market-meta small, .annual-summary-values small:not([id]), .source-card small, .flow-period:not([id])')]
  .map((node) => ({ node, original: node.textContent }));
const staticLanguageLabels = [...document.querySelectorAll('section[aria-label]')].map((node) => ({ node, original: node.getAttribute("aria-label") }));

/** 概要: 現在の言語で文言を整形します。引数: value - 原文。戻り値: 表示文字列。 */
function t(value) { return translateText(value, state.language); }

/** 概要: 固定文言とボタン・支援技術向けの言語を切り替えます。引数: なし。戻り値: なし。 */
function renderLanguage() {
  if (document.documentElement) document.documentElement.lang = state.language;
  staticLanguageNodes.forEach(({ node, original }) => { node.textContent = t(original); });
  staticLanguageLabels.forEach(({ node, original }) => { node.ariaLabel = t(original); });
  elements.languageToggle.textContent = state.language === "ja" ? "English" : "日本語";
  elements.languageToggle.ariaLabel = state.language === "ja" ? "Switch to English" : "日本語に切り替え";
  elements.languageToggle.title = elements.languageToggle.ariaLabel;
  elements.yearSelect.ariaLabel = state.language === "ja" ? "対象年度" : "Fiscal year";
  elements.quarterSelect.ariaLabel = state.language === "ja" ? "対象四半期" : "Quarter";
  elements.statementSelect.ariaLabel = state.language === "ja" ? "内訳を確認する決算書" : "Statement details period";
  document.querySelector("#metric-cost-title").textContent = t("Operating Cost");
}
const metricKey = {
  revenue: "revenue",
  cost: "operatingCost",
  operating: "operatingIncome",
  net: "netIncome",
};

/**
 * 概要: 百万円単位の数字を日本語では億円・兆円、英語ではJPYのM/B/Tで表示します。
 * 引数: value - 表示したい数値。
 * 戻り値: 整形済みの文字列。
 */
function formatBillions(value) {
  if (state.language === "en") return new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY", notation: "compact", maximumFractionDigits: 2 }).format(value * 1e6);
  const totalOku = Math.floor(Math.abs(value) / 100);
  const sign = value < 0 && totalOku ? "-" : "";
  const trillion = Math.floor(totalOku / 10000);
  const oku = totalOku % 10000;
  const parts = [];

  if (trillion) parts.push(`${trillion.toLocaleString("ja-JP")}兆`);
  parts.push(`${oku.toLocaleString("ja-JP")}億円`);
  return `${sign}${parts.join("")}`;
}

function formatOptionalBillions(value) {
  return value === null ? "開示なし" : formatBillions(value);
}

/**
 * 概要: グラフ内に収まるよう、百万円単位の金額を兆円または億円へ短く整形します。
 * 引数: value - 百万円単位の金額。
 * 戻り値: 符号付きの短い金額表記。
 */
function formatChartAmount(value) {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1000000) return `${sign}${(absolute / 1000000).toFixed(2)}兆`;
  if (absolute >= 100) return `${sign}${Math.round(absolute / 100).toLocaleString("ja-JP")}億`;
  return `${sign}${absolute.toLocaleString("ja-JP")}百万`;
}

function niceAxisMax(value) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatMillions(value) {
  return `¥${value.toLocaleString("ja-JP")}M`;
}

function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** 概要: 選択言語で日付を表示します。引数: dateString - YYYY-MM-DD。戻り値: 日付文字列。 */
function formatDate(dateString) {
  return new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

/** 概要: 選択言語で四半期名を表示します。引数: result - 決算データ。戻り値: 期間名。 */
function periodTypeLabel(result) {
  return t(`第${result.quarter}四半期`);
}

function chartPeriodLabel(result) {
  return `FY${String(result.fiscalYear)} Q${result.quarter}`;
}

/**
 * 概要: 今選ばれている会社・年度・期間の決算データを取り出します。
 * 引数: なし。
 * 戻り値: 選択中の決算データ。見つからない場合はundefined。
 */
function activeResult() {
  return state.results.find((item) => item.id === state.activeId) ?? state.results.at(-1);
}

function activeYearResults() {
  const year = activeResult()?.fiscalYear;
  return year ? state.results.filter((item) => item.fiscalYear === year) : [];
}

/**
 * 概要: 前年の同じ期間を探します。売上が増えたか減ったかを比べるためです。
 * 引数: result - 比較元の決算データ。
 * 戻り値: 前年同期間の決算データ。見つからない場合はundefined。
 */
function comparisonResult(result) {
  if (!result) return null;
  return state.results.find((item) => (
    item.fiscalYear === result.fiscalYear - 1 && item.quarter === result.quarter
  )) ?? null;
}

/**
 * 概要: 年度と期間の選択肢を、今あるデータに合わせて作り直します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderPicker() {
  const years = [...new Set(state.results.map((result) => result.fiscalYear))].sort((a, b) => b - a);
  const current = activeResult();
  const selectedYear = current?.fiscalYear ?? years[0];
  const periods = state.results
    .filter((result) => result.fiscalYear === selectedYear)
    .sort((a, b) => a.quarter - b.quarter);

  elements.yearSelect.innerHTML = t(years
    .map((year) => `<option value="${year}">${fiscalPeriodLabel(state.results.find((result) => result.fiscalYear === year))}</option>`)
    .join(""));
  elements.yearSelect.value = selectedYear ?? "";
  elements.yearSelect.disabled = !years.length;

  elements.quarterSelect.innerHTML = t(periods
    .map(
      (result) =>
        `<option value="${result.id}">${periodTypeLabel(result)} — ${formatDate(result.periodEnd)}</option>`,
    )
    .join(""));
  elements.quarterSelect.value = state.activeId;
  elements.quarterSelect.disabled = !periods.length;
}

function profitValue(result) {
  return usesPretaxMetric(result) ? result.pretaxIncome : result.operatingIncome;
}

function usesPretaxMetric(result) {
  return state.companyCode === "softbank-group"
    || (result?.operatingIncome === null && result?.pretaxIncome !== null);
}

/**
 * 概要: 売上・費用・利益など、画面上部の大きな数字を表示します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderMetrics() {
  const current = activeResult();
  const usesPretaxIncome = usesPretaxMetric(current);
  elements.metricCostCaption.textContent = t(current?.operatingCostLabel ?? (usesPretaxIncome ? "連結サマリーでは非開示" : "営業収益 − 営業利益"));
  elements.metricProfitTitle.textContent = t(usesPretaxIncome ? "Profit Before Tax" : "Operating Income");
  elements.metricProfitCaption.textContent = t(usesPretaxIncome ? "税引前利益" : "営業利益");
  elements.profitChartLabel.textContent = t(usesPretaxIncome ? "Profit Before Tax" : "Operating Income");
  elements.marginChartTitle.textContent = t(usesPretaxIncome ? "Pretax Margin" : "Operating Margin");
  if (!current) {
    elements.periodCaption.textContent = t("決算データ未登録");
    metricIds.forEach((metric) => {
      document.querySelector(`#metric-${metric}`).textContent = t("—");
      document.querySelector(`#change-${metric}`).textContent = t("PENDING");
    });
    elements.marginValue.textContent = t("—");
    elements.marginChange.textContent = t("公式IR取込待ち");
    elements.marginChange.style.color = "var(--muted)";
    return;
  }
  const previous = comparisonResult(current);
  elements.periodCaption.textContent = t(`決算期間末 ${formatDate(current.periodEnd)}`);

  metricIds.forEach((metric) => {
    const key = metric === "operating" && usesPretaxIncome ? "pretaxIncome" : metricKey[metric];
    const valueElement = document.querySelector(`#metric-${metric}`);
    const changeElement = document.querySelector(`#change-${metric}`);
    valueElement.textContent = t(current[key] === null ? "開示なし" : formatBillions(current[key]));

    if (!previous || current[key] === null || previous[key] === null || previous[key] === 0) {
      changeElement.textContent = t("BASE");
      changeElement.classList.remove("negative");
      return;
    }

    const change = ((current[key] - previous[key]) / previous[key]) * 100;
    changeElement.textContent = t(`${formatPercent(change)} YoY`);
    changeElement.classList.toggle("negative", change < 0);
  });

  const profitKey = usesPretaxIncome ? "pretaxIncome" : "operatingIncome";
  const margin = (current[profitKey] / current.revenue) * 100;
  const previousMargin = previous ? (previous[profitKey] / previous.revenue) * 100 : margin;
  const pointChange = margin - previousMargin;
  elements.marginValue.textContent = t(`${margin.toFixed(1)}%`);
  elements.marginChange.textContent = previous ? t(`${pointChange >= 0 ? "+" : ""}${pointChange.toFixed(1)} pt YoY`) : t("BASE");
  elements.marginChange.style.color = !previous ? "var(--muted)" : pointChange >= 0 ? "var(--green)" : "var(--red)";
}

/**
 * 概要: 公式IRサイトから見つけたPDFリンクを一覧にします。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderDocuments() {
  const documents = state.officialIrDocumentsByCompany[state.companyCode];
  if (!documents) {
    elements.documentsBody.innerHTML = t('<tr><td colspan="4">公式IR資料を読み込んでいます。</td></tr>');
    return;
  }
  if (!documents.length) {
    elements.documentsBody.innerHTML = t('<tr><td colspan="4">公式IRサイトでPDF資料を取得できませんでした。</td></tr>');
    return;
  }
  elements.documentsBody.innerHTML = sortIrDocuments(documents, state.companyCode)
    .map(
      (document) => `
        <tr>
          <td>${officialDocumentFiscalYear(document)}</td>
          <td>${officialDocumentQuarter(document)}</td>
          <td>${escapeHtml(document.title)}</td>
          <td><a class="pdf-link" href="${escapeHtml(document.url)}" target="_blank" rel="noreferrer">PDF ↗</a></td>
        </tr>
      `,
    )
    .join("");
}

function officialDocumentFiscalYear(document) {
  if (document.fiscalYear) return `FY${document.fiscalYear}`;
  const value = `${document.title} ${document.url}`;
  const mufgMatch = value.match(/summary(\d{2})(?:03|06|09|12)_ja\.pdf/i);
  if (mufgMatch) return `FY20${mufgMatch[1]}`;

  const hitachiMatch = value.match(/\/(\d{4})_(?:[1-3]Q|An)\.pdf/i);
  if (hitachiMatch) return `FY${Number(hitachiMatch[1]) + 1}`;

  const fastRetailingMatch = value.match(/tanshin(\d{4})\d{2}_[1-4]q\.pdf/i);
  if (fastRetailingMatch) return `FY${fastRetailingMatch[1]}`;

  const match = value.match(/\bfy\s*([12]\d{3}|[0-9]{2})\b/i)
    ?? value.match(/(?:^|[^\d])([12]\d{3})(?:[^\d]|$)/);
  if (!match) return "—";
  const year = Number(match[1]);
  return `FY${year < 100 ? 2000 + year : year}`;
}

function officialDocumentQuarter(document) {
  if (document.quarter) return `Q${document.quarter}`;
  const value = `${document.title} ${document.url}`;
  const mufgMatch = value.match(/summary\d{2}(03|06|09|12)_ja\.pdf/i);
  if (mufgMatch) return { "03": "Q4", "06": "Q1", "09": "Q2", "12": "Q3" }[mufgMatch[1]];

  if (/_An\.pdf/i.test(value) || /_fy_01\.pdf/i.test(value)) return "Q4";

  const match = value.match(/q([1-4])/i)
    ?? value.match(/([1-4])q/i)
    ?? value.match(/第\s*([1-4])\s*四半期/);
  return match ? `Q${match[1]}` : "—";
}

/**
 * 概要: 解像度に合わせて描画領域を整え、サンキーは全体表示と拡大表示を切り替えます。
 * 引数: canvas - 描画対象のcanvas要素。
 * 戻り値: canvasの2D描画コンテキスト、幅、高さ。
 */
function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
  const isSankey = canvas.id === "sankey-chart";
  const availableWidth = isSankey ? canvas.parentElement?.clientWidth ?? rect.width : rect.width;
  const canvasWidth = isSankey && state.sankeyExpanded ? Math.max(availableWidth, 680) : availableWidth;
  if (isSankey) canvas.style.width = `${canvasWidth}px`;
  canvas.width = canvasWidth * ratio;
  canvas.height = rect.height * ratio;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  chartModels.set(canvas, { width: canvasWidth, height: rect.height, regions: [], items: [], keyboardIndex: -1 });
  if (inspectedCanvas === canvas) closeChartInspection();
  return { context, width: canvasWidth, height: rect.height };
}

function drawEmptyChart(canvas, message = "決算データ未登録") {
  const { context: ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9b998f";
  ctx.font = '600 13px "Noto Sans JP"';
  ctx.textAlign = "center";
  ctx.fillText(t(message), width / 2, height / 2);
}

function labelIndexesForWidth(count, width, minGap = 58) {
  if (count <= 0) return new Set();
  const maxLabels = Math.max(2, Math.floor(width / minGap));
  if (count <= maxLabels) return new Set(Array.from({ length: count }, (_, index) => index));

  const indexes = new Set([0, count - 1]);
  const slots = Math.max(1, maxLabels - 1);
  for (let slot = 1; slot < slots; slot += 1) {
    indexes.add(Math.round(((count - 1) / slots) * slot));
  }
  return indexes;
}

function clampedTextX(ctx, text, x, minX, maxX) {
  const halfWidth = ctx.measureText(text).width / 2;
  return Math.min(Math.max(x, minX + halfWidth), maxX - halfWidth);
}

/**
 * 概要: 売上・費用・利益の推移グラフを描きます。
 * 引数: なし。
 * 戻り値: なし。
 */
function drawPerformanceChart() {
  const canvas = document.querySelector("#performance-chart");
  const results = activeYearResults();
  if (!results.length) {
    drawEmptyChart(canvas);
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const model = chartModels.get(canvas);
  const padding = { top: 10, right: 22, bottom: 31, left: 9 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...results.map((item) => item.revenue)) * 1.12;
  const maxProfit = Math.max(...results.map(profitValue)) * 1.28;
  const gap = chartWidth / results.length;
  const barWidth = Math.min(47, gap * 0.38);
  const visibleLabelIndexes = labelIndexesForWidth(results.length, chartWidth, 64);
  const activeIndex = results.findIndex((result) => result.id === state.activeId);

  ctx.clearRect(0, 0, width, height);
  if (activeIndex >= 0) {
    const activeX = padding.left + gap * activeIndex;
    ctx.fillStyle = "rgba(214, 183, 122, .075)";
    ctx.fillRect(activeX, padding.top, gap, chartHeight);
    ctx.fillStyle = "rgba(214, 183, 122, .75)";
    ctx.fillRect(activeX, padding.top, gap, 2);
  }
  ctx.font = '600 9px "Manrope"';
  ctx.strokeStyle = "rgba(224, 205, 165, .10)";
  ctx.fillStyle = "#77756e";
  ctx.lineWidth = 1;

  for (let index = 0; index < 4; index += 1) {
    const y = padding.top + (chartHeight / 3) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const points = [];
  results.forEach((result, index) => {
    const x = padding.left + gap * index + gap / 2;
    const barHeight = (result.revenue / maxRevenue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    const profitLabel = usesPretaxMetric(result) ? "税引前利益" : "営業利益";
    const revenueDatum = financialInspection("売上収益", result, [{ label:"売上収益", value:result.revenue }]);
    const profitDatum = financialInspection(profitLabel, result, [{ label:profitLabel, value:profitValue(result) }]);
    const periodDatum = financialInspection("売上収益と利益", result, [{ label:"売上収益", value:result.revenue }, { label:profitLabel, value:profitValue(result) }]);
    model.items.push(periodDatum);
    model.regions.push({ kind:"rect", x:padding.left + gap * index, y:padding.top, width:gap, height:chartHeight, datum:periodDatum });
    model.regions.push({ kind:"rect", x:x - barWidth / 2, y, width:barWidth, height:barHeight, datum:revenueDatum });

    const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
    gradient.addColorStop(0, "rgba(214, 183, 122, .72)");
    gradient.addColorStop(1, "rgba(214, 183, 122, .16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    ctx.fillStyle = index === activeIndex ? "#d6b77a" : "#77756e";
    ctx.textAlign = "center";
    ctx.font = `${index === activeIndex ? "800" : "600"} 9px "Manrope"`;
    if (visibleLabelIndexes.has(index)) {
      const label = chartPeriodLabel(result);
      ctx.fillText(label, clampedTextX(ctx, label, x, padding.left, width - padding.right), height - 7);
    }

    const profitY = padding.top + chartHeight - (profitValue(result) / maxProfit) * chartHeight;
    model.regions.push({ kind:"point", x, y:profitY, radius:18, datum:profitDatum });
    points.push({ x, y: profitY });
  });

  ctx.strokeStyle = "#82ba8e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === activeIndex ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = "#171914";
    ctx.fill();
    ctx.strokeStyle = index === activeIndex ? "#d6b77a" : "#82ba8e";
    ctx.lineWidth = index === activeIndex ? 3 : 2;
    ctx.stroke();
  });
}

/**
 * 概要: 利益率の推移グラフを描きます。
 * 引数: なし。
 * 戻り値: なし。
 */
function drawMarginChart() {
  const canvas = document.querySelector("#margin-chart");
  const results = activeYearResults();
  if (!results.length) {
    drawEmptyChart(canvas);
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const model = chartModels.get(canvas);
  const padding = { top: 12, right: 10, bottom: 29, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const margins = results.map((item) => (profitValue(item) / item.revenue) * 100);
  const max = Math.max(...margins) * 1.14;
  const visibleLabelIndexes = labelIndexesForWidth(margins.length, chartWidth, 66);
  const activeIndex = results.findIndex((result) => result.id === state.activeId);
  const points = margins.map((margin, index) => ({
    x: margins.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth / (margins.length - 1)) * index,
    y: padding.top + chartHeight - (margin / max) * chartHeight,
  }));
  points.forEach((point, index) => {
    const result = results[index];
    const label = usesPretaxMetric(result) ? "税引前利益率" : "営業利益率";
    const datum = financialInspection(label, result, [{ label, value:margins[index], format:"percent" }]);
    const left = index ? (points[index - 1].x + point.x) / 2 : padding.left;
    const right = index < points.length - 1 ? (points[index + 1].x + point.x) / 2 : width - padding.right;
    model.items.push(datum);
    model.regions.push({ kind:"rect", x:left, y:padding.top, width:right - left, height:chartHeight, datum });
  });

  ctx.clearRect(0, 0, width, height);
  if (activeIndex >= 0) {
    const activeX = points[activeIndex].x;
    ctx.fillStyle = "rgba(214, 183, 122, .075)";
    ctx.fillRect(Math.max(padding.left, activeX - 24), padding.top, 48, chartHeight);
    ctx.strokeStyle = "rgba(214, 183, 122, .4)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(activeX, padding.top);
    ctx.lineTo(activeX, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = "rgba(224, 205, 165, .10)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 3; index += 1) {
    const y = padding.top + (chartHeight / 2) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
  gradient.addColorStop(0, "rgba(130, 186, 142, .20)");
  gradient.addColorStop(1, "rgba(130, 186, 142, 0)");
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartHeight);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points.at(-1).x, padding.top + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#82ba8e";
  ctx.lineWidth = 2;
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, index === activeIndex ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = "#171914";
    ctx.fill();
    ctx.strokeStyle = index === activeIndex ? "#d6b77a" : "#82ba8e";
    ctx.lineWidth = index === activeIndex ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = index === activeIndex ? "#d6b77a" : "#77756e";
    ctx.textAlign = "center";
    ctx.font = `${index === activeIndex ? "800" : "600"} 9px "Manrope"`;
    if (visibleLabelIndexes.has(index)) {
      const label = chartPeriodLabel(results[index]);
      ctx.fillText(label, clampedTextX(ctx, label, point.x, padding.left, width - padding.right), height - 7);
    }
  });
}

/**
 * 概要: 収入・支出・利益の配分を、同一の金額尺度でサンキーグラフとして描きます。
 * 引数: なし。
 * 戻り値: なし。
 */
function drawSankeyChart() {
  elements.sankeyZoom.textContent = t(state.sankeyExpanded ? "全体表示" : "拡大表示");
  elements.sankeyZoom.ariaPressed = String(state.sankeyExpanded);
  const canvas = document.querySelector("#sankey-chart");
  const result = flowResult();
  const cashMode = state.flowMode === 'cash';
  const flow = cashMode ? buildCashFlow(result?.cashFlow) : buildIncomeFlow(result, result ? profitValue(result) : null);
  if (!flow || !flow.total) {
    canvas.ariaLabel = t(cashMode ? "この決算書のキャッシュフローは未開示・未取得です" : "収入・支出のサンキーグラフ: 表示できる業績データがありません");
    drawEmptyChart(canvas, cashMode ? "この決算書のキャッシュフローは未開示・未取得です" : result ? "収入・支出の内訳を表示できません" : "四半期データ未登録");
    return;
  }
  const nodeCount = Math.max(flow.sources.length, flow.targets.length);
  const hub = sankeyHubSize(flow.total);
  if (canvas.parentElement) canvas.parentElement.style.height = `${Math.max(390, (nodeCount - 1) * 58 + 90 + hub.height)}px`;
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const model = chartModels.get(canvas);
  const nodeDatum = (node) => financialInspection(node.label, result, [
    { label:"金額", value:node.value }, { label:"配分総額に占める割合", value:node.value / flow.total * 100, format:"percent" },
    ...(cashMode && Number.isFinite(node.signedValue) ? [{label:'現金への増減',value:node.signedValue}] : []),
  ]);
  const gap = 58;
  const top = 60;
  const available = height - top - 30;
  const scale = Math.min(hub.height, Math.max(1, available - (nodeCount - 1) * gap)) / flow.total;
  const nodeWidth = 12;
  const hubX = width * 0.48;
  const hubHeight = flow.total * scale;
  const hubY = top + (available - hubHeight) / 2;
  const colors = { revenue: "#d6b77a", expense: "#d8867f", profit: "#82ba8e", other: "#7faed8", loss: "#d8867f" };
  const position = (nodes, x) => {
    let y = top + (available - hubHeight - (nodes.length - 1) * gap) / 2;
    return nodes.map((node) => {
      const item = { ...node, x, y, height: node.value * scale };
      y += item.height + gap;
      return item;
    });
  };
  const sources = position(flow.sources, 18);
  const targets = position(flow.targets, width - 30);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#171713";
  ctx.fillRect(0, 0, width, height);
  const ribbon = (x1, y1, x2, y2, thickness, color) => {
    const bend = (x2 - x1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + bend, y1, x2 - bend, y2, x2, y2);
    ctx.lineTo(x2, y2 + thickness);
    ctx.bezierCurveTo(x2 - bend, y2 + thickness, x1 + bend, y1 + thickness, x1, y1 + thickness);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.23;
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  let offset = hubY;
  sources.forEach((node) => {
    model.regions.push({ kind:"ribbon", x1:node.x + nodeWidth, y1:node.y, x2:hubX, y2:offset, thickness:node.height, datum:nodeDatum(node) });
    ribbon(node.x + nodeWidth, node.y, hubX, offset, node.height, colors[node.kind]);
    offset += node.height;
  });
  offset = hubY;
  targets.forEach((node) => {
    model.regions.push({ kind:"ribbon", x1:hubX + hub.width, y1:offset, x2:node.x, y2:node.y, thickness:node.height, datum:nodeDatum(node) });
    ribbon(hubX + hub.width, offset, node.x, node.y, node.height, colors[node.kind]);
    offset += node.height;
  });
  ctx.fillStyle = "#b3955d";
  ctx.fillRect(hubX, hubY, hub.width, hubHeight);
  model.regions.push({ kind:"rect", x:hubX, y:hubY, width:hub.width, height:hubHeight,
    datum:financialInspection(cashMode ? "現金の配分" : "損益の配分", result, [{ label:"配分総額", value:flow.total }]) });
  ctx.fillStyle = "#9b998f";
  ctx.font = '600 11px "Noto Sans JP"';
  ctx.textAlign = "left";
  ctx.fillText(t(cashMode ? "期首現金・流入" : "収入・調整"), 18, 28);
  ctx.textAlign = "center";
  ctx.fillText(t(cashMode ? "現金の配分" : "損益の配分"), hubX + hub.width / 2, 28);
  ctx.textAlign = "right";
  ctx.fillText(t(cashMode ? "流出・期末現金" : "支出・利益"), width - 18, 28);
  const drawNode = (node, left) => {
    ctx.fillStyle = colors[node.kind];
    ctx.fillRect(node.x, node.y, nodeWidth, node.height);
    const x = left ? node.x + nodeWidth + 10 : node.x - 10;
    const y = node.y + node.height / 2;
    const datum = nodeDatum(node);
    model.items.push(datum);
    model.regions.push({ kind:"rect", x:node.x, y:node.y, width:nodeWidth, height:node.height, datum });
    model.regions.push({ kind:"rect", x:left ? node.x : node.x - (width * 0.43 - 25), y:y - 24,
      width:width * 0.43 - 25 + nodeWidth, height:48, datum });
    ctx.textAlign = left ? "left" : "right";
    ctx.font = '600 11px "Noto Sans JP"';
    ctx.fillStyle = "#f0eee8";
    const labels = flowLabelLines(ctx, t(node.label), width * 0.43 - 45);
    labels.forEach((label, index) => ctx.fillText(label, x, y - 5 - (labels.length - 1 - index) * 14));
    ctx.font = '700 13px "Manrope", "Noto Sans JP"';
    ctx.fillStyle = colors[node.kind];
    const amountLabel = width < 520 && state.language === "ja"
      ? `${formatChartAmount(node.value).replace(/^\+/, "")}円` : formatFlowAmount(node.value);
    ctx.fillText(amountLabel, x, y + 16);
  };
  sources.forEach((node) => drawNode(node, true));
  targets.forEach((node) => drawNode(node, false));
  canvas.ariaLabel = t(cashMode ? "キャッシュフローのサンキーグラフ。" : "収入・支出のサンキーグラフ。") + [...flow.sources, ...flow.targets]
    .map((node) => t(node.label) + ": " + formatFlowAmount(node.value)).join(state.language === "en" ? "; " : "。");
}

/**
 * 概要: サンキーの小さな税額や丸め差額もゼロに丸めず表示します。
 * 引数: value - 百万円単位の金額。
 * 戻り値: 選択言語の金額文字列。日本語では百万円または億円以上。
 */
function formatFlowAmount(value) {
  if (state.language === "en") return formatBillions(value);
  return Math.abs(value) < 100 ? `${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}百万円` : formatOptionalBillions(value);
}

/**
 * 概要: 長い決算書の科目名をグラフの各列に収まる最大2行へ分けます。
 * 引数: context - 描画コンテキスト。label - 科目名。maxWidth - 表示可能幅。
 * 戻り値: 表示用の行配列。省略した全文は読み上げ説明と内訳表に保持します。
 */
function flowLabelLines(context, label, maxWidth) {
  const lines = [""];
  for (const character of label) {
    const index = lines.length - 1;
    if (context.measureText(lines[index] + character).width > maxWidth && lines[index]) {
      if (lines.length === 2) { lines[index] = lines[index].slice(0, -1) + "…"; break; }
      lines.push(character);
    } else lines[index] += character;
  }
  return lines;
}

/**
 * 概要: 選択中の四半期の業績内訳パネルを更新します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderAnnualFlow() {
  const result = flowResult();
  const cashMode=state.flowMode==='cash';
  document.querySelector('#flow-title').textContent=t(cashMode?'キャッシュフローのサンキーグラフ':'収入と支出のサンキーグラフ');
  document.querySelector('#flow-description').textContent=t(cashMode?'期首現金と流入から、流出と期末現金へのつながりを表示します。帯の太さは金額に比例します。':'売上収益が費用・税金等・純利益へ配分される流れを表示します。帯の太さは金額に比例します。');
  document.querySelector('#flow-note').textContent=t(cashMode?'営業・投資・財務CFは各活動の純額です。増加は左、減少は右に表示します。減価償却など現金を伴わない調整を、現金収入として重複計上しません。期首残高＋各CF＋為替等の調整＝期末残高です。':'この図は損益のつながりを示します。増益となる税金・その他は左側の流入、純損失は不足額として表示します。');
  const captions=cashMode?['配分総額','期首現金及び現金同等物','営業キャッシュフロー','投資キャッシュフロー','財務キャッシュフロー','為替・その他の調整','期末現金及び現金同等物']:['配分総額','売上収益','営業費用・費用等','費用差引後','税金・その他','利益率','純利益'];
  captions.forEach((label,index)=>{document.querySelector(index===2?'#flow-cost-caption':`#flow-caption-${index}`).textContent=t(label);});
  elements.cumulativeFlow.disabled=cashMode || !selectedStatement();
  if (cashMode) {
    const cash=result?.cashFlow;
    elements.flowPeriod.textContent=t(result?`${fiscalPeriodLabel(result)} / ${result.periodStart}〜${result.periodEnd} / ${result.basis==='cumulative'?'累計':'単独四半期'}`:'決算データ未登録');
    const values=cash?[buildCashFlow(cash)?.total,cash.opening,cash.operating,cash.investing,cash.financing,cash.adjustmentTotal+cash.residual,cash.closing]:[];
    [elements.previousCashAndCashEquivalents,elements.annualRevenue,elements.annualOperatingCost,elements.investmentCashFlow,elements.financingCashFlow,elements.otherCashFlowAdjustment,elements.cashAndCashEquivalents]
      .forEach((element,index)=>{element.textContent=t(Number.isFinite(values[index])?formatFlowAmount(values[index]):'開示なし');});
    return;
  }
  if (!result) {
    const year = activeResult()?.fiscalYear;
    elements.flowPeriod.textContent = t(year ? `FY${year}` : "PENDING");
    [
      elements.previousCashAndCashEquivalents,
      elements.annualRevenue,
      elements.annualOperatingCost,
      elements.investmentCashFlow,
      elements.financingCashFlow,
      elements.otherCashFlowAdjustment,
      elements.cashAndCashEquivalents,
    ].forEach((element) => {
      element.textContent = t("未登録");
    });
    return;
  }
  const reportedProfit = profitValue(result);
  const flow = buildIncomeFlow(result, reportedProfit);
  elements.flowCostCaption.textContent = t(flow?.separateCosts ? "営業費用・費用等" : "費用・税金等（差額）");
  const operatingCost = result.operatingCost ?? result.revenue - (Number.isFinite(reportedProfit) ? reportedProfit : result.netIncome);
  const profit = result.revenue - operatingCost;
  const taxAndOther = result.netIncome - profit;
  const margin = result.revenue > 0 ? (profit / result.revenue) * 100 : null;
  elements.flowPeriod.textContent = t(`${fiscalPeriodLabel(result)} / ${result.periodStart ?? "期間開始不明"}〜${result.periodEnd}${result.basis === "cumulative" ? "（累計）" : "（単独四半期）"}`);
  elements.previousCashAndCashEquivalents.textContent = t(flow ? formatOptionalBillions(flow.total) : "開示なし");
  elements.annualRevenue.textContent = t(`+${formatOptionalBillions(result.revenue)}`);
  elements.annualOperatingCost.textContent = t(formatOptionalBillions(-operatingCost));
  elements.investmentCashFlow.textContent = t(formatOptionalBillions(profit));
  elements.financingCashFlow.textContent = t(formatOptionalBillions(taxAndOther));
  elements.otherCashFlowAdjustment.textContent = t(margin === null ? "開示なし" : `${margin.toFixed(1)}%`);
  elements.cashAndCashEquivalents.textContent = t(formatOptionalBillions(result.netIncome));
}

/**
 * 概要: 選択中の業績に合わせて推移・利益率・サンキーグラフを更新します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderCharts() {
  drawPerformanceChart();
  drawMarginChart();
  drawSankeyChart();
}

/**
 * 概要: 日足に5/25/100日MAと表示期間のフィボナッチを重ねます。
 * 引数: なし。
 * 戻り値: なし。
 */
function drawStockChart() {
  const canvas = elements.stockChart;
  const {prices,averages,fibonacci} = stockIndicators(state.stockPrices);
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const model = chartModels.get(canvas);
  const padding = { top: 24, right: 22, bottom: 35, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maValues = Object.values(averages).flat().filter(Number.isFinite);
  const lowest = Math.min(...prices.map((item) => item.low),...maValues);
  const highest = Math.max(...prices.map((item) => item.high),...maValues);
  const margin = Math.max(highest - lowest,1) * 0.06;
  const min = lowest - margin;
  const max = highest + margin;
  const span = Math.max(max - min, 1);
  const gap = chartWidth / prices.length;
  const bodyWidth = Math.max(0.7, Math.min(8, gap * 0.64));
  const scaleX = (index) => padding.left + gap * index + gap / 2;
  const scaleY = (value) => padding.top + chartHeight - ((value - min) / span) * chartHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(224, 205, 165, .10)";
  ctx.fillStyle = "#77756e";
  ctx.font = '600 10px "Manrope"';
  ctx.lineWidth = 1;

  for (let index = 0; index < 4; index += 1) {
    const value = min + (span / 3) * index;
    const y = scaleY(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(`¥${Math.round(value).toLocaleString("ja-JP")}`, padding.left - 9, y + 3);
  }

  prices.forEach((item, index) => {
    const x = scaleX(index);
    const openY = scaleY(item.open);
    const highY = scaleY(item.high);
    const lowY = scaleY(item.low);
    const closeY = scaleY(item.close);
    const rising = item.close >= item.open;
    const color = rising ? "#82ba8e" : "#d8867f";
    const datum = { title:"日足株価", period:formatDate(item.date), source:state.stockChartSymbol + " / Yahoo Finance",
      rows:[{label:"始値",value:item.open,format:"yen"},{label:"高値",value:item.high,format:"yen"},
        {label:"安値",value:item.low,format:"yen"},{label:"終値",value:item.close,format:"yen"},
        ...[5,25,100].map((period) => ({label:`MA${period}（${period}日）`,value:averages[period][index],format:"yen",emptyLabel:"期間不足"}))] };
    model.items.push(datum);
    model.regions.push({ kind:"rect", x:padding.left + gap * index, y:padding.top, width:gap, height:chartHeight, datum });

    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(2, Math.abs(closeY - openY)));
  });

  for (const [period,color] of [[5,"#5bc0eb"],[25,"#f2b35c"],[100,"#c795ff"]]) {
    ctx.beginPath();
    let started = false;
    averages[period].forEach((value,index) => {
      if (!Number.isFinite(value)) { started = false; return; }
      if (started) ctx.lineTo(scaleX(index),scaleY(value)); else ctx.moveTo(scaleX(index),scaleY(value));
      started = true;
    });
    ctx.strokeStyle = color;ctx.lineWidth = 1.8;ctx.stroke();
  }
  if (fibonacci) {
    ctx.font = '600 9px "Manrope"';ctx.textAlign = "right";
    for (const level of fibonacci.levels) {
      const y = scaleY(level.price);
      const percent = Number((level.ratio * 100).toFixed(1));
      ctx.setLineDash([4,4]);ctx.strokeStyle = "rgba(157,168,181,.55)";ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(padding.left,y);ctx.lineTo(width-padding.right,y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle = "#b7c2cf";
      const label = width < 520 ? `${percent}%` : `Fib ${percent}% · ¥${level.price.toLocaleString("en-US",{maximumFractionDigits:2})}`;
      ctx.fillText(label,width-padding.right,y-5);
      const datum = {title:`フィボナッチ ${percent}%`,period:`${prices[0].date}〜${prices.at(-1).date}`,source:state.stockChartSymbol + " / Yahoo Finance",
        rows:[{label:"価格",value:level.price,format:"yen"},{label:"最高値",value:fibonacci.high,format:"yen"},
          {label:"最低値",value:fibonacci.low,format:"yen"},{label:"最高値の日付",value:fibonacci.highDate,format:"text"},
          {label:"最低値の日付",value:fibonacci.lowDate,format:"text"}]};
      model.items.push(datum);
      model.regions.push({kind:"rect",x:padding.left,y:y-3,width:chartWidth,height:6,datum});
    }
  }
  const labelIndexes = [0, Math.floor((prices.length - 1) / 2), prices.length - 1];
  ctx.fillStyle = "#77756e";
  ctx.textAlign = "center";
  labelIndexes.forEach((index) => {
    const label = formatDate(prices[index].date);
    ctx.fillText(label, clampedTextX(ctx, label, scaleX(index), padding.left, width - padding.right), height - 9);
  });
}

/**
 * 概要: 日足・指標の基準期間・取得状態を表示します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderStockChart() {
  state.renderedStockChartSymbol = state.stockChartSymbol;
  if (state.stockPrices.length) {
    drawStockChart();
    const {prices,fibonacci} = stockIndicators(state.stockPrices);
    const latest = prices.at(-1);
    const cached = state.stockPayloadBySymbol[state.stockChartSymbol];
    elements.stockChartStatus.textContent = t(`${state.stockChartSymbol} / ${prices.length}営業日 / ${formatDate(latest.date)} 終値 ¥${latest.close.toLocaleString("ja-JP")}${cached?.stale ? " / 更新失敗・前回取得値" : ""}`);
    elements.stockIndicatorStatus.textContent = t(fibonacci
      ? `最高値 ${fibonacci.highDate} ¥${fibonacci.high.toLocaleString("en-US")} / 最低値 ${fibonacci.lowDate} ¥${fibonacci.low.toLocaleString("en-US")} / 0%=最高値、100%=最低値`
      : "値幅がないためフィボナッチは非表示");
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(elements.stockChart);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9b998f";
  ctx.font = '600 13px "Noto Sans JP"';
  ctx.textAlign = "center";
  const isLoading = state.stockChartStatus === "loading";
  elements.stockIndicatorStatus.textContent = "";
  ctx.fillText(t(isLoading ? "日足株価を読み込んでいます。" : "日足株価を取得できませんでした。"), width / 2, height / 2);
  elements.stockChartStatus.textContent = t(isLoading
    ? `${state.stockChartSymbol} / 読み込み中`
    : `${state.stockChartSymbol} / ${state.stockChartError || "株価データなし"}`);
}

/**
 * 概要: 会社名、IRリンク、選択中の会社ボタンなどを更新します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderCompany() {
  const company = companies[state.companyCode];
  elements.companyName.textContent = state.language === "en" ? englishCompanyNames[state.companyCode] ?? company.name : company.name;
  elements.sourceName.textContent = state.language === "en" ? `${englishCompanyNames[state.companyCode] ?? company.name} IR` : company.sourceName;
  elements.irLink.href = company.sourcePage;
  elements.companyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.company === state.companyCode);
  });
  updateRefreshButtonAvailability();
}

/**
 * 概要: 画面全体をまとめて描き直します。データが変わった後は基本的にこれを呼びます。
 * 引数: なし。
 * 戻り値: なし。
 */
function render() {
  renderLanguage();
  renderCompany();
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
  renderStockChart();
  renderLiveMarket();
  renderDataStatus();
  renderStatementDetails();
}

/**
 * 概要: 内訳表で選ばれた公式決算書を取り出します。
 * 引数: なし。
 * 戻り値: 公式決算書、またはundefined。
 */
function selectedStatement() {
  const reports = state.officialReportsByCompany[state.companyCode] ?? [];
  return reports.find((row) => row.periodEnd === state.statementSelectedEnd)
    ?? (state.flowMode==='cash' ? reports.filter(row=>row.cashFlow).at(-1) : undefined)
    ?? reports.find((row) => row.periodEnd === activeResult()?.periodEnd) ?? reports.at(-1);
}

/**
 * 概要: サンキーで表示する単独四半期または明示選択した決算書の期間を返します。
 * 引数: なし。
 * 戻り値: 損益データ、またはundefined。
 */
function flowResult() {
  if (state.flowMode==='cash') return selectedStatement();
  return state.cumulativeFlow ? selectedStatement() ?? activeResult() : activeResult();
}

/**
 * 概要: 決算書の科目・金額・原本ページを表示し、累計と単独四半期を区別します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderStatementDetails() {
  const reports = state.officialReportsByCompany[state.companyCode] ?? [];
  const report = selectedStatement();
  elements.statementSelect.innerHTML = t(reports.map((row) => `<option value="${row.periodEnd}">${escapeHtml(fiscalPeriodLabel(row))} / ${row.periodEnd} / ${row.basis === "cumulative" ? "累計" : "第1四半期"}${row.cashFlow?' / CFあり':''}</option>`).join(""));
  elements.statementSelect.value = report?.periodEnd ?? "";
  elements.statementSelect.disabled = !report;
  elements.cumulativeFlow.disabled = !report || state.flowMode==='cash';
  elements.cumulativeFlow.checked = state.cumulativeFlow;
  document.querySelector('#statement-title').textContent=t(state.flowMode==='cash'?'決算書のキャッシュフロー内訳':'決算書の収入・支出内訳');
  if (!report) {
    elements.statementBody.innerHTML = t('<tr><td colspan="3">解析できた公式決算書の内訳はまだありません。</td></tr>');
    elements.statementStatus.textContent = t(state.officialReportLoading.has(state.companyCode)
      ? "公式決算PDFの当期損益計算書を解析しています。株価・登録済み業績は先に表示します。"
      : !state.officialReportChecked.has(state.companyCode) ? "公式決算書の取得を準備しています。"
      : "公式決算書の形式・リンク・文字抽出を確認できなかったため、登録済みの集計値を表示しています。");
    return;
  }
  elements.statementStatus.textContent = t(`公式決算書 / ${report.periodStart}〜${report.periodEnd} / ${report.basis === "cumulative" ? "年度累計" : "単独四半期"} / 原本 ${report.sourcePages.join(", ")}ページ${state.officialReportLoading.has(state.companyCode) ? " / 他の決算書を解析中" : ""}${state.officialReportErrorsByCompany[state.companyCode] ? " / 一部資料は解析できませんでした" : ""}。差額・予想ではなく原本の当期列を表示します。`);
  const cashMode=state.flowMode==='cash';
  document.querySelector('#statement-title').textContent=t(cashMode?'決算書のキャッシュフロー内訳':'決算書の収入・支出内訳');
  if (cashMode) elements.statementStatus.textContent=t(report.cashFlow?`公式決算書 / ${report.periodStart}〜${report.periodEnd} / 原本 ${report.cashFlow.sourcePages.join(', ')}ページ / CFの当期列・百万円。`:'この決算書のキャッシュフローは未開示・未取得です');
  const rows = [...new Map((cashMode?report.cashFlow?.rows??[]:report.statementRows).map((row) => [`${row.group ?? ""}:${row.label}`, row])).values()];
  elements.statementBody.innerHTML = rows.map((row) => {
    const label = row.label === "その他" && row.group ? `${row.group} / その他` : row.label;
    const translated = t(label);
    const original = state.language === "en" && translated !== label ? `<small class="original-label" lang="ja">${escapeHtml(label)}</small>` : "";
    return `<tr><td>${escapeHtml(translated)}${original}</td><td>${row.value.toLocaleString(state.language === "en" ? "en-US" : "ja-JP")}</td><td><a class="pdf-link" href="${escapeHtml(report.sourceUrl)}#page=${row.page}" target="_blank" rel="noreferrer">${state.language === "en" ? `Page ${row.page}` : `${row.page}ページ`} ↗</a></td></tr>`;
  }).join("") || t('<tr><td colspan="3">この決算書のキャッシュフローは未開示・未取得です</td></tr>');
}

/**
 * 概要: 公式決算書を既存業績へ統合し、利用者の過去期選択を維持します。
 * 引数: companyCode - 対象企業。
 * 戻り値: なし。
 */
function applyOfficialStatements(companyCode) {
  const active = state.companyCode === companyCode;
  const currentId = state.activeId;
  const previous = activeResult();
  const selectedPeriodEnd = previous?.periodEnd;
  const followedLatest = active && currentId === state.results.at(-1)?.id;
  state.resultsByCompany[companyCode] = mergeOfficialStatements(state.resultsByCompany[companyCode] ?? [], state.officialReportsByCompany[companyCode] ?? []);
  if (active) {
    state.results = state.resultsByCompany[companyCode];
    state.activeId = followedLatest ? state.results.at(-1)?.id ?? null
      : state.results.find((row) => row.id === currentId)?.id
        ?? state.results.find((row) => row.periodEnd === selectedPeriodEnd)?.id
        ?? state.results.find((row) => row.fiscalYear === previous?.fiscalYear && row.quarter === previous?.quarter)?.id
        ?? state.results.at(-1)?.id ?? null;
    render();
  }
}

/**
 * 概要: 事前解析した公式内訳を優先し、未取得の原本だけブラウザで解析して更新します。
 * 引数: companyCode - 対象企業。force - PDFのブラウザ内解析キャッシュを無視するか。
 * 戻り値: 解析完了を示すPromise。
 */
async function loadOfficialStatements(companyCode, force = false) {
  if (state.officialReportLoading.has(companyCode)) { applyOfficialStatements(companyCode); return; }
  state.officialReportLoading.add(companyCode);
  delete state.officialReportErrorsByCompany[companyCode];
  if (state.companyCode === companyCode) renderStatementDetails();
  try {
    const response = await fetch(`/api/official-reports?company=${encodeURIComponent(companyCode)}`, {
      cache: "no-store", signal: requestTimeout(40000),
    });
    if (!response.ok) throw new Error("公式決算書の一覧を取得できませんでした");
    const payload = await response.json();
    if (!Array.isArray(payload.documents)) throw new Error("公式決算書一覧の形式が正しくありません");
    const allowedSources = new Set(payload.documents.map((document) => document.url));
    const prepared = new Map((payload.reports ?? []).filter((report) => report.companyCode === companyCode
      && allowedSources.has(report.sourceUrl)
      && Array.isArray(report.statementRows) && Number.isFinite(report.revenue) && Number.isFinite(report.netIncome))
      .map((report) => [report.sourceUrl, report]));
    if (payload.stale) state.officialReportErrorsByCompany[companyCode] = "公式一覧の更新失敗";
    // 履歴は事前解析済みの全件を先に反映し、端末で解析する未取得PDFだけを4件に制限します。
    const existing = state.officialReportsByCompany[companyCode] ?? [];
    state.officialReportsByCompany[companyCode] = [...new Map([...existing, ...prepared.values()]
      .map((report) => [report.periodEnd, report])).values()].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    applyOfficialStatements(companyCode);
    for (const document of payload.documents.filter((document) => !prepared.has(document.url)).slice(0, 4)) {
      try {
        const saved = state.parsedReportCache.get(document.url);
        let report = prepared.get(document.url) ?? (!force && saved && Date.now() - Date.parse(saved.updatedAt) < FINANCIAL_REFRESH_MS ? saved : null);
        if (!report) {
          const pdf = await fetch(`/api/report-pdf?company=${encodeURIComponent(companyCode)}&url=${encodeURIComponent(document.url)}`, { signal: requestTimeout(20000) });
          if (!pdf.ok) throw new Error("公式PDFの取得失敗");
          report = await extractStatement(new Uint8Array(await pdf.arrayBuffer()), companyCode, document.url,
            companies[companyCode].stockSymbol.replace(/\.T$/, ""));
        }
        if (!report) { state.officialReportErrorsByCompany[companyCode] = "未対応の決算書形式"; continue; }
        state.parsedReportCache.set(document.url, report);
        const reports = state.officialReportsByCompany[companyCode] ?? [];
        state.officialReportsByCompany[companyCode] = [...new Map([...reports, report].map((row) => [row.periodEnd, row])).values()]
          .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
        applyOfficialStatements(companyCode);
      } catch (error) { state.officialReportErrorsByCompany[companyCode] = error.message; }
    }
  } catch (error) { state.officialReportErrorsByCompany[companyCode] = error.message; }
  finally {
    state.officialReportLoading.delete(companyCode);
    state.officialReportChecked.add(companyCode);
    if (state.companyCode === companyCode) renderStatementDetails();
  }
}

function showToast(message) {
  elements.toast.textContent = t(message);
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3300);
}

/**
 * 概要: 選択中の企業の取得状態に合わせて更新ボタンを切り替えます。
 * 引数: なし。
 * 戻り値: なし。
 */
function updateRefreshButtonAvailability() {
  const busy = state.refreshingCompanies.has(state.companyCode);
  elements.refreshButton.disabled = busy;
  elements.refreshButton.title = t("株価・公表済み業績・資料一覧を再取得します。");
  elements.refreshButtonLabel.textContent = t(busy ? "更新中" : "更新");
}

/**
 * 概要: 市場データの時刻を日本時間で表示します。
 * 引数: value - ISO時刻。
 * 戻り値: 日本時間の表示文字列。不明な場合はダッシュ。
 */
function marketTimeLabel(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "ja-JP", {
    timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value)) : "—";
}

/**
 * 概要: 最新株価、前日比、配信時刻と更新状態を表示します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderLiveMarket() {
  const symbol = companies[state.companyCode].stockSymbol;
  const quote = state.quoteBySymbol[symbol];
  const error = state.quoteErrorsBySymbol[symbol];
  elements.livePrice.textContent = t(quote ? `¥${quote.price.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}` : "—");
  elements.liveChange.textContent = t(quote?.change !== null && quote?.change !== undefined
    ? `${quote.change >= 0 ? "+" : ""}${quote.change.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} (${formatPercent(quote.changePercent)}) 前日比` : "前日比 —");
  elements.liveChange.classList.toggle("negative", quote?.change < 0);
  elements.quoteStatus.textContent = t(quote
    ? `${symbol} / Yahoo Finance / 株価時刻 ${marketTimeLabel(quote.marketTime)} JST / 確認 ${marketTimeLabel(quote.updatedAt)}${error || quote.stale ? " / 更新失敗・前回取得値" : ""}`
    : `${symbol} / ${error ? "株価を取得できませんでした。次回更新で再試行します。" : "最新株価を取得しています"}`);
}

/**
 * 概要: 選択した業績の出典と、外部データの取得状態を表示します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderDataStatus() {
  const result = activeResult();
  const external = state.financialByCompany[state.companyCode];
  const externalAnnual = external?.annualResults?.at(-1);
  const officialAnnual = (state.officialReportsByCompany[state.companyCode] ?? []).filter((row) => row.months === 12).at(-1);
  const annual = officialAnnual && (!externalAnnual || officialAnnual.periodEnd >= externalAnnual.periodEnd) ? officialAnnual : externalAnnual;
  elements.annualSummarySource.textContent = t(`${annual?.sourceName ?? "Yahoo Finance"} / 通期実績。下の四半期業績とは期間が異なります`);
  elements.annualSummaryPeriod.textContent = t(annual ? `${annual.periodEnd} 終了年度 / ${external?.stale || state.financialErrorsByCompany[state.companyCode] ? "更新失敗・前回値" : "通期実績"}`
    : external || state.financialErrorsByCompany[state.companyCode] ? "配信元の通期業績を取得できませんでした" : "通期業績を取得しています");
  elements.annualSummaryRevenue.textContent = t(annual ? formatOptionalBillions(annual.revenue) : "—");
  const usesPretax = annual?.operatingIncome === null;
  elements.annualSummaryProfitLabel.textContent = t(usesPretax ? "税引前利益" : "営業利益");
  elements.annualSummaryProfit.textContent = t(annual ? formatOptionalBillions(usesPretax ? annual.pretaxIncome : annual.operatingIncome) : "—");
  elements.annualSummaryNet.textContent = t(annual ? formatOptionalBillions(annual.netIncome) : "—");
  const parts = [result?.sourceName === "公式決算書" ? `業績出典: 公式決算書（${result.basis === "quarter-difference" ? "累計差分" : "単独四半期"}）`
    : result?.sourceName === "Yahoo Finance" ? "業績出典: Yahoo Finance（単独四半期）"
    : state.databaseLoaded ? "業績出典: 登録済み公式IR" : "業績出典: 予備データ（最新情報ではありません）"];
  if (result) parts.push(`期間末 ${result.periodEnd}`);
  if (external) parts.push(`配信元の業績確認 ${marketTimeLabel(external.updatedAt)} JST`);
  if (external && !external.results.length) parts.push("配信元に四半期業績なし・登録済み四半期を表示");
  if (state.databaseError) parts.push(state.databaseLoaded ? "DB更新失敗・前回取得値" : "DB取得失敗");
  if (external?.stale || state.financialErrorsByCompany[state.companyCode]) parts.push("外部業績更新失敗・登録済み/前回取得値を表示");
  parts.push("業績は決算公表・配信元への反映後に更新されます");
  elements.dataStatus.textContent = t(parts.join(" / "));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * 概要: 登録済みの業績更新日を表示し、株価の取得時刻と区別します。
 * 引数: companyCode - 会社コード。省略時は表示中の企業。
 * 戻り値: なし。
 */
function updateLatestUpdate(companyCode = state.companyCode) {
  const updatedAt = state.lastUpdatedAtByCompany[companyCode];
  elements.latestUpdate.textContent = t(updatedAt
    ? `登録業績更新 ${new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Tokyo",
      }).format(new Date(updatedAt))}`
    : "登録業績更新 —");
}

/**
 * 概要: DBの会社、四半期業績、IR資料を読み込み、画面用の状態へ反映します。
 * 引数: なし。
 * 戻り値: 読み込み完了を示すPromise。
 */
async function loadDatabaseData() {
  const [companyRows, resultRows, documentRows] = await Promise.all([
    fetchSupabaseRows("earn_companies", {
      select: "code,name,stock_code,ir_url,display_order,updated_at",
      active: "eq.true",
      order: "display_order.asc",
    }),
    fetchSupabaseRows("earn_quarterly_results", {
      select: "id,company_code,fiscal_year,quarter,period_end,revenue,operating_cost,operating_income,pretax_income,net_income,source_url,updated_at",
      order: "company_code.asc,fiscal_year.asc,quarter.asc",
    }),
    fetchSupabaseRows("earn_ir_documents", {
      select: "id,company_code,fiscal_year,quarter,title,url,source_name,published_at,updated_at",
      order: "company_code.asc,published_at.desc",
    }),
  ]);

  companyRows.forEach((row) => {
    if (!companies[row.code]) return;
    companies[row.code] = {
      ...companies[row.code],
      name: row.name,
      sourceName: `${row.name} IR`,
      sourcePage: row.ir_url,
      stockSymbol: `${row.stock_code}.T`,
    };
  });

  const resultsByCompany = Object.fromEntries(Object.keys(companies).map((code) => [code, []]));
  resultRows.forEach((row) => {
    if (!resultsByCompany[row.company_code]) return;
    resultsByCompany[row.company_code].push({
      id: row.id,
      companyCode: row.company_code,
      fiscalYear: fiscalYearFromPeriod(row.period_end, row.quarter),
      quarter: row.quarter,
      periodType: `Q${row.quarter}`,
      periodStart: null,
      periodEnd: row.period_end,
      revenue: row.revenue,
      operatingCost: row.operating_cost,
      operatingIncome: row.operating_income,
      pretaxIncome: row.pretax_income,
      netIncome: row.net_income,
      sourceUrl: row.source_url,
      updatedAt: row.updated_at,
    });
  });

  const documentsByCompany = Object.fromEntries(Object.keys(companies).map((code) => [code, []]));
  documentRows.forEach((row) => {
    if (!documentsByCompany[row.company_code]) return;
    documentsByCompany[row.company_code].push({
      id: row.id,
      fiscalYear: row.fiscal_year,
      quarter: row.quarter,
      title: row.title,
      url: row.url,
      sourceName: row.source_name,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    });
  });

  Object.entries(resultsByCompany).forEach(([companyCode, rows]) => {
    rows.forEach((row) => {
      if (!row.sourceUrl || documentsByCompany[companyCode].some((item) => item.url === row.sourceUrl)) return;
      documentsByCompany[companyCode].push({
        fiscalYear: row.fiscalYear,
        quarter: row.quarter,
        title: `FY${row.fiscalYear} Q${row.quarter} financial results`,
        url: row.sourceUrl,
        sourceName: "official_ir",
        publishedAt: row.periodEnd,
        updatedAt: row.updatedAt,
      });
    });
    documentsByCompany[companyCode].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  });

  state.resultsByCompany = resultsByCompany;
  state.officialIrDocumentsByCompany = documentsByCompany;
  state.lastUpdatedAtByCompany = Object.fromEntries(Object.entries(resultsByCompany).map(([companyCode, rows]) => [
    companyCode,
    rows.map((row) => row.updatedAt).filter(Boolean).sort().at(-1) ?? null,
  ]));
  state.databaseLoaded = true;
}

/**
 * 概要: Cloudflareが公式IRページから収集した決算PDFを既存の資料一覧へ追加します。
 * 引数: companyCode - 表示対象の会社コード。
 * 戻り値: 読み込み完了を示すPromise。
 */
async function loadOfficialIrDocuments(companyCode) {
  const response = await fetch(`/api/ir-documents?company=${encodeURIComponent(companyCode)}`, {
    signal: requestTimeout(12000),
  });
  if (!response.ok) throw new Error(`公式IR資料の取得に失敗しました (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.documents)) throw new Error("公式IR資料の形式が正しくありません");
  const current = state.officialIrDocumentsByCompany[companyCode] ?? [];
  const knownUrls = new Set(current.map((document) => document.url));
  const discovered = payload.documents.filter((document) => {
    if (!document || typeof document.title !== "string" || typeof document.url !== "string") return false;
    try { return new URL(document.url).protocol === "https:" && !knownUrls.has(document.url); }
    catch { return false; }
  });
  state.officialIrDocumentsByCompany[companyCode] = sortIrDocuments([...discovered, ...current], companyCode);
}

/**
 * 概要: Worker経由でMAの準備期間を含む2年の日足を取得し、1時間保存します。
 * 引数: symbol - Yahoo Finance形式の銘柄コード。force - キャッシュを無視するか。
 * 戻り値: 日足株価の配列を返すPromise。
 */
async function loadStockPrices(symbol, { force = false } = {}) {
  const saved = state.stockPayloadBySymbol[symbol];
  if (!force && saved && !saved.stale && Date.now() - Date.parse(saved.updatedAt) < STOCK_REFRESH_MS) return saved.prices;
  const response = await fetch(`/api/daily-stock-prices?symbol=${encodeURIComponent(symbol)}${force ? "&refresh=1" : ""}`, {
    cache: "no-store", signal: requestTimeout(20000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `株価APIの取得に失敗しました (${response.status})`);
  }
  const payload = await response.json();
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  if (!prices.length) throw new Error("日足株価がありません");
  state.stockPricesBySymbol[symbol] = prices;
  state.stockPayloadBySymbol[symbol] = payload;
  return prices;
}

const quoteRequests = new Map();
let databaseRequest = null;

/**
 * 概要: 市場APIをタイムアウト付きで読み込みます。
 * 引数: path - APIパス。symbol - 銘柄コード。
 * 戻り値: APIレスポンスを返すPromise。
 */
async function loadMarketPayload(path, symbol) {
  const response = await fetch(`${path}?symbol=${encodeURIComponent(symbol)}`, {
    cache: "no-store", signal: requestTimeout(20000),
  });
  if (!response.ok) throw new Error(`市場データ取得失敗 (${response.status})`);
  return response.json();
}

/**
 * 概要: 銘柄ごとに最新株価を取得し、重複リクエストをまとめます。
 * 引数: symbol - 銘柄コード。
 * 戻り値: 取得の成功を表す真偽値を返すPromise。
 */
async function refreshQuote(symbol = companies[state.companyCode].stockSymbol) {
  if (quoteRequests.has(symbol)) return quoteRequests.get(symbol);
  state.lastQuoteCheckBySymbol[symbol] = Date.now();
  const pending = (async () => {
    try {
      const quote = await loadMarketPayload("/api/stock-quote", symbol);
      if (!Number.isFinite(quote.price) || !quote.marketTime) throw new Error("株価の形式が正しくありません");
      state.quoteBySymbol[symbol] = quote;
      delete state.quoteErrorsBySymbol[symbol];
      return !quote.stale;
    } catch (error) {
      state.quoteErrorsBySymbol[symbol] = error.message;
      return false;
    } finally {
      quoteRequests.delete(symbol);
      if (companies[state.companyCode].stockSymbol === symbol) renderLiveMarket();
    }
  })();
  quoteRequests.set(symbol, pending);
  return pending;
}

/** 概要: 株価と日足・指標を1時間単位で再確認し、選択企業が変わった場合は上書きしません。引数: なし。戻り値: 完了を示すPromise。 */
async function refreshHourlyMarket() {
  const company = state.companyCode;
  const symbol = companies[company].stockSymbol;
  const [prices] = await Promise.allSettled([loadStockPrices(symbol),refreshQuote(symbol)]);
  if (state.companyCode !== company || state.stockChartSymbol !== symbol) return;
  if (prices.status === "fulfilled") {
    state.stockPrices = prices.value;
    state.stockChartStatus = "ready";
  } else if (state.stockPayloadBySymbol[symbol]) {
    state.stockPayloadBySymbol[symbol].stale = true;
  }
  renderStockChart();
}

/**
 * 概要: 会社を開いたときや更新ボタンを押したときの、データ更新の中心処理です。
 * 引数: notify - 通知の有無。reloadDatabase - DBの再取得。forceStock - 日足の再取得。
 * 戻り値: 更新処理が終わったことを示すPromise。
 */
async function refreshCompany({ notify = false, reloadDatabase = false, forceStock = false } = {}) {
  const companyCode = state.companyCode;
  if (state.refreshingCompanies.has(companyCode)) return;
  state.lastFinancialCheckByCompany[companyCode] = Date.now();
  const symbol = companies[companyCode].stockSymbol;
  const previousId = state.activeId;
  const followedLatest = previousId === state.results.at(-1)?.id;
  state.refreshingCompanies.add(companyCode);
  updateRefreshButtonAvailability();
  state.stockChartStatus = "loading";
  state.stockChartError = "";
  state.stockPrices = state.stockPricesBySymbol[symbol] ?? [];
  renderStockChart();

  if ((reloadDatabase || !state.databaseLoaded) && !databaseRequest) {
    databaseRequest = loadDatabaseData().then(() => { state.databaseError = null; })
      .catch((error) => { state.databaseError = error.message; })
      .finally(() => { databaseRequest = null; });
  }
  const results = await Promise.allSettled([
    databaseRequest,
    loadMarketPayload("/api/financial-results", symbol),
    loadStockPrices(symbol, { force: forceStock }),
    refreshQuote(symbol),
  ]);
  const financial = results[1];
  if (financial.status === "fulfilled" && Array.isArray(financial.value.results)) {
    state.financialByCompany[companyCode] = financial.value;
    delete state.financialErrorsByCompany[companyCode];
  } else {
    state.financialErrorsByCompany[companyCode] = "外部業績を取得できませんでした";
  }
  const external = state.financialByCompany[companyCode];
  if (external) state.resultsByCompany[companyCode] = mergeFinancialResults(
    state.resultsByCompany[companyCode] ?? [], external, companyCode);
  state.resultsByCompany[companyCode] = mergeOfficialStatements(state.resultsByCompany[companyCode] ?? [],
    state.officialReportsByCompany[companyCode] ?? []);

  // DB読込が資料一覧を置き換えた後で収集済みPDFを追加します。
  try { await loadOfficialIrDocuments(companyCode); }
  catch (error) { console.warn("公式IR資料の取得に失敗しました。", error); }

  state.refreshingCompanies.delete(companyCode);
  const stock = results[2];
  if (state.companyCode === companyCode) {
    state.stockPrices = stock.status === "fulfilled" ? stock.value : state.stockPricesBySymbol[symbol] ?? [];
    state.stockChartStatus = stock.status === "fulfilled" ? "ready" : "error";
    state.stockChartError = stock.status === "rejected" ? "日足の更新失敗・前回取得値を表示" : "";
    if (stock.status === "rejected" && state.stockPayloadBySymbol[symbol]) state.stockPayloadBySymbol[symbol].stale = true;
    state.stockChartSymbol = companies[companyCode].stockSymbol;
    state.results = state.resultsByCompany[companyCode] ?? [];
    // 取得中に変更した年度・四半期の選択も維持します。
    const selectionChanged = state.activeId !== previousId;
    const selected = selectionChanged ? state.activeId : previousId;
    state.activeId = (selectionChanged || !followedLatest) && state.results.some((row) => row.id === selected)
      ? selected : state.results.at(-1)?.id ?? null;
    updateLatestUpdate(companyCode);
    render();
  }
  updateRefreshButtonAvailability();
  loadOfficialStatements(companyCode, forceStock);
  if (notify && state.companyCode === companyCode) {
    const failed = state.databaseError || financial.status === "rejected" || external?.stale
      || stock.status === "rejected" || !results[3].value || state.stockPayloadBySymbol[symbol]?.stale;
    showToast(failed ? "一部の更新に失敗しました。画面の取得状態をご確認ください。" : "株価・配信元業績を更新しました。公式決算書の解析も進めています。");
  }
}

// ここから下は、ユーザー操作に反応するイベント設定です。
for (const id of ["performance-chart", "margin-chart", "sankey-chart", "stock-chart"]) {
  const canvas = document.querySelector(`#${id}`);
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-describedby", "chart-interaction-help");
  canvas.addEventListener("click", (event) => {
    const model = chartModels.get(canvas);
    if (!model) return;
    const point = chartPoint(canvas.getBoundingClientRect(), model.width, model.height, event.clientX, event.clientY);
    const datum = hitChart(model.regions, point);
    if (datum) showChartInspection(canvas, datum, event); else closeChartInspection();
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { closeChartInspection(); return; }
    if (!["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) return;
    const model = chartModels.get(canvas);
    if (!model?.items.length) return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    model.keyboardIndex = model.keyboardIndex < 0 ? (direction < 0 ? model.items.length - 1 : 0)
      : (model.keyboardIndex + direction + model.items.length) % model.items.length;
    showChartInspection(canvas, model.items[model.keyboardIndex]);
  });
}
elements.chartTooltipClose.addEventListener("click", closeChartInspection);
document.addEventListener("click", (event) => {
  if (!chartModels.has(event.target) && !elements.chartTooltip.contains(event.target)) closeChartInspection();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeChartInspection();
});
elements.languageToggle.addEventListener("click", () => {
  state.language = state.language === "ja" ? "en" : "ja";
  saveLanguage(state.language);
  render();
  updateLatestUpdate();
  updateRefreshButtonAvailability();
});
elements.sankeyZoom.addEventListener("click", () => {
  state.sankeyExpanded = !state.sankeyExpanded;
  drawSankeyChart();
  const wrapper = document.querySelector("#sankey-chart").parentElement;
  if (wrapper) wrapper.scrollLeft = 0;
});
elements.yearSelect.addEventListener("change", (event) => {
  const selectedYear = Number(event.target.value);
  const latestPeriod = state.results.filter((result) => result.fiscalYear === selectedYear).at(-1);
  state.activeId = latestPeriod?.id ?? null;
  state.cumulativeFlow = false;
  state.statementSelectedEnd = null;
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
  renderDataStatus();
  renderStatementDetails();
});
elements.quarterSelect.addEventListener("change", (event) => {
  state.activeId = event.target.value;
  state.cumulativeFlow = false;
  state.statementSelectedEnd = null;
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
  renderDataStatus();
  renderStatementDetails();
});
elements.companyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    state.companyCode = button.dataset.company;
    state.cumulativeFlow = false;
    state.statementSelectedEnd = null;
    state.stockChartSymbol = companies[state.companyCode].stockSymbol;
    state.results = state.resultsByCompany[state.companyCode] ?? [];
    state.activeId = state.results.at(-1)?.id ?? null;
    state.stockPrices = state.stockPricesBySymbol[state.stockChartSymbol] ?? [];
    state.stockChartStatus = state.stockPrices.length ? "ready" : "loading";
    state.stockChartError = "";
    updateLatestUpdate();
    render();
    await refreshCompany();
  });
});
elements.refreshButton.addEventListener("click", () => refreshCompany({
  notify: true,
  reloadDatabase: true,
  forceStock: true,
}));
window.addEventListener("resize", () => {
  renderCharts();
  if (state.stockPrices.length) drawStockChart();
});

// ページを開いた直後に、まず予備データで描画してから最新データを取りに行きます。
updateLatestUpdate();
render();
refreshCompany({ reloadDatabase: true });

/**
 * 概要: タブ復帰・自動更新再開時は、株価1時間・決算1日の期限を過ぎたデータだけ再取得します。
 * 引数: なし。
 * 戻り値: 更新処理のPromise。期限内の場合はundefined。
 */
function refreshDueData() {
  const symbol = companies[state.companyCode].stockSymbol;
  const now = Date.now();
  if (now - (state.lastFinancialCheckByCompany[state.companyCode] ?? 0) >= FINANCIAL_REFRESH_MS) {
    return refreshCompany({ reloadDatabase: true });
  }
  if (now - (state.lastQuoteCheckBySymbol[symbol] ?? 0) >= STOCK_REFRESH_MS) return refreshHourlyMarket();
}

// 表示中だけ自動更新し、復帰時も設定した間隔を尊重します。
window.setInterval(() => {
  if (!document.hidden && elements.autoRefresh.checked) refreshHourlyMarket();
}, STOCK_REFRESH_MS);
window.setInterval(() => {
  if (!document.hidden && elements.autoRefresh.checked) refreshCompany({ reloadDatabase: true });
}, FINANCIAL_REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && elements.autoRefresh.checked) refreshDueData();
});
elements.autoRefresh.addEventListener("change", () => {
  if (elements.autoRefresh.checked) refreshDueData();
});
document.querySelector('#flow-mode').addEventListener('change',event=>{
  state.flowMode=event.target.value==='cash'?'cash':'income';
  if (state.flowMode==='cash') {
    const latest=(state.officialReportsByCompany[state.companyCode]??[]).filter(row=>row.cashFlow).at(-1);
    if (latest) state.statementSelectedEnd=latest.periodEnd;
  }
  renderStatementDetails(); renderAnnualFlow(); drawSankeyChart();
});
elements.statementSelect.addEventListener("change", (event) => {
  state.statementSelectedEnd = event.target.value;
  renderStatementDetails();
  renderAnnualFlow();
  drawSankeyChart();
});
elements.cumulativeFlow.addEventListener("change", (event) => {
  state.cumulativeFlow = event.target.checked;
  renderAnnualFlow();
  drawSankeyChart();
});
