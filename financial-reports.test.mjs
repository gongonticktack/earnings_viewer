import assert from "node:assert/strict";
import { test } from "node:test";
import { statementLines, statementPeriod, parseStatementPages, quarterlyStatements, mergeOfficialStatements } from "./financial-reports.js";
import { buildIncomeFlow } from "./sankey.js";
import { readFile } from "node:fs/promises";

test("二段組で予想が先に抽出されても実績の連結業績見出しの期間だけを採用する", () => {
  const report=statementPeriod([{number:1,lines:["連結業績予想（2023年4月1日～2024年3月31日）","2023年3月期の連結業績（2022年4月1日～2023年3月31日）"]}]);
  assert.equal(report.fiscalYear,2022);
  assert.equal(report.quarter,4);
  assert.equal(statementPeriod([{number:1,lines:["連結業績予想（2023年4月1日～2024年3月31日）"]}]),null);
});

test("日立の証券コードのコロンを許可し、株式分割の注記を前期・当期の列見出しにしない", async () => {
  const pages = JSON.parse(await readFile(new URL("./test-fixtures/hitachi-2025-q3-pages.json", import.meta.url), "utf8"));
  const report = parseStatementPages(pages, "hitachi", "https://www.hitachi.co.jp/New/cnews/month/2026/01/0129/2025_3Q.pdf", "6501");
  assert.ok(report);
  assert.equal(report.fiscalYear,2025);
  assert.equal(report.revenue,7501797);
  assert.equal(report.netIncome,638560);
  assert.equal(report.pretaxIncome,1026197);
  assert.equal(parseStatementPages(pages,"hitachi","https://official.test/report.pdf","6502"),null);
});

const pages = [
  { number: 1, lines: ["2027年3月期 第1四半期決算短信", "コード番号 7203",
    "連結業績（2026年4月1日～2026年6月30日）", "当期 1,000 150", "前期 800 110"] },
  { number: 7, lines: ["要約四半期連結損益計算書", "単位：百万円", "前第1四半期 当第1四半期",
    "売上収益 800 1,000", "売上原価 550 700", "販売費及び一般管理費 100 100",
    "営業利益 150 200", "金融収益 0 10", "金融費用 0 5", "税引前四半期利益 150 205",
    "法人所得税費用 40 50", "親会社の所有者 110 150", "非支配持分 0 5"] },
];

test('後続ページのその他包括利益を損益の科目として混ぜない',()=>{
 const expanded=[...pages,{number:8,lines:['その他の包括利益（税効果控除後）','為替換算調整額 10 20','四半期包括利益 110 170']}];
 const report=parseStatementPages(expanded,'toyota','https://test/report.pdf');
 assert.ok(!report.statementRows.some(row=>row.label==='為替換算調整額'));
 assert.equal(report.netIncome,150);
});

test("当期列・百万円単位・2026年度を確定し、原本ページと細目を保存する", () => {
  const report = parseStatementPages(pages, "toyota", "https://official.test/report.pdf", "7203");
  assert.equal(report.revenue, 1000);
  assert.equal(report.netIncome, 150);
  assert.equal(report.fiscalYear, 2026);
  assert.equal(report.basis, "quarter");
  assert.deepEqual(report.sourcePages, [7]);
  const flow = buildIncomeFlow(report, report.operatingIncome);
  assert.equal(flow.detailed, true);
  assert.ok(flow.targets.some((row) => row.label === "売上原価" && row.value === 700));
  assert.equal(flow.residual, 0);
});

test("前期列の誤採用、別会社、単位違い、予想しかない資料を採用しない", () => {
  assert.equal(parseStatementPages(pages, "other", "https://test/report.pdf", "285A"), null);
  const altered = structuredClone(pages);
  altered[0].lines = ["2027年3月期 第1四半期決算短信", "連結業績（2026年4月1日～2026年6月30日）", "当期 1,100 160"];
  assert.equal(parseStatementPages(altered, "toyota", "https://test/report.pdf"), null);
  altered[1].lines[1] = "単位：千円";
  assert.equal(parseStatementPages(altered, "toyota", "https://test/report.pdf"), null);
  altered[0].lines[1] = "連結業績予想（2026年4月1日～2027年3月31日）";
  assert.equal(parseStatementPages(altered, "toyota", "https://test/report.pdf"), null);
});

test("列の並びが当期・前期でも当期を選ぶ", () => {
  const reverse = structuredClone(pages);
  reverse[1].lines[2] = "当第1四半期 前第1四半期";
  for (let i=3;i<reverse[1].lines.length;i++) reverse[1].lines[i] = reverse[1].lines[i].replace(/ (\S+) (\S+)$/, " $2 $1");
  assert.equal(parseStatementPages(reverse, "toyota", "https://test/report.pdf").revenue, 1000);
});

test("累計に直前の累計がある場合だけ差分を作り、両方の原本を保持する", () => {
  const q1 = parseStatementPages(pages, "toyota", "https://test/q1.pdf");
  const q2 = { ...q1, quarter: 2, months: 6, basis: "cumulative", periodEnd: "2026-09-30",
    revenue: 2200, operatingCost: 1700, operatingIncome: 500, netIncome: 330, sourceUrl: "https://test/q2.pdf" };
  assert.equal(quarterlyStatements([q2]).length, 0);
  const result = quarterlyStatements([q1,q2])[1];
  assert.equal(result.revenue, 1200);
  assert.equal(result.netIncome, 180);
  assert.equal(result.periodStart, "2026-07-01");
  assert.deepEqual(result.sourceUrls, [q2.sourceUrl,q1.sourceUrl]);
  assert.equal(result.basis, "quarter-difference");
  assert.equal(quarterlyStatements([q2, { ...q1, periodStart: "2026-01-01" }]).length, 1);
});

test("同じ期間は主要値と細目をまとめて公式原本で置き換える", () => {
  const report = parseStatementPages(pages, "toyota", "https://test/q1.pdf");
  const merged = mergeOfficialStatements([{ periodEnd: report.periodEnd, revenue: 900, netIncome: 99 }], [report]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].revenue, 1000);
  assert.equal(merged[0].sourceName, "公式決算書");
});

test("PDF文字の順番がばらばらでも、座標から比較列を復元する", () => {
  const item = (str,x,y) => ({str,transform:[1,0,0,1,x,y]});
  assert.deepEqual(statementLines([item("200",300,500),item("100",200,500.5),item("売上",20,500),item("次の行",20,480)]),
    ["売上 100 200","次の行"]);
});

test("20日締めの原本を月末の補完値と二重登録せず、同じ年度・四半期で置き換える", () => {
  const report = { ...parseStatementPages(pages,"toyota","https://test/q1.pdf"),
    companyCode:"keyence",periodStart:"2026-03-21",periodEnd:"2026-06-20" };
  const existing=[{id:"yahoo",fiscalYear:2026,quarter:1,periodEnd:"2026-06-30",revenue:999}];
  const result=mergeOfficialStatements(existing,[report]);
  assert.equal(result.length,1);
  assert.equal(result[0].periodEnd,"2026-06-20");
});

test("当期・前期の横に売上比率と増減があっても当期金額を選ぶ", () => {
  const ratios=structuredClone(pages);
  ratios[1].lines[3]="売上収益 800 100.0 1,000 100.0 125";
  assert.equal(parseStatementPages(ratios,"toyota","https://test/report.pdf").revenue,1000);
});

test("20日締めの期間は原本どおりに読み、年度を開始年で定義する", () => {
  const shifted=structuredClone(pages);
  shifted[0].lines[2]="連結業績（2026年3月21日～2026年6月20日）";
  const result=parseStatementPages(shifted,"toyota","https://test/report.pdf");
  assert.equal(result.fiscalYear,2026);
  assert.equal(result.quarter,1);
  assert.equal(result.periodStart,"2026-03-21");
});
