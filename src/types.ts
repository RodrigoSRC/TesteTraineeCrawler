export interface BookClassification {
  genres: string[];
  summary: string;
}

export interface Book {
  title: string;
  price: number;
  priceFormatted: string;
  rating: number;
  availability: string;
  url: string;
  imageUrl: string;
  /** Texto livre da página de detalhe (quando enriquecimento IA está ativo). */
  description?: string;
  /** Gêneros inferidos por LLM a partir da descrição. */
  genres?: string[];
  /** Resumo de uma frase gerado por LLM. */
  summary?: string;
}

export interface AiClassifierConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface ScraperConfig {
  baseUrl: string;
  userAgent: string;
  delayMs: number;
  timeoutMs: number;
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  baseUrl: 'https://books.toscrape.com',
  userAgent: 'TesteTraineeCrawler/1.0 (trainee technical challenge)',
  delayMs: 500,
  timeoutMs: 30_000,
};
