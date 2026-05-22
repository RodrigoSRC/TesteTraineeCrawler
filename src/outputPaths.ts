import path from 'node:path';

/** Diretório de dados exportados (JSON/CSV). Separado do JS compilado no Docker. */
export function getDataOutputDir(): string {
  return process.env.OUTPUT_DIR ?? path.join(process.cwd(), 'output');
}
