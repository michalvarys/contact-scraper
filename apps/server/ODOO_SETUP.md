# Odoo Integration Setup Guide

## Quick Setup Steps

### 1. Install Dependencies

```bash
# From project root
pnpm install
# or
npm install
# or
yarn install
```

This will install the required `odoo-xmlrpc-ts` package.

### 2. Run Database Migration

```bash
cd packages/database
npx prisma migrate dev --name add_odoo_partner_id
npx prisma generate
```

This adds the `odooPartnerId` field to the Company model.

### 3. Configure Environment Variables

Add to `apps/server/.env`:

```env
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
```

### 4. Verify Odoo Connection

```bash
# Test endpoint (requires Odoo running)
curl http://localhost:3002/api/odoo/mailing-lists
```

## Build & Deploy

### Local Development

```bash
cd apps/server
npm run dev
```

### Docker Build

The Dockerfile will automatically:
1. Install `odoo-xmlrpc-ts` dependency
2. Build TypeScript files
3. Start the server

```bash
docker-compose up --build
```

## Troubleshooting

### Build Error: "Cannot find module 'odoo-xmlrpc-ts'"

**Solution:**
```bash
# Install dependencies
pnpm install
# or
npm install
```

### Build Error: "Module '@prisma/client' has no exported member 'Company'"

**Solution:**
```bash
# Regenerate Prisma client after schema changes
cd packages/database
npx prisma generate
```

### Runtime Error: "Odoo credentials not configured"

**Solution:**
Ensure environment variables are set:
```bash
export ODOO_URL=http://localhost:8069
export ODOO_DB=odoo
export ODOO_USERNAME=admin
export ODOO_PASSWORD=admin
```

### Connection Error: "Authentication failed"

**Check:**
1. Odoo instance is running at `ODOO_URL`
2. Database name matches `ODOO_DB`
3. Username/password are correct
4. User has admin/mailing list permissions in Odoo

## API Endpoints Overview

All endpoints are available at `/api/odoo/*`

### Mailing Lists
- `GET /mailing-lists` - List all mailing lists
- `POST /mailing-lists` - Create new list
- `GET /mailing-lists/:id` - Get list details
- `GET /mailing-lists/:id/contacts` - Get list contacts

### Company Sync
- `POST /companies/:id/sync` - Sync to Odoo
- `POST /companies/sync-bulk` - Bulk sync
- `GET /companies/:id/status` - Check sync status

### Subscriptions
- `POST /companies/:id/add-to-list` - Add to mailing list
- `POST /companies/add-to-list-bulk` - Bulk add
- `POST /companies/create-list-with-companies` - Create list with contacts

For detailed API documentation, see [src/odoo/README.md](src/odoo/README.md)

## Next Steps

1. **Frontend Integration**: Implement UI components for:
   - Contact detail menu with "Save to Odoo" and "Add to Mailing List"
   - Bulk actions in contact table
   - Mailing list management interface

2. **Testing**: Test all endpoints with your Odoo instance

3. **Production Configuration**: Update environment variables for production Odoo instance
