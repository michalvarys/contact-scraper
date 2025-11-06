# Odoo Integration - Installation Instructions

## Installation Steps

### 1. Install Dependencies

```bash
# From project root
pnpm install
```

This will install the `odoo-xmlrpc-ts` package that was added to `apps/server/package.json`.

### 2. Run Database Migration

```bash
cd packages/database
pnpm prisma migrate dev --name add_odoo_partner_id
pnpm prisma generate
```

### 3. Configure Environment Variables

Create/update `apps/server/.env`:

```env
# Existing variables...
DATABASE_PG_URL="postgresql://user:password@localhost:5432/gmap_scraper?schema=public"
PORT=3002

# Add Odoo configuration
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
```

### 4. Build and Start

```bash
# Development
cd apps/server
pnpm dev

# Production build
pnpm build
pnpm start
```

### 5. Verify Installation

Test the API endpoints:

```bash
# Get mailing lists
curl http://localhost:3002/api/odoo/mailing-lists

# Expected response:
# {
#   "success": true,
#   "data": [...]
# }
```

## Docker Build

If using Docker, rebuild the containers:

```bash
docker-compose build
docker-compose up
```

## Files Modified/Created

✅ Modified:
- `packages/database/prisma/schema.prisma` - Added `odooPartnerId` field
- `apps/server/package.json` - Added `odoo-xmlrpc-ts` dependency
- `apps/server/src/index.ts` - Added Odoo routes

✅ Created:
- `apps/server/src/odoo/models/odoo.ts` - Type definitions for mailing lists
- `apps/server/src/odoo/admin-client.ts` - Extended with mailing list methods
- `apps/server/src/odoo/service.ts` - Business logic layer
- `apps/server/src/odoo/routes.ts` - API endpoints
- `apps/server/src/odoo/README.md` - Complete API documentation

## Next: Frontend Integration

After installation, implement frontend features:

### Contact Detail Page
```typescript
// Add menu with:
// 1. "Uložit do Odoo" button (if not synced)
// 2. "Přidat do mailing seznamu" dropdown
// 3. Badge showing Odoo partner ID (if synced)
```

### Contact Table Bulk Actions
```typescript
// Add actions:
// 1. "Synchronizovat do Varyshopu" - Bulk sync
// 2. "Přidat do mailing seznamu" - Select list dropdown
// 3. "Vytvořit nový mailing seznam" - Create list with selected contacts
```

## Troubleshooting

### pnpm install fails
```bash
# Clear cache and retry
pnpm store prune
pnpm install
```

### Prisma generate fails
```bash
# Remove and regenerate
rm -rf node_modules/.prisma
pnpm prisma generate
```

### Build errors
```bash
# Clean build
rm -rf dist/
pnpm build
```

For detailed API documentation, see [apps/server/src/odoo/README.md](apps/server/src/odoo/README.md)
