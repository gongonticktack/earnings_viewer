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
  const period = String(document.periodEnd ?? "").match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (period && date(...period.slice(1))) return date(...period.slice(1));
  const text = `${title} ${url}`;
  const quarter = Number(document.quarter) || Number(text.match(/第\s*([1-4])\s*四半期|(?:^|[^a-z])q([1-4])|([1-4])q/i)?.slice(1).find(Boolean));
  const endPeriod = title.match(/(20\d{2})年\s*(\d{1,2})月期/)
    ?? url.match(/(20\d{2})(0[1-9]|1[0-2])(?:[_-]?[1-4]q|q[1-4])/i);
  const fiscalLabel = title.match(/(20\d{2})年度|\bFY\s*(20\d{2})\b/i)?.slice(1).find(Boolean);
  const fiscalYear = Number(document.fiscalYear) || Number(fiscalLabel);
  const endMonth = Number(endPeriod?.[2]) || (companyCode === "fast-retailing" ? 8 : 3);
  let endYear = Number(endPeriod?.[1]) || (fiscalYear ? fiscalYear + (endMonth < 12 ? 1 : 0) : 0);
  const toyota = url.match(/\/(20\d{2})_[1-4]q_/i);
  const tel = url.match(/\/fy(\d{2})q[1-4]/i);
  const hitachi = url.match(/\/(20\d{2})_(?:[1-3]q|an)\.pdf/i);
  if (!endYear && toyota) endYear = Number(toyota[1]);
  if (!endYear && tel) endYear = 2000 + Number(tel[1]);
  if (!endYear && hitachi) endYear = Number(hitachi[1]) + 1;
  if (endYear) {
    const end = new Date(Date.UTC(endYear, endMonth - 1 - (4 - (quarter || 4)) * 3 + 1, 0));
    return date(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate());
  }
  const summary = url.match(/summary(\d{2})(03|06|09|12)_ja\.pdf/i);
  if (summary) return date(2000 + Number(summary[1]), Number(summary[2]), 1);
  // 年しか判明しない資料は同年の期が分かる資料より後ろにします。
  const year = title.match(/(?:^|\D)(20\d{2})(?:\D|$)/) ?? url.match(/(?:^|\D)(20\d{2})(?:\D|$)/);
  return year ? date(Number(year[1]), 1, 1) : 0;
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
