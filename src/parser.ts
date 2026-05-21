import * as cheerio from 'cheerio';
import type { Book } from './types';

const STAR_RATING_MAP: Record<string, number> = {
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
};

export function mapStarRating(classNames: string): number {
  const match = classNames.match(/\b(One|Two|Three|Four|Five)\b/);
  if (!match) {
    return 0;
  }

  return STAR_RATING_MAP[match[1]] ?? 0;
}

export function parsePrice(rawPrice: string): { formatted: string; value: number } {
  const formatted = rawPrice.trim();
  const value = Number.parseFloat(formatted.replace(/[^\d.]/g, ''));

  return {
    formatted,
    value: Number.isNaN(value) ? 0 : value,
  };
}

export function parseBooksFromHtml(html: string, baseUrl: string): Book[] {
  const $ = cheerio.load(html);
  const books: Book[] = [];

  $('article.product_pod').each((_, element) => {
    const article = $(element);
    const link = article.find('h3 a').first();
    const relativeUrl = link.attr('href') ?? '';
    const title = link.attr('title') ?? link.text().trim();
    const priceRaw = article.find('p.price_color').first().text();
    const { formatted, value } = parsePrice(priceRaw);
    const ratingClass = article.find('p.star-rating').first().attr('class') ?? '';
    const availability = article
      .find('p.instock.availability')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    const imageRelativeUrl = article.find('img.thumbnail').first().attr('src') ?? '';

    books.push({
      title,
      price: value,
      priceFormatted: formatted,
      rating: mapStarRating(ratingClass),
      availability,
      url: new URL(relativeUrl, baseUrl).href,
      imageUrl: new URL(imageRelativeUrl, baseUrl).href,
    });
  });

  return books;
}
