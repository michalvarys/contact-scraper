# Odoo Integration API Documentation

This module provides complete integration between the contact scraper system and Odoo CRM, enabling synchronization of scraped contacts to Odoo and management of email marketing lists.

## Features

- Sync scraped companies to Odoo as contacts (res.partner)
- Create and manage mailing lists (mailing.list)
- Add contacts to mailing lists with subscription management
- Bulk operations for efficient data management
- Track sync status with `odooPartnerId` field

## Configuration

Set the following environment variables in your `.env` file:

```env
ODOO_URL=http://localhost:8069
ODOO_DB=odoo
ODOO_USERNAME=admin
ODOO_PASSWORD=admin
```

## Database Schema Changes

The `Company` model now includes an `odooPartnerId` field to track which companies have been synced to Odoo:

```prisma
model Company {
  // ... existing fields
  odooPartnerId Int? // Odoo res.partner ID when synced
}
```

**Run migration:**
```bash
cd packages/database
npx prisma migrate dev --name add_odoo_partner_id
```

## API Endpoints

All endpoints are prefixed with `/api/odoo`

### Mailing Lists

#### Get All Mailing Lists
```http
GET /api/odoo/mailing-lists?activeOnly=true
```

**Query Parameters:**
- `activeOnly` (boolean, default: true) - Only return active mailing lists

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "name": "Varyshop CZ/SK",
      "active": true,
      "is_public": true,
      "contact_count": 1,
      "contact_count_email": 1,
      "contact_count_blacklisted": 0,
      "contact_count_opt_out": 0,
      "contact_ids": [5],
      "mailing_count": 0,
      "create_date": "2025-08-03 15:15:37"
    }
  ]
}
```

#### Get Single Mailing List
```http
GET /api/odoo/mailing-lists/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Varyshop CZ/SK",
    "active": true,
    "contact_count": 1,
    // ... all mailing list fields
  }
}
```

#### Get Mailing List Contacts
```http
GET /api/odoo/mailing-lists/:id/contacts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Company Name",
      "email": "contact@company.com",
      "phone": "+420123456789",
      "mobile": null,
      "city": "Prague",
      "country_id": [58, "Czech Republic"],
      "company_name": "Company Name"
    }
  ]
}
```

#### Create Mailing List
```http
POST /api/odoo/mailing-lists
Content-Type: application/json

{
  "name": "New Marketing Campaign",
  "companyIds": ["uuid-1", "uuid-2"] // Optional - companies to add immediately
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "New Marketing Campaign",
    "active": true,
    "contact_count": 2
  },
  "message": "Mailing list created successfully"
}
```

### Company Sync Operations

#### Sync Single Company to Odoo
```http
POST /api/odoo/companies/:id/sync
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-uuid",
    "odooPartnerId": 42
  },
  "message": "Company synced to Odoo successfully"
}
```

#### Bulk Sync Companies
```http
POST /api/odoo/companies/sync-bulk
Content-Type: application/json

{
  "companyIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncedCount": 3,
    "partnerIds": [42, 43, 44]
  },
  "message": "3 companies synced to Odoo successfully"
}
```

#### Check Company Sync Status
```http
GET /api/odoo/companies/:id/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-uuid",
    "isSynced": true,
    "odooPartnerId": 42
  }
}
```

### Mailing List Subscriptions

#### Add Company to Mailing List
```http
POST /api/odoo/companies/:id/add-to-list
Content-Type: application/json

{
  "mailingListId": 3
}
```

**Note:** This endpoint automatically syncs the company to Odoo first if not already synced.

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "company-uuid",
    "mailingListId": 3,
    "subscriptionId": 15
  },
  "message": "Company added to mailing list successfully"
}
```

#### Bulk Add Companies to Mailing List
```http
POST /api/odoo/companies/add-to-list-bulk
Content-Type: application/json

{
  "companyIds": ["uuid-1", "uuid-2", "uuid-3"],
  "mailingListId": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "addedCount": 3,
    "mailingListId": 3,
    "subscriptionIds": [15, 16, 17]
  },
  "message": "3 companies added to mailing list successfully"
}
```

#### Create Mailing List with Companies
```http
POST /api/odoo/companies/create-list-with-companies
Content-Type: application/json

{
  "name": "Restaurant Campaign Q1 2025",
  "companyIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Restaurant Campaign Q1 2025",
    "active": true,
    "contact_count": 3,
    "contact_ids": [42, 43, 44]
  },
  "message": "Mailing list created and companies added successfully"
}
```

## Frontend Integration Examples

### Contact Detail Menu Actions

```typescript
// Check if contact is already in Odoo
const response = await fetch(`/api/odoo/companies/${companyId}/status`);
const { data } = await response.json();

if (!data.isSynced) {
  // Show "Save to Odoo" button
  syncButton.onclick = async () => {
    await fetch(`/api/odoo/companies/${companyId}/sync`, { method: 'POST' });
  };
}

// Add to mailing list
addToListButton.onclick = async () => {
  const mailingListId = mailingListSelect.value;

  await fetch(`/api/odoo/companies/${companyId}/add-to-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mailingListId })
  });
};
```

### Bulk Actions in Contact Table

```typescript
// Get all mailing lists for dropdown
const listsResponse = await fetch('/api/odoo/mailing-lists');
const { data: mailingLists } = await listsResponse.json();

// Bulk add selected contacts to mailing list
bulkAddButton.onclick = async () => {
  const selectedIds = getSelectedCompanyIds(); // Your table selection logic
  const mailingListId = mailingListDropdown.value;

  await fetch('/api/odoo/companies/add-to-list-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyIds: selectedIds,
      mailingListId: parseInt(mailingListId)
    })
  });
};

// Create new mailing list with selected contacts
createListButton.onclick = async () => {
  const selectedIds = getSelectedCompanyIds();
  const listName = prompt('Enter mailing list name:');

  await fetch('/api/odoo/companies/create-list-with-companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: listName,
      companyIds: selectedIds
    })
  });
};
```

## Data Mapping

When syncing companies to Odoo, the following mapping is applied:

| Company Field | Odoo Field (res.partner) | Notes |
|--------------|--------------------------|-------|
| name | name | Contact name |
| email | email | Email address |
| phone | phone | Phone number |
| address | street | Full address |
| website | comment | Added as comment with Google Maps link |
| link | comment | Google Maps URL stored in comment |

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (for POST endpoints)
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## Architecture

```
apps/server/src/odoo/
├── admin-client.ts       # Low-level Odoo XML-RPC client
├── base-client.ts        # Base client with common operations
├── client-interface.ts   # Client interface definitions
├── user-client.ts        # User-level client operations
├── service.ts            # Business logic layer
├── routes.ts             # Express API endpoints
├── models/
│   └── odoo.ts          # TypeScript interfaces for Odoo models
└── index.ts             # Module exports
```

**Service Layer Benefits:**
- Handles automatic sync before mailing list operations
- Manages database updates (odooPartnerId)
- Provides simplified API for common workflows
- Error handling and logging

**AdminClient Methods:**
- `createContact()` - Create contact in Odoo
- `updateContact()` - Update existing contact
- `createMailingList()` - Create new mailing list
- `getMailingLists()` - Fetch all mailing lists
- `addContactToMailingList()` - Subscribe contact to list
- `addContactsToMailingList()` - Bulk subscription
- `createContactAndAddToList()` - Combined operation

## Testing

Example cURL commands for testing:

```bash
# Get mailing lists
curl http://localhost:3002/api/odoo/mailing-lists

# Sync a company
curl -X POST http://localhost:3002/api/odoo/companies/COMPANY_UUID/sync

# Add company to list
curl -X POST http://localhost:3002/api/odoo/companies/COMPANY_UUID/add-to-list \
  -H "Content-Type: application/json" \
  -d '{"mailingListId": 3}'

# Create list with companies
curl -X POST http://localhost:3002/api/odoo/companies/create-list-with-companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "companyIds": ["uuid1", "uuid2"]
  }'
```

## Best Practices

1. **Always Check Sync Status First**: Use the status endpoint before attempting operations
2. **Batch Operations**: Use bulk endpoints for multiple companies to improve performance
3. **Error Handling**: Bulk operations continue on individual failures - check response for actual success count
4. **Idempotent Operations**: Syncing an already-synced company returns existing partner ID
5. **Subscription Management**: Adding a contact to a list they're already in updates the subscription

## Troubleshooting

### "Odoo credentials not configured"
- Ensure `ODOO_USERNAME` and `ODOO_PASSWORD` are set in `.env`
- Verify Odoo instance is accessible at `ODOO_URL`

### "Authentication failed"
- Check Odoo credentials are correct
- Verify user has appropriate permissions in Odoo
- Confirm database name matches `ODOO_DB`

### "Company not found"
- Verify company UUID exists in local database
- Check company wasn't deleted from local database

### Sync failures
- Check Odoo server logs for detailed error messages
- Verify required fields are present (name, address)
- Ensure Odoo has mailing list module installed

## Future Enhancements

Potential features for future development:
- Two-way sync (Odoo → Local database)
- Contact deduplication based on email
- UTM campaign tracking integration
- Webhook support for real-time updates
- Mailing campaign creation and management
- Analytics and reporting endpoints
