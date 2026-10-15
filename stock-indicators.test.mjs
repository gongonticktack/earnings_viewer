import assert from "node:assert/strict";
import { test } from "node:test";
import { movingAverage, fibonacciRetracement, stockIndicators } from "./stock-indicators.js";

test("MAは5・25・100取引日の終値の算術平均で、最初の不足期間は描画しない", () => {
  const prices = Array.from({length:120},(_,index) => ({close:index+1}));
  assert.equal(movingAverage(prices,5).at(-1),118);
  assert.equal(movingAverage(prices,25).at(-1),108);
  assert.equal(movingAverage(prices,100)[99],50.5);
  assert.equal(movingAverage(prices,100).at(-1),70.5);
  assert.equal(movingAverage(prices,100)[98],null);
  assert.deepEqual(movingAverage([1,2,null,4,5,6].map(close=>({close})),2),[null,1.5,null,null,4.5,5.5]);
  assert.throws(()=>movingAverage(prices,0),RangeError);
});

test("フィボナッチは終値でなく高値・安値から7水準と原点の日付を求める", () => {
  const result = fibonacciRetracement([{date:"2026-01-01",high:200,low:120,close:150},
    {date:"2026-01-02",high:180,low:100,close:160}]);
  assert.equal(result.highDate,"2026-01-01");
  assert.equal(result.lowDate,"2026-01-02");
  assert.deepEqual(result.levels.map(level=>level.ratio),[0,.236,.382,.5,.618,.786,1]);
  assert.equal(result.levels[0].price,200);
  assert.equal(result.levels[3].price,150);
  assert.equal(result.levels.at(-1).price,100);
  assert.equal(fibonacciRetracement([{high:100,low:100}]),null);
});

test("表示外の準備期間はMAに使用するが、フィボナッチの最高・最低には使用しない", () => {
  const history = Array.from({length:600},(_,index)=>({date:new Date(Date.UTC(2025,0,1+index)).toISOString().slice(0,10),close:index+100,high:index+102,low:index+98}));
  const result=stockIndicators(history);
  assert.equal(result.prices.length,366);
  assert.ok(result.averages[100][0] !== null);
  assert.equal(result.fibonacci.low,result.prices[0].low);
  assert.ok(result.fibonacci.low > history[0].low);
  assert.equal(result.averages[5].length,result.prices.length);
});
