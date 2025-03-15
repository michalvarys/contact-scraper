import { cn } from '@/lib/utils';
import { flexRender } from '@tanstack/react-table';
import type { Table } from '@tanstack/react-table';
import type { Company } from '@contact-scraper/api/routers';
import { TableHeader as TableHeaderBase, TableRow, TableHead, Table as TableBase } from '@/components/atoms/Table';

interface TableHeaderProps {
    table: Table<Company>;
}

export const TableHeader = ({ table }: TableHeaderProps) => {
    return (
        <div className="w-full">
            <TableBase className="w-full">
                <TableHeaderBase>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    className={cn(
                                        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
                                        header.column.getCanSort() && "cursor-pointer hover:bg-gray-100"
                                    )}
                                    style={{
                                        width: header.column.getSize(),
                                        minWidth: header.column.getSize(),
                                        maxWidth: header.column.getSize(),
                                    }}
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    <div className="flex items-center gap-2">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getIsSorted() && (
                                            <span className="ml-1">
                                                {header.column.getIsSorted() === "asc" ? " ▲" : " ▼"}
                                            </span>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeaderBase>
            </TableBase>
        </div>
    );
};
