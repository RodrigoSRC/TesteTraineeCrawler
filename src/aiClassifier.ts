import type { Book } from './types';

export interface BookClassification {
  genres: string[];
  summary: string;
}

/**
 * Bônus: usar LLM para extrair informações estruturadas de texto livre.
 * Implementação pendente.
 */
export async function classifyBook(_book: Book): Promise<BookClassification> {
  throw new Error('aiClassifier ainda não implementado');
}
