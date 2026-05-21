import axios from 'axios';
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
 * Coleta todos os livros do site. Paginação e orquestração serão implementadas aqui.
 */
export async function scrapeAllBooks(
  _config: ScraperConfig = DEFAULT_SCRAPER_CONFIG,
): Promise<Book[]> {
  throw new Error('scrapeAllBooks ainda não implementado');
}
