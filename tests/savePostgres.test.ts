import type { Pool, PoolClient } from 'pg';
import {
  ensureBooksTable,
  isDatabasePersistenceEnabled,
  saveBooksToPostgres,
} from '../src/savePostgres';
import type { Book } from '../src/types';

const sampleBook: Book = {
  title: 'A Light in the Attic',
  price: 51.77,
  priceFormatted: '£51.77',
  rating: 3,
  availability: 'In stock',
  url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
  imageUrl:
    'https://books.toscrape.com/media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg',
};

describe('savePostgres', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('isDatabasePersistenceEnabled deve refletir DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(isDatabasePersistenceEnabled()).toBe(false);

    process.env.DATABASE_URL = 'postgresql://scraper:scraper@localhost:5432/books';
    expect(isDatabasePersistenceEnabled()).toBe(true);
  });

  it('ensureBooksTable deve executar DDL de criação', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const client = { query } as Pick<PoolClient, 'query'>;

    await ensureBooksTable(client);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS books'));
  });

  it('saveBooksToPostgres deve fazer upsert de cada livro', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query, release });
    const end = jest.fn().mockResolvedValue(undefined);
    const pool = { connect, end } as unknown as Pool;

    const count = await saveBooksToPostgres(
      [sampleBook],
      'postgresql://scraper:scraper@localhost:5432/books',
      pool,
    );

    expect(count).toBe(1);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS books'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (url) DO UPDATE'),
      [
        sampleBook.url,
        sampleBook.title,
        sampleBook.price,
        sampleBook.priceFormatted,
        sampleBook.rating,
        sampleBook.availability,
        sampleBook.imageUrl,
        null,
        null,
        null,
      ],
    );
    expect(release).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();
  });
});
