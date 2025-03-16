FROM node:18.20.2 AS base

# Nastavení pracovního adresáře
WORKDIR /app

# Instalace pnpm
RUN npm install -g pnpm@9.14.2

# Installing Chromium dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fontconfig \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgbm-dev \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libicu-dev \
    libjpeg-dev \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpng-dev \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    locales \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Kopírování souborů pro instalaci závislostí
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

RUN npx --yes @puppeteer/browsers@1.7.0 install chrome@116.0.5845.96
ENV CHROME_BIN=/app/chrome/linux-116.0.5845.96/chrome-linux64/chrome

COPY apps/server ./apps/server
COPY packages ./packages

ENV PRISMA_SCHEMA_PATH=./packages/database/prisma/schema.prisma
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Install puppeteer, don't install Chromium as it will be installed manually later
RUN pnpm i puppeteer turbo@2.4.4 tsup -w

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
