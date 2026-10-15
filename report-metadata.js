import { fiscalYearFromPeriod } from "./market.js";

/**
 * 概要: 公表日、資料名の日付、原本URL、決算期間の順に根拠を探し、資料を新しい順に並べます。
 * 引数: documents - 複数の取得元を結合した資料配列。companyCode - 決算月の判定に使う会社コード（任意）。
 * 戻り値: 元の配列を変更せず、日付不明の資料を末尾にした配列。同日の順序もURLで固定します。
 */
export function sortIrDocuments(documents, companyCode) {
  return [...(documents ?? [])].sort((a, b) => documentDate(b, companyCode ?? b.companyCode) - documentDate(a, companyCode ?? a.companyCode)
    || String(a.url ?? "").localeCompare(String(b.url ?? "")));
}

/**
 * 概要: 資料の並べ替え用の日付を求めます。取得・更新日時は公表日として使いません。
 * 引数: document - 公式資料のメタデータ。companyCode - 決算月を判定する会社コード。
 * 戻り値: YYYYMMDDの数値。期間も公表日も分からない場合は0。
 */
function documentDate(document, companyCode) {
  const date = (year, month, day = 1) => {
    const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return value.getUTCFullYear() === Number(year) && value.getUTCMonth() + 1 === Number(month)
      && value.getUTCDate() === Number(day) ? Number(year) * 10000 + Number(month) * 100 + Number(day) : 0;
  };
  const published = String(document.publishedAt ?? "").match(/^(20\d{2})-(\d{2})-(\d{2})(?:T|$)/);
  if (published && date(...published.slice(1))) return date(...published.slice(1));
  const title = String(document.title ?? "").normalize("NFKC");
  const url = String(document.url ?? "").normalize("NFKC");
  const announced = [...title.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)].find((match) =>
    !/[～~〜－-]/.test(title[match.index - 1] ?? "")
      && !/^[\s]*[～~〜－-]/.test(title.slice(match.index + match[0].length)));
  if (announced && date(...announced.slice(1))) return date(...announced.slice(1));
  const urlDate = url.match(/(?:^|\D)(20\d{2})[\/_-]?(0[1-9]|1[0-2])[\/_-]?([0-2]\d|3[01])(?:\D|$)/);
  if (urlDate && date(...urlDate.slice(1))) return date(...urlDate.slice(1));
  // 日立の公式発表ページは /2026/01/0129/ のように公表日を保持します。
  const releasePath = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})(\d{2})\//);
  if (releasePath && releasePath[2] === releasePath[3] && date(releasePath[1], releasePath[2], releasePath[4])) {
    return date(releasePath[1], releasePath[2], releasePath[4]);
  }
  const period = officialDocumentPeriod(document, companyCode);
  if (period.periodEnd) return Number(period.periodEnd.replaceAll("-", ""));
  if (period.fiscalYear) {
    const endMonth = companyCode === "fast-retailing" ? 8 : 3;
    const end = new Date(Date.UTC(period.fiscalYear + 1, endMonth - (4 - (period.quarter || 4)) * 3, 0));
    return date(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate());
  }
  return 0;
}

/**
 * 概要: 発見した公式資料から損益計算書を含む決算短信・要旨を新しい順に選びます。
 * 引数: documents - 公式IR資料配列。
 * 戻り値: 原本URLが重複しない決算書配列。履歴を件数で切り捨てません。
 */
export function selectStatementDocuments(documents) {
  return sortIrDocuments([...new Map((documents ?? []).filter((document) => {
    const text = `${document.title} ${document.url}`.normalize("NFKC");
    return /^https:\/\//.test(document.url ?? "") && /\.(?:pdf|ashx)(?:$|[?#])/i.test(document.url)
      && /決算短信|決算要旨|summary_jp|tanshin|financial.*statements?/i.test(text)
      && !/質疑|presentation|_qa_|_en\./i.test(text)
      && !/\/en\/|\/eng\/|\/english\/|_eng\.pdf|[0-9]e\.pdf/i.test(document.url)
      && (!/経営計画|plan_/i.test(text) || /決算短信|決算要旨/.test(document.title))
      && !/決算説明資料/.test(document.title)
      && (!/説明会/.test(text) || /決算短信/.test(document.title));
  }).map((document) => [document.url, document])).values()]);
}
/**
 * 概要: 公表日とは独立に、原本の対象期間を開始年度・四半期へ統一します。
 * 引数: document - 資料のメタデータ。companyCode - 会社コード。reports - 照合済み原本の解析結果。
 * 戻り値: fiscalYear、quarter、periodEnd。不明な項目はnull。
 */
export function officialDocumentPeriod(document, companyCode, reports = []) {
  const report = reports.find((row) => row.sourceUrl === document.url);
  const source = report ?? document;
  const title = String(document.title ?? "").normalize("NFKC");
  const url = String(document.url ?? "").normalize("NFKC");
  const text = `${title} ${url}`;
  const match = text.match(/第\s*([1-4])\s*四半期|q([1-4])|([1-4])q/i);
  let quarter = Number(source.quarter) || Number(match?.slice(1).find(Boolean))
    || (/中間|半期/.test(title) ? 2 : /通期|_An\.pdf|_fy_01\.pdf/i.test(text) ? 4 : null);
  if (!(quarter >= 1 && quarter <= 4)) quarter = null;
  let periodEnd = /^20\d{2}-\d{2}-\d{2}$/.test(source.periodEnd ?? "") ? source.periodEnd : null;
  let endYear = null;
  let endMonth = companyCode === "fast-retailing" ? 8 : 3;
  const ending = title.match(/(20\d{2})年\s*(\d{1,2})月期/)
    ?? url.match(/(20\d{2})(0[1-9]|1[0-2])(?:[_-]?[1-4]q|q[1-4])/i);
  if (ending) {
    endYear = Number(ending[1]); endMonth = Number(ending[2]);
    if (!quarter && /決算短信|決算要旨/.test(title) && !/四半期/.test(title)) quarter = 4;
  }
  const toyota = (!companyCode || companyCode === "toyota") && url.match(/\/(20\d{2})_[1-4]q_/i);
  const tel = companyCode === "tokyo-electron" && url.match(/\/fy(\d{2})q[1-4]/i);
  const hitachi = companyCode === "hitachi" && url.match(/\/(20\d{2})_(?:[1-3]q|an)\.pdf/i);
  if (!endYear && toyota) endYear = Number(toyota[1]);
  if (!endYear && tel) endYear = 2000 + Number(tel[1]);
  if (!endYear && hitachi) endYear = Number(hitachi[1]) + 1;
  const mufg = companyCode === "mufg" && url.match(/summary(\d{2})(03|06|09|12)_ja\.pdf/i);
  if (!periodEnd && mufg) {
    quarter = { "03": 4, "06": 1, "09": 2, "12": 3 }[mufg[2]];
    periodEnd = new Date(Date.UTC(2000 + Number(mufg[1]), Number(mufg[2]), 0)).toISOString().slice(0, 10);
  }
  if (!periodEnd && endYear && quarter && endMonth >= 1 && endMonth <= 12) {
    periodEnd = new Date(Date.UTC(endYear, endMonth - (4 - quarter) * 3, 0)).toISOString().slice(0, 10);
  }
  const startYear = title.match(/(20\d{2})年度|\bFY\s*(20\d{2})\b/i)?.slice(1).find(Boolean);
  const fiscalYear = periodEnd && quarter ? fiscalYearFromPeriod(periodEnd, quarter)
    : Number(source.fiscalYear) || Number(startYear) || null;
  return { fiscalYear, quarter, periodEnd };
}
