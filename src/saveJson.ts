import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Book } from './types';

const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'output', 'books.json');

export async function saveJson(
  books: Book[],
  filePath: string = DEFAULT_OUTPUT_PATH,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(books, null, 2), 'utf-8');
}
