# Contact Scraper - Installation Guide

Web scraper for business contacts (Google Maps, Firmy.cz) with full-stack UI, data enrichment via Gemini API, and optional Odoo CRM integration.

## Prerequisites

- **Node.js** v18+
- **pnpm** v9.14+ (`corepack enable && corepack prepare pnpm@9.14.2 --activate`)
- **PostgreSQL** 16 (local install or Docker)
- **Google Chrome / Chromium** (for Puppeteer scraping)

## Quick Start

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd contact-scraper
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. The key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_PG_URL` | Yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for contact enrichment |
| `SERVER_PORT` | No | API server port (default: `30020`) |
| `CLIENT_PORT` | No | Next.js client port (default: `30010`) |
| `ODOO_URL` | No | Odoo instance URL (if using CRM sync) |
| `ODOO_DB` | No | Odoo database name |
| `ODOO_USERNAME` | No | Odoo login |
| `ODOO_PASSWORD` | No | Odoo password |

The `.env` file at the root is loaded by both server and client. You can also place `.env` files in `apps/server/`, `apps/client/`, and `packages/database/` for per-package overrides.

### 3. Start PostgreSQL

**Option A: Docker (recommended)**

```bash
docker compose up -d postgres-dev
```

This starts a PostgreSQL 16 container (`gmap-scrapper-postgres-dev`) on port `5433`. Data is persisted in `.data/db2/`.

Use this connection string in `.env`:

```
DATABASE_PG_URL="postgresql://postgres:Scraper123@localhost:5433/postgres"
```

To check that it's running:

```bash
docker compose ps postgres-dev
# or connect directly:
psql "postgresql://postgres:Scraper123@localhost:5433/postgres"
```

To stop / restart:

```bash
docker compose stop postgres-dev
docker compose start postgres-dev
```

To reset the database (deletes all data):

```bash
docker compose down postgres-dev -v
rm -rf .data/db2
docker compose up -d postgres-dev
```

**Option B: Local PostgreSQL**

Install PostgreSQL 16 for your OS:

```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu / Debian
sudo apt install postgresql-16
sudo systemctl start postgresql

# Windows - download installer from https://www.postgresql.org/download/windows/
```

Create a database and user (or use the default `postgres`), then set the connection string in `.env`:

```
DATABASE_PG_URL="postgresql://postgres:your-password@localhost:5432/contact_scraper"
```

### 4. Set up the database

Generate the Prisma client and run migrations to create all tables:

```bash
cd packages/database
pnpm prisma generate
pnpm prisma migrate dev
cd ../..
```

To verify the database is set up correctly:

```bash
cd packages/database
pnpm prisma studio
```

This opens a GUI at http://localhost:5555 where you can browse tables and data.

### 5. Run in development mode

```bash
pnpm dev
```

This starts both apps via Turbo:
- **API server** at `http://localhost:30020`
- **Client** at `http://localhost:30010`

## Docker (full stack)

To run everything in Docker:

```bash
# Build images
docker compose build

# Start all services
docker compose up -d
```

Services:
- `postgres` - Production database (port `5432`)
- `postgres-dev` - Development database (port `5433`)
- `puppeteer` - Headless browser for scraping (port `30033`)
- `api` - API server
- `client` - Next.js frontend

## Project Structure

```
contact-scraper/
  apps/
    client/          # Next.js 15 frontend (React 19, TailwindCSS, shadcn/ui)
    server/          # Express API server (tRPC, Swagger)
    storage-data/    # Local file storage for scraped data
  packages/
    database/        # Prisma schema & client
    pg/              # PostgreSQL client wrapper
    api/             # tRPC router definitions
    auth/            # JWT authentication
    scrapers/        # Google Maps & Firmy.cz scrapers (Puppeteer, Cheerio)
    storage/         # File storage service
    types/           # Shared TypeScript types
    config-eslint/   # ESLint config
    config-typescript/ # TypeScript config
```

## Useful Commands

```bash
# Development
pnpm dev                    # Start all apps in dev mode
pnpm build                  # Build everything
pnpm start                  # Start production build
pnpm lint                   # Run linter
pnpm format                 # Format code with Prettier

# Database
cd packages/database
pnpm prisma generate        # Generate Prisma client
pnpm prisma migrate dev     # Create & apply migration
pnpm prisma migrate deploy  # Apply pending migrations (production)
pnpm prisma studio          # Open Prisma Studio GUI
```

## Odoo Integration

The server includes optional Odoo CRM integration for syncing contacts and managing mailing lists. Set the `ODOO_*` environment variables to enable it.

API endpoints:
- `GET  /api/odoo/mailing-lists` - List mailing lists
- `POST /api/odoo/sync-contact` - Sync a contact to Odoo
- `POST /api/odoo/add-to-mailing-list` - Add contacts to a mailing list

See [apps/server/src/odoo/README.md](apps/server/src/odoo/README.md) for full API docs.

## Troubleshooting

**pnpm install fails**
```bash
pnpm store prune
pnpm install
```

**Prisma generate fails**
```bash
rm -rf node_modules/.prisma
cd packages/database && pnpm prisma generate
```

**Port already in use** - Change `SERVER_PORT` / `CLIENT_PORT` in `.env`.

**Puppeteer can't find Chrome** - Install Chrome or set `PUPPETEER_EXECUTABLE_PATH` to your Chromium binary path.
