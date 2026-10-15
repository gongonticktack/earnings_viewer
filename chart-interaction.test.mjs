import assert from "node:assert/strict";
import { test } from "node:test";
import { chartPoint, hitChart } from "./chart-interaction.js";

test("画面密度・CSS縮小・横スクロール後もタップを描画座標へ変換する", () => {
  assert.deepEqual(chartPoint({left:-120,top:80,width:340,height:200},680,400,50,180),{x:340,y:200});
  assert.equal(chartPoint({left:10,top:10,width:0,height:200},680,400,50,180),null);
  assert.equal(chartPoint({left:10,top:10,width:340,height:200},680,400,0,180),null);
});

test("棒に重なる利益の点を優先し、グラフ外や空白には数値を返さない", () => {
  const regions = [{kind:"rect",x:20,y:20,width:40,height:100,datum:"売上"},
    {kind:"point",x:40,y:40,radius:18,datum:"利益"}];
  assert.equal(hitChart(regions,{x:40,y:40}),"利益");
  assert.equal(hitChart(regions,{x:40,y:100}),"売上");
  assert.equal(hitChart(regions,{x:2,y:2}),null);
  assert.equal(hitChart(regions,null),null);
});

test("サンキーは帯の矩形全体ではなく、描画した曲線内だけを選択する", () => {
  const regions = [{kind:"ribbon",x1:0,y1:0,x2:100,y2:100,thickness:10,datum:"原価"}];
  assert.equal(hitChart(regions,{x:50,y:55}),"原価");
  assert.equal(hitChart(regions,{x:50,y:5}),null);
  assert.equal(hitChart(regions,{x:0,y:0}),"原価");
  assert.equal(hitChart(regions,{x:100,y:110}),"原価");
});
