import React, { memo } from 'react';
import { TableRow } from '@/components/atoms/Table';
import { cn } from '@/lib/utils';
import MemoizedTableCell from './MemoizedTableCell';

// Memoizovaný řádek tabulky pro lepší výkon
const VirtualRow = memo(({
    row,
    isActive,
    virtualRow,
    onRowClick,
    onRowDoubleClick,
    onMouseEnter,
    onMouseLeave
}: {
    row: any;
    isActive: boolean;
    virtualRow: any;
    onRowClick?: (row: any) => void;
    onRowDoubleClick?: (row: any) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) => (
    <TableRow
        key={row.id}
        data-index={virtualRow.index}
        className={cn(
            row.getIsSelected() && 'bg-blue-50',
            isActive && 'bg-gray-50',
            'overflow-hidden',
            'h-12' // Fixní výška řádku
        )}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
        }}
        onClick={() => onRowClick?.(row.original)}
        onDoubleClick={() => onRowDoubleClick?.(row.original)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    >
        {row.getVisibleCells().map((cell: any) => (
            <MemoizedTableCell key={cell.id} cell={cell} />
        ))}
    </TableRow>
));

VirtualRow.displayName = 'VirtualRow';

export default VirtualRow;
