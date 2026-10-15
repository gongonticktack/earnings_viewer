import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCashFlowPages,buildCashFlow} from './cash-flow.js';
import {readFile} from 'node:fs/promises';

const actual=JSON.parse(await readFile(new URL('./test-fixtures/toyota-cash-flow.json',import.meta.url),'utf8'));
const period={periodStart:'2025-04-01',periodEnd:'2026-03-31',basis:'cumulative'};
test('トヨタ公式通期原本の当期CF・現金残高・為替・振替を読み取り、丸め差を明記する',()=>{
 const cash=parseCashFlowPages([actual],period);
 assert.deepEqual([cash.opening,cash.operating,cash.investing,cash.financing,cash.closing],[8982404,5472920,-1520307,-536659,12659622]);
 assert.equal(cash.adjustmentTotal,261265); assert.equal(cash.residual,-1);
 assert.equal(cash.rows.find(row=>row.label==='減価償却費及び償却費').value,2392519);
 assert.deepEqual(cash.sourcePages,[16]);
 const flow=buildCashFlow(cash);
 assert.equal(flow.sources.reduce((sum,row)=>sum+row.value,0),flow.targets.reduce((sum,row)=>sum+row.value,0));
 assert.ok(flow.targets.some(row=>row.label==='投資キャッシュフロー'&&row.signedValue===-1520307));
 assert.ok(!flow.sources.some(row=>row.label.includes('減価償却')));
 assert.ok(flow.targets.some(row=>row.label==='丸め差額（計算）'&&row.value===1));
});
test('未開示・単位不明・別期間のCFは推測せず除外する',()=>{
 assert.equal(parseCashFlowPages([],period),null);
 assert.equal(parseCashFlowPages([{...actual,lines:actual.lines.map(line=>line.replace('百万円','千円'))}],period),null);
 assert.equal(parseCashFlowPages([actual],{...period,periodEnd:'2026-06-30'}),null);
 const missing={...actual,lines:actual.lines.map(line=>line.startsWith('営業活動によるキャッシュ・フロー 3,')?'営業活動によるキャッシュ・フロー 3,696,934 －':line)};
 assert.equal(parseCashFlowPages([missing],period),null);
 assert.equal(buildCashFlow({opening:1,closing:1,operating:null,investing:0,financing:0}),null);
});
test('当期・前期の逆列、2ページにまたがるCFも正しい符号と原本ページを維持する',()=>{
 const reversed={...actual,lines:actual.lines.map(line=>line.replace('前連結会計年度 当連結会計年度','当連結会計年度 前連結会計年度').replace(/ (\S+) (\S+)$/,(all,a,b)=>/^[△▲−-]?\d[\d,]*$|^[－―—-]$/.test(a)&&/^[△▲−-]?\d[\d,]*$|^[－―—-]$/.test(b)?` ${b} ${a}`:all))};
 assert.equal(parseCashFlowPages([reversed],period).operating,5472920);
 const split=actual.lines.findIndex(line=>line.includes('財務活動による'));
 const cash=parseCashFlowPages([{...actual,lines:actual.lines.slice(0,split)},{number:17,lines:actual.lines.slice(split)}],period);
 assert.equal(cash.closing,12659622); assert.deepEqual(cash.sourcePages,[16,17]);
});
test('営業流出・投資流入・財務流入とゼロのCFを保存則に従って配置する',()=>{
 const flow=buildCashFlow({opening:100,closing:140,operating:-20,investing:60,financing:0,adjustments:[]});
 assert.equal(flow.sources.find(row=>row.label==='投資キャッシュフロー').value,60);
 assert.equal(flow.targets.find(row=>row.label==='営業キャッシュフロー').value,20);
 assert.equal(flow.total,160); assert.equal(flow.targets.reduce((sum,row)=>sum+row.value,0),160);
});

test('CF計という合計表記や現金純額表記に対応し、期末後の注記を取り込まない',()=>{
 const base=structuredClone(actual);
 base.lines=base.lines.map(line=>line.replace(/^(営業|投資|財務)活動によるキャッシュ・フロー (.+)$/,'$1活動によるキャッシュ・フロー計 $2'));
 base.lines.push('該当事項はありません。 9 10');
 const cash=parseCashFlowPages([base],period);
 assert.equal(cash.operating,5472920);
 assert.ok(!cash.rows.some(row=>row.label.includes('該当事項')));
 base.lines=base.lines.map(line=>line.replace(/^営業活動によるキャッシュ・フロー計 /,'営業活動から得た現金及び現金同等物（純額） ').replace(/^(投資|財務)活動によるキャッシュ・フロー計 /,'$1活動に使用した現金及び現金同等物（純額） '));
 assert.equal(parseCashFlowPages([base],period).financing,-536659);
});
