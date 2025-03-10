import React from 'react';
import { TableRow, TableCell } from '@/components/atoms/Table';
import { BusinessTableFilters } from '@/components/molecules/BusinessTableFilters';
import { useBusinessTable } from '@/contexts/BusinessTableContext';
import { Company } from '@contact-scraper/api/routers';
import { cn } from '@/lib/utils';
import { IndeterminateCheckbox } from '@/components/atoms/IndeterminateCheckbox';
import VirtualTable from '@/components/molecules/VirtualTable';

export interface BusinessTableProps {
    /**
     * Callback pro editaci firmy
     */
    onEdit: (business: Company) => void;
    /**
     * Callback pro smazání firmy
     */
    onDelete: (businessId: string) => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Organismická komponenta pro tabulku firem
 * 
 * Používá VirtualTable pro efektivní vykreslování velkého množství dat
 * s podporou infinite scrollingu a virtualizace.
 */
export const BusinessTable: React.FC<BusinessTableProps> = ({
    onEdit,
    onDelete,
    className,
}) => {
    // Použití hooku pro práci s tabulkou
    const {
        table,
        data: companies,
        pagination,
        isLoading,
        error,
        rowSelection,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage,
        onPageChange,
        onPageSizeChange,
        pageSizeOptions,
    } = useBusinessTable();

    // Zjištění, zda jsou vybrány nějaké řádky
    const hasSelectedRows = Object.keys(rowSelection).length > 0;

    // Zobrazení chyby
    if (error) {
        return (
            <div className="container mx-auto p-4 text-red-500">
                Nepodařilo se načíst data firem
            </div>
        );
    }

    // Vytvoření obsahu patičky tabulky
    const tableFooter = (
        <TableRow>
            <TableCell className="p-1 pl-4">
                <IndeterminateCheckbox
                    checked={table.getIsAllPageRowsSelected()}
                    indeterminate={table.getIsSomePageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
            </TableCell>
            <TableCell colSpan={table.getAllColumns().length - 1} className="text-sm text-gray-600">
                Zobrazeno {table.getRowModel().rows.length} z {pagination.totalItems} záznamů
            </TableCell>
        </TableRow>
    );

    return (
        <div className={cn('flex flex-col h-full', className)}>

            {/* Virtualizovaná tabulka */}
            <VirtualTable
                table={table}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                isLoading={isLoading}
                onRowDoubleClick={onEdit}
                footer={tableFooter}
                threshold={200} // Načíst další data, když se uživatel přiblíží ke konci (200px od konce)
                // Nové props pro paginaci
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
                // Nové props pro změnu počtu záznamů na stránku
                pageSize={pagination.pageSize}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={pageSizeOptions}
            />
        </div>
    );
};

export default BusinessTable;
