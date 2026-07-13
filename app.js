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

// 画面の今の状態を1か所に集めています。会社を変えたり、PDF一覧を読んだりするとここが変わります。
const state = {
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
  stockChartStatus: "idle",
  stockChartError: "",
  databaseLoaded: false,
};

// HTMLの部品を先に探しておきます。あとで何度もdocument.querySelectorを書かなくて済みます。
const elements = {
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
  previousCashAndCashEquivalents: document.querySelector("#previous-cash-and-cash-equivalents"),
  annualRevenue: document.querySelector("#annual-revenue"),
  annualOperatingCost: document.querySelector("#annual-operating-cost"),
  investmentCashFlow: document.querySelector("#investment-cash-flow"),
  financingCashFlow: document.querySelector("#financing-cash-flow"),
  otherCashFlowAdjustment: document.querySelector("#other-cash-flow-adjustment"),
  cashAndCashEquivalents: document.querySelector("#cash-and-cash-equivalents"),
  stockChart: document.querySelector("#stock-chart"),
  stockChartStatus: document.querySelector("#stock-chart-status"),
};

const metricIds = ["revenue", "cost", "operating", "net"];
const metricKey = {
  revenue: "revenue",
  cost: "operatingCost",
  operating: "operatingIncome",
  net: "netIncome",
};

/**
 * 概要: 百万円単位の数字を「億円」で読みやすく表示します。
 * 引数: value - 表示したい数値。
 * 戻り値: 整形済みの文字列。
 */
function formatBillions(value) {
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

function formatCompactYen(value) {
  return formatBillions(value);
}

function formatMillions(value) {
  return `¥${value.toLocaleString("ja-JP")}M`;
}

function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function periodTypeLabel(result) {
  return `第${result.quarter}四半期`;
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

  elements.yearSelect.innerHTML = years
    .map((year) => `<option value="${year}">${year}年度</option>`)
    .join("");
  elements.yearSelect.value = selectedYear ?? "";
  elements.yearSelect.disabled = !years.length;

  elements.quarterSelect.innerHTML = periods
    .map(
      (result) =>
        `<option value="${result.id}">${periodTypeLabel(result)} — ${formatDate(result.periodEnd)}</option>`,
    )
    .join("");
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
  elements.metricCostCaption.textContent = usesPretaxIncome ? "連結サマリーでは非開示" : "営業収益 − 営業利益";
  elements.metricProfitTitle.textContent = usesPretaxIncome ? "Profit Before Tax" : "Operating Income";
  elements.metricProfitCaption.textContent = usesPretaxIncome ? "税引前利益" : "営業利益";
  elements.profitChartLabel.textContent = usesPretaxIncome ? "Profit Before Tax" : "Operating Income";
  elements.marginChartTitle.textContent = usesPretaxIncome ? "Pretax Margin" : "Operating Margin";
  if (!current) {
    elements.periodCaption.textContent = "決算データ未登録";
    metricIds.forEach((metric) => {
      document.querySelector(`#metric-${metric}`).textContent = "—";
      document.querySelector(`#change-${metric}`).textContent = "PENDING";
    });
    elements.marginValue.textContent = "—";
    elements.marginChange.textContent = "公式IR取込待ち";
    elements.marginChange.style.color = "var(--muted)";
    return;
  }
  const previous = comparisonResult(current);
  elements.periodCaption.textContent = `発行年月日 ${formatDate(current.periodEnd)}`;

  metricIds.forEach((metric) => {
    const key = metric === "operating" && usesPretaxIncome ? "pretaxIncome" : metricKey[metric];
    const valueElement = document.querySelector(`#metric-${metric}`);
    const changeElement = document.querySelector(`#change-${metric}`);
    valueElement.textContent = current[key] === null ? "開示なし" : formatBillions(current[key]);

    if (!previous || current[key] === null || previous[key] === null || previous[key] === 0) {
      changeElement.textContent = "BASE";
      changeElement.classList.remove("negative");
      return;
    }

    const change = ((current[key] - previous[key]) / previous[key]) * 100;
    changeElement.textContent = `${formatPercent(change)} YoY`;
    changeElement.classList.toggle("negative", change < 0);
  });

  const profitKey = usesPretaxIncome ? "pretaxIncome" : "operatingIncome";
  const margin = (current[profitKey] / current.revenue) * 100;
  const previousMargin = previous ? (previous[profitKey] / previous.revenue) * 100 : margin;
  const pointChange = margin - previousMargin;
  elements.marginValue.textContent = `${margin.toFixed(1)}%`;
  elements.marginChange.textContent = `${pointChange >= 0 ? "+" : ""}${pointChange.toFixed(1)} pt YoY`;
  elements.marginChange.style.color = pointChange >= 0 ? "var(--green)" : "var(--red)";
}

/**
 * 概要: 公式IRサイトから見つけたPDFリンクを一覧にします。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderDocuments() {
  const documents = state.officialIrDocumentsByCompany[state.companyCode];
  if (!documents) {
    elements.documentsBody.innerHTML = '<tr><td colspan="4">公式IR資料を読み込んでいます。</td></tr>';
    return;
  }
  if (!documents.length) {
    elements.documentsBody.innerHTML = '<tr><td colspan="4">公式IRサイトでPDF資料を取得できませんでした。</td></tr>';
    return;
  }
  elements.documentsBody.innerHTML = documents
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
 * 概要: グラフをきれいに描くため、画面の解像度に合わせてcanvasの大きさを整えます。
 * 引数: canvas - 描画対象のcanvas要素。
 * 戻り値: canvasの2D描画コンテキスト、幅、高さ。
 */
function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  return { context, width: rect.width, height: rect.height };
}

function drawEmptyChart(canvas, message = "決算データ未登録") {
  const { context: ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9b998f";
  ctx.font = '600 13px "Noto Sans JP"';
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
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

function drawWaterfallChart() {
  const canvas = document.querySelector("#waterfall-chart");
  const result = activeResult();
  if (!result) {
    drawEmptyChart(canvas, "四半期データ未登録");
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const profit = profitValue(result);
  const bars = [
    { label: "売上\n収益", value: result.revenue },
    { label: "営業\n費用", value: result.operatingCost === null ? null : -result.operatingCost },
    { label: usesPretaxMetric(result) ? "税引前\n利益" : "営業\n利益", value: profit },
    { label: "純利益", value: result.netIncome },
  ].filter((bar) => bar.value !== null && bar.value !== undefined);

  const padding = { top: 36, right: 12, bottom: 47, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const gap = chartWidth / bars.length;
  const barWidth = Math.min(76, gap * 0.54);
  const compactLabels = chartWidth < 360;
  const availableValues = bars.map((bar) => bar.value);
  const min = Math.min(0, ...availableValues);
  const max = Math.max(0, ...availableValues);
  const span = Math.max(max - min, 1);
  const chartMin = min - span * 0.08;
  const chartMax = max + span * 0.12;
  const scaleY = (value) => padding.top + chartHeight - ((value - chartMin) / (chartMax - chartMin)) * chartHeight;
  const zeroY = scaleY(0);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(224, 205, 165, .10)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding.top + (chartHeight / 3) * index;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(width - padding.right, zeroY);
  ctx.strokeStyle = "rgba(224, 205, 165, .28)";
  ctx.stroke();

  bars.forEach((bar, index) => {
    const x = padding.left + gap * index + gap / 2;
    const valueY = scaleY(bar.value);
    ctx.fillStyle = bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.fillRect(x - barWidth / 2, Math.min(valueY, zeroY), barWidth, Math.max(3, Math.abs(zeroY - valueY)));

    ctx.fillStyle = bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.font = compactLabels ? '700 9px "Manrope"' : '700 10px "Manrope"';
    ctx.textAlign = "center";
    const valueLabel = `${bar.value >= 0 ? "+" : ""}${formatCompactYen(bar.value)}`;
    const labelOffset = compactLabels && index % 2 ? 25 : 14;
    const preferredY = valueY + (bar.value < 0 ? labelOffset : -labelOffset);
    const minLabelY = padding.top + 10;
    const maxLabelY = padding.top + chartHeight - 8;
    const labelY = Math.min(Math.max(preferredY, minLabelY), maxLabelY);
    const labelX = clampedTextX(ctx, valueLabel, x, padding.left, width - padding.right);
    ctx.fillText(valueLabel, labelX, labelY);

    ctx.fillStyle = "#9b998f";
    ctx.font = '600 9px "Noto Sans JP"';
    bar.label.split("\n").forEach((line, lineIndex) => {
      ctx.fillText(line, x, height - 23 + lineIndex * 12);
    });
  });
}

/**
 * 概要: 選択中の四半期の業績内訳パネルを更新します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderAnnualFlow() {
  const result = activeResult();
  if (!result) {
    const year = activeResult()?.fiscalYear;
    elements.flowPeriod.textContent = year ? `FY${year}` : "PENDING";
    [
      elements.previousCashAndCashEquivalents,
      elements.annualRevenue,
      elements.annualOperatingCost,
      elements.investmentCashFlow,
      elements.financingCashFlow,
      elements.otherCashFlowAdjustment,
      elements.cashAndCashEquivalents,
    ].forEach((element) => {
      element.textContent = "未登録";
    });
    return;
  }
  const profit = profitValue(result);
  const margin = profit === null ? null : (profit / result.revenue) * 100;
  elements.flowPeriod.textContent = chartPeriodLabel(result);
  elements.previousCashAndCashEquivalents.textContent = `${result.fiscalYear}年度 第${result.quarter}四半期`;
  elements.annualRevenue.textContent = formatOptionalBillions(result.revenue);
  elements.annualOperatingCost.textContent = formatOptionalBillions(
    result.operatingCost === null ? null : -result.operatingCost,
  );
  elements.investmentCashFlow.textContent = formatOptionalBillions(profit);
  elements.financingCashFlow.textContent = formatOptionalBillions(result.netIncome);
  elements.otherCashFlowAdjustment.textContent = margin === null ? "開示なし" : `${margin.toFixed(1)}%`;
  elements.cashAndCashEquivalents.textContent = result.sourceUrl ? "PDF登録あり" : "未登録";
}

function renderCharts() {
  drawPerformanceChart();
  drawMarginChart();
  drawWaterfallChart();
}

/**
 * 概要: 週足株価をローソク足グラフとして描きます。
 * 引数: なし。
 * 戻り値: なし。
 */
function drawStockChart() {
  const canvas = elements.stockChart;
  const prices = state.stockPrices;
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 24, right: 22, bottom: 35, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const min = Math.min(...prices.map((item) => item.low));
  const max = Math.max(...prices.map((item) => item.high));
  const span = Math.max(max - min, 1);
  const gap = chartWidth / prices.length;
  const bodyWidth = Math.max(2, Math.min(8, gap * 0.64));
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

    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.max(2, Math.abs(closeY - openY)));
  });

  const labelIndexes = [0, Math.floor((prices.length - 1) / 2), prices.length - 1];
  ctx.fillStyle = "#77756e";
  ctx.textAlign = "center";
  labelIndexes.forEach((index) => {
    const label = formatDate(prices[index].date);
    ctx.fillText(label, clampedTextX(ctx, label, scaleX(index), padding.left, width - padding.right), height - 9);
  });
}

function renderStockChart() {
  state.renderedStockChartSymbol = state.stockChartSymbol;
  if (state.stockPrices.length) {
    drawStockChart();
    const latest = state.stockPrices.at(-1);
    elements.stockChartStatus.textContent = `${state.stockChartSymbol} / ${state.stockPrices.length}週 / ${formatDate(latest.date)} 終値 ¥${latest.close.toLocaleString("ja-JP")}`;
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(elements.stockChart);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9b998f";
  ctx.font = '600 13px "Noto Sans JP"';
  ctx.textAlign = "center";
  const isLoading = state.stockChartStatus === "loading";
  ctx.fillText(isLoading ? "週足株価を読み込んでいます。" : "週足株価を取得できませんでした。", width / 2, height / 2);
  elements.stockChartStatus.textContent = isLoading
    ? `${state.stockChartSymbol} / 読み込み中`
    : `${state.stockChartSymbol} / ${state.stockChartError || "株価データなし"}`;
}

/**
 * 概要: 会社名、IRリンク、選択中の会社ボタンなどを更新します。
 * 引数: なし。
 * 戻り値: なし。
 */
function renderCompany() {
  const company = companies[state.companyCode];
  elements.companyName.textContent = company.name;
  elements.sourceName.textContent = company.sourceName;
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
  renderCompany();
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
  renderStockChart();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3300);
}

function updateRefreshButtonAvailability() {
  elements.refreshButton.disabled = false;
  elements.refreshButton.title = "登録済みのPDF一覧を表示します。";
  elements.refreshButtonLabel.textContent = "更新";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateLatestUpdate(companyCode = state.companyCode) {
  const updatedAt = state.lastUpdatedAtByCompany[companyCode];
  elements.latestUpdate.textContent = updatedAt
    ? `Last updated ${new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(updatedAt))}`
    : "Last updated —";
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
      fiscalYear: row.fiscal_year,
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
 * 概要: Worker経由で直近1年の週足株価を取得し、会社ごとにキャッシュします。
 * 引数: symbol - Yahoo Finance形式の銘柄コード。force - キャッシュを無視するか。
 * 戻り値: 週足株価の配列を返すPromise。
 */
async function loadStockPrices(symbol, { force = false } = {}) {
  if (!force && state.stockPricesBySymbol[symbol]) return state.stockPricesBySymbol[symbol];
  const response = await fetch(`/api/stock-prices?symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `株価APIの取得に失敗しました (${response.status})`);
  }
  const payload = await response.json();
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  if (!prices.length) throw new Error("週足株価がありません");
  state.stockPricesBySymbol[symbol] = prices;
  return prices;
}

/**
 * 概要: 会社を開いたときや更新ボタンを押したときの、データ更新の中心処理です。
 * 引数: notify - トースト通知を出すか。
 * 戻り値: 更新処理が終わったことを示すPromise。
 */
async function refreshCompany({ notify = false, reloadDatabase = false, forceStock = false } = {}) {
  const companyCode = state.companyCode;
  const symbol = companies[companyCode].stockSymbol;
  elements.refreshButton.disabled = true;
  elements.refreshButtonLabel.textContent = "更新中";
  state.stockChartStatus = "loading";
  state.stockChartError = "";
  state.stockPrices = state.stockPricesBySymbol[symbol] ?? [];
  renderStockChart();

  let databaseError = null;
  if (reloadDatabase || !state.databaseLoaded) {
    try {
      await loadDatabaseData();
    } catch (error) {
      databaseError = error;
      console.error("DBデータの取得に失敗しました。予備データを表示します。", error);
    }
  }

  let stockError = null;
  try {
    state.stockPrices = await loadStockPrices(symbol, { force: forceStock });
    state.stockChartStatus = "ready";
  } catch (error) {
    stockError = error;
    state.stockPrices = [];
    state.stockChartStatus = "error";
    state.stockChartError = error.message;
    console.error("週足株価の取得に失敗しました。", error);
  }

  if (state.companyCode === companyCode) {
    state.stockChartSymbol = companies[companyCode].stockSymbol;
    state.results = state.resultsByCompany[companyCode] ?? [];
    state.activeId = state.results.at(-1)?.id ?? null;
    updateLatestUpdate(companyCode);
    render();
  }
  updateRefreshButtonAvailability();
  if (notify) {
    if (databaseError) showToast("DBの取得に失敗したため、予備データを表示しています。");
    else if (stockError) showToast("決算データを更新しました。株価のみ取得できませんでした。");
    else showToast("DBデータと週足株価を更新しました。");
  }
}

// ここから下は、ユーザー操作に反応するイベント設定です。
elements.yearSelect.addEventListener("change", (event) => {
  const selectedYear = Number(event.target.value);
  const latestPeriod = state.results.filter((result) => result.fiscalYear === selectedYear).at(-1);
  state.activeId = latestPeriod?.id ?? null;
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
});
elements.quarterSelect.addEventListener("change", (event) => {
  state.activeId = event.target.value;
  renderMetrics();
  renderDocuments();
  renderCharts();
});
elements.companyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    state.companyCode = button.dataset.company;
    state.stockChartSymbol = companies[state.companyCode].stockSymbol;
    state.results = state.resultsByCompany[state.companyCode] ?? [];
    state.activeId = state.results.at(-1)?.id ?? null;
    state.stockPrices = state.stockPricesBySymbol[state.stockChartSymbol] ?? [];
    state.stockChartStatus = state.stockPrices.length ? "ready" : "loading";
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
