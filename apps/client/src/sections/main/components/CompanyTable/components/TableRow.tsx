import { PropsWithChildren, useMemo } from "react"
import { Row } from '@tanstack/react-table'
import { TableRow as TableRowBase } from '@/components/atoms/Table';
export function TableRow<T>({ row, children, ...props }: PropsWithChildren<{ row: Row<T>, onDoubleClick(): void, className: string }>) {
    const selected = row.getIsSelected()
    return useMemo(() => (
        <TableRowBase {...props}>
            {children}
        </TableRowBase>
    ), [row, selected])

}
