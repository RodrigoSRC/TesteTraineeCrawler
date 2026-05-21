import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseBooksFromHtml } from './parser';
import type { Book } from './types';
import { DEFAULT_SCRAPER_CONFIG, type ScraperConfig } from './types';

export async function fetchPage(
  url: string,
  config: ScraperConfig = DEFAULT_SCRAPER_CONFIG,
): Promise<string> {
  const response = await axios.get<string>(url, {
    headers: { 'User-Agent': config.userAgent },
    timeout: config.timeoutMs,
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return response.data;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Lê o HTML da página atual e devolve a URL absoluta da próxima página,
 * ou null quando não houver mais páginas (última página).
 */
export function getNextPageUrl(html: string, currentUrl: string): string | null {
  const $ = cheerio.load(html);
  const nextHref = $('li.next a').attr('href');

  if (!nextHref) {
    return null;
  }

  return new URL(nextHref, currentUrl).href;
}

function getCatalogueStartUrl(baseUrl: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL('index.html', normalizedBase).href;
}

export interface ScrapeAllBooksDeps {
  fetchPage?: typeof fetchPage;
  sleep?: typeof sleep;
}

export async function scrapeAllBooks(
  config: ScraperConfig = DEFAULT_SCRAPER_CONFIG,
  deps: ScrapeAllBooksDeps = {},
): Promise<Book[]> {
  const fetch = deps.fetchPage ?? fetchPage;
  const wait = deps.sleep ?? sleep;
  const allBooks: Book[] = [];
  let currentUrl: string | null = getCatalogueStartUrl(config.baseUrl);

  while (currentUrl) {
    const html = await fetch(currentUrl, config);
    const booksOnPage = parseBooksFromHtml(html, config.baseUrl);

    allBooks.push(...booksOnPage);

    const nextUrl = getNextPageUrl(html, currentUrl);
    if (nextUrl) {
      await wait(config.delayMs);
    }

    currentUrl = nextUrl;
  }

  return allBooks;
}
