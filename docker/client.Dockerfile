FROM node:20-alpine AS base

# Nastavení pracovního adresáře
WORKDIR /app

# Instalace pnpm
RUN npm install -g pnpm@9.14.2

# Kopírování souborů pro instalaci závislostí
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/client/package.json ./apps/client/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/database/package.json ./packages/database/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/types/package.json ./packages/types/
COPY packages/storage/package.json ./packages/storage/
COPY packages/scrapers/package.json ./packages/scrapers/

# Instalace závislostí s přeskočením stahování Chromu pro Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalace Chromium
RUN apk add --no-cache chromium

# Instalace závislostí
RUN pnpm install

# Kopírování zdrojových souborů
COPY apps/client ./apps/client
COPY packages ./packages

# Build aplikace
# Nejprve nainstalujeme globální závislosti, které mohou být potřeba pro build
RUN npm install -g tsup

# Postupný build jednotlivých balíčků
RUN pnpm --filter "@contact-scraper/types" build && \
    pnpm --filter "@contact-scraper/storage" build && \
    pnpm --filter "@contact-scraper/api" build && \
    pnpm --filter "@contact-scraper/client" build

# Nastavení proměnných prostředí
ENV NODE_ENV=production
ENV PORT=3001

# Spuštění aplikace
CMD ["pnpm", "--filter", "@contact-scraper/client", "start"]

# Expose port
EXPOSE 3001
