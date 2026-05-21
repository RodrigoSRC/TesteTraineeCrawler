import { scrapeAllBooks } from './scraper';
import { saveCsv } from './saveCsv';
import { saveJson } from './saveJson';

async function main(): Promise<void> {
  const books = await scrapeAllBooks();

  await saveJson(books);
  await saveCsv(books);

  console.log(`Scraping concluído: ${books.length} livros salvos em output/`);
}

main().catch((error: unknown) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
