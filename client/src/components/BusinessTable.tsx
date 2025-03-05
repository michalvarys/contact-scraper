// src/components/BusinessTable.tsx
'use client';

import React, { useState } from 'react';
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import { Business } from '@/types/business';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    FilterFn,
    // Row,
    // Table
} from '@tanstack/react-table';

interface BusinessTableProps {
    businesses: Business[];
}

export function BusinessTable({ businesses }: BusinessTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [websiteFilter, setWebsiteFilter] = useState<'all' | 'with' | 'without'>('all');
    const [emailFilter, setEmailFilter] = useState<'all' | 'with' | 'without'>('all');
    const [globalFilter, setGlobalFilter] = useState('');

    const columns: ColumnDef<Business>[] = [
        {
            accessorKey: 'name',
            header: 'Název',
            cell: ({ row }) => (
                <a
                    href={row.original.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                >
                    {row.original.name}
                </a>
            )
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => (
                row.original.email && (
                    <a
                        href={`mailto:${row.original.email}`}
                        className="hover:underline"
                    >
                        {row.original.email}
                    </a>
                )
            )
        },
        {
            accessorKey: 'website',
            header: 'Web',
            cell: ({ row }) => (
                row.original.website && (
                    <a
                        href={row.original.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        {row.original.website}
                    </a>
                )
            )
        },
        {
            accessorKey: 'phone',
            header: 'Telefon'
        },
        {
            accessorKey: 'categories',
            header: 'Kategorie',
            cell: ({ row }) => row.original.categories?.join(', ')
        },
        {
            accessorKey: 'address',
            header: 'Adresa'
        }
    ];

    const customFilter: FilterFn<Business> = (row, columnId, value): boolean => {
        const business = row.original;
        if (value) {
            const searchTerm = String(value).toLowerCase();
            const matchesSearch = business.name.toLowerCase().includes(searchTerm) ||
                business.address.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
        }
        const matchesCategory = !categoryFilter ||
            (business.categories || []).includes(categoryFilter);

        const matchesWebsite = websiteFilter === 'all' ||
            (websiteFilter === 'with' ? !!business.website : !business.website);

        const matchesEmail = emailFilter === 'all' ||
            (emailFilter === 'with' ? !!business.email : !business.email);

        const hasRecords = !!(business.email || business.website || business.phone || business.name);
        return hasRecords && matchesCategory && matchesWebsite && matchesEmail;
    };

    const table = useReactTable({
        data: businesses,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        globalFilterFn: customFilter,
        state: {
            sorting,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 20,
            },
        },
    });

    // Extract unique categories
    const uniqueCategories = [...new Set(businesses.flatMap(b => b.categories || []))];

    const resetFilters = () => {
        setGlobalFilter('');
        setCategoryFilter('');
        setWebsiteFilter('all');
        setEmailFilter('all');
        table.resetSorting();
    };

    // Apply custom filters
    React.useEffect(() => {
        table.setGlobalFilter(globalFilter);
    }, [categoryFilter, websiteFilter, emailFilter, table, globalFilter]);

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
                <Input
                    placeholder="Hledat podle názvu nebo adresy"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="flex-grow min-w-[200px]"
                />

                <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Všechny kategorie</SelectItem>
                        {uniqueCategories.map(category => (
                            <SelectItem key={category} value={category}>
                                {category}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={websiteFilter}
                    onValueChange={(value: 'all' | 'with' | 'without') => setWebsiteFilter(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Web" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Jakýkoli web</SelectItem>
                        <SelectItem value="with">S webem</SelectItem>
                        <SelectItem value="without">Bez webu</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={emailFilter}
                    onValueChange={(value: 'all' | 'with' | 'without') => setEmailFilter(value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Email" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Jakýkoli email</SelectItem>
                        <SelectItem value="with">S emailem</SelectItem>
                        <SelectItem value="without">Bez emailu</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={resetFilters}
                    title="Resetovat filtry"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <UITable>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="cursor-pointer hover:bg-gray-100"
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {header.column.getIsSorted() && (
                                        <span>{header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}</span>
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </UITable>

            <div className="flex justify-between items-center">
                <div>
                    Celkem firem: {table.getFilteredRowModel().rows.length}
                    <Input
                        max={200}
                        min={10}
                        type="number"
                        value={table.getState().pagination.pageSize}
                        step={5}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>
                        Strana {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}