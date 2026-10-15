import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { buildIncomeFlow, sankeyHubSize } from "./sankey.js";

test("合流部は収支総額に応じて滑らかに太くなり、小額・巨大額でも上下限を超えない", () => {
  let previous=0;
  for (const total of [0,0.001,100,10000,1000000,100000000,Number.MAX_VALUE]) {
    const size=sankeyHubSize(total);
    assert.ok(size.height>=144&&size.height<=240);
    assert.ok(size.width>=20&&size.width<=28);
    assert.ok(size.height>=previous);
    previous=size.height;
  }
  assert.ok(sankeyHubSize(10000000).height>sankeyHubSize(10000).height);
  for (const total of [-1,NaN,Infinity,undefined]) assert.equal(sankeyHubSize(total).height,144);
});

function assertBalanced(flow) {
  const sourceTotal = flow.sources.reduce((sum, node) => sum + node.value, 0);
  const targetTotal = flow.targets.reduce((sum, node) => sum + node.value, 0);
  assert.ok(Math.abs(sourceTotal - targetTotal) < 1e-8);
  assert.equal(flow.total, sourceTotal);
  assert.ok([...flow.sources, ...flow.targets].every((node) => Number.isFinite(node.value) && node.value > 0));
}

test("売上を営業費用・税金等・純利益へ分け、流入と流出の金額が一致する", () => {
  const flow = buildIncomeFlow({ revenue: 1000, operatingCost: 800, netIncome: 150 }, 200);
  assertBalanced(flow);
  assert.deepEqual(flow.targets.map((node) => node.value), [800, 50, 150]);
  assert.equal(flow.sources.length, 1);
});

test("営業利益より純利益が大きい場合は増益調整を流入側へ追加する", () => {
  const flow = buildIncomeFlow({ revenue: 1000, operatingCost: 900, netIncome: 150 }, 100);
  assertBalanced(flow);
  assert.equal(flow.sources[1].value, 50);
  assert.match(flow.sources[1].label, /増益/);
});

test("営業赤字・純損失を負の帯にせず不足額として明示する", () => {
  const flow = buildIncomeFlow({ revenue: 1000, operatingCost: 1200, netIncome: -250 }, -200);
  assertBalanced(flow);
  assert.equal(flow.hasLoss, true);
  assert.equal(flow.sources.find((node) => node.kind === "loss").value, 250);
  assert.ok(!flow.targets.some((node) => node.kind === "profit"));
});

test("費用が欠損している場合は差額を表示し、未開示の利益をゼロと見なさない", () => {
  const flow = buildIncomeFlow({ revenue: 1000, operatingCost: null, netIncome: 150 }, null);
  assertBalanced(flow);
  assert.equal(flow.targets[0].value, 850);
  assert.equal(flow.targets[0].label, "費用・税金等（差額）");
  assert.equal(flow.separateCosts, false);
});

test("調整によって利益が売上を超える場合も流れの金額を保つ", () => {
  const flow = buildIncomeFlow({ revenue: 100, operatingCost: null, netIncome: 150 }, 120);
  assertBalanced(flow);
  assert.equal(flow.total, 150);
});

test("ゼロ金額は帯を作らず、欠損・非数・負の売上は描画対象にしない", () => {
  const flow = buildIncomeFlow({ revenue: 0, operatingCost: 0, netIncome: 0 }, 0);
  assert.equal(flow.total, 0);
  for (const row of [null, { revenue: 100, netIncome: null }, { revenue: -100, netIncome: 10 },
    { revenue: Infinity, netIncome: 10 }]) assert.equal(buildIncomeFlow(row, null), null);
});

test("照合した6社の2026年度公式決算書は細目の収支が丸め誤差内で一致する", () => {
  const reports=JSON.parse(readFileSync(new URL("./test-fixtures/official-statements.json",import.meta.url),"utf8"));
  assert.equal(reports.length,6);
  for(const report of reports) {
    const flow=buildIncomeFlow(report,report.operatingIncome??report.pretaxIncome);
    assert.equal(flow.detailed,true,report.companyCode);
    assert.ok(Math.abs(flow.residual)<=3,`${report.companyCode}: ${flow.residual}`);
    assertBalanced(flow);
    assert.ok(report.sourceUrl.startsWith("https://"));
    assert.equal(report.fiscalYear,2026);
  }
});

test("同名のその他と集計行は、区分を保持し二重計上しない", () => {
  const report={revenue:1000,netIncome:190,statementRows:[
    {label:"売上原価",value:700},
    {label:"研究開発費",value:50,group:"販売費及び一般管理費"},
    {label:"その他",value:50,group:"販売費及び一般管理費"},
    {label:"販売費及び一般管理費合計",value:100,group:"販売費及び一般管理費"},
    {label:"その他",value:30,group:"営業外収益"},
    {label:"その他",value:10,group:"営業外費用"},
    {label:"法人税等",value:30},
  ]};
  const flow=buildIncomeFlow(report,200);
  assertBalanced(flow);
  assert.equal(flow.residual,0);
  assert.ok(flow.sources.some(row=>row.label==="営業外収益 / その他"));
  assert.ok(flow.targets.some(row=>row.label==="営業外費用 / その他"));
  assert.ok(!flow.targets.some(row=>row.label==="販売費及び一般管理費合計"));
});
