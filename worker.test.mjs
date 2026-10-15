import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import worker from "./worker.js";

const originalFetch = globalThis.fetch;

test("現在の一覧から消えた2022年度も確認済みアーカイブと原本が一致する場合だけ配信する", async () => {
  const sourceUrl="https://official.test/files/2023_tanshin.pdf";
  const document={companyCode:"toyota",title:"2023年3月期 第1四半期 決算短信",url:sourceUrl,
    discoveredFrom:"https://official.test/ir/archive/2023/",officialIrUrl:"https://official.test/ir/"};
  const report={companyCode:"toyota",sourceUrl,fiscalYear:2022,quarter:1,revenue:1000,netIncome:100,
    statementRows:[{label:"売上原価",value:800,page:7}]};
  const env=makeEnv({"ir-documents:toyota":JSON.stringify({updatedAt:new Date().toISOString(),
    documents:[{title:"2027年3月期 決算短信",url:"https://official.test/current.pdf"}]})});
  env.ASSETS.fetch=async()=>Response.json({version:1,reportsByCompany:{toyota:[report]},documentsByCompany:{toyota:[document,
    {...document,url:"https://unverified.test/report.pdf"},
    {...document,companyCode:"sony"}, {...document,discoveredFrom:"https://unverified.test/ir/"}]}});
  globalThis.fetch=()=>{throw new Error("外部取得は不要");};
  const response=await worker.fetch(new Request("https://site.test/api/official-reports?company=toyota"),env,{});
  const payload=await response.json();
  assert.deepEqual(payload.reports,[report]);
  assert.equal(payload.documents.filter(row=>row.url===sourceUrl).length,1);
  assert.equal(payload.documents.length,2);
});
test('追加希望は正規化してDBに保存し、状態フィールドの指定を無視する', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname,'/rest/v1/earn_company_requests');
    assert.equal(options.headers.Prefer,'return=minimal');
    assert.deepEqual(JSON.parse(options.body),{company_name:'キオクシア',stock_code:'285A'});
    return new Response(null,{status:201});
  };
  const response = await worker.fetch(new Request('https://site.test/api/company-requests',{
    method:'POST',headers:{'Content-Type':'application/json',Origin:'https://site.test'},
    body:JSON.stringify({company_name:' キオクシア ',stock_code:'２８５ａ',status:'added'}),
  }),makeEnv(),{});
  assert.equal(response.status,201); assert.deepEqual(await response.json(),{saved:true});
});
test('追加希望の不正入力・別サイトからの送信・DB障害を成功扱いしない', async () => {
  globalThis.fetch = async () => new Response(null,{status:403});
  const send = (body,headers={}) => worker.fetch(new Request('https://site.test/api/company-requests',{
    method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),
  }),makeEnv(),{});
  for (const body of [{company_name:''},{company_name:'a'.repeat(121)},{company_name:'企業',stock_code:'12345'},null]) {
    assert.equal((await send(body)).status,400);
  }
  assert.equal((await send({company_name:'企業'}, {Origin:'https://other.test'})).status,403);
  assert.equal((await send({company_name:'企業'})).status,503);
  assert.equal((await worker.fetch(new Request('https://site.test/api/company-requests'),makeEnv(),{})).status,405);
});
afterEach(() => { globalThis.fetch = originalFetch; });

function makeEnv(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    records,
    STOCK_PRICES: {
      async get(key) { return JSON.parse(records.get(key) ?? "null"); },
      async put(key, value) { records.set(key, value); },
    },
    IR_DOCUMENTS: {
      async get(key) { return JSON.parse(records.get(key) ?? "null"); },
      async put(key, value) { records.set(key, value); },
    },
    ASSETS: {
      async fetch() { return Response.json({ supabase: { url: "https://example.supabase.co", key: "public-key" } }); },
    },
  };
}

function chartResponse(close = 100) {
  return Response.json({ chart: { result: [{
    timestamp: [1_700_000_000],
    indicators: { quote: [{ open: [90], high: [110], low: [80], close: [close] }] },
  }] } });
}

test("事前解析した内訳は会社と現在の公式原本URLが一致する資料だけ配信する", async () => {
  const sourceUrl = "https://official.test/report.pdf";
  const report = { companyCode:"toyota",sourceUrl,revenue:1000,netIncome:100,
    statementRows:[{label:"売上原価",value:800,page:10}] };
  const env = makeEnv({"ir-documents:toyota":JSON.stringify({updatedAt:new Date().toISOString(),
    documents:[{title:"2027年3月期 第1四半期 決算要旨",url:sourceUrl}]})});
  env.ASSETS.fetch = async () => Response.json({version:1,reportsByCompany:{toyota:[report,
    {...report,companyCode:"sony"},{...report,sourceUrl:"https://unverified.test/report.pdf"},
    {...report,statementRows:[{label:"bad",value:null,page:10}]}]}});
  globalThis.fetch = () => {throw new Error("公式PDFの再取得は不要");};
  const response = await worker.fetch(new Request("https://site.test/api/official-reports?company=toyota"),env,{});
  const payload = await response.json();
  assert.deepEqual(payload.reports,[report]);
  assert.equal(payload.reports[0].statementRows[0].value,800);
});

test("保存済みの株価を返し、外部APIを呼ばない", async () => {
  const saved = { symbol: "7203.T", interval: "1wk", prices: [{ close: 100 }], updatedAt: new Date().toISOString() };
  const env = makeEnv({ "stock-prices:7203.T": JSON.stringify(saved) });
  globalThis.fetch = () => { throw new Error("外部APIを呼んではいけません"); };
  const response = await worker.fetch(new Request("https://site.test/api/stock-prices?symbol=7203.T"), env, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ...saved, stale: false });
});

test("保存値がなければ株価を取得して保存する", async () => {
  const env = makeEnv();
  globalThis.fetch = async () => chartResponse();
  const response = await worker.fetch(new Request("https://site.test/api/stock-prices?symbol=7203.T"), env, {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).prices[0].close, 100);
  assert.equal(JSON.parse(env.records.get("stock-prices:7203.T")).prices[0].close, 100);
});

test("定期実行は有効な銘柄を重複なしで更新する", async () => {
  const env = makeEnv();
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "example.supabase.co") {
      return Response.json([{ code: "toyota", stock_code: "7203" }, { code: "duplicate", stock_code: "7203" }, { code: "kioxia", stock_code: "285A" }, { code: "bad", stock_code: "bad" }]);
    }
    requested.push(url.pathname);
    return chartResponse();
  };
  await worker.scheduled({}, env, {});
  assert.deepEqual(requested.sort(), ["/v8/finance/chart/285A.T", "/v8/finance/chart/7203.T"]);
  assert.equal(env.records.size, 2);
});

test("一部の取得失敗を報告し、成功した銘柄は保存する", async () => {
  const env = makeEnv();
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "example.supabase.co") return Response.json([{ code: "toyota", stock_code: "7203" }, { code: "kioxia", stock_code: "285A" }]);
    return url.pathname.endsWith("7203.T") ? chartResponse() : new Response("unavailable", { status: 503 });
  };
  await assert.rejects(worker.scheduled({}, env, {}), /285A.T/);
  assert.ok(env.records.has("stock-prices:7203.T"));
  assert.ok(!env.records.has("stock-prices:285A.T"));
});

test("公式IR資料APIは保存済みの資料を返す", async () => {
  const saved = { documents: [{ title: "決算短信", url: "https://example.test/report.pdf" }], updatedAt: "2026-10-01T00:00:00Z" };
  const env = makeEnv({ "ir-documents:toyota": JSON.stringify(saved) });
  const response = await worker.fetch(new Request("https://site.test/api/ir-documents?company=toyota"), env, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), saved);
});

test("IR定期実行は公式ページの決算PDFを保存する", async () => {
  const env = makeEnv();
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.hostname === "example.supabase.co") {
      return Response.json([{ code: "toyota", stock_code: "7203", ir_url: "https://global.toyota/jp/ir/financial-results/" }]);
    }
    return new Response('<h2>2027年3月期</h2><a href="/2027_1q_summary_jp.pdf">決算要旨</a>');
  };
  await worker.scheduled({ cron: "0 10 * * *" }, env, {});
  const saved = JSON.parse(env.records.get("ir-documents:toyota"));
  assert.equal(saved.documents.length, 1);
  assert.equal(saved.documents[0].url, "https://global.toyota/2027_1q_summary_jp.pdf");
});

test("古い週足はAPIアクセス時に更新し、手動更新は日次保存値を再取得する", async () => {
  for (const query of ["", "&refresh=1"]) {
    const age = query ? 120_000 : 7 * 3600_000;
    const saved = { prices: [{ close: 1 }], updatedAt: new Date(Date.now() - age).toISOString() };
    const env = makeEnv({ "stock-prices:7203.T": JSON.stringify(saved) });
    globalThis.fetch = async () => chartResponse(200);
    const response = await worker.fetch(new Request(`https://site.test/api/stock-prices?symbol=7203.T${query}`), env, {});
    assert.equal((await response.json()).prices[0].close, 200);
  }
});

test("最新株価APIは1時間キャッシュし、期限切れを更新する", async () => {
  const env = makeEnv();
  let count = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get("interval"), "1m");
    count++;
    return Response.json({ chart: { result: [{ meta: { currency: "JPY", regularMarketPrice: 101,
      previousClose: 100, regularMarketTime: 1791873000 } }] } });
  };
  const request = new Request("https://site.test/api/stock-quote?symbol=7203.T");
  const first = await worker.fetch(request, env, {});
  assert.equal(first.headers.get("Cache-Control"), "no-store");
  assert.equal((await first.json()).change, 1);
  await worker.fetch(request, env, {});
  assert.equal(count, 1);
  const saved = JSON.parse(env.records.get("stock-quote:7203.T"));
  saved.updatedAt = new Date(Date.now() - 30 * 60_000).toISOString();
  env.records.set("stock-quote:7203.T", JSON.stringify(saved));
  await worker.fetch(request, env, {});
  assert.equal(count, 1);
  saved.updatedAt = new Date(Date.now() - 3_600_001).toISOString();
  env.records.set("stock-quote:7203.T", JSON.stringify(saved));
  await worker.fetch(request, env, {});
  assert.equal(count, 2);
});

test("市場API障害時は前回値にstaleを付け、初回障害は502を返す", async () => {
  globalThis.fetch = async () => new Response("failure", { status: 503 });
  const saved = { price: 100, updatedAt: "2020-01-01T00:00:00Z" };
  const request = new Request("https://site.test/api/stock-quote?symbol=7203.T");
  const response = await worker.fetch(request, makeEnv({ "stock-quote:7203.T": JSON.stringify(saved) }), {});
  const data = await response.json();
  assert.equal(data.price, 100);
  assert.equal(data.stale, true);
  assert.equal((await worker.fetch(request, makeEnv(), {})).status, 502);
});

test("株価と業績APIは不正な銘柄を外部へ送らない", async () => {
  globalThis.fetch = () => { throw new Error("外部に接続しない"); };
  for (const path of ["stock-quote", "financial-results", "stock-prices", "daily-stock-prices"]) {
    assert.equal((await worker.fetch(new Request(`https://site.test/api/${path}?symbol=../../evil`), makeEnv(), {})).status, 400);
  }
});

test("日足APIはMA準備期間の2年分を52週に切らず保存し、日本時間・1時間キャッシュを使う", async () => {
  let calls=0;
  globalThis.fetch = async (input) => {
    const url=new URL(input);
    assert.equal(url.searchParams.get("interval"),"1d");
    assert.equal(url.searchParams.get("range"),"2y");
    calls++;
    const values=Array.from({length:140},(_,index)=>index===3?null:100+index);
    return Response.json({chart:{result:[{timestamp:values.map((_,index)=>1700000000+index*86400),
      indicators:{quote:[{open:values,high:values,low:values,close:values}]}}]}});
  };
  const env=makeEnv();
  const request=new Request("https://site.test/api/daily-stock-prices?symbol=7203.T");
  const first=await (await worker.fetch(request,env,{})).json();
  assert.equal(first.interval,"1d");
  assert.equal(first.prices.length,139);
  assert.equal(first.prices[0].date,"2023-11-15");
  await worker.fetch(request,env,{});
  assert.equal(calls,1);
  const saved=JSON.parse(env.records.get("daily-stock-prices:7203.T"));
  saved.updatedAt=new Date(Date.now()-3_600_001).toISOString();
  env.records.set("daily-stock-prices:7203.T",JSON.stringify(saved));
  await worker.fetch(request,env,{});
  assert.equal(calls,2);
});

test("業績APIは実績の単独四半期を返し、1日キャッシュする", async () => {
  let count = 0;
  globalThis.fetch = async (input) => {
    assert.ok(new URL(input).searchParams.get("type").includes("annualTotalRevenue"));
    count++;
    return Response.json({ timeseries: { result: [
      ["quarterlyTotalRevenue", 1e9], ["quarterlyNetIncome", 1e8], ["quarterlyPretaxIncome", 2e8],
    ].map(([type, raw]) => ({ meta: { type: [type] }, [type]: [{ asOfDate: "2026-06-30",
      currencyCode: "JPY", periodType: "3M", reportedValue: { raw } }] })) } });
  };
  const env = makeEnv();
  const request = new Request("https://site.test/api/financial-results?symbol=7203.T");
  const data = await (await worker.fetch(request, env, {})).json();
  assert.equal(data.results[0].revenue, 1000);
  assert.equal(data.results[0].operatingIncome, null);
  const saved = JSON.parse(env.records.get("financial-results:7203.T"));
  saved.updatedAt = new Date(Date.now() - 23 * 3_600_000).toISOString();
  env.records.set("financial-results:7203.T", JSON.stringify(saved));
  await worker.fetch(request, env, {});
  assert.equal(count, 1);
  saved.updatedAt = new Date(Date.now() - 25 * 3_600_000).toISOString();
  env.records.set("financial-results:7203.T", JSON.stringify(saved));
  await worker.fetch(request, env, {});
  assert.equal(count, 2);
});

test("公式決算書の一覧は1日の保存値を使い、初回は公式ページを確認する", async () => {
  const saved = { documents: [{ title: "2027年3月期 第1四半期 決算要旨", url: "https://official.test/report.pdf" }], updatedAt: new Date(Date.now() - 12 * 3_600_000).toISOString() };
  let env = makeEnv({ "ir-documents:toyota":JSON.stringify(saved) });
  globalThis.fetch = () => { throw new Error("保存値を使う"); };
  const request = new Request("https://site.test/api/official-reports?company=toyota");
  const cachedResponse = await (await worker.fetch(request,env,{})).json();
  assert.equal(cachedResponse.documents.length,1);
  assert.equal(cachedResponse.stale,false);
  env=makeEnv();
  globalThis.fetch=async input => new URL(input).hostname === "example.supabase.co"
    ? Response.json([{code:"toyota",stock_code:"7203",ir_url:"https://official.test/ir/"}])
    : new Response('<a href="/report.pdf">2027年3月期 第1四半期 決算要旨</a>');
  assert.equal((await (await worker.fetch(request,env,{})).json()).documents.length,1);
  assert.ok(env.records.has("ir-documents:toyota"));
});

test("PDF中継は保存済み公式原本だけを許可し、任意URLを取得しない", async () => {
  const env=makeEnv({"ir-documents:toyota":JSON.stringify({documents:[{title:"決算要旨",url:"https://official.test/report.pdf"}]})});
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response("%PDF-1.7 test",{headers:{"Content-Type":"application/pdf"}});};
  const bad = await worker.fetch(new Request("https://site.test/api/report-pdf?company=toyota&url=https://evil.test/report.pdf"),env,{});
  assert.equal(bad.status,403);
  assert.equal(calls,0);
  const good=await worker.fetch(new Request("https://site.test/api/report-pdf?company=toyota&url=https://official.test/report.pdf"),env,{});
  assert.equal(good.status,200);
  assert.equal(good.headers.get("Content-Type"),"application/pdf");
  assert.equal(good.headers.get("Cache-Control"),"public, max-age=86400");
  assert.equal(calls,1);
  globalThis.fetch=async()=>new Response("<html>error</html>");
  assert.equal((await worker.fetch(new Request("https://site.test/api/report-pdf?company=toyota&url=https://official.test/report.pdf"),env,{})).status,502);
});
