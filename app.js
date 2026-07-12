import "./config.js";

const companies = {
  toyota: {
    code: "toyota",
    name: "TOYOTA MOTOR CORPORATION",
    sourceName: "TOYOTA IR",
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    stockSymbol: "7203.T",
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
};

// Official PDFs publish cumulative values. Each entry below is normalized to a standalone quarter.
const fallbackResults = {
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
};

const registeredDataDescription = "公式IR資料をもとにJSへ登録済みのデータ（リアルタイム自動取得ではありません）";

const annualAnalyses = {
  toyota: {
    previousFiscalYear: "FY2025",
    currentFiscalYear: "FY2026",
    previousOperatingIncome: 4795586,
    currentOperatingIncome: 3766216,
    previousRevenue: 48036704,
    currentRevenue: 50684952,
    previousOperatingCost: 43241118,
    currentOperatingCost: 46918736,
    operatingCashFlow: 5472920,
    investingCashFlow: -1520307,
    financingCashFlow: -536659,
    previousCashAndCashEquivalents: 8982404,
    cashAndCashEquivalents: 12659622,
    expenses: [
      { label: "売上原価", value: 39141418 },
      { label: "金融事業に係る金融費用", value: 3079794 },
      { label: "販売費及び一般管理費", value: 4697524 },
    ],
  },
  ntt: {
    previousFiscalYear: "FY2024",
    currentFiscalYear: "FY2025",
    previousOperatingIncome: 1649571,
    currentOperatingIncome: 1706221,
    previousRevenue: 13704727,
    currentRevenue: 14409121,
    previousOperatingCost: 12055156,
    currentOperatingCost: 12702900,
    operatingCashFlow: 1485190,
    investingCashFlow: -1023424,
    financingCashFlow: 441332,
    previousCashAndCashEquivalents: 1000994,
    cashAndCashEquivalents: 1921882,
    expenses: [
      { label: "人件費", value: 3214887 },
      { label: "経費", value: 7207918 },
      { label: "減価償却費", value: 1790983 },
      { label: "固定資産除却費", value: 119782 },
      { label: "減損損失", value: 80189 },
      { label: "租税公課", value: 289141 },
    ],
  },
  softbank: {
    previousFiscalYear: "FY2024",
    currentFiscalYear: "FY2025",
    previousOperatingIncome: 989016,
    currentOperatingIncome: 1042576,
    previousRevenue: 6544349,
    currentRevenue: 7038680,
    previousOperatingCost: 5555333,
    currentOperatingCost: 5996104,
    operatingCashFlow: 1393760,
    investingCashFlow: -1270806,
    financingCashFlow: -136854,
    previousCashAndCashEquivalents: 1435525,
    cashAndCashEquivalents: 1438799,
    expenses: [{ label: "営業費用合計", value: 5996104 }],
  },
};

const state = {
  companyCode: "toyota",
  resultsByCompany: { ...fallbackResults },
  edinetDocumentsByCompany: {},
  edinetFactsByCompany: {},
  officialIrDocumentsByCompany: {},
  results: fallbackResults.toyota,
  activeId: fallbackResults.toyota.at(-1).id,
  lastSyncedAtByCompany: {},
  syncLogs: [],
  stockChartSymbol: companies.toyota.stockSymbol,
  renderedStockChartSymbol: null,
  stockPrices: [],
};

const elements = {
  quarterSelect: document.querySelector("#quarter-select"),
  periodCaption: document.querySelector("#period-caption"),
  latestUpdate: document.querySelector("#latest-update"),
  syncButton: document.querySelector("#sync-button"),
  syncButtonLabel: document.querySelector("#sync-button-label"),
  metricCostCaption: document.querySelector("#metric-cost-caption"),
  metricProfitTitle: document.querySelector("#metric-profit-title"),
  metricProfitCaption: document.querySelector("#metric-profit-caption"),
  profitChartLabel: document.querySelector("#profit-chart-label"),
  marginChartTitle: document.querySelector("#margin-chart-title"),
  documentsBody: document.querySelector("#documents-body"),
  xbrlFactsBody: document.querySelector("#xbrl-facts-body"),
  toast: document.querySelector("#toast"),
  marginValue: document.querySelector("#margin-value"),
  marginChange: document.querySelector("#margin-change"),
  companyName: document.querySelector("#company-name"),
  sourceName: document.querySelector("#source-name"),
  irLink: document.querySelector("#ir-link"),
  companyButtons: document.querySelectorAll(".company-button"),
  flowPeriod: document.querySelector("#flow-period"),
  quarterlyScopePeriod: document.querySelector("#quarterly-scope-period"),
  annualScopePeriod: document.querySelector("#annual-scope-period"),
  previousCashAndCashEquivalents: document.querySelector("#previous-cash-and-cash-equivalents"),
  annualRevenue: document.querySelector("#annual-revenue"),
  annualOperatingCost: document.querySelector("#annual-operating-cost"),
  investmentCashFlow: document.querySelector("#investment-cash-flow"),
  financingCashFlow: document.querySelector("#financing-cash-flow"),
  otherCashFlowAdjustment: document.querySelector("#other-cash-flow-adjustment"),
  cashAndCashEquivalents: document.querySelector("#cash-and-cash-equivalents"),
  syncLogList: document.querySelector("#sync-log-list"),
  logClearButton: document.querySelector("#log-clear-button"),
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

function quarterLabel(result) {
  return `${result.fiscalYear}年${result.quarter}Q`;
}

function chartQuarterLabel(result) {
  return `${String(result.fiscalYear)}年${result.quarter}Q`;
}

function activeResult() {
  return state.results.find((item) => item.id === state.activeId) ?? state.results.at(-1);
}

function previousResult(result) {
  if (!result) return null;
  const currentIndex = state.results.findIndex((item) => item.id === result.id);
  return currentIndex > 0 ? state.results[currentIndex - 1] : null;
}

function renderPicker() {
  elements.quarterSelect.innerHTML = state.results
    .map(
      (result) =>
        `<option value="${result.id}">${quarterLabel(result)} — ${formatDate(result.periodEnd)}</option>`,
    )
    .join("");
  elements.quarterSelect.value = state.activeId;
  elements.quarterSelect.disabled = !state.results.length;
}

function profitValue(result) {
  return state.companyCode === "softbank-group" ? result.pretaxIncome : result.operatingIncome;
}

function renderMetrics() {
  const current = activeResult();
  const usesPretaxIncome = state.companyCode === "softbank-group";
  elements.metricCostCaption.textContent = usesPretaxIncome ? "連結サマリーでは非開示" : "営業収益 − 営業利益";
  elements.metricProfitTitle.textContent = usesPretaxIncome ? "Profit Before Tax" : "Operating Income";
  elements.metricProfitCaption.textContent = usesPretaxIncome ? "税引前利益" : "営業利益";
  elements.profitChartLabel.textContent = usesPretaxIncome ? "Profit Before Tax" : "Operating Income";
  elements.marginChartTitle.textContent = usesPretaxIncome ? "Pretax Margin" : "Operating Margin";
  if (!current) {
    elements.periodCaption.textContent = "決算データ未登録";
    elements.quarterlyScopePeriod.textContent = "未選択";
    metricIds.forEach((metric) => {
      document.querySelector(`#metric-${metric}`).textContent = "—";
      document.querySelector(`#change-${metric}`).textContent = "PENDING";
    });
    elements.marginValue.textContent = "—";
    elements.marginChange.textContent = "公式IR取込待ち";
    elements.marginChange.style.color = "var(--muted)";
    return;
  }
  const previous = previousResult(current);
  elements.periodCaption.textContent = `発行年月日 ${formatDate(current.periodEnd)}`;
  elements.quarterlyScopePeriod.textContent = `${quarterLabel(current)} を表示中`;

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
    changeElement.textContent = `${formatPercent(change)} QoQ`;
    changeElement.classList.toggle("negative", change < 0);
  });

  const profitKey = usesPretaxIncome ? "pretaxIncome" : "operatingIncome";
  const margin = (current[profitKey] / current.revenue) * 100;
  const previousMargin = previous ? (previous[profitKey] / previous.revenue) * 100 : margin;
  const pointChange = margin - previousMargin;
  elements.marginValue.textContent = `${margin.toFixed(1)}%`;
  elements.marginChange.textContent = `${pointChange >= 0 ? "+" : ""}${pointChange.toFixed(1)} pt QoQ`;
  elements.marginChange.style.color = pointChange >= 0 ? "var(--green)" : "var(--red)";
}

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

function renderXbrlFacts() {
  if (!elements.xbrlFactsBody) return;
  const facts = state.edinetFactsByCompany[state.companyCode];
  if (!facts) {
    elements.xbrlFactsBody.innerHTML = '<tr><td colspan="5">Loading saved EDINET XBRL data from DB.</td></tr>';
    return;
  }
  if (!facts.length) {
    elements.xbrlFactsBody.innerHTML = '<tr><td colspan="5">No saved EDINET XBRL data found in DB.</td></tr>';
    return;
  }
  elements.xbrlFactsBody.innerHTML = facts
    .map(
      (fact) => `
        <tr>
          <td>${fact.periodEnd ? formatDate(fact.periodEnd) : "-"}</td>
          <td>${escapeHtml(fact.label)}</td>
          <td>${escapeHtml(formatXbrlValue(fact))}</td>
          <td>${escapeHtml(fact.unitRef ?? "-")}</td>
          <td>${escapeHtml(fact.documentId)}</td>
        </tr>
      `,
    )
    .join("");
}

function formatXbrlValue(fact) {
  const value = Number(fact.value);
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("ja-JP");
}

function officialDocumentFiscalYear(document) {
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
  const value = `${document.title} ${document.url}`;
  const mufgMatch = value.match(/summary\d{2}(03|06|09|12)_ja\.pdf/i);
  if (mufgMatch) return { "03": "Q4", "06": "Q1", "09": "Q2", "12": "Q3" }[mufgMatch[1]];

  if (/_An\.pdf/i.test(value) || /_fy_01\.pdf/i.test(value)) return "Q4";

  const match = value.match(/q([1-4])/i)
    ?? value.match(/([1-4])q/i)
    ?? value.match(/第\s*([1-4])\s*四半期/);
  return match ? `Q${match[1]}` : "—";
}

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

function drawPerformanceChart() {
  const canvas = document.querySelector("#performance-chart");
  if (!state.results.length) {
    drawEmptyChart(canvas);
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 10, right: 22, bottom: 31, left: 9 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...state.results.map((item) => item.revenue)) * 1.12;
  const maxProfit = Math.max(...state.results.map(profitValue)) * 1.28;
  const gap = chartWidth / state.results.length;
  const barWidth = Math.min(47, gap * 0.38);
  const visibleLabelIndexes = labelIndexesForWidth(state.results.length, chartWidth, 64);

  ctx.clearRect(0, 0, width, height);
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
  state.results.forEach((result, index) => {
    const x = padding.left + gap * index + gap / 2;
    const barHeight = (result.revenue / maxRevenue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, padding.top + chartHeight);
    gradient.addColorStop(0, "rgba(214, 183, 122, .72)");
    gradient.addColorStop(1, "rgba(214, 183, 122, .16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    ctx.fillStyle = "#77756e";
    ctx.textAlign = "center";
    if (visibleLabelIndexes.has(index)) {
      const label = chartQuarterLabel(result);
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

  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#171914";
    ctx.fill();
    ctx.strokeStyle = "#82ba8e";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawMarginChart() {
  const canvas = document.querySelector("#margin-chart");
  if (!state.results.length) {
    drawEmptyChart(canvas);
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 12, right: 10, bottom: 29, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const margins = state.results.map((item) => (profitValue(item) / item.revenue) * 100);
  const max = Math.max(...margins) * 1.14;
  const visibleLabelIndexes = labelIndexesForWidth(margins.length, chartWidth, 66);
  const points = margins.map((margin, index) => ({
    x: padding.left + (chartWidth / (margins.length - 1)) * index,
    y: padding.top + chartHeight - (margin / max) * chartHeight,
  }));

  ctx.clearRect(0, 0, width, height);
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
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#171914";
    ctx.fill();
    ctx.strokeStyle = "#82ba8e";
    ctx.stroke();
    ctx.fillStyle = "#77756e";
    ctx.textAlign = "center";
    ctx.font = '600 9px "Manrope"';
    if (visibleLabelIndexes.has(index)) {
      const label = chartQuarterLabel(state.results[index]);
      ctx.fillText(label, clampedTextX(ctx, label, point.x, padding.left, width - padding.right), height - 7);
    }
  });
}

function drawWaterfallChart() {
  const canvas = document.querySelector("#waterfall-chart");
  const analysis = annualAnalyses[state.companyCode];
  if (!analysis) {
    drawEmptyChart(canvas, "年次キャッシュフロー未登録");
    return;
  }
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const previousCash = analysis.previousCashAndCashEquivalents;
  const currentCash = analysis.cashAndCashEquivalents;
  const flowBars = [
    { label: "売上収益", value: analysis.currentRevenue },
    { label: "原価・人件費\nなど", value: -analysis.currentOperatingCost },
    { label: "投資活動", value: analysis.investingCashFlow },
    { label: "財務活動", value: analysis.financingCashFlow },
  ].filter((bar) => bar.value !== null);
  const canReconcile = previousCash !== null && currentCash !== null;
  let runningTotal = canReconcile ? previousCash : 0;
  const bars = canReconcile
    ? [{ label: "前期末\n現金", value: previousCash, start: 0, end: previousCash, total: true }]
    : [];

  flowBars.forEach((bar) => {
    const start = runningTotal;
    runningTotal += bar.value;
    bars.push({ ...bar, start, end: runningTotal });
  });

  if (canReconcile) {
    const adjustment = calculateProfitCashAdjustment(analysis);
    if (adjustment !== 0) {
      bars.push({ label: "その他\n調整", value: adjustment, start: runningTotal, end: currentCash });
    }
    bars.push({
      label: "今期末\n現金",
      value: currentCash,
      start: currentCash,
      end: currentCash,
      total: true,
    });
  }

  const padding = { top: 36, right: 12, bottom: 47, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const gap = chartWidth / bars.length;
  const barWidth = Math.min(76, gap * 0.54);
  const compactLabels = chartWidth < 360;
  const availableValues = bars.flatMap((bar) => [bar.start, bar.end]);
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

  if (!canReconcile) {
    ctx.fillStyle = "#9b998f";
    ctx.font = '600 12px "Noto Sans JP"';
    ctx.textAlign = "center";
    ctx.fillText("期首・期末現金残高の開示がないため、増減のみを表示しています。", width / 2, padding.top + 18);
  }

  bars.forEach((bar, index) => {
    const x = padding.left + gap * index + gap / 2;
    const startY = scaleY(bar.start);
    const endY = scaleY(bar.end);
    const top = bar.total ? endY : Math.min(startY, endY);
    const bottom = bar.total ? zeroY : Math.max(startY, endY);

    if (index > 0) {
      const previousBar = bars[index - 1];
      const previousX = padding.left + gap * (index - 1) + gap / 2;
      ctx.beginPath();
      ctx.moveTo(previousX + barWidth / 2, scaleY(previousBar.end));
      ctx.lineTo(x - barWidth / 2, scaleY(bar.start));
      ctx.strokeStyle = "rgba(224, 205, 165, .38)";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = bar.total ? "rgba(214, 183, 122, .68)" : bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.fillRect(x - barWidth / 2, Math.min(top, bottom), barWidth, Math.max(3, Math.abs(bottom - top)));

    ctx.fillStyle = bar.total ? "#d6b77a" : bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.font = compactLabels ? '700 9px "Manrope"' : '700 10px "Manrope"';
    ctx.textAlign = "center";
    const valueLabel = `${bar.value >= 0 && !bar.total ? "+" : ""}${formatCompactYen(bar.value)}`;
    const labelOffset = compactLabels && index % 2 ? 25 : 14;
    const preferredY = endY + (bar.value < 0 && !bar.total ? labelOffset : -labelOffset);
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

function calculateProfitCashAdjustment(analysis) {
  if (analysis.previousCashAndCashEquivalents === null || analysis.cashAndCashEquivalents === null) return null;
  const disclosedChanges = [
    analysis.currentRevenue,
    -analysis.currentOperatingCost,
    analysis.investingCashFlow,
    analysis.financingCashFlow,
  ]
    .filter((value) => value !== null)
    .reduce((total, value) => total + value, 0);
  return analysis.cashAndCashEquivalents - analysis.previousCashAndCashEquivalents - disclosedChanges;
}

function renderAnnualFlow() {
  const analysis = annualAnalyses[state.companyCode];
  if (!analysis) {
    elements.flowPeriod.textContent = "PENDING";
    elements.annualScopePeriod.textContent = "未登録";
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
  elements.flowPeriod.textContent = analysis.currentFiscalYear;
  elements.annualScopePeriod.textContent = `${analysis.currentFiscalYear} 通期`;
  elements.previousCashAndCashEquivalents.textContent = formatOptionalBillions(analysis.previousCashAndCashEquivalents);
  elements.annualRevenue.textContent = formatOptionalBillions(analysis.currentRevenue);
  elements.annualOperatingCost.textContent = formatOptionalBillions(-analysis.currentOperatingCost);
  elements.investmentCashFlow.textContent = formatOptionalBillions(analysis.investingCashFlow);
  elements.financingCashFlow.textContent = formatOptionalBillions(analysis.financingCashFlow);
  elements.otherCashFlowAdjustment.textContent = formatOptionalBillions(calculateProfitCashAdjustment(analysis));
  elements.cashAndCashEquivalents.textContent = formatOptionalBillions(analysis.cashAndCashEquivalents);
}

function renderCharts() {
  drawPerformanceChart();
  drawMarginChart();
  drawWaterfallChart();
}

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

async function renderStockChart() {
  const symbol = state.stockChartSymbol;
  if (state.renderedStockChartSymbol === symbol) return;
  state.renderedStockChartSymbol = symbol;
  elements.stockChartStatus.textContent = `${symbol} の週足を読み込んでいます。`;

  try {
    const payload = await fetchJson(`${window.APP_CONFIG.api.stocks}/${encodeURIComponent(symbol)}`);
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quotes = result?.indicators?.quote?.[0] ?? {};
    state.stockPrices = timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: quotes.open?.[index],
        high: quotes.high?.[index],
        low: quotes.low?.[index],
        close: quotes.close?.[index],
      }))
      .filter((item) => [item.open, item.high, item.low, item.close].every(Number.isFinite));
    if (!state.stockPrices.length) throw new Error("株価データがありません。");
    elements.stockChartStatus.textContent = `${symbol} / 週足ローソク / 過去2年`;
    drawStockChart();
  } catch (error) {
    const { context: ctx, width, height } = prepareCanvas(elements.stockChart);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#9b998f";
    ctx.font = '600 13px "Noto Sans JP"';
    ctx.textAlign = "center";
    ctx.fillText("株価データを取得できませんでした。Cloudflare Workers配信後に再度お試しください。", width / 2, height / 2);
    elements.stockChartStatus.textContent = error.message;
  }
}

function renderCompany() {
  const company = companies[state.companyCode];
  elements.companyName.textContent = company.name;
  elements.sourceName.textContent = company.sourceName;
  elements.irLink.href = company.sourcePage;
  elements.companyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.company === state.companyCode);
  });
  updateSyncButtonAvailability();
}

function render() {
  renderCompany();
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderXbrlFacts();
  renderAnnualFlow();
  renderCharts();
  renderStockChart();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3300);
}

function updateSyncButtonAvailability({ loading = false } = {}) {
  elements.syncButton.disabled = loading;
  elements.syncButton.title = "公式IR PDF一覧を更新し、本日提出されたEDINET書類をDBへ保存します。";
  elements.syncButtonLabel.textContent = "更新";
}

function addSyncLog(level, stage, message, companyCode = state.companyCode) {
  state.syncLogs.unshift({
    level,
    stage,
    message,
    companyCode,
    timestamp: new Date(),
  });
  state.syncLogs = state.syncLogs.slice(0, 30);
  renderSyncLogs();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSyncLogs() {
  if (!state.syncLogs.length) {
    elements.syncLogList.innerHTML = '<p class="sync-log-empty">まだ同期処理は実行されていません。</p>';
    return;
  }
  elements.syncLogList.innerHTML = state.syncLogs
    .map(
      (log) => `
        <article class="sync-log-entry ${log.level}">
          <span class="sync-log-status">${log.level === "error" ? "FAILED" : log.level === "info" ? "WAITING" : log.level === "unsupported" ? "UNSUPPORTED" : "SUCCESS"}</span>
          <span class="sync-log-time">${new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(log.timestamp)}</span>
          <strong>${escapeHtml(companies[log.companyCode]?.sourceName ?? log.companyCode)}</strong>
          <small>${escapeHtml(log.stage)}</small>
          <p>${escapeHtml(log.message)}</p>
        </article>
      `,
    )
    .join("");
}

function updateLatestUpdate(companyCode = state.companyCode) {
  const syncedAt = state.lastSyncedAtByCompany[companyCode];
  elements.latestUpdate.textContent = syncedAt
    ? `Last updated ${new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(syncedAt))}`
    : "Last updated —";
}

function apiHeaders(config) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: options.signal ?? controller.signal });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const detail = payload.error ?? payload.message;
      const detailText = detail ? `: ${detail}` : "";
      const stage = payload.stage ? ` [${payload.stage}]` : "";
      throw new Error(
        `データ取得に失敗しました (${response.status})${stage}${detailText} @ ${new URL(url, window.location.href).pathname}`,
      );
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`15秒以内に応答がありません @ ${new URL(url, window.location.href).pathname}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJsonWithSyncLog(url, options, { companyCode, stage, description }) {
  const startedAt = performance.now();
  addSyncLog("info", `${stage} 開始`, `${description}を問い合わせています。`, companyCode);
  try {
    const payload = await fetchJson(url, options);
    const elapsed = Math.round(performance.now() - startedAt);
    addSyncLog("success", `${stage} 完了`, `${description}を取得しました。${elapsed}ms`, companyCode);
    return payload;
  } catch (error) {
    const elapsed = Math.round(performance.now() - startedAt);
    addSyncLog("error", `${stage} 失敗`, `${description}で停止しました。${elapsed}ms: ${error.message}`, companyCode);
    throw error;
  }
}

async function loadCachedCompanyData(companyCode, config) {
  addSyncLog("success", "DB読込開始", "保存済みデータと前回取得日時を確認します。", companyCode);
  const baseUrl = `${config.supabaseUrl}/rest/v1`;
  const headers = apiHeaders(config);
  const [companiesData, resultsData, flowsData, documentsData, factsData] = await Promise.all([
    fetchJsonWithSyncLog(
      `${baseUrl}/earn_companies?code=eq.${companyCode}&select=last_synced_at`,
      { headers },
      { companyCode, stage: "企業マスタ読込", description: "前回同期日時" },
    ),
    fetchJsonWithSyncLog(
      `${baseUrl}/earn_quarterly_results?company_code=eq.${companyCode}&select=*&order=period_end.asc`,
      { headers },
      { companyCode, stage: "四半期データ読込", description: "保存済み四半期データ" },
    ),
    fetchJsonWithSyncLog(
      `${baseUrl}/earn_annual_profit_flows?company_code=eq.${companyCode}&select=*&order=synced_at.desc&limit=1`,
      { headers },
      { companyCode, stage: "年次CF読込", description: "保存済み年次キャッシュフロー" },
    ),
    fetchJsonWithSyncLog(
      `${baseUrl}/earn_edinet_documents?company_code=eq.${companyCode}&select=*&order=submitted_at.desc`,
      { headers },
      { companyCode, stage: "EDINET書類読込", description: "保存済みEDINET書類" },
    ),
    fetchJsonWithSyncLog(
      `${baseUrl}/earn_edinet_facts?company_code=eq.${companyCode}&select=*&order=period_end.desc,display_order.asc&limit=80`,
      { headers },
      { companyCode, stage: "EDINET XBRL", description: "saved EDINET XBRL facts" },
    ),
  ]);

  state.lastSyncedAtByCompany[companyCode] = companiesData[0]?.last_synced_at ?? null;
  if (resultsData.length) state.resultsByCompany[companyCode] = resultsData.map(normalizeResult);
  if (flowsData.length) annualAnalyses[companyCode] = normalizeAnnualFlow({
    ...annualAnalyses[companyCode],
    ...flowsData[0],
  });
  state.edinetDocumentsByCompany[companyCode] = documentsData.map(normalizeEdinetDocument);
  state.edinetFactsByCompany[companyCode] = factsData.map(normalizeEdinetFact);
  addSyncLog(
    "success",
    "DB読込完了",
    `${resultsData.length}件の四半期データを読み込みました。`,
    companyCode,
  );
  if (resultsData.length) {
    addSyncLog("success", "データ種別", `DB保存済み: ${registeredDataDescription}`, companyCode);
  }
  return state.lastSyncedAtByCompany[companyCode];
}

async function loadOfficialIrDocuments(companyCode) {
  addSyncLog("info", "公式IR資料取得 開始", "企業サイトからPDFリンクを確認します。", companyCode);
  try {
    const payload = await fetchJson(`${window.APP_CONFIG.api.officialIr}/${encodeURIComponent(companyCode)}`);
    state.officialIrDocumentsByCompany[companyCode] = payload.documents ?? [];
    addSyncLog("success", "公式IR資料取得 完了", `${payload.documents?.length ?? 0}件のPDFリンクを読み込みました。`, companyCode);
    return payload;
  } catch (error) {
    state.officialIrDocumentsByCompany[companyCode] = [];
    addSyncLog("error", "公式IR資料取得 失敗", error.message, companyCode);
    return { documents: [] };
  }
}

async function syncTodayEdinetDocuments(companyCode, config) {
  const configuredHistoryDays = Number(config.edinet?.historyDays);
  const configuredBatchDays = Number(config.edinet?.batchDays);
  const historyDays = Number.isInteger(configuredHistoryDays) && configuredHistoryDays > 0
    ? Math.min(configuredHistoryDays, 400)
    : 400;
  const batchDays = Number.isInteger(configuredBatchDays) && configuredBatchDays > 0
    ? Math.min(configuredBatchDays, 31)
    : 31;
  const batches = Math.ceil(historyDays / batchDays);
  let saved = 0;
  addSyncLog("info", "EDINET同期 開始", `金融庁EDINET APIから過去${historyDays}日分の対象企業の書類を取得し、DBへ保存します。`, companyCode);
  try {
    for (let index = 0; index < batches; index += 1) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - index * batchDays);
      const days = Math.min(batchDays, historyDays - index * batchDays);
      const endDate = date.toISOString().slice(0, 10);
      const payload = await fetchJson(`${window.APP_CONFIG.api.edinetSync}?date=${endDate}&days=${days}`, { method: "POST" });
      if (payload.edinetError) {
        addSyncLog("error", "EDINET同期 失敗", payload.edinetError, companyCode);
        return { ...payload, saved, edinetSyncFailed: true };
      }
      if (!payload.persisted && payload.documents?.length) {
        await fetchJson(`${config.supabaseUrl}/rest/v1/earn_edinet_documents?on_conflict=id`, {
          method: "POST",
          headers: {
            ...apiHeaders(config),
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(payload.documents),
        });
      }
      if (!payload.factsPersisted && payload.facts?.length) {
        await fetchJson(`${config.supabaseUrl}/rest/v1/earn_edinet_facts?on_conflict=id`, {
          method: "POST",
          headers: {
            ...apiHeaders(config),
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(payload.facts),
        });
      }
      if (payload.persistenceError) {
        addSyncLog("error", "Worker保存 失敗", payload.persistenceError, companyCode);
      }
      saved += payload.facts?.length ?? payload.documents?.length ?? 0;
    }
    addSyncLog("success", "EDINET同期 完了", `${saved}件のXBRLデータをDBへ保存しました。`, companyCode);
    await loadCachedCompanyData(companyCode, config);
    return { saved };
  } catch (error) {
    addSyncLog("error", "EDINET同期 失敗", error.message, companyCode);
    return { saved: 0, edinetSyncFailed: true };
  }
}

async function refreshCompany({ force = false, notify = false } = {}) {
  const config = window.APP_CONFIG ?? {};
  const companyCode = state.companyCode;
  elements.syncButton.classList.add("loading");
  updateSyncButtonAvailability({ loading: true });

  try {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      const payload = await loadOfficialIrDocuments(companyCode);
      if (state.companyCode === companyCode) render();
      if (notify) showToast(`${payload.documents?.length ?? 0}件の公式IR PDFを取得しました。`);
      return;
    }

    if (force) {
      await loadCachedCompanyData(companyCode, config);
    } else {
      await Promise.all([
        loadCachedCompanyData(companyCode, config),
        loadOfficialIrDocuments(companyCode),
      ]);
    }
    const payload = force ? await syncTodayEdinetDocuments(companyCode, config) : null;

    if (state.companyCode === companyCode) {
      state.results = state.resultsByCompany[companyCode];
      state.activeId = state.results.at(-1)?.id ?? null;
      updateLatestUpdate(companyCode);
      render();
    }
    if (notify || payload) {
      showToast(
        payload?.edinetSyncFailed
          ? "公式IR PDF一覧を更新しました。EDINET同期の詳細はSync Logを確認してください。"
          : payload
          ? `${payload.saved}件のEDINET書類を保存しました。`
          : "保存済みの最新データを表示しています。",
      );
    }
  } catch (error) {
    addSyncLog("error", "同期失敗", error.message, companyCode);
    showToast(error.message);
  } finally {
    elements.syncButton.classList.remove("loading");
    updateSyncButtonAvailability();
  }
}

function normalizeResult(item) {
  return {
    id: item.id,
    companyCode: item.company_code ?? item.companyCode,
    fiscalYear: item.fiscal_year ?? item.fiscalYear,
    quarter: item.quarter,
    periodEnd: item.period_end ?? item.periodEnd,
    revenue: item.revenue,
    operatingCost: item.operating_cost ?? item.operatingCost ?? null,
    operatingIncome: item.operating_income ?? item.operatingIncome ?? null,
    pretaxIncome: item.pretax_income ?? item.pretaxIncome ?? null,
    netIncome: item.net_income ?? item.netIncome,
    sourceUrl: item.source_url ?? item.sourceUrl,
  };
}

function normalizeEdinetDocument(item) {
  return {
    id: item.id,
    companyCode: item.company_code ?? item.companyCode,
    edinetCode: item.edinet_code ?? item.edinetCode,
    filerName: item.filer_name ?? item.filerName,
    docTypeCode: item.doc_type_code ?? item.docTypeCode,
    description: item.description,
    periodStart: item.period_start ?? item.periodStart,
    periodEnd: item.period_end ?? item.periodEnd,
    submittedAt: item.submitted_at ?? item.submittedAt,
  };
}

function normalizeEdinetFact(item) {
  return {
    id: item.id,
    documentId: item.document_id ?? item.documentId,
    companyCode: item.company_code ?? item.companyCode,
    concept: item.concept,
    label: item.label,
    value: item.value,
    unitRef: item.unit_ref ?? item.unitRef,
    decimals: item.decimals,
    contextRef: item.context_ref ?? item.contextRef,
    periodStart: item.period_start ?? item.periodStart,
    periodEnd: item.period_end ?? item.periodEnd,
    submittedAt: item.submitted_at ?? item.submittedAt,
    displayOrder: item.display_order ?? item.displayOrder,
  };
}

function normalizeAnnualFlow(item) {
  return {
    previousFiscalYear: item.previous_fiscal_year ?? item.previousFiscalYear,
    currentFiscalYear: item.current_fiscal_year ?? item.currentFiscalYear,
    previousRevenue: item.previous_revenue ?? item.previousRevenue,
    currentRevenue: item.current_revenue ?? item.currentRevenue,
    previousOperatingCost: item.previous_operating_cost ?? item.previousOperatingCost,
    currentOperatingCost: item.current_operating_cost ?? item.currentOperatingCost,
    previousOperatingIncome: item.previous_operating_income ?? item.previousOperatingIncome,
    currentOperatingIncome: item.current_operating_income ?? item.currentOperatingIncome,
    operatingCashFlow: item.operating_cash_flow ?? item.operatingCashFlow,
    investingCashFlow: item.investing_cash_flow ?? item.investingCashFlow,
    financingCashFlow: item.financing_cash_flow ?? item.financingCashFlow ?? null,
    previousCashAndCashEquivalents:
      item.previous_cash_and_cash_equivalents ?? item.previousCashAndCashEquivalents ?? null,
    cashAndCashEquivalents: item.cash_and_cash_equivalents ?? item.cashAndCashEquivalents ?? null,
    expenses: item.expense_breakdown ?? item.expenses,
  };
}

elements.quarterSelect.addEventListener("change", (event) => {
  state.activeId = event.target.value;
  renderMetrics();
  renderDocuments();
});
elements.companyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    state.companyCode = button.dataset.company;
    state.stockChartSymbol = companies[state.companyCode].stockSymbol;
    state.results = state.resultsByCompany[state.companyCode];
    state.activeId = state.results.at(-1)?.id ?? null;
    updateLatestUpdate();
    render();
    await refreshCompany();
  });
});
elements.syncButton.addEventListener("click", () => refreshCompany({ force: true, notify: true }));
elements.logClearButton.addEventListener("click", () => {
  state.syncLogs = [];
  renderSyncLogs();
});
window.addEventListener("resize", () => {
  renderCharts();
  if (state.stockPrices.length) drawStockChart();
});

updateLatestUpdate();
render();
refreshCompany();
