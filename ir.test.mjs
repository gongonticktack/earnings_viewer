import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverIrDocuments, extractIrLinks } from "./ir.js";

test("履歴同期では公式アーカイブの年度別ページまでたどり、別サイトへ移らない", async () => {
  const pages = new Map([
    ["https://example.co.jp/ir/results/", '<a href="/ir/results/archive/">過去の決算資料</a><a href="https://other.test/ir/results/">決算資料</a>'],
    ["https://example.co.jp/ir/results/archive/", '<a href="/ir/results/archive/2023/">2023年3月期</a>'],
    ["https://example.co.jp/ir/results/archive/2023/", '<a href="/pdf/2023_tanshin.pdf">決算短信</a>'],
  ]);
  const visited = [];
  const documents = await discoverIrDocuments({code:"sample",ir_url:[...pages.keys()][0]}, async (url) => {
    visited.push(url); return new Response(pages.get(url), {status:pages.has(url)?200:404});
  }, {history:true});
  assert.deepEqual(visited,[...pages.keys()]);
  assert.equal(documents[0].discoveredFrom,[...pages.keys()][2]);
});

test("公式ページの相対PDFリンクを解決し、決算資料だけを選ぶ", async () => {
  const html = `
    <h2>2027年3月期</h2><h3>第1四半期決算情報</h3>
    <a href="/pages/2027_1q_summary_jp.pdf">決算要旨</a>
    <a href="/pages/governance.pdf">コーポレートガバナンス</a>`;
  const links = extractIrLinks(html, "https://global.toyota/jp/ir/financial-results/");
  assert.equal(links[0].url, "https://global.toyota/pages/2027_1q_summary_jp.pdf");
  const documents = await discoverIrDocuments(
    { code: "toyota", ir_url: "https://global.toyota/jp/ir/financial-results/" },
    async () => new Response(html),
  );
  assert.equal(documents.length, 1);
  assert.equal(documents[0].sourceName, "official_ir");
});

test("IRトップから同じサイトの決算ページを1段たどる", async () => {
  const pages = new Map([
    ["https://example.co.jp/ir/", '<a href="/ir/financial/results.html">決算関連資料</a>'],
    ["https://example.co.jp/ir/financial/results.html", '<a href="/files/tanshin2027.pdf">決算短信</a>'],
  ]);
  const visited = [];
  const documents = await discoverIrDocuments(
    { code: "sample", ir_url: "https://example.co.jp/ir/" },
    async (url) => { visited.push(url); return new Response(pages.get(url) ?? "", { status: pages.has(url) ? 200 : 404 }); },
  );
  assert.deepEqual(visited, [...pages.keys()]);
  assert.equal(documents[0].url, "https://example.co.jp/files/tanshin2027.pdf");
});

test("HTTP以外のリンクは採用しない", () => {
  const links = extractIrLinks('<a href="javascript:alert(1)">決算短信</a><a href="http://example.test/report.pdf">決算短信</a>', "https://example.test/ir/");
  assert.equal(links.length, 0);
});

test("年度の選択先URLとPDFを返すashx形式を収集し、数値だけの選択値はURLにしない", async () => {
  const links=extractIrLinks('<select><option value="/ir/results/fs2022.html">2022年度</option><option value="2021">2021年度</option></select>',"https://official.test/ir/");
  assert.deepEqual(links.map(link=>link.url),["https://official.test/ir/results/fs2022.html"]);
  const documents=await discoverIrDocuments({code:"murata",ir_url:"https://official.test/ir/"},async()=>new Response('<title>決算短信</title><a href="/media/2023.ashx?la=ja">2023年3月期 第1四半期 (PDF)</a>'));
  assert.equal(documents.length,1);
  assert.match(documents[0].title,/決算短信/);
});

test("追加ページが失敗しても最初のページで見つけた資料を残す", async () => {
  const documents = await discoverIrDocuments(
    { code: "sample", ir_url: "https://example.co.jp/ir/" },
    async (url) => url.endsWith("/ir/")
      ? new Response('<a href="/report.pdf">決算短信</a><a href="/ir/financial/archive.html">決算資料アーカイブ</a>')
      : new Response("missing", { status: 404 }),
  );
  assert.equal(documents.length, 1);
});
