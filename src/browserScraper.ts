import { chromium, type Browser, type Page } from 'playwright';
import { parseBooksFromHtml } from './parser';
import type { Book } from './types';
import { DEFAULT_SCRAPER_CONFIG, type ScraperConfig } from './types';

export interface BrowserScraperOptions {
  /** Iterações máximas de scroll / "load more" (limite de segurança). */
  maxLoadAttempts?: number;
  /** Seletor CSS do botão "carregar mais", quando existir. */
  loadMoreSelector?: string;
  /** Pausa após cada ação de carregamento (ms). */
  loadDelayMs?: number;
}

export interface BrowserScraperDeps {
  launchBrowser?: () => Promise<Browser>;
}

const DEFAULT_BROWSER_OPTIONS: Required<BrowserScraperOptions> = {
  maxLoadAttempts: 20,
  loadMoreSelector: '[data-load-more]',
  loadDelayMs: 200,
};

/**
 * Aguarda conteúdo renderizado por JavaScript — clica em "load more" ou
 * faz scroll até o catálogo parar de crescer (infinite scroll simulado).
 */
export async function loadAllDynamicContent(
  page: Page,
  options: BrowserScraperOptions = {},
): Promise<void> {
  const { maxLoadAttempts, loadMoreSelector, loadDelayMs } = {
    ...DEFAULT_BROWSER_OPTIONS,
    ...options,
  };

  for (let attempt = 0; attempt < maxLoadAttempts; attempt++) {
    const loadMore = page.locator(loadMoreSelector);
    const hasLoadMore = await loadMore.isVisible().catch(() => false);

    if (hasLoadMore) {
      await loadMore.click();
      await page.waitForTimeout(loadDelayMs);
      continue;
    }

    const previousCount = await page.locator('article.product_pod').count();
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(loadDelayMs);

    const newCount = await page.locator('article.product_pod').count();
    if (newCount === previousCount) {
      break;
    }
  }
}

/**
 * Scraper alternativo para catálogos que exigem browser (JS / infinite scroll).
 * O site principal (books.toscrape.com) é estático — use o scraper Cheerio padrão.
 */
export async function scrapeDynamicCatalogPage(
  url: string,
  config: ScraperConfig = DEFAULT_SCRAPER_CONFIG,
  options: BrowserScraperOptions = {},
  deps: BrowserScraperDeps = {},
): Promise<Book[]> {
  const launch = deps.launchBrowser ?? (() => chromium.launch({ headless: true }));
  const browser = await launch();

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'User-Agent': config.userAgent });
    await page.goto(url, {
      timeout: config.timeoutMs,
      waitUntil: 'domcontentloaded',
    });
    await loadAllDynamicContent(page, options);

    const html = await page.content();
    return parseBooksFromHtml(html, config.baseUrl);
  } finally {
    await browser.close();
  }
}

export function isBrowserScraperEnabled(): boolean {
  return process.env.ENABLE_BROWSER_SCRAPER === 'true';
}

export function getBrowserScraperTargetFromEnv(): string | null {
  const target = process.env.BROWSER_SCRAPER_URL?.trim();
  return target && target.length > 0 ? target : null;
}
