import { parseCashFlowPages } from './cash-flow.js';
const finite = Number.isFinite;
const compact = (text) => text.normalize("NFKC").replace(/[\s|]/g, "");

/**
 * 概要: PDFの文字座標を行ごとに並べ、前期と当期の列順を保存します。
 * 引数: items - PDF.jsの文字要素配列。
 * 戻り値: 上から下、左から右に並べた文字列の配列。
 */
export function statementLines(items) {
  const rows = [];
  for (const item of items) {
    if (typeof item.str !== "string" || !item.str.trim()) continue;
    const y = item.transform?.[5];
    const x = item.transform?.[4];
    if (!finite(y) || !finite(x)) continue;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push({ x, text: item.str });
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => row.items.sort((a, b) => a.x - b.x)
    .map((item) => item.text).join(" "));
}

/**
 * 概要: 決算書の実績期間と年度を読み取ります。業績予想の期間を採用しません。
 * 引数: pages - ページ番号と行配列を持つPDFページ。
 * 戻り値: 年度・四半期・実績期間。期間を確定できなければnull。
 */
export function statementPeriod(pages) {
  const text = compact(pages.filter((page) => page.number <= 3).flatMap((page) => page.lines).join(" "));
  const actual = text.split(/業績予想|連結業績予想/)[0];
  const datePattern = /(20\d{2})年(\d{1,2})月(\d{1,2})日[～~〜－-](20\d{2})年(\d{1,2})月(\d{1,2})日/;
  // 二段組で予想欄が先に抽出されても、「連結業績」の実績見出しに直結する期間だけは採用します。
  const dates = actual.match(datePattern) ?? text.match(new RegExp(`連結業績[（(]${datePattern.source}`));
  if (!dates) return null;
  const values = dates.slice(1).map(Number);
  const [sy, sm, sd, ey, em, ed] = values;
  const iso = (year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const periodStart = iso(sy, sm, sd);
  const periodEnd = iso(ey, em, ed);
  const months = (ey - sy) * 12 + em - sm + (ed >= sd ? 1 : 0);
  if (![3, 6, 9, 12].includes(months) || periodEnd < periodStart
      || Date.parse(periodEnd) > Date.now()) return null;
  return { fiscalYear: sy, quarter: months / 3, periodStart, periodEnd,
    basis: months === 3 ? "quarter" : "cumulative", months };
}

/**
 * 概要: PDFの損益計算書とCF計算書から当期の実績・細目を読み取ります。単位・列を確定できない表は除外します。
 * 引数: pages - PDFページ。companyCode - 会社識別子。sourceUrl - 原本URL。expectedCode - 照合する証券コード（任意）。
 * 戻り値: 出典・ページ・開示されたCFを含む累計または四半期業績。対応外の表はnull。
 */
export function parseStatementPages(pages, companyCode, sourceUrl, expectedCode) {
  const period = statementPeriod(pages);
  if (!period) return null;
  const cover = compact(pages.filter((page) => page.number <= 3).flatMap((page) => page.lines).join(" "));
  if (expectedCode && cover.match(/コード番号[:：]?([0-9A-Z]{4})/)?.[1] !== expectedCode) return null;
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const text = compact(page.lines.join(" "));
    if (!/損益計算|損益及び包括利益計算|包括利益計算書|損益の部/.test(text) || !/(原価|営業費用|経常費用|金融費用)/.test(text)
        || !/(単位[:：]?百万円|百万円)/.test(text) || /\.\.\.|…/.test(page.lines[0] ?? "")) continue;
    const columnHeader = page.lines.find((line) => {
      const value = compact(line);
      return /前(?:連結|第|期|年度|四半期|事業|中間)/.test(value)
        && /当(?:連結|第|期|年度|四半期|事業|中間)/.test(value)
        && !/当社|注[)）]|株式分割/.test(value) && line.length < 160;
    });
    const headerYears = (line) => [...new Set([...line.matchAll(/(20\d{2})(?:年|\/)/g)].map((match) => Number(match[1])))];
    const datedHeader = page.lines.find((line) => headerYears(line).length === 2 && line.length < 160);
    if (!columnHeader && !datedHeader) continue;
    const dates = datedHeader ? headerYears(datedHeader) : [];
    const currentColumn = columnHeader ? (compact(columnHeader).indexOf("当") > compact(columnHeader).indexOf("前") ? 1 : 0)
      : dates[1] > dates[0] ? 1 : 0;
    const rows = [];
    let preceding = "";
    let group = null;
    const pageLines = [page, pages[index + 1]].filter(Boolean).flatMap((source) => source.lines.map((raw) => ({ raw, number: source.number })));
    for (const { raw, number } of pageLines) {
      const line = compact(raw);
      if (rows.length && /包括利益計算書/.test(line)) break;
      if (rows.length && /^(その他の包括利益|純損益に振替えられる)/.test(line)) break;
      if (rows.length && /貸借対照表|財政状態計算書|キャッシュ.*フロー計算書/.test(line)) break;
      if (/単位[:：]?円/.test(line)) break;
      const match = raw.normalize("NFKC").trim().match(/^(.+?)\s+((?:[△▲−-]?\d[\d,]*(?:\.\d+)?|[－―—-])(?:\s+(?:[△▲−-]?\d[\d,]*(?:\.\d+)?|[－―—-])){1,6})$/);
      if (!match) {
        if (!/\d/.test(line)) preceding = line;
        if (/^(販売費及び一般管理費|営業外収益|営業外費用|特別利益|特別損失|投資損益|収益|原価)$/.test(line)) group = line;
        continue;
      }
      let label = compact(match[1]).replace(/(?:注)?\d+$/, "");
      if (!/[一-龠ぁ-んァ-ヶA-Za-z]/.test(label)) continue;
      if (/^特別/.test(group ?? "") && /^(営業利益|経常利益|税引前|税金等調整前|法人|四半期|親会社|当社|非支配|特別利益|特別損失)/.test(label)
          && label !== `${group}合計`) group = null;
      if (/^(利益|純利益|四半期利益|四半期純利益|当期利益|当期純利益)$/.test(label)
          && /親会社/.test(preceding)) label = preceding + label;
      // 売上比率などの小数列を除いて、前期・当期の金額列を選びます。
      const amounts = match[2].split(/\s+/).filter((value) => !value.includes("."));
      const token = amounts[currentColumn];
      if (!token) continue;
      // ダッシュは非開示/該当なしであり、根拠なくゼロに変えません。
      if (/^[－―—-]$/.test(token)) continue;
      const value = Number(token.replace(/[△▲−]/, "-").replaceAll(",", ""));
      if (finite(value)) rows.push({ label, value, page: number, group });
      if (/合計$/.test(label)) group = null;
      if (/^(特別利益|特別損失)$/.test(label)) group = label;
      preceding = "";
    }
    const pick = (regex) => rows.find((row) => regex.test(row.label))?.value ?? null;
    const revenue = pick(/^(営業収益合計|売上収益合計|売上高合計|収益合計)$/)
      ?? pick(/^(売上収益|売上高|営業収益|経常収益|収益)$/);
    const operatingIncome = pick(/^営業(利益|損失)/);
    const pretaxIncome = pick(/^(税引前|税金等調整前).*(利益|損失)/) ?? pick(/^経常(利益|損失)/);
    const netIncome = pick(/^親会社(の所有者|所有者|株主).*(利益|損失)/)
      ?? pick(/^親会社の所有者$/) ?? pick(/^親会社株主持分$/)
      ?? pick(/^当社(?:株主)?に帰属する.*利益$/) ?? pick(/^当社株主$/) ?? pick(/^当社の所有者$/);
    if (!finite(revenue) || revenue <= 0 || !finite(netIncome)
        || (!finite(operatingIncome) && !finite(pretaxIncome))) continue;
    // 表紙の当期連結業績に主要値が存在することも照合し、前期列の誤採用を防ぎます。
    const front = compact(pages.filter((p) => p.number <= 3).flatMap((p) => p.lines).join(" "));
    if (![revenue, netIncome].every((value) => front.includes(Math.abs(value).toLocaleString("en-US")))) continue;
    const reportedCost = pick(/^(経常費用|営業費用|営業費用合計)$/);
    return { ...period, companyCode, revenue, operatingIncome, pretaxIncome, netIncome,
      operatingCost: reportedCost ?? revenue - (operatingIncome ?? pretaxIncome), statementRows: rows,
      cashFlow: parseCashFlowPages(pages, period),
      signedExpenses: /△は[^)）]{0,60}費用/.test(text) || (pick(/^(売上原価|原価|原価合計)$/) < 0 && pick(/^販売費及び一般管理費$/) < 0),
      operatingCostLabel: reportedCost !== null ? (rows.some((row) => row.label === "経常費用") ? "決算書の経常費用" : "決算書の営業費用")
        : operatingIncome !== null ? "売上収益−営業利益（差額）" : "収益−税引前利益（差額）",
      sourceName: "公式決算書", sourceUrl, sourcePages: [...new Set(rows.map((row) => row.page))],
      sourceUrls: [sourceUrl], updatedAt: new Date().toISOString() };
  }
  return null;
}

/**
 * 概要: 公式PDFを読み、損益と後続のキャッシュフロー計算書を解析します。
 * 引数: bytes - PDFバイナリ。companyCode - 会社識別子。sourceUrl - 原本URL。expectedCode - 照合する証券コード（任意）。
 * 戻り値: 損益と開示されたCFを含む業績、またはnullを返すPromise。
 */
export async function extractStatement(bytes, companyCode, sourceUrl, expectedCode) {
  const { getDocument, GlobalWorkerOptions } = await import("./vendor/pdf-reader.js");
  GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf-worker.js", import.meta.url).href;
  const root = new URL("./vendor/", import.meta.url);
  const resourceBase = root.protocol === "file:"
    ? decodeURIComponent(root.pathname).replace(/^\/([A-Za-z]:)/, "$1") : root.href;
  const task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true,
    disableFontFace: true, verbosity: 0,
    cMapUrl: `${resourceBase}cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${resourceBase}standard_fonts/` });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error("ページ数が解析上限を超えています");
    const pages = [];
    for (let number = 1; number <= Math.min(pdf.numPages, 70); number++) {
      const page = await pdf.getPage(number);
      const { items } = await page.getTextContent();
      pages.push({ number, lines: statementLines(items) });
      // CF計算書は損益計算書の後ろに載るため、途中で解析を終了しません。
      page.cleanup();
    }
    return parseStatementPages(pages, companyCode, sourceUrl, expectedCode);
  } finally { await task.destroy(); }
}

/**
 * 概要: 累計から直前の累計を引いて単独四半期を作ります。基準期間がない累計は変換しません。
 * 引数: reports - 抽出した公式決算書の配列。
 * 戻り値: 根拠を保持した単独四半期配列。
 */
export function quarterlyStatements(reports) {
  return reports.flatMap((report) => {
    let result = report;
    if (report.quarter > 1) {
      const prior = reports.find((row) => row.fiscalYear === report.fiscalYear
        && row.periodStart === report.periodStart && row.quarter === report.quarter - 1);
      if (!prior) return [];
      const difference = (key) => finite(report[key]) && finite(prior[key]) ? report[key] - prior[key] : null;
      const key = (row) => `${row.group ?? ""}:${row.label}`;
      const precedingLabels = new Map(prior.statementRows.map((row) => [key(row), row]));
      result = { ...report, revenue: difference("revenue"), operatingIncome: difference("operatingIncome"),
        pretaxIncome: difference("pretaxIncome"), operatingCost: difference("operatingCost"), netIncome: difference("netIncome"),
        statementRows: report.statementRows.filter((row) => precedingLabels.has(key(row)))
          .map((row) => ({ ...row, value: row.value - precedingLabels.get(key(row)).value })),
        sourceUrls: [report.sourceUrl, prior.sourceUrl], basis: "quarter-difference", cumulativeStart: report.periodStart,
        periodStart: new Date(Date.parse(prior.periodEnd) + 86400000).toISOString().slice(0, 10) };
    }
    if (!finite(result.revenue) || result.revenue <= 0 || !finite(result.netIncome)) return [];
    return [{ ...result, id: `${result.companyCode}-official-${result.periodEnd}`, periodType: `Q${result.quarter}` }];
  }).sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}

/**
 * 概要: 公式の単独四半期を既存データへ統合します。内訳と主要値を同じ原本で揃えます。
 * 引数: existing - 既存業績。reports - 解析済みの公式決算書。
 * 戻り値: 公式決算書を優先した業績配列。
 */
export function mergeOfficialStatements(existing, reports) {
  const official = quarterlyStatements(reports);
  const key = (row) => {
    const matched = official.find((candidate) => candidate.periodEnd === row.periodEnd);
    const period = matched ?? row;
    return period.fiscalYear !== undefined && period.quarter !== undefined
      ? `${period.fiscalYear}:Q${period.quarter}` : row.periodEnd;
  };
  return [...new Map([...existing, ...official].map((row) => [key(row), row])).values()]
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
}
