import assert from "node:assert/strict";
import { test } from "node:test";
import { selectStatementDocuments, sortIrDocuments } from "./report-metadata.js";

test("取得元・取得順・更新日時によらず公表日と年度四半期で新しい資料を上にする", () => {
  const documents=[
    {url:"https://official.test/old.pdf",fiscalYear:2022,quarter:4,updatedAt:"2026-10-15"},
    {url:"https://official.test/2027_1q_summary_jp.pdf",title:"第1四半期決算情報（2026年8月4日）"},
    {url:"https://official.test/2026_4q_summary_jp.pdf",title:"決算情報（2026年5月8日）"},
    {url:"https://official.test/new.pdf",fiscalYear:2026,quarter:1},
    {url:"https://official.test/unknown.pdf",title:"決算資料",updatedAt:"2099-01-01"},
    {url:"https://official.test/revised.pdf",fiscalYear:2025,quarter:4,publishedAt:"2026-08-05T10:00:00Z"},
  ];
  const before=[...documents];
  assert.deepEqual(sortIrDocuments(documents,"toyota").map(row=>row.url.split('/').at(-1)),
    ["revised.pdf","2027_1q_summary_jp.pdf","new.pdf","2026_4q_summary_jp.pdf","old.pdf","unknown.pdf"]);
  assert.deepEqual(documents,before);
});

test("全角の日付、同年の四半期、決算月、年度範囲内の日付を正しく扱う", () => {
  const documents=[
    {url:"https://official.test/a.pdf",title:"2022年度（2022年4月1日～2023年3月31日） / 2023年3月期 決算"},
    {url:"https://official.test/b.pdf",fiscalYear:2022,quarter:3},
    {url:"https://official.test/c.pdf",title:"２０２３年５月１０日 決算資料"},
  ];
  assert.deepEqual(sortIrDocuments(documents).map(row=>row.url.split('/').at(-1)),["c.pdf","a.pdf","b.pdf"]);
  assert.equal(sortIrDocuments([
    {url:"https://official.test/old.pdf",fiscalYear:2024,quarter:4},
    {url:"https://official.test/new.pdf",title:"2026年8月期 第1四半期 決算短信"},
  ],"fast-retailing")[0].url,"https://official.test/new.pdf");
});

test("2022年度の原本を最新4件の後でも切り捨てない", () => {
  const documents = Array.from({length: 5}, (_, index) => ({
    title: `${2027 - index}年3月期 第1四半期 決算短信`,
    url: `https://official.test/${2027 - index}_1q_tanshin.pdf`,
  }));
  assert.equal(selectStatementDocuments(documents).length, 5);
  assert.equal(selectStatementDocuments(documents).at(-1).url, documents.at(-1).url);
});

test("新しい決算短信を優先し、説明会・質疑・英語版・重複を除外する", () => {
  const document = (title,url) => ({title,url});
  const result = selectStatementDocuments([
    document("2026年3月期 決算短信","https://official.test/2026.pdf"),
    document("2027年３月期 第１四半期 決算短信","https://official.test/2027.pdf"),
    document("第1四半期 決算要旨","https://official.test/2027_1q_summary_jp.pdf"),
    document("決算要旨","https://official.test/2027_1q_summary_en.pdf"),
    document("決算短信","https://official.test/eng/tanshin202608_4q_eng.pdf"),
    document("2027年3月期 決算説明会 質疑応答要旨","https://official.test/qa.pdf"),
    document("2027年3月期 決算短信","javascript:evil.pdf"),
    document("2027年３月期 第１四半期 決算短信","https://official.test/2027.pdf"),
  ]);
  assert.equal(result.length,3);
  assert.deepEqual(result.slice(0,2).map(document=>document.url).sort(),
    ["https://official.test/2027.pdf","https://official.test/2027_1q_summary_jp.pdf"].sort());
});
