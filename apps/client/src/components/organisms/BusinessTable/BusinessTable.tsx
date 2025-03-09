import React, { useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableFooter } from '@/components/atoms/Table';
import { TableCell } from '@/components/atoms/TableCell';
import { TablePagination } from '@/components/molecules/TablePagination';
import { BusinessTableFilters } from '@/components/molecules/BusinessTableFilters';
import { useBusinessTable } from '@/contexts/BusinessTableContext';
import { Company } from '@contact-scraper/api/routers';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { flexRender } from '@tanstack/react-table';
import { IndeterminateCheckbox } from '@/components/atoms/IndeterminateCheckbox';

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
 */
export const BusinessTable: React.FC<BusinessTableProps> = ({
    onEdit,
    onDelete,
    className,
}) => {
    // Použití hooku pro práci s tabulkou
    const {
        table,
        pagination,
        isLoading,
        error,
        rowSelection,
    } = useBusinessTable();

    // Stav pro aktivní řádek (např. při najetí myší)
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

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

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Tabulka s fixním headerem a scrollovatelným body */}
            <div className="flex-grow flex flex-col border rounded-md overflow-hidden">
                <style jsx global>{`
                    .sticky-header {
                        position: sticky;
                        top: 0;
                        z-index: 10;
                        background-color: white;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .sticky-footer {
                        position: sticky;
                        bottom: 0;
                        z-index: 10;
                        background-color: white;
                        border-top: 1px solid #e5e7eb;
                    }
                    .scrollable-body {
                        overflow-y: auto;
                        max-height: calc(75vh - 200px);
                    }
                `}</style>
                <Table className="w-full">
                    <TableHeader className="sticky-header">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            header.column.getCanSort() && 'cursor-pointer hover:bg-gray-100'
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{ width: header.column.columnDef.size ? `${header.column.columnDef.size}px` : undefined }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                        {header.column.getIsSorted() && (
                                            <span className="ml-1">
                                                {header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}
                                            </span>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="scrollable-body">
                        {isLoading && table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-4 animate-spin mr-2" />
                                        Načítání dat...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                                    Nebyly nalezeny žádné firmy odpovídající filtru
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row, index) => {
                                const isActive = activeRowIndex === index;

                                return (
                                    <TableRow
                                        key={row.id}
                                        className={cn(
                                            row.getIsSelected() && 'bg-blue-50',
                                            isActive && 'bg-gray-50',
                                            'h-12' // Fixní výška řádku
                                        )}
                                        onDoubleClick={() => onEdit(row.original)}
                                        onMouseEnter={() => setActiveRowIndex(index)}
                                        onMouseLeave={() => setActiveRowIndex(null)}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                                className="whitespace-nowrap overflow-hidden"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                    <TableFooter className="sticky-footer">
                        <TableRow>
                            <TableCell className="p-1 pl-2">
                                <IndeterminateCheckbox
                                    checked={table.getIsAllPageRowsSelected()}
                                    indeterminate={table.getIsSomePageRowsSelected()}
                                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                                />
                            </TableCell>
                            <TableCell colSpan={table.getAllColumns().length - 1} className="text-sm text-gray-600">
                                Stránka ({table.getRowModel().rows.length} záznamů)
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>

            </div>

            {/* Fixní spodní lišta se stránkováním */}
            <div className="sticky bottom-0 zIndex-10 bg-white border-t border-gray-200 py-2 mt-4">
                <TablePagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    onPageChange={(page) => {
                        table.setPageIndex(page - 1);
                    }}
                    onPageSizeChange={(size) => {
                        table.setPageSize(size);
                    }}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default BusinessTable;
