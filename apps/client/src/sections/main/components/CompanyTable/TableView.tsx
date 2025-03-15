import { Table, TableFooter as TableFooterBase } from '@/components/atoms/Table';
import { cn } from '@/lib/utils';
import { useBusinessTable } from '../../contexts/BusinessTableContext';
import { useRef, useState } from 'react';
import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import { useBusinessMutations } from '@/hooks';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { TableHeader } from './components/TableHeader';
import { TableBody } from './components/TableBody';
import { TableFooter } from './components/TableFooter';
import { EditBusinessModal } from './components/EditBusinessModal';
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
            }
        });
    };

    return (
        <div className="table-container">
            <div className="table-wrapper">
                {/* Header */}
                <div className="sticky-header">
                    <TableHeader table={table} />
                </div>

                {/* Scrollovatelná oblast s obsahem tabulky */}
                <div
                    onScroll={handleScroll}
                    ref={tableContainerRef}
                    className="scrollable-body"
                >
                    <Table className="overflow-hidden">
                        <TableBody
                            table={table}
                            isLoading={isLoading}
                            onEditBusiness={handleEditBusiness}
                        />
                        <TableFooterBase className="sticky-footer" />
                    </Table>
                </div>

                {/* Footer */}
                <TableFooter
                    table={table}
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    pageSizeOptions={pageSizeOptions}
                />
            </div>

            <EditBusinessModal
                business={editingBusiness}
                onSave={handleSaveBusiness}
                onClose={() => setEditingBusiness(null)}
            />
        </div>
    );
}
