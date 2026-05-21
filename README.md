# TesteTraineeCrawler

Scraper Node.js + TypeScript para o desafio técnico Crawler/RPA & IA (books.toscrape.com).

## Estrutura

```
src/
  types.ts         # schema Book e configuração do scraper
  scraper.ts       # requisições HTTP e paginação
  parser.ts        # extração de dados com Cheerio
  saveJson.ts      # persistência em output/books.json
  saveCsv.ts       # persistência em output/books.csv
  aiClassifier.ts  # bônus: classificação via LLM (pendente)
  index.ts         # orquestra o pipeline
tests/
  scraper.test.ts  # testes de parser, exportação e scraper
output/            # artefatos gerados (build + dados)
```

## Pré-requisitos

- Node.js 20+

## Instalação

```bash
npm install
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Executa em modo watch (tsx) |
| `npm run build` | Compila `src/` para `output/` |
| `npm start` | Roda o build compilado |
| `npm test` | Executa testes com Jest |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:coverage` | Cobertura de testes |
| `npm run lint` | Verifica código com ESLint |
| `npm run lint:fix` | Corrige problemas automáticos |
| `npm run typecheck` | Checagem de tipos sem emitir arquivos |
| `npm run check` | typecheck + lint + test |

## Status da implementação

- [x] Parser de listagem (título, preço, rating, disponibilidade, URLs)
- [x] Exportação JSON e CSV
- [ ] Paginação e coleta completa (`scraper.ts`)
- [ ] Classificação com IA (`aiClassifier.ts`)
- [ ] Dockerfile e pipeline GitLab CI/CD

## Próximos passos

1. Implementar `scrapeAllBooks` com paginação e delay entre requisições
2. Adicionar Dockerfile, `docker-compose.yml` e `.gitlab-ci.yml`
3. Documentar schema final e decisões técnicas no README
