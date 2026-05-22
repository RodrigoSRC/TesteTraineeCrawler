import {
  enrichBooksWithAi,
  getAiClassifierConfigFromEnv,
  isAiClassifierEnabled,
} from './aiClassifier';
import { fetchPage, scrapeAllBooks } from './scraper';
import { saveCsv } from './saveCsv';
import { saveJson } from './saveJson';
import {
  isDatabasePersistenceEnabled,
  saveBooksToPostgres,
} from './savePostgres';
import { getDataOutputDir } from './outputPaths';
import { DEFAULT_SCRAPER_CONFIG } from './types';

async function main(): Promise<void> {
  let books = await scrapeAllBooks();

  if (isAiClassifierEnabled()) {
    const aiConfig = getAiClassifierConfigFromEnv();
    if (!aiConfig) {
      console.warn(
        'ENABLE_AI_CLASSIFIER=true, mas OPENAI_API_KEY não está definida — enriquecimento IA ignorado.',
      );
    } else {
      console.log('[ai] Enriquecendo livros com classificação LLM...');
      books = await enrichBooksWithAi(books, {
        fetchPage,
        scraperConfig: DEFAULT_SCRAPER_CONFIG,
        aiConfig,
      });
    }
  }

  await saveJson(books);
  await saveCsv(books);

  let dbSuffix = '';
  if (isDatabasePersistenceEnabled()) {
    const persisted = await saveBooksToPostgres(books);
    dbSuffix = ` + ${persisted} no PostgreSQL`;
  }

  const aiEnriched = books.filter((book) => book.genres?.length).length;
  const aiSuffix =
    isAiClassifierEnabled() && aiEnriched > 0
      ? ` (${aiEnriched} com classificação IA)`
      : '';

  console.log(
    `Scraping concluído: ${books.length} livros salvos em ${getDataOutputDir()}/${aiSuffix}${dbSuffix}`,
  );
}

main().catch((error: unknown) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
