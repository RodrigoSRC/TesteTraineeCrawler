# =============================================================================
# TesteTraineeCrawler — job batch (sem servidor HTTP)
#
# Este container executa o scraper uma vez, grava books.json/books.csv em
# output/ e encerra. Não há porta HTTP para expor (diferente de uma API).
# =============================================================================

# --- Stage 1: build ----------------------------------------------------------
# Compila TypeScript com todas as dependências (incluindo devDependencies).
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build

# --- Stage 2: runtime ------------------------------------------------------
# Imagem enxuta só com dependências de produção e o JavaScript compilado.
FROM node:20-alpine AS runtime

WORKDIR /app

# Usuário dedicado — o processo não roda como root.
RUN addgroup -S scraper && adduser -S scraper -G scraper

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/output ./output

RUN mkdir -p output && chown -R scraper:scraper /app

USER scraper

# Job batch: node output/index.js → scrape → salva arquivos → exit 0
CMD ["node", "output/index.js"]
