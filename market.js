/**
 * 概要: Yahoo Financeのチャート情報を最新株価に整形します。
 * 引数: payload - チャートAPIのJSON。
 * 戻り値: 株価・前日比・配信時刻のオブジェクト。
 */
export function normalizeQuote(payload) {
  const meta = payload?.chart?.result?.[0]?.meta;
  if (!Number.isFinite(meta?.regularMarketPrice) || meta.regularMarketPrice <= 0
      || !Number.isFinite(meta.regularMarketTime) || meta.currency !== "JPY") {
    throw new Error("有効な円建て株価がありません");
  }
  const previousClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = Number.isFinite(previousClose) && previousClose > 0
    ? meta.regularMarketPrice - previousClose : null;
  return {
    price: meta.regularMarketPrice, currency: meta.currency,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    change, changePercent: change === null ? null : change / previousClose * 100,
    marketTime: new Date(meta.regularMarketTime * 1000).toISOString(),
    source: "Yahoo Finance", delayNotice: "配信元による遅延あり",
  };
}

/**
 * 概要: 単独四半期と通期の円建て実績を別々に百万円単位へ変換します。累計・予想は取り込みません。
 * 引数: payload - 財務時系列APIのJSON。
 * 戻り値: 四半期・通期配列と年度末の基準日。
 */
export function normalizeFinancials(payload) {
  const series = payload?.timeseries?.result;
  if (!Array.isArray(series)) throw new Error("業績データの形式が正しくありません");
  const byDate = new Map();
  const annualByDate = new Map();
  const fields = { quarterlyTotalRevenue: "revenue", quarterlyOperatingIncome: "operatingIncome",
    quarterlyPretaxIncome: "pretaxIncome", quarterlyNetIncome: "netIncome" };
  const annualFields = { annualTotalRevenue: "revenue", annualOperatingIncome: "operatingIncome",
    annualPretaxIncome: "pretaxIncome", annualNetIncome: "netIncome" };
  let annualPeriodEnd = null;
  for (const item of series) {
    const type = item.meta?.type?.[0];
    for (const value of item[type] ?? []) {
      if (value.currencyCode !== "JPY" || !/^\d{4}-\d{2}-\d{2}$/.test(value.asOfDate ?? "")
          || !Number.isFinite(value.reportedValue?.raw)) continue;
      if (type === "annualTotalRevenue" && value.periodType === "12M") {
        if (!annualPeriodEnd || value.asOfDate > annualPeriodEnd) annualPeriodEnd = value.asOfDate;
      }
      if (annualFields[type] && value.periodType === "12M") {
        const row = annualByDate.get(value.asOfDate) ?? { periodEnd: value.asOfDate,
          operatingIncome: null, pretaxIncome: null };
        row[annualFields[type]] = value.reportedValue.raw / 1_000_000;
        annualByDate.set(value.asOfDate, row);
      }
      if (!fields[type] || value.periodType !== "3M") continue;
      const row = byDate.get(value.asOfDate) ?? { periodEnd: value.asOfDate,
        operatingIncome: null, pretaxIncome: null };
      row[fields[type]] = value.reportedValue.raw / 1_000_000;
      byDate.set(value.asOfDate, row);
    }
  }
  const results = [...byDate.values()].filter((row) => Number.isFinite(row.revenue)
    && row.revenue > 0 && Number.isFinite(row.netIncome)
    && (Number.isFinite(row.operatingIncome) || Number.isFinite(row.pretaxIncome)))
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const annualResults = [...annualByDate.values()].filter((row) => Number.isFinite(row.revenue)
    && row.revenue > 0 && Number.isFinite(row.netIncome))
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  if (!results.length && !annualResults.length) throw new Error("利用できる単独四半期・通期業績がありません");
  return { results, annualResults, annualPeriodEnd };
}

/**
 * 概要: 登録済み業績を優先し、新しい四半期だけ外部データで補います。
 * 引数: existing - 登録済み配列。payload - 外部業績。companyCode - 会社識別子。
 * 戻り値: 年度・四半期を割り当てた業績配列。基準期がない場合は登録済み配列。
 */
export function mergeFinancialResults(existing, payload, companyCode) {
  const anchor = existing.filter((row) => row.sourceName !== "Yahoo Finance")
    .toSorted((a, b) => a.periodEnd.localeCompare(b.periodEnd)).at(-1);
  const baseDate = anchor?.periodEnd ?? payload.annualPeriodEnd;
  if (!baseDate) return existing;
  const [year, month] = baseDate.split("-").map(Number);
  const baseQuarter = anchor?.quarter ?? 4;
  const baseYear = fiscalYearFromPeriod(baseDate, baseQuarter);
  const additions = payload.results.filter((row) => !anchor || row.periodEnd > anchor.periodEnd)
    .flatMap((row) => {
      const [rowYear, rowMonth] = row.periodEnd.split("-").map(Number);
      const months = (rowYear - year) * 12 + rowMonth - month;
      if (months % 3 !== 0 || (anchor && months <= 0)) return [];
      const offset = baseQuarter - 1 + months / 3;
      const quarter = ((offset % 4) + 4) % 4 + 1;
      const fiscalYear = baseYear + Math.floor(offset / 4);
      return [{ ...row, id: `${companyCode}-yahoo-${row.periodEnd}`, companyCode,
        fiscalYear, quarter, periodType: `Q${quarter}`, periodStart: null,
        operatingCost: row.operatingIncome === null ? null : row.revenue - row.operatingIncome,
        sourceName: "Yahoo Finance", sourceUrl: null, updatedAt: payload.updatedAt }];
    });
  return [...new Map([...existing, ...additions].map((row) => [row.periodEnd, row])).values()]
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

/**
 * 概要: 四半期末と期番号から会計年度の開始年を計算し、年度表記を揃えます。
 * 引数: periodEnd - 期間末日。quarter - 四半期番号。
 * 戻り値: 年度の開始年。
 */
export function fiscalYearFromPeriod(periodEnd, quarter) {
  const [year, month] = periodEnd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 - ((quarter - 1) * 3 + 2), 1)).getUTCFullYear();
}

/**
 * 概要: 開始年度と決算期末を併記して、年度末の年との混同を防ぎます。
 * 引数: result - 期間末日と四半期番号を持つ業績。
 * 戻り値: 「2026年度（2027年3月期）」形式の文字列。
 */
export function fiscalPeriodLabel(result) {
  const [year, month] = result.periodEnd.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1 + (4 - result.quarter) * 3, 1));
  return `${fiscalYearFromPeriod(result.periodEnd, result.quarter)}年度（${end.getUTCFullYear()}年${end.getUTCMonth() + 1}月期）`;
}
