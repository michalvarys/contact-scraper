import { Table, TableFooter as TableFooterBase } from '@/components/atoms/Table';
import { useBusinessTable } from '../../contexts/BusinessTableContext';
import { useState } from 'react';
import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import { useBusinessMutations } from '@/hooks';
import { TableHeader } from './components/TableHeader';
import { TableBody } from './components/TableBody';
import { TableFooter } from './components/TableFooter';
import { EditBusinessModal } from './components/EditBusinessModal';
import { OdooBulkActions } from './components/OdooBulkActions';
import { EnrichmentBulkActions } from './components/EnrichmentBulkActions';
//@ts-ignore
import './styles/table.css';

export function TableView() {
  const [editingBusiness, setEditingBusiness] = useState<Company | null>(null);

  const {
    table,
    isLoading,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
    pagination,
    updateRowData,
    isAllSelected,
    setIsAllSelected,
  } = useBusinessTable();

  const { updateBusiness } = useBusinessMutations();

  const handleEditBusiness = (company: Company) => {
    setEditingBusiness(company);
  };

  const handleSaveBusiness = (updatedBusiness: UpdateCompanyData) => {
    updateBusiness.mutate(updatedBusiness, {
      onSuccess: (response) => {
        setEditingBusiness(null);
        if (response && response.data) {
          updateRowData(response.data.id, response.data);
        }
      },
    });
  };

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCompanyIds = selectedRows.map((row) => row.original.id);
  const selectedCompanies = selectedRows.map((row) => row.original);

  const handleBulkComplete = () => {
    table.resetRowSelection();
    setIsAllSelected(false);
  };

  // Apply enriched contact fields to the table optimistically. Only known
  // contact columns live on the Company row; other fields are metadata-only.
  const handleRowEnriched = (companyId: string, data: Record<string, string>) => {
    const patch: Partial<Company> = {};
    for (const key of ['email', 'phone', 'website'] as const) {
      const value = (data[key] ?? '').trim();
      if (value && value.toUpperCase() !== 'N/A') {
        patch[key] = value;
      }
    }
    if (Object.keys(patch).length > 0) {
      updateRowData(companyId, patch);
    }
  };

  return (
    <div className="table-container">
      <OdooBulkActions
        selectedCompanyIds={selectedCompanyIds}
        selectedCompanies={selectedCompanies}
        isAllSelected={isAllSelected}
        onComplete={handleBulkComplete}
      />

      <EnrichmentBulkActions
        selectedCompanyIds={selectedCompanyIds}
        selectedCompanies={selectedCompanies}
        isAllSelected={isAllSelected}
        onRowEnriched={handleRowEnriched}
        onComplete={handleBulkComplete}
      />

      <div className="table-wrapper">
        <div className="sticky-header">
          <TableHeader table={table} />
        </div>

        <div className="scrollable-body">
          <Table className="overflow-hidden">
            <TableBody table={table} isLoading={isLoading} onEditBusiness={handleEditBusiness} />
            <TableFooterBase className="sticky-footer">
              <TableFooter
                table={table}
                pagination={pagination}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={pageSizeOptions}
              />
            </TableFooterBase>
          </Table>
        </div>
      </div>

      <EditBusinessModal
        business={editingBusiness}
        onSave={handleSaveBusiness}
        onClose={() => setEditingBusiness(null)}
      />
    </div>
  );
}
