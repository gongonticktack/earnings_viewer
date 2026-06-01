const companies = {
  toyota: {
    code: "toyota",
    name: "TOYOTA MOTOR CORPORATION",
    sourceName: "TOYOTA IR",
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
  },
  ntt: {
    code: "ntt",
    name: "NTT, INC.",
    sourceName: "NTT IR",
    sourcePage: "https://group.ntt/jp/ir/library/presentation/financial/",
  },
  toshiba: {
    code: "toshiba",
    name: "TOSHIBA CORPORATION",
    sourceName: "TOSHIBA IR",
    sourcePage: "https://www.global.toshiba/jp/ir/corporate/finance.html",
  },
  softbank: {
    code: "softbank",
    name: "SOFTBANK CORP.",
    sourceName: "SOFTBANK IR",
    sourcePage: "https://www.softbank.jp/corp/ir/documents/financial_reports/",
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
  toshiba: [
    {
      id: "toshiba-fy2024-q1", fiscalYear: 2024, quarter: 1, periodEnd: "2024-06-30",
      revenue: 749100, operatingCost: 734800, operatingIncome: 14300, netIncome: 38300,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2024q1.pdf",
    },
    {
      id: "toshiba-fy2024-q2", fiscalYear: 2024, quarter: 2, periodEnd: "2024-09-30",
      revenue: 872800, operatingCost: 816600, operatingIncome: 56200, netIncome: 78000,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2024q2.pdf",
    },
    {
      id: "toshiba-fy2024-q3", fiscalYear: 2024, quarter: 3, periodEnd: "2024-12-31",
      revenue: 855100, operatingCost: 811300, operatingIncome: 43800, netIncome: 68500,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2024q3.pdf",
    },
    {
      id: "toshiba-fy2024-q4", fiscalYear: 2024, quarter: 4, periodEnd: "2025-03-31",
      revenue: 1036900, operatingCost: 952700, operatingIncome: 84200, netIncome: 94200,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2024q4.pdf",
    },
    {
      id: "toshiba-fy2025-q1", fiscalYear: 2025, quarter: 1, periodEnd: "2025-06-30",
      revenue: 737900, operatingCost: 697800, operatingIncome: 40100, netIncome: 146900,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2025q1.pdf",
    },
    {
      id: "toshiba-fy2025-q2", fiscalYear: 2025, quarter: 2, periodEnd: "2025-09-30",
      revenue: 875900, operatingCost: 800600, operatingIncome: 75300, netIncome: 169100,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2025q2.pdf",
    },
    {
      id: "toshiba-fy2025-q3", fiscalYear: 2025, quarter: 3, periodEnd: "2025-12-31",
      revenue: 908200, operatingCost: 808900, operatingIncome: 99300, netIncome: 183200,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2025q3.pdf",
    },
    {
      id: "toshiba-fy2025-q4", fiscalYear: 2025, quarter: 4, periodEnd: "2026-03-31",
      revenue: 1187100, operatingCost: 1101000, operatingIncome: 86100, netIncome: 1468100,
      sourceUrl: "https://www.global.toshiba/content/dam/toshiba/jp/ir/corporate/finance/pdf/tpr2025q4.pdf",
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
};

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
    investingCashFlow: -1520307,
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
    investingCashFlow: -1023424,
    expenses: [
      { label: "人件費", value: 3214887 },
      { label: "経費", value: 7207918 },
      { label: "減価償却費", value: 1790983 },
      { label: "固定資産除却費", value: 119782 },
      { label: "減損損失", value: 80189 },
      { label: "租税公課", value: 289141 },
    ],
  },
  toshiba: {
    previousFiscalYear: "FY2024",
    currentFiscalYear: "FY2025",
    previousOperatingIncome: 198500,
    currentOperatingIncome: 300800,
    previousRevenue: 3513900,
    currentRevenue: 3709100,
    previousOperatingCost: 3315400,
    currentOperatingCost: 3408300,
    investingCashFlow: 736400,
    expenses: [{ label: "営業費用合計", value: 3408300 }],
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
    investingCashFlow: -1270806,
    expenses: [{ label: "営業費用合計", value: 5996104 }],
  },
};

const state = {
  companyCode: "toyota",
  resultsByCompany: { ...fallbackResults },
  results: fallbackResults.toyota,
  activeId: fallbackResults.toyota.at(-1).id,
  lastSyncedAtByCompany: {},
  syncLogs: [],
};

const elements = {
  quarterSelect: document.querySelector("#quarter-select"),
  periodCaption: document.querySelector("#period-caption"),
  latestUpdate: document.querySelector("#latest-update"),
  syncButton: document.querySelector("#sync-button"),
  documentsBody: document.querySelector("#documents-body"),
  toast: document.querySelector("#toast"),
  marginValue: document.querySelector("#margin-value"),
  marginChange: document.querySelector("#margin-change"),
  companyName: document.querySelector("#company-name"),
  sourceName: document.querySelector("#source-name"),
  irLink: document.querySelector("#ir-link"),
  companyButtons: document.querySelectorAll(".company-button"),
  flowPeriod: document.querySelector("#flow-period"),
  investmentCashFlow: document.querySelector("#investment-cash-flow"),
  expenseList: document.querySelector("#expense-list"),
  syncLogList: document.querySelector("#sync-log-list"),
  logClearButton: document.querySelector("#log-clear-button"),
};

const metricIds = ["revenue", "cost", "operating", "net"];
const metricKey = {
  revenue: "revenue",
  cost: "operatingCost",
  operating: "operatingIncome",
  net: "netIncome",
};

function formatBillions(value) {
  const sign = value < 0 ? "-" : "";
  return `${sign}¥${(Math.abs(value) / 1000).toLocaleString("ja-JP", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}B`;
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
  return `FY${result.fiscalYear} Q${result.quarter}`;
}

function chartQuarterLabel(result) {
  return `FY${String(result.fiscalYear).slice(-2)} Q${result.quarter}`;
}

function activeResult() {
  return state.results.find((item) => item.id === state.activeId) ?? state.results.at(-1);
}

function previousResult(result) {
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
}

function renderMetrics() {
  const current = activeResult();
  const previous = previousResult(current);
  elements.periodCaption.textContent = `決算期間終了日 ${formatDate(current.periodEnd)}`;

  metricIds.forEach((metric) => {
    const key = metricKey[metric];
    const valueElement = document.querySelector(`#metric-${metric}`);
    const changeElement = document.querySelector(`#change-${metric}`);
    valueElement.textContent = formatBillions(current[key]);

    if (!previous) {
      changeElement.textContent = "BASE";
      changeElement.classList.remove("negative");
      return;
    }

    const change = ((current[key] - previous[key]) / previous[key]) * 100;
    changeElement.textContent = `${formatPercent(change)} QoQ`;
    changeElement.classList.toggle("negative", change < 0);
  });

  const margin = (current.operatingIncome / current.revenue) * 100;
  const previousMargin = previous ? (previous.operatingIncome / previous.revenue) * 100 : margin;
  const pointChange = margin - previousMargin;
  elements.marginValue.textContent = `${margin.toFixed(1)}%`;
  elements.marginChange.textContent = `${pointChange >= 0 ? "+" : ""}${pointChange.toFixed(1)} pt QoQ`;
  elements.marginChange.style.color = pointChange >= 0 ? "var(--green)" : "var(--red)";
}

function renderDocuments() {
  elements.documentsBody.innerHTML = [...state.results]
    .reverse()
    .map(
      (result) => `
        <tr class="${result.id === state.activeId ? "selected" : ""}">
          <td>${formatDate(result.periodEnd)}</td>
          <td>${quarterLabel(result)}</td>
          <td>${formatMillions(result.revenue)}</td>
          <td>${formatMillions(result.operatingIncome)}</td>
          <td>${formatMillions(result.netIncome)}</td>
          <td><a class="pdf-link" href="${result.sourceUrl}" target="_blank" rel="noreferrer">PDF ↗</a></td>
        </tr>
      `,
    )
    .join("");
}

function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  return { context, width: rect.width, height: rect.height };
}

function drawPerformanceChart() {
  const canvas = document.querySelector("#performance-chart");
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 10, right: 22, bottom: 31, left: 9 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...state.results.map((item) => item.revenue)) * 1.12;
  const maxProfit = Math.max(...state.results.map((item) => item.operatingIncome)) * 1.28;
  const gap = chartWidth / state.results.length;
  const barWidth = Math.min(47, gap * 0.38);

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
    ctx.fillText(chartQuarterLabel(result), x, height - 7);

    const profitY = padding.top + chartHeight - (result.operatingIncome / maxProfit) * chartHeight;
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
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 12, right: 10, bottom: 29, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const margins = state.results.map((item) => (item.operatingIncome / item.revenue) * 100);
  const max = Math.max(...margins) * 1.14;
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
    ctx.fillText(chartQuarterLabel(state.results[index]), point.x, height - 7);
  });
}

function drawWaterfallChart() {
  const canvas = document.querySelector("#waterfall-chart");
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const analysis = annualAnalyses[state.companyCode];
  const revenueChange = analysis.currentRevenue - analysis.previousRevenue;
  const costChange = analysis.currentOperatingCost - analysis.previousOperatingCost;
  const bars = [
    { label: `${analysis.previousFiscalYear}\n営業利益`, value: analysis.previousOperatingIncome, total: true },
    { label: "営業収益\n増減", value: revenueChange },
    { label: "営業費用\n増減", value: -costChange },
    { label: `${analysis.currentFiscalYear}\n営業利益`, value: analysis.currentOperatingIncome, total: true },
  ];
  const padding = { top: 36, right: 12, bottom: 47, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const gap = chartWidth / bars.length;
  const barWidth = Math.min(76, gap * 0.54);
  const max = Math.max(
    analysis.previousOperatingIncome,
    analysis.currentOperatingIncome,
    analysis.previousOperatingIncome + Math.max(revenueChange, 0),
  ) * 1.13;
  const scaleY = (value) => padding.top + chartHeight - (value / max) * chartHeight;
  let running = analysis.previousOperatingIncome;

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

  bars.forEach((bar, index) => {
    const x = padding.left + gap * index + gap / 2;
    let start = 0;
    let end = bar.value;
    if (!bar.total) {
      start = running;
      end = running + bar.value;
      running = end;
    }
    const top = scaleY(Math.max(start, end));
    const bottom = scaleY(Math.min(start, end));
    ctx.fillStyle = bar.total ? "rgba(214, 183, 122, .68)" : bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.fillRect(x - barWidth / 2, top, barWidth, Math.max(3, bottom - top));

    if (index < bars.length - 1) {
      const connectorY = scaleY(bar.total ? bar.value : end);
      ctx.beginPath();
      ctx.moveTo(x + barWidth / 2, connectorY);
      ctx.lineTo(x + gap - barWidth / 2, connectorY);
      ctx.strokeStyle = "rgba(224, 205, 165, .28)";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const displayedValue = bar.total ? bar.value : bar.value;
    ctx.fillStyle = bar.total ? "#d6b77a" : bar.value >= 0 ? "#82ba8e" : "#d8867f";
    ctx.font = '700 10px "Manrope"';
    ctx.textAlign = "center";
    ctx.fillText(`${displayedValue >= 0 && !bar.total ? "+" : ""}${formatBillions(displayedValue)}`, x, top - 10);

    ctx.fillStyle = "#9b998f";
    ctx.font = '600 9px "Noto Sans JP"';
    bar.label.split("\n").forEach((line, lineIndex) => {
      ctx.fillText(line, x, height - 23 + lineIndex * 12);
    });
  });
}

function renderAnnualFlow() {
  const analysis = annualAnalyses[state.companyCode];
  elements.flowPeriod.textContent = `${analysis.previousFiscalYear} → ${analysis.currentFiscalYear}`;
  elements.investmentCashFlow.textContent = formatBillions(analysis.investingCashFlow);
  elements.expenseList.innerHTML = analysis.expenses
    .map(
      (expense) => `
        <div class="expense-item">
          <span>${expense.label}</span>
          <strong>${formatBillions(expense.value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderCharts() {
  drawPerformanceChart();
  drawMarginChart();
  drawWaterfallChart();
}

function renderCompany() {
  const company = companies[state.companyCode];
  elements.companyName.textContent = company.name;
  elements.sourceName.textContent = company.sourceName;
  elements.irLink.href = company.sourcePage;
  elements.companyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.company === state.companyCode);
  });
}

function render() {
  renderCompany();
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderAnnualFlow();
  renderCharts();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3300);
}

function isOlderThanThreeMonths(dateString) {
  if (!dateString) return true;
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - 3);
  return new Date(dateString) < threshold;
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
          <span class="sync-log-status">${log.level === "error" ? "FAILED" : "SUCCESS"}</span>
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
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.error ? `: ${payload.error}` : "";
    const stage = payload.stage ? ` [${payload.stage}]` : "";
    throw new Error(`データ取得に失敗しました (${response.status})${stage}${detail} @ ${new URL(url).pathname}`);
  }
  return response.json();
}

async function loadCachedCompanyData(companyCode, config) {
  addSyncLog("success", "DB読込開始", "保存済みデータと前回取得日時を確認します。", companyCode);
  const baseUrl = `${config.supabaseUrl}/rest/v1`;
  const headers = apiHeaders(config);
  const [companiesData, resultsData, flowsData] = await Promise.all([
    fetchJson(`${baseUrl}/earn_companies?code=eq.${companyCode}&select=last_synced_at`, { headers }),
    fetchJson(`${baseUrl}/earn_quarterly_results?company_code=eq.${companyCode}&select=*&order=period_end.asc`, {
      headers,
    }),
    fetchJson(
      `${baseUrl}/earn_annual_profit_flows?company_code=eq.${companyCode}&select=*&order=synced_at.desc&limit=1`,
      { headers },
    ),
  ]);

  state.lastSyncedAtByCompany[companyCode] = companiesData[0]?.last_synced_at ?? null;
  if (resultsData.length) state.resultsByCompany[companyCode] = resultsData.map(normalizeResult);
  if (flowsData.length) annualAnalyses[companyCode] = normalizeAnnualFlow(flowsData[0]);
  addSyncLog(
    "success",
    "DB読込完了",
    `${resultsData.length}件の四半期データを読み込みました。`,
    companyCode,
  );
  return state.lastSyncedAtByCompany[companyCode];
}

async function invokeSync(companyCode, config) {
  addSyncLog("success", "公式IR取得開始", "公式IRページを確認し、DBを更新します。", companyCode);
  const payload = await fetchJson(`${config.supabaseUrl}/functions/v1/sync-earnings`, {
    method: "POST",
    headers: apiHeaders(config),
    body: JSON.stringify({ companyCode }),
  });
  if (Array.isArray(payload.results) && payload.results.length) {
    state.resultsByCompany[companyCode] = payload.results.map(normalizeResult);
  }
  if (payload.annualFlow) annualAnalyses[companyCode] = normalizeAnnualFlow(payload.annualFlow);
  state.lastSyncedAtByCompany[companyCode] = payload.lastSyncedAt ?? new Date().toISOString();
  (payload.logs ?? []).forEach((message) => addSyncLog("success", "Edge Function", message, companyCode));
  return payload;
}

async function refreshCompany({ force = false, notify = false } = {}) {
  const config = window.APP_CONFIG ?? {};
  const companyCode = state.companyCode;
  elements.syncButton.disabled = true;
  elements.syncButton.classList.add("loading");

  try {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      addSyncLog("success", "デモモード", "Supabase未接続のため、同梱サンプルを表示しました。", companyCode);
      if (notify) showToast("デモモード: 保存済みのサンプルを表示しています。");
      return;
    }

    const lastSyncedAt = await loadCachedCompanyData(companyCode, config);
    let payload = null;
    if (force || isOlderThanThreeMonths(lastSyncedAt)) {
      payload = await invokeSync(companyCode, config);
    } else {
      addSyncLog("success", "鮮度確認", "前回取得から3か月未満のため、DBのデータを使用します。", companyCode);
    }

    if (state.companyCode === companyCode) {
      state.results = state.resultsByCompany[companyCode];
      state.activeId = state.results.at(-1).id;
      updateLatestUpdate(companyCode);
      render();
    }
    if (notify || payload) {
      showToast(payload ? `${payload.synced}件の決算データを再取得しました。` : "保存済みの最新データを表示しています。");
    }
  } catch (error) {
    addSyncLog("error", "同期失敗", error.message, companyCode);
    showToast(error.message);
  } finally {
    elements.syncButton.disabled = false;
    elements.syncButton.classList.remove("loading");
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
    operatingCost: item.operating_cost ?? item.operatingCost,
    operatingIncome: item.operating_income ?? item.operatingIncome,
    netIncome: item.net_income ?? item.netIncome,
    sourceUrl: item.source_url ?? item.sourceUrl,
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
    investingCashFlow: item.investing_cash_flow ?? item.investingCashFlow,
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
    state.results = state.resultsByCompany[state.companyCode];
    state.activeId = state.results.at(-1).id;
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
window.addEventListener("resize", renderCharts);

updateLatestUpdate();
render();
refreshCompany();
