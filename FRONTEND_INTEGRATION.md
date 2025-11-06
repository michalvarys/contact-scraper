# Frontend Integration Guide - Odoo Mailing Lists

Návod pro integraci Odoo funkcí do frontend aplikace.

## Požadované funkce

### 1. Detail kontaktu - Menu akce

V detailu kontaktu (Company) přidat menu s následujícími akcemi:

#### a) "Uložit do Odoo" tlačítko
- **Zobrazit jen když**: `company.odooPartnerId === null`
- **Akce**: Synchronizovat kontakt do Varyshop
- **API endpoint**: `POST /api/odoo/companies/:id/sync`

#### b) "Přidat do mailing seznamu" dropdown
- **Zobrazit vždy** (pokud není v Odoo, automaticky se nejdříve uloží)
- **Akce**: Přidat do vybraného mailing seznamu
- **API endpoint**: `POST /api/odoo/companies/:id/add-to-list`

#### c) Badge s Odoo ID
- **Zobrazit když**: `company.odooPartnerId !== null`
- **Obsah**: "Odoo ID: {odooPartnerId}"

### 2. Tabulka kontaktů - Bulk akce

Přidat bulk akce pro vybrané kontakty:

#### a) "Synchronizovat do Varyshopu"
- **Akce**: Bulk sync vybraných kontaktů
- **API endpoint**: `POST /api/odoo/companies/sync-bulk`

#### b) "Přidat do mailing seznamu"
- **Zobrazit**: Dropdown se seznamem mailing listů
- **Akce**: Přidat všechny vybrané kontakty do seznamu
- **API endpoint**: `POST /api/odoo/companies/add-to-list-bulk`

#### c) "Vytvořit nový mailing seznam"
- **Akce**: Dialog pro zadání jména, vytvoří seznam a přidá vybrané kontakty
- **API endpoint**: `POST /api/odoo/companies/create-list-with-companies`

## Implementace v React/Next.js

### Hooks pro Odoo operace

```typescript
// hooks/useOdoo.ts
import { useState } from 'react';

interface MailingList {
  id: number;
  name: string;
  contact_count: number;
  active: boolean;
}

export function useOdoo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCompany = async (companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/odoo/companies/${companyId}/sync`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data.odooPartnerId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addToMailingList = async (companyId: string, mailingListId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/odoo/companies/${companyId}/add-to-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailingListId }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getMailingLists = async (): Promise<MailingList[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/odoo/mailing-lists');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncBulk = async (companyIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/odoo/companies/sync-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addToMailingListBulk = async (companyIds: string[], mailingListId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/odoo/companies/add-to-list-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds, mailingListId }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createListWithCompanies = async (name: string, companyIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/odoo/companies/create-list-with-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyIds }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    syncCompany,
    addToMailingList,
    getMailingLists,
    syncBulk,
    addToMailingListBulk,
    createListWithCompanies,
  };
}
```

### Komponenta pro detail kontaktu

```typescript
// components/CompanyDetailActions.tsx
import { useState, useEffect } from 'react';
import { useOdoo } from '@/hooks/useOdoo';

interface Company {
  id: string;
  name: string;
  odooPartnerId: number | null;
  // ... other fields
}

interface Props {
  company: Company;
  onUpdate: () => void;
}

export function CompanyDetailActions({ company, onUpdate }: Props) {
  const { loading, error, syncCompany, addToMailingList, getMailingLists } = useOdoo();
  const [mailingLists, setMailingLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<number | null>(null);

  useEffect(() => {
    loadMailingLists();
  }, []);

  const loadMailingLists = async () => {
    try {
      const lists = await getMailingLists();
      setMailingLists(lists);
    } catch (err) {
      console.error('Failed to load mailing lists:', err);
    }
  };

  const handleSync = async () => {
    try {
      await syncCompany(company.id);
      alert('Kontakt byl úspěšně synchronizován do Odoo!');
      onUpdate(); // Refresh company data
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  const handleAddToList = async () => {
    if (!selectedList) {
      alert('Vyberte mailing seznam');
      return;
    }

    try {
      await addToMailingList(company.id, selectedList);
      alert('Kontakt byl přidán do mailing seznamu!');
      onUpdate();
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold text-lg">Varyshop akce</h3>

      {/* Varyshop Status Badge */}
      {company.odooPartnerId ? (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
          ✓ Varyshop ID: {company.odooPartnerId}
        </div>
      ) : (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
          Není ve Varyshopu
        </div>
      )}

      {/* Sync to Odoo Button */}
      {!company.odooPartnerId && (
        <button
          onClick={handleSync}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Synchronizuji...' : 'Uložit do Varyshop'}
        </button>
      )}

      {/* Add to Mailing List */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Přidat do mailing seznamu
        </label>
        <select
          value={selectedList || ''}
          onChange={(e) => setSelectedList(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Vyberte seznam...</option>
          {mailingLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.contact_count} kontaktů)
            </option>
          ))}
        </select>
        <button
          onClick={handleAddToList}
          disabled={loading || !selectedList}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Přidávám...' : 'Přidat do seznamu'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Komponenta pro bulk akce v tabulce

```typescript
// components/CompanyTableBulkActions.tsx
import { useState, useEffect } from 'react';
import { useOdoo } from '@/hooks/useOdoo';

interface Props {
  selectedCompanyIds: string[];
  onComplete: () => void;
}

export function CompanyTableBulkActions({ selectedCompanyIds, onComplete }: Props) {
  const {
    loading,
    error,
    syncBulk,
    addToMailingListBulk,
    createListWithCompanies,
    getMailingLists,
  } = useOdoo();
  const [mailingLists, setMailingLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    loadMailingLists();
  }, []);

  const loadMailingLists = async () => {
    try {
      const lists = await getMailingLists();
      setMailingLists(lists);
    } catch (err) {
      console.error('Failed to load mailing lists:', err);
    }
  };

  const handleBulkSync = async () => {
    if (selectedCompanyIds.length === 0) {
      alert('Vyberte alespoň jeden kontakt');
      return;
    }

    try {
      const result = await syncBulk(selectedCompanyIds);
      alert(`${result.syncedCount} kontaktů bylo synchronizováno do Odoo!`);
      onComplete();
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  const handleBulkAddToList = async () => {
    if (selectedCompanyIds.length === 0) {
      alert('Vyberte alespoň jeden kontakt');
      return;
    }
    if (!selectedList) {
      alert('Vyberte mailing seznam');
      return;
    }

    try {
      const result = await addToMailingListBulk(selectedCompanyIds, selectedList);
      alert(`${result.addedCount} kontaktů bylo přidáno do mailing seznamu!`);
      onComplete();
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      alert('Zadejte název mailing seznamu');
      return;
    }
    if (selectedCompanyIds.length === 0) {
      alert('Vyberte alespoň jeden kontakt');
      return;
    }

    try {
      const result = await createListWithCompanies(newListName, selectedCompanyIds);
      alert(`Mailing seznam "${result.name}" byl vytvořen s ${result.contact_count} kontakty!`);
      setShowCreateDialog(false);
      setNewListName('');
      onComplete();
      loadMailingLists(); // Refresh list
    } catch (err: any) {
      alert(`Chyba: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Bulk akce ({selectedCompanyIds.length} vybráno)
        </h3>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Bulk Sync */}
        <button
          onClick={handleBulkSync}
          disabled={loading || selectedCompanyIds.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Synchronizovat do Varyshopu
        </button>

        {/* Add to Existing List */}
        <div className="flex gap-2">
          <select
            value={selectedList || ''}
            onChange={(e) => setSelectedList(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
            disabled={loading || selectedCompanyIds.length === 0}
          >
            <option value="">Vyberte seznam...</option>
            {mailingLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAddToList}
            disabled={loading || !selectedList || selectedCompanyIds.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Přidat do seznamu
          </button>
        </div>

        {/* Create New List */}
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={loading || selectedCompanyIds.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Vytvořit nový seznam
        </button>
      </div>

      {/* Create List Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Vytvořit nový mailing seznam
            </h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Název seznamu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewListName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleCreateList}
                disabled={loading || !newListName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Vytvořit
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
```

## Integrace do existujících stránek

### Detail kontaktu

```typescript
// pages/companies/[id].tsx
import { CompanyDetailActions } from '@/components/CompanyDetailActions';

export default function CompanyDetailPage({ company }) {
  const handleUpdate = () => {
    // Refresh company data
    router.reload();
  };

  return (
    <div>
      {/* Existing company details */}
      <div>{company.name}</div>
      <div>{company.email}</div>
      {/* ... */}

      {/* Add Odoo actions */}
      <CompanyDetailActions
        company={company}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
```

### Tabulka kontaktů

```typescript
// pages/companies/index.tsx
import { CompanyTableBulkActions } from '@/components/CompanyTableBulkActions';
import { useState } from 'react';

export default function CompaniesPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleComplete = () => {
    // Refresh table data
    setSelectedIds([]);
    // ... refresh logic
  };

  return (
    <div>
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <CompanyTableBulkActions
          selectedCompanyIds={selectedIds}
          onComplete={handleComplete}
        />
      )}

      {/* Table with checkboxes */}
      <table>
        {/* ... table implementation with selection */}
      </table>
    </div>
  );
}
```

## CSS Styling (Tailwind)

Výše uvedené komponenty používají Tailwind CSS. Pokud používáte jiný framework, upravte třídy podle potřeby.

## Testování

```bash
# Otestujte API endpointy před integrací
curl http://localhost:3002/api/odoo/mailing-lists
curl -X POST http://localhost:3002/api/odoo/companies/COMPANY_ID/sync
```

## Poznámky

- Všechny operace vyžadují běžící Odoo instanci
- Kontakty se automaticky synchronizují při prvním přidání do mailing seznamu
- Bulk operace pokračují i při chybě jednotlivých kontaktů
- `odooPartnerId` se ukládá do databáze po první synchronizaci
