import { TableRow, TableCell } from '@/components/atoms/Table';
import { PageSizeSelector, Pagination } from '@/components/molecules/VirtualTable/components';
import IndeterminateCheckbox from '@/components/atoms/IndeterminateCheckbox';
import type { Table } from '@tanstack/react-table';
import type { Company } from '@contact-scraper/api/routers';

interface TableFooterProps {
    table: Table<Company>;
    pagination: {
        currentPage?: number;
        totalPages?: number;
        pageSize?: number;
        totalItems?: number;
    };
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export const TableFooter = ({
    table,
    pagination,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
}: TableFooterProps) => {
    return (
        <>
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

            {pagination.currentPage && pagination.totalPages && onPageChange && (
                <div className="p-2">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        {/* Výběr velikosti stránky */}
                        {pagination.pageSize !== undefined && onPageSizeChange && (
                            <PageSizeSelector
                                pageSize={pagination.pageSize}
                                onPageSizeChange={onPageSizeChange}
                                pageSizeOptions={pageSizeOptions}
                            />
                        )}

                        {/* Paginace */}
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={onPageChange}
                        />
                    </div>
                </div>
            )}
        </>
    );
};
