import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Book } from './types';

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'output', 'books.csv');

const BASE_CSV_HEADERS = [
  'title',
  'price',
  'priceFormatted',
  'rating',
  'availability',
  'url',
  'imageUrl',
] as const;

const AI_CSV_HEADERS = ['description', 'genres', 'summary'] as const;

type BaseCsvField = (typeof BASE_CSV_HEADERS)[number];
type AiCsvField = (typeof AI_CSV_HEADERS)[number];
type CsvField = BaseCsvField | AiCsvField;

function getCsvHeaders(books: Book[]): readonly CsvField[] {
  const hasAiFields = books.some(
    (book) => book.description || book.genres?.length || book.summary,
  );

  return hasAiFields ? [...BASE_CSV_HEADERS, ...AI_CSV_HEADERS] : BASE_CSV_HEADERS;
}

function getCsvFieldValue(book: Book, field: CsvField): string | number {
  if (field === 'genres') {
    return book.genres?.join('; ') ?? '';
  }

  const value = book[field as keyof Book];
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return '';
}

function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function booksToCsv(books: Book[]): string {
  const headers = getCsvHeaders(books);
  const headerLine = headers.join(',');
  const rows = books.map((book) =>
    headers.map((field) => escapeCsvField(getCsvFieldValue(book, field))).join(','),
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
