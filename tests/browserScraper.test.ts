import path from 'node:path';
import type { Browser, Page } from 'playwright';
import {
  getBrowserScraperTargetFromEnv,
  isBrowserScraperEnabled,
  loadAllDynamicContent,
  scrapeDynamicCatalogPage,
} from '../src/browserScraper';
import type { Book } from '../src/types';

const DYNAMIC_CATALOG_FIXTURE = path.join(
  __dirname,
  'fixtures',
  'dynamic-catalog.html',
);

const FULL_CATALOG_HTML = `
  <html><body>
    <article class="product_pod">
      <div class="image_container">
        <a href="catalogue/a-light-in-the-attic_1000/index.html">
          <img src="media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg" class="thumbnail" alt="A Light in the Attic">
        </a>
      </div>
      <p class="star-rating Three"></p>
      <h3><a href="catalogue/a-light-in-the-attic_1000/index.html" title="A Light in the Attic">A Light in the Attic</a></h3>
      <div class="product_price">
        <p class="price_color">£51.77</p>
        <p class="instock availability"><i class="icon-ok"></i> In stock</p>
      </div>
    </article>
    <article class="product_pod">
      <div class="image_container">
        <a href="catalogue/tipping-the-velvet_999/index.html">
          <img src="media/cache/26/0c/260c6ae16bce31c8f8c95daddd9f4a1c.jpg" class="thumbnail" alt="Tipping the Velvet">
        </a>
      </div>
      <p class="star-rating One"></p>
      <h3><a href="catalogue/tipping-the-velvet_999/index.html" title="Tipping the Velvet">Tipping the Velvet</a></h3>
      <div class="product_price">
        <p class="price_color">£53.74</p>
        <p class="instock availability"><i class="icon-ok"></i> In stock</p>
      </div>
    </article>
    <article class="product_pod">
      <div class="image_container">
        <a href="catalogue/soumission_998/index.html">
          <img src="media/cache/3e/ef/3eef99c9d9adef34639f510662022830.jpg" class="thumbnail" alt="Soumission">
        </a>
      </div>
      <p class="star-rating One"></p>
      <h3><a href="catalogue/soumission_998/index.html" title="Soumission">Soumission</a></h3>
      <div class="product_price">
        <p class="price_color">£50.10</p>
        <p class="instock availability"><i class="icon-ok"></i> In stock</p>
      </div>
    </article>
  </body></html>
`;

function createMockPage(initialHtml: string, finalHtml: string): Page {
  let html = initialHtml;
  let loadMoreVisible = true;
  let productCount = 1;

  const locators = new Map<string, ReturnType<typeof createLocator>>();

  function createLocator(selector: string) {
    return {
      isVisible: jest.fn(async () => {
        if (selector === '[data-load-more]') {
          return loadMoreVisible;
        }
        return false;
      }),
      click: jest.fn(async () => {
        html = finalHtml;
        loadMoreVisible = false;
        productCount = 3;
      }),
      count: jest.fn(async () => {
        if (selector === 'article.product_pod') {
          return productCount;
        }
        return 0;
      }),
    };
  }

  const locator = jest.fn((selector: string) => {
    if (!locators.has(selector)) {
      locators.set(selector, createLocator(selector));
    }
    return locators.get(selector)!;
  });

  return {
    locator,
    evaluate: jest.fn(async () => {
      productCount = 3;
    }),
    waitForTimeout: jest.fn(async () => undefined),
    setExtraHTTPHeaders: jest.fn(async () => undefined),
    goto: jest.fn(async () => undefined),
    content: jest.fn(async () => html),
  } as unknown as Page;
}

function createMockBrowser(page: Page): Browser {
  return {
    newPage: jest.fn(async () => page),
    close: jest.fn(async () => undefined),
  } as unknown as Browser;
}

describe('browserScraper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('isBrowserScraperEnabled respeita ENABLE_BROWSER_SCRAPER', () => {
    process.env.ENABLE_BROWSER_SCRAPER = 'true';
    expect(isBrowserScraperEnabled()).toBe(true);

    process.env.ENABLE_BROWSER_SCRAPER = 'false';
    expect(isBrowserScraperEnabled()).toBe(false);
  });

  it('getBrowserScraperTargetFromEnv lê BROWSER_SCRAPER_URL', () => {
    process.env.BROWSER_SCRAPER_URL = `file://${DYNAMIC_CATALOG_FIXTURE}`;
    expect(getBrowserScraperTargetFromEnv()).toBe(`file://${DYNAMIC_CATALOG_FIXTURE}`);

    delete process.env.BROWSER_SCRAPER_URL;
    expect(getBrowserScraperTargetFromEnv()).toBeNull();
  });

  it('loadAllDynamicContent clica em load-more até esgotar batches', async () => {
    const initialHtml = '<html><body><article class="product_pod"></article></body></html>';
    const page = createMockPage(initialHtml, FULL_CATALOG_HTML);

    await loadAllDynamicContent(page, { maxLoadAttempts: 5, loadDelayMs: 0 });

    const loadMoreLocator = page.locator('[data-load-more]');
    expect(loadMoreLocator.click).toHaveBeenCalled();
  });

  it('scrapeDynamicCatalogPage parseia livros após carregar conteúdo dinâmico (mock)', async () => {
    const page = createMockPage(
      '<html><body></body></html>',
      FULL_CATALOG_HTML,
    );
    const browser = createMockBrowser(page);
    const launchBrowser = jest.fn(async () => browser);

    const books = await scrapeDynamicCatalogPage(
      `file://${DYNAMIC_CATALOG_FIXTURE}`,
      {
        baseUrl: 'https://books.toscrape.com',
        userAgent: 'test-browser-agent',
        delayMs: 0,
        timeoutMs: 5_000,
      },
      { loadDelayMs: 0 },
      { launchBrowser },
    );

    expect(launchBrowser).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith(`file://${DYNAMIC_CATALOG_FIXTURE}`, {
      timeout: 5_000,
      waitUntil: 'domcontentloaded',
    });
    expect(books).toHaveLength(3);
    expect(books.map((book: Book) => book.title)).toEqual([
      'A Light in the Attic',
      'Tipping the Velvet',
      'Soumission',
    ]);
    expect(books[0].url).toBe(
      'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
    );
    expect(browser.close).toHaveBeenCalled();
  });
});
