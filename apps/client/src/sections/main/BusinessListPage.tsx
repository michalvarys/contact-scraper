'use client';
import React from 'react';

import { BusinessTableProvider, useBusinessTable } from './contexts/BusinessTableContext';
import BusinessTable from './components/CompanyTable';
import { TableBulkActions } from './components/TableBulkActions';
import { TableFilters } from './components/TableFilters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/molecules/Dialog/Dialog';
import { EditBusinessForm } from './components/EditBusinessForm/EditBusinessForm';
import { Button } from '@/components/atoms/Button';
import { useBusinessMutations } from '@/hooks/api/useBusinessMutations';
import type { UpdateCompanyData } from '@contact-scraper/api/routers';

type BusinessListPageProps = {
  className?: string;
};

function BusinessListPageContent(props: BusinessListPageProps) {
  const {
    editingCompany,
    setEditingCompany,
    deletingCompanyId,
    setDeletingCompanyId,
    updateRowData,
    data,
    refetch,
  } = useBusinessTable();

  const { updateBusiness, deleteBusiness } = useBusinessMutations();

  const handleSaveEdit = (updatedData: Omit<UpdateCompanyData, 'id'>) => {
    if (!editingCompany) return;

    updateBusiness.mutate(
      { ...updatedData, id: editingCompany.id },
      {
        onSuccess: (response) => {
          // Aktualizace dat v tabulce
          if (response.success && response.data) {
            updateRowData(editingCompany.id, response.data);
          }
          setEditingCompany(null);
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingCompanyId) return;

    deleteBusiness.mutate(deletingCompanyId, {
      onSuccess: () => {
        setDeletingCompanyId(null);
        // Refetch dat pro aktualizaci tabulky po smazání
        refetch();
      },
    });
  };

  const deletingCompany = data.find((c) => c.id === deletingCompanyId);

  return (
    <>
      <div className={props.className}>
        <h1 className="text-3xl font-bold mb-6">Firemní databáze</h1>

        <TableFilters />
        <TableBulkActions />
        <BusinessTable />
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
        <DialogContent containerClassName="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upravit firmu</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <EditBusinessForm
              company={editingCompany}
              onSave={handleSaveEdit}
              onCancel={() => setEditingCompany(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingCompanyId}
        onOpenChange={(open) => !open && setDeletingCompanyId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat firmu</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat firmu "{deletingCompany?.name}"? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingCompanyId(null)}
              disabled={deleteBusiness?.isLoading}
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteBusiness?.isLoading}
            >
              {deleteBusiness?.isLoading ? 'Mazání...' : 'Smazat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BusinessListPage(props: BusinessListPageProps) {
  return (
    <BusinessTableProvider>
      <BusinessListPageContent {...props} />
    </BusinessTableProvider>
  );
}

export default BusinessListPage;
