const PDF_LINK_PATTERN = /\.(?:pdf|ashx)(?:$|[?#])/i;
const REPORT_PATTERN = /決算(?:短信|要旨|報告|資料)|financial[\s_-]*(?:results?|reports?|statements?)|earnings[\s_-]*(?:release|report)|tanshin|summary\d{4}|fy\d{2,4}[_-]?[1-4]q/i;
const IR_PAGE_PATTERN = /決算|財務情報|financial|earnings|results|短信/i;

/**
 * 概要: HTMLで使われる主な文字参照を文字に戻します。
 * 引数: value - 変換対象の文字列。
 * 戻り値: 文字参照を変換した文字列。
 */
function decodeHtml(value) {
  return value.replace(/&#(x[\da-f]+|\d+);?|&(amp|lt|gt|quot|apos|nbsp);/gi, (match, numeric, named) => {
    if (numeric) {
      const code = numeric[0].toLowerCase() === "x" ? parseInt(numeric.slice(1), 16) : Number(numeric);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[named.toLowerCase()] ?? match;
  });
}

/**
 * 概要: HTMLから公式IRページへのリンクとPDFリンクを抽出します。
 * 引数: html - IRページのHTML。pageUrl - 取得したページのURL。
 * 戻り値: URLと表示文字列を持つリンク配列。
 */
export function extractIrLinks(html, pageUrl) {
  const links = [];
  const anchors = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchors)) {
    const href = match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!href) continue;
    let url;
    try { url = new URL(decodeHtml(href[1] ?? href[2] ?? href[3]), pageUrl); } catch { continue; }
    if (url.protocol !== "https:") continue;
    const attributes = match[1].match(/(?:aria-label|title)\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const inner = match[2].replace(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi, " $1 ");
    let title = decodeHtml(`${inner.replace(/<[^>]*>/g, " ")} ${attributes}`.replace(/\s+/g, " ").trim());
    const before = html.slice(Math.max(0, match.index - 4000), match.index);
    const rowStart = before.lastIndexOf("<tr");
    if (rowStart >= 0 && before.lastIndexOf("</tr>") < rowStart) {
      const rowHeading = before.slice(rowStart).match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1];
      if (rowHeading) title = `${decodeHtml(rowHeading.replace(/<[^>]*>/g, " ")).trim()} / ${title}`;
    }
    const heading = [...before
      .matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].at(-1)?.[1] ?? "";
    const section = decodeHtml(heading.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
    links.push({ url: url.href, title, section });
  }
  // 年度の切替先をselect要素で公開する公式アーカイブも、実在するリンクだけをたどります。
  for (const match of html.matchAll(/<option\b[^>]*value\s*=\s*["']([^"']+)["'][^>]*>([^<]*)<\/option>/gi)) {
    if (!/^(?:https:\/\/|\/|\.\/|\.\.\/)|\.html?(?:[?#]|$)/i.test(match[1])) continue;
    try {
      const url = new URL(decodeHtml(match[1]), pageUrl);
      if (url.protocol === "https:") links.push({url:url.href,title:decodeHtml(match[2]).trim(),section:"決算資料アーカイブ"});
    } catch { /* URL形式でない選択値は収集しません。 */ }
  }
  return links;
}

/**
 * 概要: 会社の公式IRサイトから決算PDFのリンクを収集します。
 * 引数: company - codeとir_urlを持つ会社。fetchPage - HTML取得関数。options - historyがtrueなら過去のアーカイブも探索。
 * 戻り値: 公式決算PDFの一覧を返すPromise。
 */
export async function discoverIrDocuments(company, fetchPage = fetch, options = {}) {
  const root = new URL(company.ir_url);
  if (root.protocol !== "https:") throw new Error("IR URLはHTTPSで指定してください");
  const queue = [{ url: root.href, depth: 0, priority: 10 }];
  const alternate = { ntt: "/jp/ir/library/", hitachi: "/ja-jp/ir/" }[company.code];
  if (alternate && new URL(alternate, root).href !== root.href) queue.push({ url: new URL(alternate, root).href, depth: 0, priority: 9 });
  const visited = new Set();
  const officialOrigins = new Set([root.origin]);
  const documents = new Map();
  while (queue.length && visited.size < (options.history ? 40 : 6)) {
    queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const page = queue.shift();
    if (visited.has(page.url)) continue;
    visited.add(page.url);
    let response;
    try { response = await fetchPage(page.url, { signal: AbortSignal.timeout(8000), headers: { Accept: "text/html" } }); }
    catch (error) {
      if (page.depth === 0) throw error;
      continue;
    }
    if (!response.ok) {
      if (page.depth === 0) throw new Error(`IRページの取得に失敗しました (${response.status}): ${page.url}`);
      continue;
    }
    const html = await response.text();
    const resolvedPage = response.url && new URL(response.url).protocol === "https:" ? response.url : page.url;
    if (page.depth === 0) officialOrigins.add(new URL(resolvedPage).origin);
    const pageTitle = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]*>/g, " ");
    for (const link of extractIrLinks(html, resolvedPage)) {
      const target = new URL(link.url);
      const label = `${pageTitle} ${link.section} ${link.title} ${target.pathname}`;
      if (company.code === "mizuho" && /\/tanshin\/us\//.test(target.pathname)) continue;
      if (PDF_LINK_PATTERN.test(link.url) && REPORT_PATTERN.test(label)) {
        if (company.code === "ntt" && /NTTデータ/i.test(link.title)) continue;
        if (company.code === "ntt" && target.hostname.replace(/^www\./, "") !== root.hostname.replace(/^www\./, "")) continue;
        if (!documents.has(link.url)) documents.set(link.url, {
          companyCode: company.code,
          title: [link.section, link.title, /決算短信/.test(pageTitle) ? "決算短信" : ""].filter(Boolean).join(" / ").slice(0, 180) || "決算資料",
          url: link.url,
          sourceName: "official_ir",
          fiscalYear: null,
          quarter: null,
          publishedAt: null,
          discoveredFrom: resolvedPage,
          officialIrUrl: [...officialOrigins].find((origin) => origin === new URL(resolvedPage).origin) ?? root.href,
        });
      } else if (page.depth < (options.history ? 3 : 1) && officialOrigins.has(target.origin) && !PDF_LINK_PATTERN.test(link.url)
        && IR_PAGE_PATTERN.test(label) && /\/(?:ir|investor|financial|result)/i.test(target.pathname)
        && !visited.has(link.url) && !queue.some((item) => item.url === link.url)) {
        queue.push({ url: link.url, depth: page.depth + 1,
          priority: (options.history && /202[2-6]|アーカイブ|archive|過去/.test(label) ? 10 : 0)
            + (/決算短信|決算関連|決算資料|financial.results|earnings|tanshin/i.test(label) ? 5 : 1) });
      }
    }
  }
  // キオクシアの決算短信一覧はJavaScriptで描画されるため、公式ニュースの原本リンクを補います。
  if (!documents.size && company.code === "kioxia" && !root.pathname.endsWith("news.html")) {
    return discoverIrDocuments({ ...company, ir_url: new URL("/ja-jp/news.html", root).href }, fetchPage, options);
  }
  const year = (document) => Math.max(0, ...[...`${document.title} ${document.url}`.normalize("NFKC").matchAll(/20\d{2}/g)].map((match) => Number(match[0])));
  return [...documents.values()].sort((a, b) => year(b) - year(a)).slice(0, options.history ? 400 : 60);
}
