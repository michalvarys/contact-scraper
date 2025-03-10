import React, { memo } from 'react';
import { TableCell } from '@/components/atoms/TableCell';
import { flexRender } from '@tanstack/react-table';

// Memoizovaná buňka tabulky pro lepší výkon
const MemoizedTableCell = memo(({ cell }: { cell: any }) => (
    <TableCell
        key={cell.id}
        className="whitespace-nowrap overflow-hidden"
        style={{ width: cell.column.getSize() }}
    >
        {flexRender(
            cell.column.columnDef.cell,
            cell.getContext()
        )}
    </TableCell>
));

MemoizedTableCell.displayName = 'MemoizedTableCell';

export default MemoizedTableCell;
