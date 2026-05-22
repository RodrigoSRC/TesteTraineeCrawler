import { Pool, type PoolClient } from 'pg';
import type { Book } from './types';

export function isDatabasePersistenceEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS books (
  url TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  price_formatted TEXT NOT NULL,
  rating SMALLINT NOT NULL DEFAULT 0,
  availability TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  genres TEXT[],
  summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const UPSERT_SQL = `
INSERT INTO books (
  url, title, price, price_formatted, rating, availability, image_url,
  description, genres, summary, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
)
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  price_formatted = EXCLUDED.price_formatted,
  rating = EXCLUDED.rating,
  availability = EXCLUDED.availability,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  genres = EXCLUDED.genres,
  summary = EXCLUDED.summary,
  updated_at = NOW()
`;

export async function ensureBooksTable(
  client: Pick<PoolClient, 'query'>,
): Promise<void> {
  await client.query(CREATE_TABLE_SQL);
}

export async function saveBooksToPostgres(
  books: Book[],
  databaseUrl?: string,
  pool?: Pool,
): Promise<number> {
  const connectionString = databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida');
  }

  const ownsPool = !pool;
  const dbPool = pool ?? new Pool({ connectionString });

  try {
    const client = await dbPool.connect();
    try {
      await ensureBooksTable(client);

      for (const book of books) {
        await client.query(UPSERT_SQL, [
          book.url,
          book.title,
          book.price,
          book.priceFormatted,
          book.rating,
          book.availability,
          book.imageUrl,
          book.description ?? null,
          book.genres?.length ? book.genres : null,
          book.summary ?? null,
        ]);
      }

      return books.length;
    } finally {
      client.release();
    }
  } finally {
    if (ownsPool) {
      await dbPool.end();
    }
  }
}
