import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { mergeFinancialResults, fiscalYearFromPeriod, fiscalPeriodLabel } from "./market.js";
import { buildIncomeFlow, sankeyHubSize } from "./sankey.js";
import { sortIrDocuments, officialDocumentPeriod } from "./report-metadata.js";
import { buildCashFlow } from "./cash-flow.js";
import { mergeOfficialStatements } from "./financial-reports.js";
import { translateText, readLanguage, saveLanguage } from "./i18n.js";
import { chartPoint, hitChart } from "./chart-interaction.js";
import { stockIndicators } from "./stock-indicators.js";

const source = (await readFile(new URL("./app.js", import.meta.url), "utf8"))
  .replaceAll("\r\n", "\n")
  .replace('import { mergeFinancialResults, fiscalYearFromPeriod, fiscalPeriodLabel } from "./market.js";', "")
  .replace('import { buildIncomeFlow, sankeyHubSize } from "./sankey.js";', "")
  .replace('import { sortIrDocuments, officialDocumentPeriod } from "./report-metadata.js";', "")
  .replace('import { buildCashFlow } from "./cash-flow.js";', "")
  .replace('import { extractStatement, mergeOfficialStatements } from "./financial-reports.js";', "")
  .replace('import { translateText, readLanguage, saveLanguage } from "./i18n.js";', "")
  .replace('import { chartPoint, hitChart } from "./chart-interaction.js";', "")
  .replace('import { stockIndicators } from "./stock-indicators.js";', "")
  .replaceAll("import.meta.url", '"https://site.test/app.js"')
  .replace("refreshCompany({ reloadDatabase: true });\n", "await refreshCompany({ reloadDatabase: true });\n");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('CFへ切り替えると決算書の期間・符号・原本内訳を表示し、未開示資料は空の図になる',async()=>{
 const app=await setup({chartWidth:286,ratio:3});
 const report={companyCode:'toyota',fiscalYear:2026,quarter:1,basis:'quarter',periodStart:'2026-04-01',periodEnd:'2026-06-30',
  revenue:1000,operatingIncome:200,pretaxIncome:200,netIncome:150,statementRows:[{label:'売上原価',value:800,page:7}],
  sourceName:'公式決算書',sourceUrl:'https://official.test/cash.pdf',sourceUrls:['https://official.test/cash.pdf'],sourcePages:[7],
  cashFlow:{opening:100,closing:140,operating:-20,investing:60,financing:0,adjustments:[],adjustmentTotal:0,residual:0,
   rows:[{label:'営業活動によるキャッシュフロー',value:-20,page:16}],sourcePages:[16]}};
 const missing={...report,periodEnd:'2026-09-30',quarter:2,basis:'cumulative',cashFlow:null};
 app.state.officialReportsByCompany.toyota=[report,missing]; app.applyOfficialStatements('toyota');
 const activeId=app.state.activeId;
 app.nodes.get('#flow-mode').listeners.change({target:{value:'cash'}});
 assert.equal(app.state.statementSelectedEnd,report.periodEnd);
 assert.equal(app.state.activeId,activeId);
 assert.match(app.elements.flowPeriod.textContent,/2026-04-01〜2026-06-30/);
 assert.equal(app.elements.annualOperatingCost.textContent,'-20百万円');
 assert.match(app.elements.statementBody.innerHTML,/-20/); assert.match(app.elements.statementBody.innerHTML,/#page=16/);
 const canvas=app.nodes.get('#sankey-chart'); const model=app.chartModels.get(canvas);
 const datum=model.items.find(row=>row.title==='営業キャッシュフロー');
 const hit=model.regions.find(row=>row.kind==='rect'&&row.datum.title===datum.title);
 canvas.listeners.click({clientX:hit.x+hit.width/2,clientY:hit.y+hit.height/2});
 assert.match(app.elements.chartTooltipContent.innerHTML,/現金への増減/);
 app.elements.languageToggle.listeners.click();
 assert.match(app.nodes.get('#flow-title').textContent,/Cash flow/);
 app.elements.statementSelect.listeners.change({target:{value:missing.periodEnd}});
 assert.equal(app.chartModels.get(canvas).items.length,0);
 assert.match(app.elements.statementStatus.textContent,/not disclosed/);
 app.nodes.get('#flow-mode').listeners.change({target:{value:'income'}});
 assert.equal(app.state.activeId,activeId);
});

test("日足をクリックするとMA3本の数値、水準をクリックするとフィボナッチの価格が出る", async () => {
  const app=await setup();
  app.setHandler(url=>url.pathname==="/api/daily-stock-prices" ? Response.json({prices:Array.from({length:200},(_,index)=>({
    date:new Date(Date.UTC(2026,0,1+index)).toISOString().slice(0,10),open:101+index,close:101+index,high:102+index,low:100+index})),updatedAt:new Date().toISOString()}) : null);
  await app.refreshCompany({forceStock:true});
  const canvas=app.nodes.get("#stock-chart");
  const model=app.chartModels.get(canvas);
  const candle=model.items.filter(datum=>datum.title==="日足株価").at(-1);
  const region=model.regions.find(row=>row.datum===candle);
  canvas.listeners.click({clientX:region.x+region.width/2,clientY:region.y+1});
  assert.match(app.elements.chartTooltipContent.innerHTML,/MA5/);
  assert.match(app.elements.chartTooltipContent.innerHTML,/MA25/);
  assert.match(app.elements.chartTooltipContent.innerHTML,/MA100/);
  assert.match(app.elements.chartTooltipContent.innerHTML,/¥250.5/);
  const fib=model.regions.find(row=>row.datum.title==="フィボナッチ 50%");
  canvas.listeners.click({clientX:fib.x+fib.width/2,clientY:fib.y+fib.height/2});
  assert.match(app.elements.chartTooltipContent.innerHTML,/¥200.5/);
  assert.match(app.elements.chartTooltipContent.innerHTML,/最高値/);
});

test("4種類のグラフをクリックすると該当の値が表示され、空白・再描画・閉じるで消える", async () => {
  const app = await setup();
  for (const id of ["performance-chart","margin-chart","sankey-chart","stock-chart"]) {
    const canvas = app.nodes.get(`#${id}`);
    const region = app.chartModels.get(canvas).regions.at(-1);
    assert.ok(region,id);
    canvas.listeners.click({clientX:region.kind === "point" ? region.x : region.x + region.width / 2,
      clientY:region.kind === "point" ? region.y : region.y + region.height / 2});
    assert.equal(app.elements.chartTooltip.hidden,false,id);
    assert.match(app.elements.chartTooltipContent.innerHTML,/202[0-9]/);
    assert.ok(app.elements.chartTooltipContent.innerHTML.includes(region.datum.rows[0].label));
  }
  const canvas = app.nodes.get("#performance-chart");
  canvas.listeners.click({clientX:0,clientY:0});
  assert.equal(app.elements.chartTooltip.hidden,true);
  canvas.listeners.keydown({key:"ArrowRight",preventDefault(){}});
  assert.equal(app.elements.chartTooltip.hidden,false);
  app.elements.chartTooltipClose.listeners.click();
  assert.equal(app.elements.chartTooltip.hidden,true);
  canvas.listeners.keydown({key:"ArrowRight",preventDefault(){}});
  app.elements.languageToggle.listeners.click();
  assert.equal(app.elements.chartTooltip.hidden,true);
  canvas.listeners.keydown({key:"Enter",preventDefault(){}});
  assert.match(app.elements.chartTooltipContent.innerHTML,/JPY million/);
  canvas.listeners.keydown({key:"Escape"});
  assert.equal(app.elements.chartTooltip.hidden,true);
});

test("言語ボタンは企業・四半期・自動更新の選択を保ち、英語と日本語を往復する", async () => {
  const app = await setup();
  app.state.activeId = "old";
  app.elements.autoRefresh.checked = false;
  app.calls.length = 0;
  app.elements.languageToggle.listeners.click();
  assert.equal(app.state.language, "en");
  assert.equal(app.document.documentElement.lang, "en");
  assert.equal(app.elements.languageToggle.textContent, "日本語");
  assert.equal(app.elements.metricProfitTitle.textContent, "Operating Income");
  assert.match(app.nodes.get("#metric-revenue").textContent, /¥.*M/);
  assert.match(app.elements.dataStatus.textContent, /Result source/);
  assert.equal(app.state.activeId, "old");
  assert.equal(app.state.companyCode, "toyota");
  assert.equal(app.elements.autoRefresh.checked, false);
  assert.equal(app.calls.length, 0);
  app.elements.languageToggle.listeners.click();
  assert.equal(app.state.language, "ja");
  assert.equal(app.elements.metricProfitTitle.textContent, "営業利益");
  assert.match(app.elements.dataStatus.textContent, /業績出典/);
});

async function setup({ chartWidth = 800, ratio = 1, nativeTimeout = true } = {}) {
  const nodes = new Map();
  const timers = new Map();
  const calls = [];
  const context2d = new Proxy({ measureText: () => ({ width: 30 }),
    createLinearGradient: () => ({ addColorStop() {} }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
  });
  const element = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id: id.startsWith("#") ? id.slice(1) : id, textContent: "", value: "", checked: true, style: {},
      dataset: {}, listeners: {}, classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, callback) { this.listeners[type] = callback; },
      setAttribute(name,value) {this[name] = value;}, contains(node) {return this === node;},
      getBoundingClientRect: () => ({ left:0, top:0, width: chartWidth, height: 320 }), getContext: () => context2d,
    });
    return nodes.get(id);
  };
  const buttons = ["toyota", "kioxia", "mufg"].map((company) => {
    const button = element(company); button.dataset.company = company; return button;
  });
  const document = { hidden: false, listeners: {}, querySelector: element,
    documentElement: { lang: "ja" }, querySelectorAll: (selector) => selector === ".company-button" ? buttons : [], addEventListener(type, fn) { this.listeners[type] = fn; } };
  let handler = null;
  const rows = [
    { id: "old", company_code: "toyota", fiscal_year: 2025, quarter: 3, period_end: "2024-12-31",
      revenue: 100, operating_cost: 80, operating_income: 20, pretax_income: null, net_income: 10 },
    { id: "latest", company_code: "toyota", fiscal_year: 2025, quarter: 4, period_end: "2025-03-31",
      revenue: 110, operating_cost: 80, operating_income: 30, pretax_income: null, net_income: 15 },
  ];
  const fetch = async (input) => {
    const url = new URL(input, "https://site.test");
    calls.push(url.pathname);
    if (handler) { const result = await handler(url); if (result) return result; }
    if (url.pathname.endsWith("config.json")) return Response.json({ supabase: { url: "https://db.test", key: "public" } });
    if (url.pathname.endsWith("earn_companies") || url.pathname.endsWith("earn_ir_documents")) return Response.json([]);
    if (url.pathname.endsWith("earn_quarterly_results")) return Response.json(rows);
    if (url.pathname === "/api/ir-documents") return Response.json({ documents: [] });
    if (url.pathname === "/api/official-reports") return Response.json({ documents: [] });
    if (url.pathname === "/api/financial-results") return Response.json({ results: [], updatedAt: new Date().toISOString() });
    if (url.pathname === "/api/stock-quote") return Response.json({ price: 100, change: 1, changePercent: 1,
      marketTime: new Date().toISOString(), updatedAt: new Date().toISOString(), stale: false });
    if (url.pathname === "/api/daily-stock-prices") return Response.json({ prices: [{ date: "2026-10-13", open: 90, high: 110,
      low: 80, close: url.searchParams.get("symbol") === "8306.T" ? 8306 : 7203 }], updatedAt: new Date().toISOString() });
    throw new Error(`予期しないURL ${url}`);
  };
  const sandbox = vm.createContext({ document, fetch, URL, Response, AbortSignal: nativeTimeout ? AbortSignal : {}, AbortController, console,
    mergeFinancialResults, fiscalYearFromPeriod, fiscalPeriodLabel, mergeOfficialStatements, translateText, readLanguage, saveLanguage, chartPoint, hitChart, stockIndicators,
    extractStatement: async () => null, buildIncomeFlow, sankeyHubSize, sortIrDocuments, officialDocumentPeriod, buildCashFlow, window: { devicePixelRatio: ratio, setTimeout() {}, addEventListener() {},
      setInterval(fn, ms) { timers.set(ms, fn); } } });
  const api = await vm.runInContext(`(async () => { ${source}\nreturn {state, elements, refreshCompany, refreshQuote, applyOfficialStatements, loadOfficialStatements, loadOfficialIrDocuments, renderDocuments, chartModels}; })()`, sandbox);
  return { ...api, rows, nodes, timers, document, calls, buttons, setHandler(fn) { handler = fn; } };
}

test("科目が多くても合流部の太さを保ち、入出の帯の太さが総額に一致する", async () => {
  const app=await setup();
  await tick();
  const canvas=app.nodes.get("#sankey-chart");
  canvas.parentElement={style:{},clientWidth:640,getBoundingClientRect(){return{left:0,top:0,width:640,height:parseFloat(this.style.height)||390};}};
  const reports=JSON.parse(await readFile(new URL("./test-fixtures/official-statements.json",import.meta.url),"utf8"));
  app.state.officialReportsByCompany.toyota=reports.filter(report=>report.companyCode==="toyota");
  app.applyOfficialStatements("toyota");
  const regions=app.chartModels.get(canvas).regions;
  const hub=regions.find(region=>region.kind==="rect"&&region.datum.title==="損益の配分");
  assert.ok(hub.height>=144&&hub.height<=240);
  assert.ok(hub.width>=20&&hub.width<=28);
  const incoming=regions.filter(region=>region.kind==="ribbon"&&region.x2===hub.x);
  const outgoing=regions.filter(region=>region.kind==="ribbon"&&region.x1===hub.x+hub.width);
  assert.ok(incoming.length>3&&outgoing.length>3);
  for (const ribbons of [incoming,outgoing]) assert.ok(Math.abs(ribbons.reduce((sum,row)=>sum+row.thickness,0)-hub.height)<1e-6);
});

test("資料の追加取得後と描画時のどちらも、新しい資料が上に並ぶ", async () => {
  const app=await setup();
  await tick();
  app.state.officialIrDocumentsByCompany.toyota=[
    {url:"https://official.test/current.pdf",title:"newest",fiscalYear:2026,quarter:1},
    {url:"https://official.test/older.pdf",title:"oldest",fiscalYear:2022,quarter:4},
  ];
  app.setHandler(url=>url.pathname==="/api/ir-documents"?Response.json({documents:[
    {url:"https://official.test/middle.pdf",title:"middle",fiscalYear:2024,quarter:4},
  ]}):null);
  await app.loadOfficialIrDocuments("toyota");
  app.renderDocuments();
  const html=app.elements.documentsBody.innerHTML;
  assert.ok(html.indexOf('>newest<')<html.indexOf('>middle<'));
  assert.ok(html.indexOf('>middle<')<html.indexOf('>oldest<'));
  app.state.officialIrDocumentsByCompany.toyota.reverse();
  app.renderDocuments();
  assert.equal(app.elements.documentsBody.innerHTML,html);
});

test("資料一覧は遅れて公表された通期も原本の対象年度・四半期を優先する", async () => {
  const app = await setup();
  await tick();
  const url = "https://official.test/annual.pdf";
  app.state.officialIrDocumentsByCompany.toyota = [
    {url,title:"2026年5月8日 決算資料",fiscalYear:2026,quarter:1},
    {url:"https://official.test/news/2026/unknown.pdf",title:"2026年8月4日 決算資料"},
  ];
  app.state.officialReportsByCompany.toyota = [{sourceUrl:url,periodEnd:"2026-03-31",fiscalYear:2025,quarter:4}];
  app.renderDocuments();
  assert.match(app.elements.documentsBody.innerHTML, /FY2025<\/td>\s*<td>Q4/);
  assert.doesNotMatch(app.elements.documentsBody.innerHTML, /FY2026/);
  assert.match(app.elements.documentsBody.innerHTML, /<td>—<\/td>\s*<td>—/);
});

test("スマホのサンキーは画面幅に収まり、拡大・全体表示を往復しても損益と選択期を保つ", async () => {
  const app = await setup({ chartWidth: 286, ratio: 3 });
  const canvas = app.nodes.get("#sankey-chart");
  const activeId = app.state.activeId;
  const description = canvas.ariaLabel;
  assert.equal(canvas.width, 286 * 3);
  assert.equal(canvas.style.width, "286px");
  app.elements.sankeyZoom.listeners.click();
  assert.equal(canvas.width, 680 * 3);
  assert.equal(app.elements.sankeyZoom.ariaPressed, "true");
  assert.equal(app.elements.sankeyZoom.textContent, "全体表示");
  assert.equal(canvas.ariaLabel, description);
  app.elements.sankeyZoom.listeners.click();
  assert.equal(canvas.width, 286 * 3);
  assert.equal(app.elements.sankeyZoom.ariaPressed, "false");
  assert.equal(app.state.activeId, activeId);
  assert.equal(canvas.ariaLabel, description);
  app.elements.languageToggle.listeners.click();
  assert.equal(app.elements.sankeyZoom.textContent, "Expand chart");
});

test("PDFを解析できないWebViewでも配信済みの原本科目・金額・ページを表示する", async () => {
  const app = await setup({ nativeTimeout: false });
  await tick();
  const report = { companyCode:"toyota", fiscalYear:2026, quarter:1, months:3, basis:"quarter",
    periodStart:"2026-04-01", periodEnd:"2026-06-30", revenue:1000, operatingCost:800,
    operatingIncome:200, pretaxIncome:200, netIncome:150, sourceName:"公式決算書",
    sourceUrl:"https://official.test/report.pdf", sourceUrls:["https://official.test/report.pdf"], sourcePages:[10],
    statementRows:[{ label:"売上原価", value:700, page:10 }] };
  app.setHandler((url) => url.pathname === "/api/official-reports" ? Response.json({
    documents:[{url:report.sourceUrl}], reports:[report] }) : null);
  app.calls.length = 0;
  await app.refreshCompany({ forceStock:true });
  await tick();
  assert.match(app.elements.statementBody.innerHTML,/売上原価/);
  assert.match(app.elements.statementBody.innerHTML,/700/);
  assert.match(app.elements.statementBody.innerHTML,/#page=10/);
  assert.equal(app.state.results.at(-1).fiscalYear,2026);
  assert.ok(!app.calls.includes("/api/report-pdf"));
  assert.equal(app.state.officialReportErrorsByCompany.toyota,undefined);
});

test("株価1時間・決算1日の自動更新は停止設定と非表示タブを尊重する", async () => {
  const app = await setup();
  app.calls.length = 0;
  app.document.hidden = true;
  app.timers.get(3_600_000)(); app.timers.get(86_400_000)();
  assert.equal(app.calls.length, 0);
  app.document.hidden = false;
  app.elements.autoRefresh.checked = false;
  app.timers.get(3_600_000)(); app.timers.get(86_400_000)();
  assert.equal(app.calls.length, 0);
  app.elements.autoRefresh.checked = true;
  app.timers.get(3_600_000)();
  await tick();
  assert.deepEqual(app.calls, ["/api/stock-quote"]);
});

test("タブ復帰では期限内の決算を再取得せず、1時間後は株価だけ・1日後は決算も確認する", async () => {
  const app = await setup();
  app.calls.length = 0;
  app.document.listeners.visibilitychange();
  await tick();
  assert.equal(app.calls.length, 0);
  app.state.lastQuoteCheckBySymbol["7203.T"] = Date.now() - 3_600_001;
  app.document.listeners.visibilitychange();
  await tick();
  assert.deepEqual(app.calls, ["/api/stock-quote"]);
  app.calls.length = 0;
  app.state.lastFinancialCheckByCompany.toyota = Date.now() - 86_400_001;
  app.document.listeners.visibilitychange();
  await tick();
  assert.ok(app.calls.includes("/api/financial-results"));
});

test("先に選んだ会社の遅い応答で現在の株価を上書きしない", async () => {
  const app = await setup();
  let release;
  app.setHandler((url) => url.pathname === "/api/daily-stock-prices" && url.searchParams.get("symbol") === "285A.T"
    ? new Promise((resolve) => { release = () => resolve(Response.json({ prices: [{ date: "2026-10-13",
      open: 1, high: 2, low: 1, close: 285 }], updatedAt: new Date().toISOString() })); }) : null);
  const pending = app.buttons[1].listeners.click();
  await tick();
  await app.buttons[2].listeners.click();
  release();
  await pending;
  assert.equal(app.state.companyCode, "mufg");
  assert.equal(app.state.stockPrices[0].close, 8306);
  assert.equal(app.elements.refreshButton.disabled, false);
});

test("過去の四半期は更新後も維持し、最新期を選択中なら新しい期へ追従する", async () => {
  const app = await setup();
  app.state.activeId = "old";
  app.rows.push({ ...app.rows[1], id: "new", fiscal_year: 2026, quarter: 1, period_end: "2025-06-30" });
  await app.refreshCompany({ reloadDatabase: true });
  assert.equal(app.state.activeId, "old");
  app.state.activeId = "new";
  app.rows.push({ ...app.rows[2], id: "newer", quarter: 2, period_end: "2025-09-30" });
  await app.refreshCompany({ reloadDatabase: true });
  assert.equal(app.state.activeId, "newer");
});

test("取得失敗では株価と週足を保持し、更新失敗を表示する", async () => {
  const app = await setup();
  app.setHandler((url) => (url.pathname.startsWith("/api/stock-") || url.pathname === "/api/daily-stock-prices") ? new Response("failure", { status: 502 }) : null);
  await app.refreshCompany({ forceStock: true });
  assert.equal(app.state.stockPrices[0].close, 7203);
  assert.equal(app.state.quoteBySymbol["7203.T"].price, 100);
  assert.match(app.elements.quoteStatus.textContent, /更新失敗/);
  assert.match(app.elements.stockChartStatus.textContent, /更新失敗/);
});

test("取得中に変更した四半期の選択を上書きしない", async () => {
  const app = await setup();
  let release;
  app.setHandler((url) => url.pathname === "/api/financial-results"
    ? new Promise((resolve) => { release = () => resolve(Response.json({ results: [] })); }) : null);
  const pending = app.refreshCompany();
  await tick();
  app.state.activeId = "old";
  release();
  await pending;
  assert.equal(app.state.activeId, "old");
});

test("サンキーの読み上げ説明に収入と支出を表示し、四半期変更に追従する", async () => {
  const app = await setup();
  const canvas = app.nodes.get("#sankey-chart");
  assert.match(canvas.ariaLabel, /収入・支出のサンキーグラフ/);
  assert.match(canvas.ariaLabel, /営業費用・費用等/);
  assert.match(canvas.ariaLabel, /純利益/);
  const previous = canvas.ariaLabel;
  Object.assign(app.state.results.find((row) => row.id === "old"), {
    revenue: 2000, operatingCost: 1600, operatingIncome: 400, netIncome: 200,
  });
  app.elements.quarterSelect.listeners.change({ target: { value: "old" } });
  assert.notEqual(canvas.ariaLabel, previous);
  assert.ok(!canvas.ariaLabel.includes("???"));
});

test("2022年度までの事前解析履歴をすべて反映し、古い年度を選択してもPDFを端末で再解析しない", async () => {
  const app = await setup();
  await tick();
  const reports = Array.from({length:5}, (_, index) => {
    const year=2026-index;
    return {companyCode:"toyota",fiscalYear:year,quarter:1,periodStart:`${year}-04-01`,periodEnd:`${year}-06-30`,
      basis:"quarter",months:3,revenue:1000+year,operatingIncome:200,pretaxIncome:200,operatingCost:800+year,netIncome:150,
      statementRows:[{label:"売上原価",value:800+year,page:10}],sourceName:"公式決算書",
      sourceUrl:`https://official.test/${year}_tanshin.pdf`,sourcePages:[10]};
  });
  app.setHandler(url => url.pathname === "/api/official-reports" ? Response.json({
    documents:reports.map(report=>({url:report.sourceUrl,title:"決算短信"})), reports,
  }) : null);
  await app.loadOfficialStatements("toyota");
  assert.equal(app.state.officialReportsByCompany.toyota.length,5);
  assert.match(app.elements.yearSelect.innerHTML,/2022年度（2023年3月期）/);
  app.elements.yearSelect.listeners.change({target:{value:"2022"}});
  assert.equal(app.state.results.find(row=>row.id===app.state.activeId).fiscalYear,2022);
  assert.equal(app.elements.marginChange.textContent,"BASE");
  assert.equal(app.calls.filter(path=>path==="/api/report-pdf").length,0);
  delete app.state.financialByCompany.toyota;
  app.state.officialReportsByCompany.toyota.push({...reports.at(-1),quarter:4,months:12,periodEnd:"2023-03-31",basis:"cumulative"});
  app.elements.yearSelect.listeners.change({target:{value:"2022"}});
  assert.match(app.elements.dataStatus.textContent,/期間末 2022-06-30/);
  assert.match(app.elements.annualSummaryPeriod.textContent,/2023-03-31/);
});

test("公式決算書から2026年度が追加され、主要値と原本ページが表示される", async () => {
  const app=await setup();
  const report={companyCode:"toyota",fiscalYear:2026,quarter:1,periodStart:"2026-04-01",periodEnd:"2026-06-30",
    basis:"quarter",months:3,revenue:1000,operatingIncome:200,pretaxIncome:200,operatingCost:800,netIncome:150,
    statementRows:[{label:"売上原価",value:700,page:10},{label:"販売費及び一般管理費",value:100,page:10}],
    sourceName:"公式決算書",sourceUrl:"https://official.test/report.pdf",sourcePages:[10],sourceUrls:["https://official.test/report.pdf"]};
  app.state.officialReportsByCompany.toyota=[report];
  app.applyOfficialStatements("toyota");
  assert.equal(app.state.results.at(-1).fiscalYear,2026);
  assert.match(app.elements.yearSelect.innerHTML,/2026年度（2027年3月期）/);
  assert.match(app.elements.statementBody.innerHTML,/売上原価/);
  assert.match(app.elements.statementBody.innerHTML,/#page=10/);
  assert.match(app.elements.dataStatus.textContent,/公式決算書/);
  const activeId = app.state.activeId;
  app.elements.languageToggle.listeners.click();
  assert.match(app.elements.statementBody.innerHTML, /Cost of sales/);
  assert.match(app.elements.statementBody.innerHTML, /class="original-label" lang="ja">売上原価/);
  assert.match(app.elements.statementBody.innerHTML, /#page=10/);
  assert.match(app.nodes.get("#sankey-chart").ariaLabel, /Income and expense Sankey/);
  assert.match(app.nodes.get("#sankey-chart").ariaLabel, /Operating and other expenses/);
  assert.equal(app.state.activeId, activeId);
  assert.equal(report.statementRows[0].label, "売上原価");
});
