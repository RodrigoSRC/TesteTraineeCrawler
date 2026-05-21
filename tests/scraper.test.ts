import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  mapStarRating,
  parseBooksFromHtml,
  parsePrice,
} from '../src/parser';
import { booksToCsv, saveCsv } from '../src/saveCsv';
import { saveJson } from '../src/saveJson';
import { getNextPageUrl, scrapeAllBooks } from '../src/scraper';
import type { Book } from '../src/types';

const SAMPLE_LIST_HTML = `
  <html>
    <body>
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
    </body>
  </html>
`;

const sampleBook: Book = {
  title: 'A Light in the Attic',
  price: 51.77,
  priceFormatted: '£51.77',
  rating: 3,
  availability: 'In stock',
  url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
  imageUrl:
    'https://books.toscrape.com/media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg',
};

describe('parser', () => {
  it('deve mapear classes star-rating para número', () => {
    expect(mapStarRating('star-rating Three')).toBe(3);
    expect(mapStarRating('star-rating Five')).toBe(5);
    expect(mapStarRating('star-rating')).toBe(0);
  });

  it('deve extrair valor numérico do preço', () => {
    expect(parsePrice('£51.77')).toEqual({
      formatted: '£51.77',
      value: 51.77,
    });
  });

  it('deve parsear livros da página de listagem', () => {
    const books = parseBooksFromHtml(
      SAMPLE_LIST_HTML,
      'https://books.toscrape.com',
    );

    expect(books).toHaveLength(1);
    expect(books[0]).toEqual(sampleBook);
  });
});

describe('exporters', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `crawler-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('deve gerar CSV com headers e valores escapados', () => {
    const csv = booksToCsv([sampleBook]);

    expect(csv).toContain('title,price,priceFormatted,rating,availability,url,imageUrl');
    expect(csv).toContain('A Light in the Attic,51.77,£51.77,3,In stock');
  });

  it('deve salvar JSON e CSV no disco', async () => {
    const jsonPath = path.join(tempDir, 'books.json');
    const csvPath = path.join(tempDir, 'books.csv');

    await saveJson([sampleBook], jsonPath);
    await saveCsv([sampleBook], csvPath);

    const jsonContent = JSON.parse(await readFile(jsonPath, 'utf-8')) as Book[];
    const csvContent = await readFile(csvPath, 'utf-8');

    expect(jsonContent).toEqual([sampleBook]);
    expect(csvContent).toContain('A Light in the Attic');
  });
});

const PAGE_WITH_NEXT_HTML = `
  <html><body>
    <ul class="pager">
      <li class="next"><a href="catalogue/page-2.html">next</a></li>
    </ul>
  </body></html>
`;

const PAGE_WITHOUT_NEXT_HTML = `
  <html><body>
    <ul class="pager"></ul>
  </body></html>
`;

describe('scraper', () => {
  it('deve extrair URL absoluta da próxima página', () => {
    const nextUrl = getNextPageUrl(
      PAGE_WITH_NEXT_HTML,
      'https://books.toscrape.com/index.html',
    );

    expect(nextUrl).toBe('https://books.toscrape.com/catalogue/page-2.html');
  });

  it('deve retornar null na última página', () => {
    const nextUrl = getNextPageUrl(
      PAGE_WITHOUT_NEXT_HTML,
      'https://books.toscrape.com/catalogue/page-50.html',
    );

    expect(nextUrl).toBeNull();
  });

  it('deve percorrer todas as páginas mockadas e acumular livros', async () => {
    const page1Html = SAMPLE_LIST_HTML.replace(
      '</body>',
      '<ul class="pager"><li class="next"><a href="catalogue/page-2.html">next</a></li></ul></body>',
    );
    const page2Html = SAMPLE_LIST_HTML;

    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page1Html)
      .mockResolvedValueOnce(page2Html);
    const sleep = jest.fn().mockResolvedValue(undefined);

    const config = {
      baseUrl: 'https://books.toscrape.com',
      userAgent: 'test-agent',
      delayMs: 0,
      timeoutMs: 5_000,
    };

    const books = await scrapeAllBooks(config, { fetchPage, sleep });

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(
      1,
      'https://books.toscrape.com/index.html',
      config,
    );
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      'https://books.toscrape.com/catalogue/page-2.html',
      config,
    );
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(books).toHaveLength(2);
    expect(books[0]).toEqual(sampleBook);
    expect(books[1]).toEqual(sampleBook);
  });
});
