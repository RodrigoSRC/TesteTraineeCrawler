import { parseBookDescriptionFromHtml } from './parser';
import type { fetchPage } from './scraper';
import { sleep } from './scraper';
import type {
  AiClassifierConfig,
  Book,
  BookClassification,
  ScraperConfig,
} from './types';

const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface ClassifyBookDescriptionDeps {
  fetchFn?: typeof fetch;
}

export interface EnrichBooksWithAiOptions {
  fetchPage: typeof fetchPage;
  scraperConfig: ScraperConfig;
  aiConfig: AiClassifierConfig;
  maxBooks?: number;
  classifyBookDescription?: typeof classifyBookDescription;
  sleepFn?: typeof sleep;
}

export function getAiClassifierConfigFromEnv(): AiClassifierConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    apiUrl: process.env.OPENAI_API_URL?.trim() || DEFAULT_OPENAI_API_URL,
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
  };
}

export function isAiClassifierEnabled(): boolean {
  return process.env.ENABLE_AI_CLASSIFIER === 'true';
}

function buildClassificationPrompt(title: string, description: string): string {
  return [
    'Extraia informações estruturadas da descrição do livro abaixo.',
    'Responda APENAS com JSON válido no formato:',
    '{"genres":["genero1","genero2"],"summary":"resumo em uma frase em português"}',
    'Regras:',
    '- genres: de 1 a 3 gêneros curtos em português',
    '- summary: uma frase objetiva em português',
    '',
    `Título: ${title}`,
    `Descrição: ${description}`,
  ].join('\n');
}

function parseClassificationResponse(content: string): BookClassification {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Resposta do LLM não contém JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    genres?: unknown;
    summary?: unknown;
  };

  if (!Array.isArray(parsed.genres) || typeof parsed.summary !== 'string') {
    throw new Error('JSON do LLM não segue o schema esperado');
  }

  const genres = parsed.genres
    .filter((genre): genre is string => typeof genre === 'string')
    .map((genre) => genre.trim())
    .filter(Boolean);

  const summary = parsed.summary.trim();
  if (genres.length === 0 || summary.length === 0) {
    throw new Error('Classificação do LLM veio vazia');
  }

  return { genres, summary };
}

/**
 * Usa um LLM (API compatível com OpenAI) para extrair gêneros e resumo
 * a partir da descrição em texto livre do livro.
 */
export async function classifyBookDescription(
  title: string,
  description: string,
  config: AiClassifierConfig,
  deps: ClassifyBookDescriptionDeps = {},
): Promise<BookClassification> {
  const fetchFn = deps.fetchFn ?? fetch;

  const response = await fetchFn(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Você extrai metadados de livros. Responda somente com JSON válido.',
        },
        {
          role: 'user',
          content: buildClassificationPrompt(title, description),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Resposta do LLM sem conteúdo');
  }

  return parseClassificationResponse(content);
}

/**
 * Enriquece livros visitando a página de detalhe, extraindo a descrição
 * e classificando com LLM. Limitado por maxBooks para evitar custo/tempo excessivo.
 */
export async function enrichBooksWithAi(
  books: Book[],
  options: EnrichBooksWithAiOptions,
): Promise<Book[]> {
  const {
    fetchPage: fetchBookPage,
    scraperConfig,
    aiConfig,
    maxBooks = Number.parseInt(process.env.AI_MAX_BOOKS ?? '5', 10),
    classifyBookDescription: classify = classifyBookDescription,
    sleepFn = sleep,
  } = options;

  const limit = Number.isFinite(maxBooks) && maxBooks > 0 ? maxBooks : books.length;
  const enriched = books.map((book) => ({ ...book }));

  for (let index = 0; index < Math.min(limit, enriched.length); index += 1) {
    const book = enriched[index];
    const html = await fetchBookPage(book.url, scraperConfig);
    const description = parseBookDescriptionFromHtml(html);

    if (!description) {
      console.warn(`[ai] Sem descrição para "${book.title}" — pulando`);
      continue;
    }

    book.description = description;

    try {
      const classification = await classify(book.title, description, aiConfig);
      book.genres = classification.genres;
      book.summary = classification.summary;
      console.log(`[ai] Classificado: "${book.title}" → ${classification.genres.join(', ')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ai] Falha ao classificar "${book.title}": ${message}`);
    }

    if (index < Math.min(limit, enriched.length) - 1) {
      await sleepFn(scraperConfig.delayMs);
    }
  }

  return enriched;
}
