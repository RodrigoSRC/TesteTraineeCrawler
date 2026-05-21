export interface Book {
  title: string;
  price: number;
  priceFormatted: string;
  rating: number;
  availability: string;
  url: string;
  imageUrl: string;
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
