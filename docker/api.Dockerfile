FROM node:18.20.2-alpine AS base

# Nastavení pracovního adresáře
WORKDIR /app

# Instalace pnpm
RUN npm install -g pnpm@9.14.2

# Nastavení prostředí
# ENV PUPPETEER_SKIP_DOWNLOAD=true
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PRISMA_SCHEMA_PATH=./packages/database/prisma/schema.prisma
ENV SHELL=/bin/sh


# Instalace systémových závislostí
RUN apk add --no-cache chromium openssl
RUN apk add --no-cache libc6-compat
RUN apk add --no-cache python3 make g++

# Kopírování souborů pro instalaci závislostí
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/server ./apps/server
COPY packages ./packages
RUN pnpm i turbo@2.4.4 tsup -w

# Instalace závislostí
RUN pnpm install

# Generování Prisma klienta
RUN cd packages/database && pnpm db:generate

# RUN pnpm turbo build
# Postupný build jednotlivých balíčků
RUN pnpm --filter "@contact-scraper/types" build && \
    pnpm --filter "@contact-scraper/storage" build && \
    pnpm --filter "@contact-scraper/api" build && \
    pnpm --filter "@contact-scraper/server" build

# Nastavení proměnných prostředí
ENV NODE_ENV=production
ENV PORT=3000

# Spuštění aplikace
CMD ["pnpm", "--filter", "@contact-scraper/server", "start"]

# Expose port
EXPOSE 3000
