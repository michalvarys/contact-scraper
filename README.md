# Contact Scraper

> This project is **vibe-coded** - built entirely with AI-assisted development (before Claude Code existed - use wisely).

Web scraper for business contacts from Google Maps and Firmy.cz with a full-stack management UI, AI-powered data enrichment (Gemini), and optional Odoo CRM integration.

## Features

- Scraping business contacts from Google Maps and Firmy.cz + zlatestranky
- Full-stack UI for managing scraped contacts (Next.js + Express)
- AI enrichment of contact data via claude code subscription (claude -p)
- Export scraped data
- Odoo CRM sync - push contacts and manage mailing lists

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui
- **Backend**: Express, tRPC, Swagger
- **Database**: PostgreSQL 16, Prisma ORM
- **Scraping**: Puppeteer, Cheerio
- **Monorepo**: pnpm workspaces, Turborepo

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy and configure environment variables
cp .env.example .env

# Start PostgreSQL (via Docker)
docker compose up -d postgres-dev

# Set up database
cd packages/database
pnpm prisma generate
pnpm prisma migrate dev
cd ../..

# Run in dev mode
pnpm dev
```

- API server: http://localhost:30020
- Client: http://localhost:30010

See [INSTALLATION.md](INSTALLATION.md) for the full installation guide, Docker deployment, project structure, and troubleshooting.

## Sponsor

If you find this project useful, consider supporting its development:

- [GitHub Sponsors](https://github.com/sponsors/michalvarys)
- [Buy Me a Coffee](https://buymeacoffee.com/michalvarys)
- [Ko-fi](https://ko-fi.com/michalvarys)

## License

ISC
