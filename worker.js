const stockSymbols = new Set(["7203.T", "9432.T", "9434.T", "9984.T", "8306.T", "9983.T", "6501.T", "8316.T"]);
const irSources = {
  toyota: {
    sourcePage: "https://global.toyota/jp/ir/financial-results/",
    allowedDomains: ["global.toyota"],
  },
  ntt: {
    sourcePage: "https://group.ntt/jp/ir/library/presentation/financial/",
    allowedDomains: ["group.ntt", "ntt.jp"],
  },
  softbank: {
    sourcePage: "https://www.softbank.jp/corp/ir/documents/financial_reports/",
    allowedDomains: ["softbank.jp"],
    supplementalPages: [
      "https://www.softbank.jp/corp/set/common/shared/json/ir/fy2025/fy2025_q4.tsv",
      "https://www.softbank.jp/corp/set/common/shared/json/ir/fy2025/fy2025_q3.tsv",
      "https://www.softbank.jp/corp/set/common/shared/json/ir/fy2025/fy2025_q2.tsv",
      "https://www.softbank.jp/corp/set/common/shared/json/ir/fy2025/fy2025_q1.tsv",
    ],
  },
  "softbank-group": {
    sourcePage: "https://group.softbank/ir/financials/financial_reports",
    allowedDomains: ["group.softbank"],
  },
  mufg: {
    sourcePage: "https://www.mufg.jp/ir/index.html",
    allowedDomains: ["mufg.jp"],
  },
  "fast-retailing": {
    sourcePage: "https://www.fastretailing.com/jp/ir/library/earning.html",
    allowedDomains: ["fastretailing.com"],
  },
  hitachi: {
    sourcePage: "https://www.hitachi.com/ja-jp/ir/library/fr/",
    allowedDomains: ["hitachi.com"],
  },
  smfg: {
    sourcePage: "https://www.smfg.co.jp/investor/financial/latest_statement.html",
    allowedDomains: ["smfg.co.jp"],
  },
};

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ");
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function isAllowedDomain(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function discoverIrDocuments(html, source) {
  const documents = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtml(match[2]);
    let url;
    try {
      url = new URL(href, source.sourcePage);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || !isAllowedDomain(url.hostname, source.allowedDomains)) continue;

    const extension = url.pathname.match(/\.(pdf|xlsx?|csv)$/i)?.[1]?.toLowerCase();
    if (!extension || seen.has(url.href)) continue;

    seen.add(url.href);
    const fallbackTitle = decodeURIComponent(url.pathname.split("/").at(-1));
    documents.push({
      title: textContent(match[3]) || fallbackTitle,
      type: extension === "pdf" ? "PDF" : extension.toUpperCase(),
      url: url.href,
    });
  }

  return documents.slice(0, 30);
}

function discoverLooseIrDocuments(text, source) {
  const documents = [];
  const seen = new Set();
  const filePattern = /(?:https?:\/\/|\/)[^"'<>\s\t]+?\.(?:pdf|xlsx?|csv)(?:\?[^"'<>\s\t]*)?/gi;

  for (const match of text.matchAll(filePattern)) {
    let url;
    try {
      url = new URL(decodeHtml(match[0]), source.sourcePage);
    } catch {
      continue;
    }
    if (!isAllowedDocumentUrl(url, source) || seen.has(url.href)) continue;

    seen.add(url.href);
    const extension = url.pathname.match(/\.(pdf|xlsx?|csv)$/i)[1].toLowerCase();
    documents.push({
      title: decodeURIComponent(url.pathname.split("/").at(-1)),
      type: extension === "pdf" ? "PDF" : extension.toUpperCase(),
      url: url.href,
    });
  }

  return documents;
}

function isAllowedDocumentUrl(url, source) {
  return url.protocol === "https:"
    && isAllowedDomain(url.hostname, source.allowedDomains)
    && /\.(pdf|xlsx?|csv)$/i.test(url.pathname);
}

async function fetchOfficialIrDocuments(companyCode) {
  const source = irSources[companyCode];
  if (!source) return Response.json({ error: "IR source is not configured" }, { status: 404 });

  const upstream = await fetch(source.sourcePage, {
    headers: { "User-Agent": "earnings-viewer/1.0" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!upstream.ok) return Response.json({ error: "Official IR page is temporarily unavailable" }, { status: 502 });

  const html = await upstream.text();
  const documents = discoverIrDocuments(html, source);
  for (const supplementalPage of source.supplementalPages ?? []) {
    const supplemental = await fetch(supplementalPage, {
      headers: { "User-Agent": "earnings-viewer/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!supplemental.ok) continue;
    documents.push(...discoverLooseIrDocuments(await supplemental.text(), source));
  }
  const uniqueDocuments = [...new Map(documents.map((document) => [document.url, document])).values()].slice(0, 30);
  return Response.json(
    {
      companyCode,
      sourcePage: source.sourcePage,
      documents: uniqueDocuments,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

const financialExtractionSchema = {
  type: "object",
  properties: {
    documentType: { type: "string" },
    fiscalYear: { type: ["integer", "null"] },
    quarter: { type: ["integer", "null"] },
    periodEnd: { type: ["string", "null"] },
    unit: { type: "string" },
    cumulative: {
      type: "object",
      properties: {
        revenue: { type: ["integer", "null"] },
        operatingIncome: { type: ["integer", "null"] },
        pretaxIncome: { type: ["integer", "null"] },
        netIncome: { type: ["integer", "null"] },
      },
      required: ["revenue", "operatingIncome", "pretaxIncome", "netIncome"],
    },
    evidence: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["documentType", "fiscalYear", "quarter", "periodEnd", "unit", "cumulative", "evidence", "confidence", "notes"],
};

function normalizeExtractedFinancials(value) {
  const normalized = {
    ...value,
    fiscalYear: Number.isInteger(value.fiscalYear) ? value.fiscalYear : null,
    quarter: Number.isInteger(value.quarter) && value.quarter >= 1 && value.quarter <= 4 ? value.quarter : null,
    periodEnd: /^\d{4}-\d{2}-\d{2}$/.test(value.periodEnd ?? "") ? value.periodEnd : null,
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
  };
  normalized.cumulative = Object.fromEntries(
    Object.entries(value.cumulative ?? {}).map(([key, item]) => [key, Number.isInteger(item) ? item : null]),
  );
  return normalized;
}

async function extractOfficialIrDocument(request, env, companyCode) {
  if (!env.AI) return Response.json({ error: "Workers AI binding is not configured" }, { status: 503 });

  const source = irSources[companyCode];
  if (!source) return Response.json({ error: "IR source is not configured" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  let documentUrl;
  try {
    documentUrl = new URL(body.url);
  } catch {
    return Response.json({ error: "Document URL is invalid" }, { status: 400 });
  }
  if (!isAllowedDocumentUrl(documentUrl, source)) {
    return Response.json({ error: "Document URL is not allowed" }, { status: 400 });
  }

  const upstream = await fetch(documentUrl, { headers: { "User-Agent": "earnings-viewer/1.0" } });
  if (!upstream.ok) return Response.json({ error: "Official IR document is temporarily unavailable" }, { status: 502 });
  const contentLength = Number(upstream.headers.get("Content-Length")) || 0;
  if (contentLength > 15 * 1024 * 1024) {
    return Response.json({ error: "Official IR document is too large to parse safely" }, { status: 413 });
  }

  const documentBuffer = await upstream.arrayBuffer();
  if (documentBuffer.byteLength > 15 * 1024 * 1024) {
    return Response.json({ error: "Official IR document is too large to parse safely" }, { status: 413 });
  }
  const name = decodeURIComponent(documentUrl.pathname.split("/").at(-1));
  const converted = await env.AI.toMarkdown({
    name,
    blob: new Blob([documentBuffer], { type: upstream.headers.get("Content-Type") ?? "application/pdf" }),
  });
  if (converted.format !== "markdown") {
    return Response.json({ error: converted.error ?? "Document text conversion failed" }, { status: 422 });
  }

  const markdown = converted.data;
  const prompt = [
    "Extract consolidated financial results from this official investor-relations document.",
    "Return values in millions of Japanese yen as integers. Convert units when needed.",
    "Use cumulative year-to-date values when the document is quarterly or half-year.",
    "Use null when a requested metric is not explicitly disclosed.",
    "For pretaxIncome, use consolidated profit before tax when available.",
    "For netIncome, use profit attributable to owners of parent when available.",
    "Evidence must contain short source excerpts supporting the extracted values.",
    "Do not guess. Lower confidence when labels or units are ambiguous.",
    "",
    markdown.slice(0, 30000),
  ].join("\n");
  const extraction = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_schema", json_schema: financialExtractionSchema },
    temperature: 0,
    max_tokens: 1600,
  });

  return Response.json({
    companyCode,
    sourceUrl: documentUrl.href,
    name,
    markdown: markdown.slice(0, 250000),
    markdownTruncated: markdown.length > 250000,
    extraction: normalizeExtractedFinancials(extraction.response ?? extraction),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const extractionMatch = url.pathname.match(/^\/api\/ir\/([a-z-]+)\/extract$/);
    if (extractionMatch && request.method === "POST") return extractOfficialIrDocument(request, env, extractionMatch[1]);

    const irMatch = url.pathname.match(/^\/api\/ir\/([a-z-]+)$/);
    if (irMatch) return fetchOfficialIrDocuments(irMatch[1]);

    const match = url.pathname.match(/^\/api\/stocks\/([A-Z0-9.]+)$/);

    if (!match) return new Response("Not found", { status: 404 });

    const symbol = match[1];
    if (!stockSymbols.has(symbol)) return new Response("Unsupported stock symbol", { status: 400 });

    const upstreamUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=2y&interval=1wk`;
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "earnings-viewer/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!upstream.ok) return new Response("Stock price data is temporarily unavailable", { status: 502 });

    return new Response(upstream.body, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  },
};
