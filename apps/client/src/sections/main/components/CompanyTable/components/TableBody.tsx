import { cn } from '@/lib/utils';
import { flexRender } from '@tanstack/react-table';
import type { Table } from '@tanstack/react-table';
import type { Company } from '@contact-scraper/api/routers';
import { TableBody as TableBodyBase, TableRow as TableRowBase, TableCell } from '@/components/atoms/Table';
import { Loader2 } from 'lucide-react';
import { TableRow } from './TableRow';

interface TableBodyProps {
    table: Table<Company>;
    isLoading: boolean;
    onEditBusiness: (company: Company) => void;
}

export const TableBody = ({
    table,
    isLoading,
    onEditBusiness,
}: TableBodyProps) => {
    const { rows } = table.getRowModel();

    if (isLoading && rows.length === 0) {
        return (
            <TableBodyBase>
                <TableRowBase>
                    <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-4 animate-spin mr-2" />
                            Načítání dat...
                        </div>
                    </TableCell>
                </TableRowBase>
            </TableBodyBase>
        );
    }

    if (rows.length === 0) {
        return (
            <TableBodyBase>
                <TableRowBase>
                    <TableCell colSpan={table.getAllColumns().length} className="text-center py-8">
                        Nebyly nalezeny žádné záznamy odpovídající filtru
                    </TableCell>
                </TableRowBase>
            </TableBodyBase>
        );
    }

    return (
        <TableBodyBase>
            {rows.map((dataRow) => {
                const row = table.getRow(dataRow.id);

                return (
                    <TableRow
                        key={row.id}
                        row={row}
                        data-index={row.index}
                        onDoubleClick={() => onEditBusiness(row.original)}
                        className={cn(
                            row.getIsSelected() && 'bg-blue-50',

                        )}
                    >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell
                                key={cell.id}
                                className="px-4 whitespace-nowrap overflow-hidden"
                                style={{
                                    width: cell.column.getSize(),
                                    minWidth: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                            >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                        ))}
                    </TableRow>
                );
            })}
        </TableBodyBase>
    );
};
