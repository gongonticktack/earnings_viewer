const SOURCE_PAGE = "https://global.toyota/jp/ir/financial-results/";

// Toyota FY2026 values from official summary PDFs. Each entry is a standalone quarter.
const fallbackResults = [
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
];

const state = {
  results: fallbackResults,
  activeId: fallbackResults.at(-1).id,
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
};

const metricIds = ["revenue", "cost", "operating", "net"];
const metricKey = {
  revenue: "revenue",
  cost: "operatingCost",
  operating: "operatingIncome",
  net: "netIncome",
};

function formatBillions(value) {
  return `¥${(value / 1000).toLocaleString("ja-JP", {
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

function renderCharts() {
  drawPerformanceChart();
  drawMarginChart();
}

function render() {
  renderPicker();
  renderMetrics();
  renderDocuments();
  renderCharts();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 3300);
}

async function syncResults() {
  const config = window.APP_CONFIG ?? {};
  elements.syncButton.disabled = true;
  elements.syncButton.classList.add("loading");

  try {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      showToast("デモモード: 公式IR資料から取得済みのサンプルを表示しています。");
      return;
    }

    const response = await fetch(`${config.supabaseUrl}/functions/v1/sync-toyota-results`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourcePage: SOURCE_PAGE }),
    });
    if (!response.ok) throw new Error(`同期に失敗しました (${response.status})`);

    const payload = await response.json();
    if (Array.isArray(payload.results) && payload.results.length) {
      state.results = payload.results.map(normalizeResult);
      state.activeId = state.results.at(-1).id;
      render();
    }
    showToast(`${payload.synced ?? state.results.length}件の決算データを同期しました。`);
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.latestUpdate.textContent = `Last updated ${new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date())}`;
    elements.syncButton.disabled = false;
    elements.syncButton.classList.remove("loading");
  }
}

function normalizeResult(item) {
  return {
    id: item.id,
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

elements.quarterSelect.addEventListener("change", (event) => {
  state.activeId = event.target.value;
  renderMetrics();
  renderDocuments();
});
elements.syncButton.addEventListener("click", syncResults);
window.addEventListener("resize", renderCharts);

elements.latestUpdate.textContent = `Last updated ${new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date())}`;
render();
