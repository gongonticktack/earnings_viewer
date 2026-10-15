import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeQuote, normalizeFinancials, mergeFinancialResults, fiscalYearFromPeriod, fiscalPeriodLabel } from "./market.js";

test("最新株価の前日比は週足の終値ではなく当日前日終値から計算する", () => {
  const quote = normalizeQuote({ chart: { result: [{ meta: { regularMarketPrice: 102.5,
    previousClose: 100, regularMarketTime: 1791873000, currency: "JPY" } }] } });
  assert.equal(quote.change, 2.5);
  assert.equal(quote.changePercent, 2.5);
  assert.equal(quote.marketTime, "2026-10-13T06:30:00.000Z");
  assert.throws(() => normalizeQuote({}), /株価/);
});

test("四半期は百万円へ変換し、累計・外貨・欠損を採用しない", () => {
  const series = (type, raw, currencyCode = "JPY", periodType = "3M") => ({ meta: { type: [type] },
    [type]: [{ asOfDate: "2026-06-30", periodType, currencyCode, reportedValue: { raw } }] });
  const payload = { timeseries: { result: [series("quarterlyTotalRevenue", 1e9),
    series("quarterlyNetIncome", -1e8), series("quarterlyOperatingIncome", 2e8),
    series("annualTotalRevenue", 4e9, "JPY", "12M")] } };
  const data = normalizeFinancials(payload);
  assert.equal(data.results[0].revenue, 1000);
  assert.equal(data.results[0].netIncome, -100);
  assert.equal(data.annualPeriodEnd, "2026-06-30");
  payload.timeseries.result[0] = series("quarterlyTotalRevenue", 1e9, "USD");
  assert.throws(() => normalizeFinancials(payload), /単独四半期/);
  payload.timeseries.result[0] = series("quarterlyTotalRevenue", 1e9, "JPY", "6M");
  assert.throws(() => normalizeFinancials(payload), /単独四半期/);
});

test("公式業績を優先し、次年度の新しい期を補完する。外部値の修正も反映する", () => {
  const official = [{ id: "official", periodEnd: "2026-03-31", fiscalYear: 2025, quarter: 4, revenue: 100 }];
  const incoming = { updatedAt: "2026-10-13T00:00:00Z", results: [
    { periodEnd: "2026-03-31", revenue: 999, operatingIncome: 10 },
    { periodEnd: "2026-06-30", revenue: 110, operatingIncome: 20, netIncome: 15 },
  ] };
  const merged = mergeFinancialResults(official, incoming, "toyota");
  assert.equal(merged[0].revenue, 100);
  assert.equal(merged[1].fiscalYear, 2026);
  assert.equal(merged[1].quarter, 1);
  assert.equal(merged[1].operatingCost, 90);
  incoming.results[1].revenue = 120;
  const revised = mergeFinancialResults(merged, incoming, "toyota");
  assert.equal(revised.length, 2);
  assert.equal(revised[1].revenue, 120);
});

test("8月年度末と年をまたぐ四半期も正しく扱う", () => {
  const existing = [{ periodEnd: "2025-08-31", fiscalYear: 2025, quarter: 4 }];
  const data = { results: [{ periodEnd: "2026-02-28", operatingIncome: null, revenue: 10 }] };
  const row = mergeFinancialResults(existing, data, "fast-retailing")[1];
  assert.equal(row.fiscalYear, 2026);
  assert.equal(row.quarter, 2);
  assert.equal(row.operatingCost, null);
});

test("DB未登録企業は配信された通期末を基準にし、基準不明では年度を推測しない", () => {
  const data = { annualPeriodEnd: "2026-03-31", results: [{ periodEnd: "2025-06-30", operatingIncome: 1, revenue: 10 }] };
  assert.equal(mergeFinancialResults([], data, "test")[0].fiscalYear, 2025);
  assert.equal(mergeFinancialResults([], data, "test")[0].quarter, 1);
  assert.deepEqual(mergeFinancialResults([], { ...data, annualPeriodEnd: null }, "test"), []);
});

test("開始年度と年度末を統一し、2027年3月期第1四半期は2026年度になる", () => {
  assert.equal(fiscalYearFromPeriod("2026-06-30", 1), 2026);
  assert.equal(fiscalYearFromPeriod("2026-03-31", 4), 2025);
  assert.equal(fiscalYearFromPeriod("2026-08-31", 4), 2025);
  assert.equal(fiscalPeriodLabel({ periodEnd: "2026-06-30", quarter: 1 }), "2026年度（2027年3月期）");
});

test("四半期が配信されない企業でも通期実績を取得し、四半期へ流用しない", () => {
  const result = normalizeFinancials({ timeseries: { result: [
    ["annualTotalRevenue", 2e9], ["annualNetIncome", 1e8],
  ].map(([type, raw]) => ({ meta: { type: [type] }, [type]: [{ asOfDate: "2026-03-31",
    periodType: "12M", currencyCode: "JPY", reportedValue: { raw } }] })) } });
  assert.equal(result.results.length, 0);
  assert.equal(result.annualResults[0].revenue, 2000);
  assert.equal(result.annualResults[0].netIncome, 100);
  assert.deepEqual(mergeFinancialResults([], result, "test"), []);
});
