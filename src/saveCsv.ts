import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Book } from './types';

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'output', 'books.csv');

const CSV_HEADERS = [
  'title',
  'price',
  'priceFormatted',
  'rating',
  'availability',
  'url',
  'imageUrl',
] as const satisfies readonly (keyof Book)[];

function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function booksToCsv(books: Book[]): string {
  const headerLine = CSV_HEADERS.join(',');
  const rows = books.map((book) =>
    CSV_HEADERS.map((field) => escapeCsvField(book[field])).join(','),
  );

  return [headerLine, ...rows].join('\n');
}

export async function saveCsv(
  books: Book[],
  filePath: string = DEFAULT_OUTPUT_PATH,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, booksToCsv(books), 'utf-8');
}
