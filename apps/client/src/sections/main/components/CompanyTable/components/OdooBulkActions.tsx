import React, { useState, useEffect } from 'react';
import { useOdoo } from '@/hooks/useOdoo';
import { Button } from '@/components/atoms/Button';
import { Loader2, Upload, Plus, ListPlus } from 'lucide-react';

interface OdooBulkActionsProps {
  selectedCompanyIds: string[];
  onComplete?: () => void;
}

export const OdooBulkActions: React.FC<OdooBulkActionsProps> = ({
  selectedCompanyIds,
  onComplete,
}) => {
  const {
    loading,
    error,
    syncBulk,
    addToMailingListBulk,
    createListWithCompanies,
    getMailingLists,
  } = useOdoo();

  const [mailingLists, setMailingLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

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
    if (selectedCompanyIds.length === 0) return;

    try {
      const result = await syncBulk(selectedCompanyIds);
      setShowSuccess(`✓ ${result.syncedCount} kontaktů synchronizováno do Odoo`);
      setTimeout(() => setShowSuccess(null), 4000);
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk sync failed:', err);
    }
  };

  const handleBulkAddToList = async () => {
    if (selectedCompanyIds.length === 0 || !selectedList) return;

    try {
      const result = await addToMailingListBulk(selectedCompanyIds, parseInt(selectedList));
      const listName = mailingLists.find((l) => l.id === parseInt(selectedList))?.name;
      setShowSuccess(`✓ ${result.addedCount} kontaktů přidáno do seznamu: ${listName}`);
      setTimeout(() => setShowSuccess(null), 4000);
      setSelectedList('');
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk add to list failed:', err);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || selectedCompanyIds.length === 0) return;

    try {
      const result = await createListWithCompanies(newListName, selectedCompanyIds);
      setShowSuccess(`✓ Seznam "${result.name}" vytvořen s ${result.contact_count} kontakty`);
      setTimeout(() => setShowSuccess(null), 4000);
      setShowCreateDialog(false);
      setNewListName('');
      onComplete?.();
      loadMailingLists(); // Refresh list
    } catch (err: any) {
      console.error('Create list failed:', err);
    }
  };

  if (selectedCompanyIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900">
            Odoo Bulk Akce ({selectedCompanyIds.length} vybráno)
          </h3>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-3 p-3 bg-green-100 text-green-800 rounded-md text-sm">
            {showSuccess}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Bulk Sync */}
          <Button
            type="button"
            onClick={handleBulkSync}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Synchronizuji...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Synchronizovat do Varyshopu
              </>
            )}
          </Button>

          {/* Add to Existing List */}
          <div className="flex gap-2">
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              disabled={loading}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white disabled:opacity-50"
            >
              <option value="">Vyberte mailing seznam...</option>
              {mailingLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.contact_count})
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleBulkAddToList}
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
                  Přidat do seznamu
                </>
              )}
            </Button>
          </div>

          {/* Create New List */}
          <Button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Vytvořit nový seznam
          </Button>
        </div>
      </div>

      {/* Create List Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Vytvořit nový mailing seznam</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vytvoří nový mailing seznam a přidá {selectedCompanyIds.length} vybraných kontaktů.
            </p>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Název seznamu..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewListName('');
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
    </>
  );
};
