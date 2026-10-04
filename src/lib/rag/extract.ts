import "server-only";
import * as cheerio from "cheerio";
import { extractText, getDocumentProxy } from "unpdf";
import { normalize } from "./chunk";

/** A piece of extracted content that keeps where it came from, for citations. */
export type ExtractedDoc = { text: string; page?: number; url?: string; title?: string };

// ---------------------------------------------------------------- PDF

export async function extractPdf(data: Uint8Array): Promise<ExtractedDoc[]> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return text
    .map((pageText, i) => ({ text: normalize(pageText), page: i + 1 }))
    .filter((d) => d.text.length > 0);
}

// ---------------------------------------------------------------- Website

const MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES || 25);
const SKIP_EXT = /\.(png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|mp3|css|js|json|xml|woff2?)$/i;
const USER_AGENT = "SupportPilotBot/1.0 (+https://github.com/supportpilot)";

/**
 * Crawls a website breadth-first (same host only). Seeds from sitemap.xml when
 * present so we pick up pages that aren't linked from the home page.
 */
export async function crawlWebsite(startUrl: string, maxPages = MAX_PAGES): Promise<ExtractedDoc[]> {
  const start = new URL(startUrl);
  assertPublicHost(start);

  const queue: string[] = [canonical(start)];
  const seen = new Set(queue);
  for (const url of await sitemapUrls(start)) {
    if (!seen.has(url)) {
      seen.add(url);
      queue.push(url);
    }
  }

  const docs: ExtractedDoc[] = [];
  const indexed = new Set<string>(); // final URLs, so redirects aren't indexed twice
  let reached = 0;
  while (queue.length && docs.length < maxPages) {
    const batch = queue.splice(0, 4);
    const results = await Promise.all(batch.map((url) => fetchPage(url)));

    for (const result of results) {
      if (!result) continue;
      reached++;
      if (result.text.length > 80 && !indexed.has(result.url)) {
        indexed.add(result.url);
        docs.push({ text: result.text, url: result.url, title: result.title });
      }
      for (const link of result.links) {
        if (!seen.has(link) && seen.size < maxPages * 4) {
          seen.add(link);
          queue.push(link);
        }
      }
    }
  }
  if (reached === 0) throw new Error("Couldn't reach that website. Check the URL and that the site is public.");
  if (docs.length === 0) throw new Error("No readable text found on that website.");
  return docs.slice(0, maxPages);
}

async function fetchPage(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null;
    const html = await res.text();
    return parseHtml(html, res.url || url);
  } catch {
    return null;
  }
}

export function parseHtml(html: string, url: string) {
  const $ = cheerio.load(html);
  const base = new URL(url);

  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    try {
      const href = new URL($(el).attr("href")!, base);
      if (href.host === base.host && /^https?:$/.test(href.protocol) && !SKIP_EXT.test(href.pathname)) {
        links.add(canonical(href));
      }
    } catch {
      /* ignore malformed links */
    }
  });

  const title = ($("title").first().text() || $("h1").first().text() || base.pathname).trim();

  $("script, style, noscript, svg, iframe, form, nav, footer, header, aside, [aria-hidden=true], .cookie, #cookie-banner").remove();
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");

  // Preserve block structure so the chunker can split on paragraphs.
  root.find("br").replaceWith("\n");
  root.find("p, h1, h2, h3, h4, h5, h6, li, tr, div, section, blockquote, pre, dd, dt").each((_, el) => {
    $(el).append("\n\n");
  });
  root.find("h1, h2, h3").each((_, el) => {
    $(el).prepend("\n\n");
  });

  return { url: canonical(base), title, text: normalize(root.text()), links: [...links] };
}

async function sitemapUrls(start: URL): Promise<string[]> {
  try {
    const res = await fetch(new URL("/sitemap.xml", start), {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
      .map((m) => {
        try {
          const u = new URL(m[1]);
          return u.host === start.host && !SKIP_EXT.test(u.pathname) ? canonical(u) : null;
        } catch {
          return null;
        }
      })
      .filter((u): u is string => !!u)
      .slice(0, MAX_PAGES * 2);
  } catch {
    return [];
  }
}

function canonical(url: URL) {
  const u = new URL(url);
  u.hash = "";
  u.search = "";
  return u.toString().replace(/\/$/, "");
}

/** Basic SSRF guard: refuse to crawl localhost / private network addresses. */
function assertPublicHost(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) URLs are supported.");
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host.startsWith("[") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error("That URL points to a private network address.");
}
