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
};

// Official PDFs publish cumulative values. Each entry below is normalized to a standalone quarter.
const fallbackResults = {
  toyota: [
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
};

const state = {
  companyCode: "toyota",
  resultsByCompany: { ...fallbackResults },
  results: fallbackResults.toyota,
  activeId: fallbackResults.toyota.at(-1).id,
  lastSyncedAtByCompany: {},
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
    ctx.fillText(`Q${result.quarter}`, x, height - 7);

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
    ctx.fillText(`Q${state.results[index].quarter}`, point.x, height - 7);
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
  if (!response.ok) throw new Error(`データ取得に失敗しました (${response.status})`);
  return response.json();
}

async function loadCachedCompanyData(companyCode, config) {
  const baseUrl = `${config.supabaseUrl}/rest/v1`;
  const headers = apiHeaders(config);
  const [companiesData, resultsData, flowsData] = await Promise.all([
    fetchJson(`${baseUrl}/companies?code=eq.${companyCode}&select=last_synced_at`, { headers }),
    fetchJson(`${baseUrl}/quarterly_results?company_code=eq.${companyCode}&select=*&order=period_end.asc`, {
      headers,
    }),
    fetchJson(
      `${baseUrl}/annual_profit_flows?company_code=eq.${companyCode}&select=*&order=synced_at.desc&limit=1`,
      { headers },
    ),
  ]);

  state.lastSyncedAtByCompany[companyCode] = companiesData[0]?.last_synced_at ?? null;
  if (resultsData.length) state.resultsByCompany[companyCode] = resultsData.map(normalizeResult);
  if (flowsData.length) annualAnalyses[companyCode] = normalizeAnnualFlow(flowsData[0]);
  return state.lastSyncedAtByCompany[companyCode];
}

async function invokeSync(companyCode, config) {
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
  return payload;
}

async function refreshCompany({ force = false, notify = false } = {}) {
  const config = window.APP_CONFIG ?? {};
  const companyCode = state.companyCode;
  elements.syncButton.disabled = true;
  elements.syncButton.classList.add("loading");

  try {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      if (notify) showToast("デモモード: 保存済みのサンプルを表示しています。");
      return;
    }

    const lastSyncedAt = await loadCachedCompanyData(companyCode, config);
    let payload = null;
    if (force || isOlderThanThreeMonths(lastSyncedAt)) {
      payload = await invokeSync(companyCode, config);
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
window.addEventListener("resize", renderCharts);

updateLatestUpdate();
render();
refreshCompany();
