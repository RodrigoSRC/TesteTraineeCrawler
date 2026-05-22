import {
  classifyBookDescription,
  enrichBooksWithAi,
  getAiClassifierConfigFromEnv,
  isAiClassifierEnabled,
} from '../src/aiClassifier';
import { parseBookDescriptionFromHtml } from '../src/parser';
import type { Book } from '../src/types';

const SAMPLE_DETAIL_HTML = `
  <html><body>
    <div id="product_description" class="sub-header">Product Description</div>
    <p>
      It's the story of a young girl who discovers a hidden world of poetry
      and mystery in her attic. A touching tale about family and imagination.
    </p>
  </body></html>
`;

const aiConfig = {
  apiKey: 'test-key',
  apiUrl: 'https://api.example.com/v1/chat/completions',
  model: 'gpt-test',
};

describe('parseBookDescriptionFromHtml', () => {
  it('deve extrair descrição da página de detalhe', () => {
    const description = parseBookDescriptionFromHtml(SAMPLE_DETAIL_HTML);

    expect(description).toContain('young girl');
    expect(description).toContain('poetry');
  });

  it('deve retornar null quando não houver descrição', () => {
    expect(parseBookDescriptionFromHtml('<html><body></body></html>')).toBeNull();
  });
});

describe('aiClassifier', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve ler configuração de ambiente quando habilitado', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-custom';

    expect(getAiClassifierConfigFromEnv()).toEqual({
      apiKey: 'sk-test',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-custom',
    });
  });

  it('deve retornar null sem OPENAI_API_KEY', () => {
    delete process.env.OPENAI_API_KEY;
    expect(getAiClassifierConfigFromEnv()).toBeNull();
  });

  it('isAiClassifierEnabled respeita ENABLE_AI_CLASSIFIER', () => {
    process.env.ENABLE_AI_CLASSIFIER = 'true';
    expect(isAiClassifierEnabled()).toBe(true);

    process.env.ENABLE_AI_CLASSIFIER = 'false';
    expect(isAiClassifierEnabled()).toBe(false);
  });

  it('deve classificar descrição via LLM mockado', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                genres: ['Poesia', 'Ficção'],
                summary: 'Menina descobre poesia no sótão.',
              }),
            },
          },
        ],
      }),
    });

    const result = await classifyBookDescription(
      'A Light in the Attic',
      'Poetry book about attic adventures.',
      aiConfig,
      { fetchFn },
    );

    expect(result).toEqual({
      genres: ['Poesia', 'Ficção'],
      summary: 'Menina descobre poesia no sótão.',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      aiConfig.apiUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('deve enriquecer livros mockados com descrição e classificação IA', async () => {
    const book: Book = {
      title: 'A Light in the Attic',
      price: 51.77,
      priceFormatted: '£51.77',
      rating: 3,
      availability: 'In stock',
      url: 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
      imageUrl: 'https://books.toscrape.com/media/cache/test.jpg',
    };

    const fetchPage = jest.fn().mockResolvedValue(SAMPLE_DETAIL_HTML);
    const classifyBookDescriptionMock = jest.fn().mockResolvedValue({
      genres: ['Poesia'],
      summary: 'História poética no sótão.',
    });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const enriched = await enrichBooksWithAi([book], {
      fetchPage,
      scraperConfig: {
        baseUrl: 'https://books.toscrape.com',
        userAgent: 'test-agent',
        delayMs: 0,
        timeoutMs: 5_000,
      },
      aiConfig,
      maxBooks: 1,
      classifyBookDescription: classifyBookDescriptionMock,
      sleepFn,
    });

    expect(fetchPage).toHaveBeenCalledWith(book.url, expect.any(Object));
    expect(classifyBookDescriptionMock).toHaveBeenCalledWith(
      book.title,
      expect.stringContaining('young girl'),
      aiConfig,
    );
    expect(enriched[0]).toMatchObject({
      description: expect.stringContaining('young girl'),
      genres: ['Poesia'],
      summary: 'História poética no sótão.',
    });
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
