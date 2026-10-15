import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildCashFlow } from './cash-flow.js';
import { quarterlyStatements } from './financial-reports.js';
import { fiscalYearFromPeriod } from './market.js';

const manifest = JSON.parse(await readFile(new URL("./statement-data.json", import.meta.url), "utf8"));
const verified = JSON.parse(await readFile(new URL("./test-fixtures/official-statements.json", import.meta.url), "utf8"));

test("全保存原本の年度・四半期は公表時期ではなく実績期間に一致する", () => {
  for (const report of Object.values(manifest.reportsByCompany).flat()) {
    assert.equal(report.fiscalYear, fiscalYearFromPeriod(report.periodEnd, report.quarter), report.sourceUrl);
    assert.equal(report.quarter, report.months / 3, report.sourceUrl);
    assert.equal(Number(report.periodStart.slice(0,4)), report.fiscalYear, report.sourceUrl);
  }
});

test("2022年度の13社の4四半期は出典付きの原本から作られ、未取得企業の値は作らない", () => {
  const companies=["toyota","mufg","softbank-group","fast-retailing","advantest","smfg","mizuho","keyence","itochu","shin-etsu","mitsubishi-corp","hitachi","ntt"];
  for (const code of companies) {
    const reports=manifest.reportsByCompany[code];
    assert.deepEqual(quarterlyStatements(reports).filter(row=>row.fiscalYear===2022).map(row=>row.quarter),[1,2,3,4],code);
    assert.deepEqual(manifest.coverageByCompany[code].years[2022],[1,2,3,4],code);
    const documents=new Map(manifest.documentsByCompany[code].map(document=>[document.url,document]));
    for (const report of reports.filter(row=>row.fiscalYear===2022)) {
      const document=documents.get(report.sourceUrl);
      assert.ok(document,code);
      assert.equal(new URL(document.discoveredFrom).origin,new URL(document.officialIrUrl).origin);
      assert.ok(report.statementRows.length>0);
      assert.ok(report.sourcePages.every(page=>Number.isInteger(page)&&page>0));
    }
  }
  const toyota=manifest.reportsByCompany.toyota.find(row=>row.fiscalYear===2022&&row.quarter===1);
  assert.equal(toyota.revenue,8491116);
  assert.equal(toyota.netIncome,736820);
  assert.deepEqual(manifest.coverageByCompany["tokio-marine"].years[2022],[]);
});

test("配信用内訳の主要値と原本ページは照合済み6社の2026年度原本に一致する", () => {
  assert.equal(manifest.version,1);
  for (const expected of verified) {
    const actual = manifest.reportsByCompany[expected.companyCode]?.find((row) => row.sourceUrl === expected.sourceUrl);
    assert.ok(actual,`${expected.companyCode}の公式原本`);
    for (const key of ["revenue","operatingIncome","pretaxIncome","netIncome","fiscalYear","periodStart","periodEnd"]) {
      assert.equal(actual[key],expected[key],`${expected.companyCode}: ${key}`);
    }
    assert.deepEqual(actual.statementRows,expected.statementRows);
    assert.deepEqual(actual.sourcePages,expected.sourcePages);
  }
});

test('配信用CFは原本行と主要値が一致し、期首から期末の誤差が丸め範囲に収まる',()=>{
 const reports=Object.values(manifest.reportsByCompany).flat().filter(report=>report.cashFlow);
 assert.ok(reports.length>=27);
 for (const report of reports) {
   const cash=report.cashFlow;
   assert.ok(Math.abs(cash.residual)<=3,`${report.companyCode}/${report.periodEnd}: ${cash.residual}`);
   assert.equal(cash.periodEnd,report.periodEnd);
   assert.ok(cash.rows.every(row=>Number.isFinite(row.value)&&row.page>0));
   assert.ok(cash.rows.some(row=>row.value===cash.opening&&/期首/.test(row.label)));
   assert.ok(cash.rows.some(row=>row.value===cash.closing&&/期末/.test(row.label)));
   const flow=buildCashFlow(cash);
   assert.equal(flow.total,flow.targets.reduce((sum,row)=>sum+row.value,0));
 }
});
