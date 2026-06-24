import React, { useState, useEffect } from 'react';
import { useOdoo } from '@/hooks/useOdoo';
import { Button } from '@/components/atoms/Button';
import Badge from '@/components/atoms/Badge';
import type { Company } from '@contact-scraper/api/routers';
import { Loader2, Upload, Plus, ListPlus } from 'lucide-react';

interface OdooActionsProps {
  company: Company;
  onUpdate?: () => void;
}

export const OdooActions: React.FC<OdooActionsProps> = ({ company, onUpdate }) => {
  const {
    loading,
    error,
    syncCompany,
    updateCompany,
    addToMailingList,
    getMailingLists,
    createListWithCompanies,
  } = useOdoo();
  const [mailingLists, setMailingLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
      const mailingContactId = await syncCompany(company.id);
      setShowSuccess(`Kontakt synchronizován! Odoo ID: ${mailingContactId}`);
      setTimeout(() => setShowSuccess(null), 3000);
      onUpdate?.();
    } catch (err: any) {
      console.error('Sync failed:', err);
      alert(`❌ Chyba při synchronizaci: ${err?.message || 'Neznámá chyba'}`);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateCompany(company.id);
      setShowSuccess('Údaje aktualizovány v Odoo!');
      setTimeout(() => setShowSuccess(null), 3000);
      onUpdate?.();
    } catch (err: any) {
      console.error('Update failed:', err);
      alert(`❌ Chyba při aktualizaci: ${err?.message || 'Neznámá chyba'}`);
    }
  };

  const handleAddToList = async () => {
    if (!selectedList) {
      return;
    }

    // Check if user wants to create new list
    if (selectedList === '__create_new__') {
      setShowCreateDialog(true);
      return;
    }

    try {
      await addToMailingList(company.id, parseInt(selectedList));
      const listName = mailingLists.find((l) => l.id === parseInt(selectedList))?.name;
      setShowSuccess(`Přidáno do seznamu: ${listName}`);
      setTimeout(() => setShowSuccess(null), 3000);
      setSelectedList('');
      // Reload mailing lists to update contact counts
      await loadMailingLists();
      onUpdate?.();
    } catch (err: any) {
      console.error('Add to list failed:', err);
      const errorMsg = err?.message || 'Nepodařilo se přidat do seznamu';
      // Check if it's an email-related error
      if (errorMsg.includes('no email') || errorMsg.includes('Email is required')) {
        alert('❌ Kontakt nelze přidat do mailing listu: Chybí emailová adresa');
      } else {
        alert(`❌ Chyba: ${errorMsg}`);
      }
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      return;
    }

    try {
      const result = await createListWithCompanies(newListName, [company.id]);
      setShowSuccess(`Seznam "${result.name}" vytvořen a kontakt přidán!`);
      setTimeout(() => setShowSuccess(null), 3000);
      setShowCreateDialog(false);
      setNewListName('');
      // Reload mailing lists to show new list with contact count
      await loadMailingLists();
      onUpdate?.();
    } catch (err: any) {
      console.error('Create list failed:', err);
    }
  };

  return (
    <div className="border rounded-lg bg-blue-50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="font-semibold text-lg text-left">Odoo CRM</span>
        {company?.odooMailingContactId ? (
          <Badge className="bg-green-100 text-green-800">✓ Odoo ID: {company.odooMailingContactId}</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-600">Není v Odoo</Badge>
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 p-4 pt-0">
          {/* Success Message */}
          {showSuccess && (
            <div className="p-3 bg-green-100 text-green-800 rounded-md text-sm">
              {showSuccess}
            </div>
          )}

          {/* Error Message */}
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

          {/* Sync Button */}
          {!company.odooMailingContactId && (
            <div>
              <Button
                type="button"
                onClick={handleSync}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchronizuji...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Uložit do Odoo
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-600 mt-1">Uložit kontakt do Odoo CRM systému</p>
            </div>
          )}

          {/* Update Button - shown when already synced */}
          {company.odooMailingContactId && (
            <div>
              <Button
                type="button"
                onClick={handleUpdate}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aktualizuji...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Aktualizovat v Odoo
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-600 mt-1">
                Aktualizovat údaje v Odoo (např. pokud jste přidali email)
              </p>
            </div>
          )}

          {/* Add to Mailing List */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Přidat do mailing seznamu
            </label>
            <div className="flex gap-2">
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white disabled:opacity-50"
              >
                <option value="">Vyberte seznam...</option>
                {mailingLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.contact_count} kontaktů)
                  </option>
                ))}
                <option value="__create_new__" className="font-semibold">
                  [+] Vytvořit nový seznam...
                </option>
              </select>
              <Button
                type="button"
                onClick={handleAddToList}
                disabled={loading || !selectedList}
                className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedList === '__create_new__' ? 'Vytvářím...' : 'Přidávám...'}
                  </>
                ) : selectedList === '__create_new__' ? (
                  <>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Vytvořit
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Přidat
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              {company?.odooMailingContactId
                ? 'Přidat kontakt do vybraného mailing seznamu'
                : 'Kontakt bude automaticky nejdříve uložen do Varyshopu'}
            </p>
          </div>
        </div>
      )}

      {/* Create New List Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Vytvořit nový mailing seznam</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vytvoří nový mailing seznam a přidá tento kontakt.
            </p>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Název seznamu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newListName.trim()) {
                  handleCreateList();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewListName('');
                  setSelectedList('');
                }}
                disabled={loading}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                onClick={handleCreateList}
                disabled={loading || !newListName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vytvářím...
                  </>
                ) : (
                  <>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Vytvořit seznam
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
