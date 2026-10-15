import { readFile, writeFile } from "node:fs/promises";
import { extractStatement, quarterlyStatements } from "./financial-reports.js";
import { selectStatementDocuments } from "./report-metadata.js";
import { discoverIrDocuments } from "./ir.js";

const site = "https://earningsviewer.gongonticktack.workers.dev";
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const history = process.argv.includes("--history");
const requested = new Set(process.argv.slice(2).filter((value) => !value.startsWith("--")));
const appSource = await readFile(new URL("./app.js", import.meta.url), "utf8");
const sourcePages = new Map([...appSource.matchAll(/code:\s*"([a-z0-9-]+)"[\s\S]*?sourcePage:\s*"([^"]+)"/g)]
  .map((match) => [match[1], match[2]]));
const companies = [...html.matchAll(/data-company="([^"]+)"[^>]*>[\s\S]*?<small>([0-9A-Z]{4})<\/small>/g)]
  .map((match) => ({ code: match[1], ticker: match[2] })).filter((company) => !requested.size || requested.has(company.code));
const target = new URL("./statement-data.json", import.meta.url);
let previous = { version: 1, reportsByCompany: {} };
try { previous = JSON.parse(await readFile(target, "utf8")); } catch { /* 初回は空から作成します。 */ }
const output = { version: 1, generatedAt: new Date().toISOString(), reportsByCompany: { ...previous.reportsByCompany },
  documentsByCompany: { ...previous.documentsByCompany }, failures: { ...previous.failures } };
for (const [code, documents] of Object.entries(output.documentsByCompany)) {
  for (const document of documents) {
    if (!document.officialIrUrl && document.discoveredFrom && sourcePages.has(code)
        && new URL(document.discoveredFrom).origin === new URL(sourcePages.get(code)).origin) {
      document.officialIrUrl = sourcePages.get(code);
    }
  }
}

/** 概要: 公式原本を解析し、履歴モードでは2022年度以降のアーカイブも配信用に保存します。引数: company - 会社と証券コード。戻り値: 完了を示すPromise。 */
async function syncCompany(company) {
  delete output.failures[company.code];
  const reports = new Map((previous.reportsByCompany?.[company.code] ?? []).map((report) => [report.sourceUrl, report]));
  const failures = [];
  try {
    let documents;
    if (history) {
      const ir_url = sourcePages.get(company.code);
      if (!ir_url) throw new Error("公式IRの登録がありません");
      documents = await discoverIrDocuments({ code: company.code, ir_url }, fetch, { history: true });
    } else {
      const response = await fetch(`${site}/api/official-reports?company=${company.code}`, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`一覧取得 ${response.status}`);
      ({ documents } = await response.json());
    }
    const verified = new Map((previous.documentsByCompany?.[company.code] ?? []).map((document) => [document.url, document]));
    for (const document of selectStatementDocuments(documents)) {
      try {
        const years = [...`${document.title} ${document.url}`.matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
        if (history && years.length && Math.max(...years) < 2022) continue;
        if (history && reports.has(document.url) && !process.argv.includes("--reparse")) {
          const report = reports.get(document.url);
          if (document.discoveredFrom) verified.set(document.url, { ...document, fiscalYear: report.fiscalYear,
            quarter: report.quarter, officialIrUrl: document.officialIrUrl ?? sourcePages.get(company.code), verifiedAt: output.generatedAt });
          continue;
        }
        let pdf = await fetch(history ? document.url : `${site}/api/report-pdf?company=${company.code}&url=${encodeURIComponent(document.url)}`, { signal: AbortSignal.timeout(40000) });
        // 配信環境から接続できない公式ホストは、確認済みの原本URLを同期端末から取得します。
        if (!pdf.ok) pdf = await fetch(document.url, { signal: AbortSignal.timeout(40000), headers:{Accept:"application/pdf"} });
        if (!pdf.ok) throw new Error(`PDF取得 ${pdf.status}`);
        const bytes = new Uint8Array(await pdf.arrayBuffer());
        if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("原本が解析上限を超えています");
        const report = await extractStatement(bytes, company.code, document.url, company.ticker);
        if (!report) throw new Error("対応できない決算書形式");
        if (history && report.fiscalYear < 2022) continue;
        reports.set(document.url, report);
        if (document.discoveredFrom) verified.set(document.url, { ...document, fiscalYear: report.fiscalYear,
          quarter: report.quarter, officialIrUrl: document.officialIrUrl ?? sourcePages.get(company.code), verifiedAt: output.generatedAt });
        console.log(`${company.code}: ${report.fiscalYear}年度 Q${report.quarter} ${report.periodEnd}`);
      } catch (error) { failures.push({ url: document.url, error: error.message }); }
    }
    output.reportsByCompany[company.code] = [...reports.values()].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    output.documentsByCompany[company.code] = [...verified.values()];
  } catch (error) { failures.push({ error: error.message }); }
  if (failures.length) output.failures[company.code] = failures;
  console.log(`${company.code}: ${reports.size}件の内訳 / 未取得${failures.length}件`);
}

// 同時解析を2社に抑えて、PDF解析のメモリ使用量を制限します。
for (let index = 0; index < companies.length; index += 2) {
  await Promise.all(companies.slice(index, index + 2).map(syncCompany));
  output.coverageByCompany = Object.fromEntries([...sourcePages.keys()].map((code) => {
    const reports = output.reportsByCompany[code] ?? [];
    const quarters = quarterlyStatements(reports);
    return [code, { fromFiscalYear:2022, years:Object.fromEntries(Array.from({length:5},(_,index)=>{
      const year=2022+index;
      return [year,[...new Set(quarters.filter((report)=>report.fiscalYear===year).map((report)=>report.quarter))].sort()];
    })), reportCount:reports.length }];
  }));
  await writeFile(target, JSON.stringify(output, null, 2) + "\n");
}
console.log(`公式原本の解析結果を保存しました（${companies.length}社）。`);
