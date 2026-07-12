import React, { useState, useEffect, useCallback } from 'react';
import { useOdoo } from '@/hooks/useOdoo';
import { useExportCSV } from '@/hooks';
import { Button } from '@/components/atoms/Button';
import { Loader2, Upload, Plus, ListPlus, Download } from 'lucide-react';
import type { Company } from '@contact-scraper/api/routers';
import { useFilters } from '@/hooks/useFilters';
import { trpc } from '@/trpc/trpc';

interface OdooBulkActionsProps {
  selectedCompanyIds: string[];
  selectedCompanies: Company[];
  isAllSelected?: boolean;
  onComplete?: () => void;
}

export const OdooBulkActions: React.FC<OdooBulkActionsProps> = ({
  selectedCompanyIds,
  selectedCompanies,
  isAllSelected = false,
  onComplete,
}) => {
  const {
    loading,
    error,
    progress,
    syncBulk,
    updateBulk,
    addToMailingListBulk,
    createListWithCompanies,
    getMailingLists,
  } = useOdoo();
  const { exportToCSV } = useExportCSV();

  const { filters } = useFilters();
  const { data: allIds, isFetching: isAllIdsFetching } = trpc.company.getAllIds.useQuery(filters, {
    enabled: isAllSelected,
    keepPreviousData: false,
  });

  const getEffectiveIds = useCallback((): string[] => {
    if (isAllSelected && allIds && !isAllIdsFetching) {
      return allIds;
    }
    return selectedCompanyIds;
  }, [isAllSelected, allIds, isAllIdsFetching, selectedCompanyIds]);

  const [syncToPartner, setSyncToPartner] = useState(false);
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
    const ids = getEffectiveIds();
    if (ids.length === 0) return;

    try {
      const result = await syncBulk(ids, { syncToPartner });
      setShowSuccess(`✓ ${result.syncedCount} kontaktů synchronizováno do Odoo`);
      setTimeout(() => setShowSuccess(null), 4000);
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk sync failed:', err);
    }
  };

  const handleBulkUpdate = async () => {
    const ids = getEffectiveIds();
    if (ids.length === 0) return;

    try {
      const result = await updateBulk(ids, { syncToPartner });
      if (result.errors && result.errors.length > 0) {
        setShowSuccess(
          `⚠️ ${result.updatedCount}/${result.totalRequested} kontaktů aktualizováno (${result.errors.length} chyb)`,
        );
      } else {
        setShowSuccess(`✓ ${result.updatedCount} kontaktů aktualizováno v Odoo`);
      }
      setTimeout(() => setShowSuccess(null), 4000);
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk update failed:', err);
    }
  };

  const handleBulkAddToList = async () => {
    const ids = getEffectiveIds();
    if (ids.length === 0 || !selectedList) return;

    try {
      const result = await addToMailingListBulk(ids, parseInt(selectedList), { syncToPartner });
      const listName = mailingLists.find((l) => l.id === parseInt(selectedList))?.name;
      setShowSuccess(`✓ ${result.addedCount} kontaktů přidáno do seznamu: ${listName}`);
      setTimeout(() => setShowSuccess(null), 4000);
      setSelectedList('');
      // Reload mailing lists to update contact counts
      await loadMailingLists();
      onComplete?.();
    } catch (err: any) {
      console.error('Bulk add to list failed:', err);
    }
  };

  const handleCreateList = async () => {
    const ids = getEffectiveIds();
    if (!newListName.trim() || ids.length === 0) return;

    try {
      const result = await createListWithCompanies(newListName, ids, { syncToPartner });
      setShowSuccess(`✓ Seznam "${result.name}" vytvořen s ${result.contact_count} kontakty`);
      setTimeout(() => setShowSuccess(null), 4000);
      setShowCreateDialog(false);
      setNewListName('');
      // Reload mailing lists to show new list with contact count
      await loadMailingLists();
      onComplete?.();
    } catch (err: any) {
      console.error('Create list failed:', err);
    }
  };

  const handleExportCSV = () => {
    if (selectedCompanies.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `export-firmy-${timestamp}.csv`;
    exportToCSV(selectedCompanies, filename);
    setShowSuccess(`✓ ${selectedCompanies.length} záznamů exportováno do CSV`);
    setTimeout(() => setShowSuccess(null), 4000);
  };

  const allIdsReady = isAllSelected && allIds && !isAllIdsFetching;
  const effectiveCount = allIdsReady ? allIds.length : selectedCompanyIds.length;

  if (selectedCompanyIds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900">
            CRM Bulk Akce ({effectiveCount} vybráno)
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

        {/* Progress */}
        {progress && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-blue-800 mb-1">
              <span>Zpracovávám...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Partner sync option */}
        <label className="mb-3 flex items-center gap-2 text-sm text-blue-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncToPartner}
            onChange={(e) => setSyncToPartner(e.target.checked)}
            className="rounded border-blue-300"
          />
          Vytvořit i res.partner (propojit s mailing.contact)
        </label>

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
                Synchronizovat do Odoo
              </>
            )}
          </Button>

          {/* Bulk Update */}
          <Button
            type="button"
            onClick={handleBulkUpdate}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
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

          {/* Export to CSV */}
          <Button
            type="button"
            onClick={handleExportCSV}
            disabled={loading}
            className="bg-gray-700 hover:bg-gray-800 text-white whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            Export do CSV
          </Button>
        </div>
      </div>

      {/* Create List Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Vytvořit nový mailing seznam</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vytvoří nový mailing seznam a přidá {effectiveCount} vybraných kontaktů.
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
