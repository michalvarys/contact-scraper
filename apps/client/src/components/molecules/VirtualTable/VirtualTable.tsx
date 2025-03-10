import React, { memo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableFooter } from '@/components/atoms/Table';
import { TableCell } from '@/components/atoms/TableCell';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { flexRender } from '@tanstack/react-table';
import { useVirtualTable } from '@/hooks/useVirtualTable';
import { VirtualTableProps } from './types';
import {
    MemoizedTableCell,
    VirtualRow,
    LoadingIndicator,
    Pagination,
    PageSizeSelector
} from './components';

/**
 * Komponenta pro virtualizovanou tabulku s infinite scrollingem
 */
function VirtualTable<T>({
    table,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    isLoading,
    onRowClick,
    onRowDoubleClick,
    className,
    rowHeight = 48,
    overscan = 20,
    threshold = 300,
    footer,
    currentPage,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
}: VirtualTableProps<T>) {
    // Použití hooku pro virtualizaci tabulky
    const {
        tableContainerRef,
        virtualItems,
        totalSize,
        handleScroll,
        activeRowIndex,
        setActiveRowIndex,
        rows,
    } = useVirtualTable({
        table,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage,
        isLoading,
        rowHeight,
        overscan,
        threshold,
    });

    // Obsah tabulky pro prázdný stav nebo načítání
    const getTableContent = () => {
        if (isLoading && rows.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-4 animate-spin mr-2" />
                            Načítání dat...
                        </div>
                    </TableCell>
                </TableRow>
            );
        }

        if (rows.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                        Nebyly nalezeny žádné záznamy odpovídající filtru
                    </TableCell>
                </TableRow>
            );
        }

        return virtualItems.map(virtualRow => {
            const row = rows[virtualRow.index];
            const isActive = activeRowIndex === virtualRow.index;

            return (
                <VirtualRow
                    key={row.id}
                    row={row}
                    isActive={isActive}
                    virtualRow={virtualRow}
                    onRowClick={onRowClick}
                    onRowDoubleClick={onRowDoubleClick}
                    onMouseEnter={() => setActiveRowIndex(virtualRow.index)}
                    onMouseLeave={() => setActiveRowIndex(null)}
                />
            );
        });
    };

    return (
        <div className={cn('flex flex-col border rounded-md overflow-hidden', className)}>
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
                    height: 600px;
                    will-change: transform; /* Optimalizace pro GPU akceleraci */
                }
            `}</style>

            <div
                ref={tableContainerRef}
                className="scrollable-body relative w-full max-h-[75vh] overflow-y-auto overflow-x-auto"
                onScroll={handleScroll}
            >
                <Table>
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
                    <TableBody
                        style={{
                            height: `${totalSize}px`, // Celková výška všech řádků
                            position: 'relative', // Potřebné pro absolutní pozicování řádků
                            willChange: 'contents', // Optimalizace pro GPU akceleraci
                        }}
                    >
                        {getTableContent()}
                    </TableBody>
                    <TableFooter className="sticky-footer">
                        {footer}

                        {/* Přidání paginace a výběru velikosti stránky, pokud jsou poskytnuty props */}
                        {(currentPage !== undefined && totalPages !== undefined && onPageChange) && (
                            <TableRow>
                                <TableCell colSpan={table.getAllColumns().length} className="p-2">
                                    <div className="flex flex-wrap justify-between items-center gap-4">
                                        {/* Výběr velikosti stránky */}
                                        {pageSize !== undefined && onPageSizeChange && (
                                            <PageSizeSelector
                                                pageSize={pageSize}
                                                onPageSizeChange={onPageSizeChange}
                                                pageSizeOptions={pageSizeOptions}
                                            />
                                        )}

                                        {/* Paginace */}
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={onPageChange}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableFooter>
                </Table>

                {/* Indikátor načítání - mimo TableBody */}
                {isFetchingNextPage && <LoadingIndicator />}
            </div>
        </div>
    );
}

// Exportujeme memoizovanou verzi komponenty pro lepší výkon
export default memo(VirtualTable) as typeof VirtualTable;
