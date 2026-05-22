import path from 'node:path';
import {
  getBrowserScraperTargetFromEnv,
  scrapeDynamicCatalogPage,
} from './browserScraper';
import { DEFAULT_SCRAPER_CONFIG } from './types';

async function main(): Promise<void> {
  const fixturePath = path.join(
    process.cwd(),
    'tests',
    'fixtures',
    'dynamic-catalog.html',
  );
  const targetUrl =
    getBrowserScraperTargetFromEnv() ??
    `file://${fixturePath.replace(/\\/g, '/')}`;

  console.log(`[browser] Scraping catálogo dinâmico: ${targetUrl}`);

  const books = await scrapeDynamicCatalogPage(targetUrl, DEFAULT_SCRAPER_CONFIG, {
    loadDelayMs: 100,
  });

  console.log(`[browser] ${books.length} livros extraídos:`);
  for (const book of books) {
    console.log(`  - ${book.title} (${book.priceFormatted}, ${book.rating}★)`);
  }
}

main().catch((error: unknown) => {
  console.error('Erro no demo browser:', error);
  process.exit(1);
});
