import { Table, TableFooter as TableFooterBase } from '@/components/atoms/Table';
import { cn } from '@/lib/utils';
import { useBusinessTable } from '../../contexts/BusinessTableContext';
import { useRef, useState, useEffect } from 'react';
import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import { useBusinessMutations } from '@/hooks';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { usePageTracking } from './hooks/usePageTracking';
import { TableHeader } from './components/TableHeader';
import { TableBody } from './components/TableBody';
import { TableFooter } from './components/TableFooter';
import { EditBusinessModal } from './components/EditBusinessModal';
import { OdooBulkActions } from './components/OdooBulkActions';
//@ts-ignore
import './styles/table.css';

export function TableView() {
  const threshold = 300;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [editingBusiness, setEditingBusiness] = useState<Company | null>(null);

  const {
    table,
    isFetchingNextPage,
    isLoading,
    onPageChange,
    onPageSizeChange,
    hasNextPage,
    fetchNextPage,
    pageSizeOptions,
    pagination,
    updateRowData,
    isLoadingPreviousPages,
    scrollToPageAfterLoad,
  } = useBusinessTable();

  // Infinite scroll hook
  const { handleScroll } = useInfiniteScroll({
    threshold,
    containerRef: tableContainerRef,
    isFetchingNextPage,
    hasNextPage,
    isLoading,
    fetchNextPage,
  });

  // Page tracking hook - sleduje viditelné řádky a aktualizuje URL
  usePageTracking({
    containerRef: tableContainerRef,
    pageSize: pagination.pageSize,
    enabled: true,
  });

  // Efekt pro zachování scroll pozice po načtení předchozích stránek
  useEffect(() => {
    if (
      !isLoadingPreviousPages &&
      scrollToPageAfterLoad.current !== null &&
      tableContainerRef.current
    ) {
      const targetPage = scrollToPageAfterLoad.current;
      const targetRowIndex = (targetPage - 1) * pagination.pageSize;

      // Počkáme na vykreslení řádků
      setTimeout(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const targetRow = container.querySelector(`[data-index="${targetRowIndex}"]`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'auto', block: 'start' });
        }

        // Reset flagy
        scrollToPageAfterLoad.current = null;
      }, 100);
    }
  }, [isLoadingPreviousPages, pagination.pageSize, scrollToPageAfterLoad]);

  // Mutace pro operace s firmami
  const { updateBusiness } = useBusinessMutations();

  const handleEditBusiness = (company: Company) => {
    setEditingBusiness(company);
  };

  // Funkce pro uložení úprav
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

  // Get selected row IDs
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCompanyIds = selectedRows.map((row) => row.original.id);

  const handleBulkComplete = () => {
    table.resetRowSelection();
  };

  return (
    <div className="table-container">
      {/* Odoo Bulk Actions */}
      <OdooBulkActions selectedCompanyIds={selectedCompanyIds} onComplete={handleBulkComplete} />

      <div className="table-wrapper">
        {/* Header */}
        <div className="sticky-header">
          <TableHeader table={table} />
        </div>

        {/* Scrollovatelná oblast s obsahem tabulky */}
        <div onScroll={handleScroll} ref={tableContainerRef} className="scrollable-body">
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
