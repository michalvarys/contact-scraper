// src/components/BusinessTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
    X,
    Loader2
} from 'lucide-react';
import { Business } from '@/types/business';
import {
    useReactTable,
    getCoreRowModel,
    ColumnDef,
    flexRender,
    SortingState,
} from '@tanstack/react-table';
import { useFilters } from '@/hooks/useFilters';
import { CategorySelect } from './CategorySelect';
import { useSearchParams } from 'next/navigation';
import { debounce } from '@/utils/helpers';
import { useDebounce } from '@/hooks/useDebounce';

interface BusinessTableProps {
    businesses: Business[];
    isLoading: boolean;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
}

export function BusinessTable({
    businesses,
    isLoading,
    totalItems,
    currentPage,
    pageSize,
    totalPages,
}: BusinessTableProps) {
    const { filters, setFilters, resetFilters, setFilter } = useFilters();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchTerm, setSearchTerm] = useState(filters.keyword || '');
    const [limit, setLimit] = useState(filters.limit || '20')

    useDebounce(() => {
        setFilter('keyword', searchTerm);
    }, 500, [searchTerm])

    useDebounce(() => {
        setFilters({
            // Při změně velikosti stránky se vrátíme na první stránku
            page: '1',
            limit: limit.toString()
        });
    }, 500, [limit])


    // Odeslání filtrů na server při změně
    useEffect(() => {
        console.log(sorting)
        const newFilters: Record<string, string> = {};
        if (sorting.length > 0) {
            const sortColumn = sorting[0].id;
            const sortDirection = sorting[0].desc ? 'desc' : 'asc';

            // Mapování sloupců na názvy v API
            const columnMapping: Record<string, string> = {
                'name': 'name',
                'address': 'address',
                'reviewsCount': 'reviewsCount',
                'scrapedAt': 'scrapedAt',
                'email': 'email',
                'website': 'website',
            };

            if (columnMapping[sortColumn]) {
                newFilters.sortBy = columnMapping[sortColumn];
                newFilters.sortDir = sortDirection;
            }
        }

        // Přidání stránkování
        newFilters.page = currentPage.toString();
        newFilters.limit = pageSize.toString();

        setFilters(newFilters);
    }, [sorting, currentPage, pageSize, setFilters]);

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
            cell: ({ row }) => {
                const categories = row.original.categories || [];
                return categories.map(cat => cat.name).join(', ');
            }
        },
        {
            accessorKey: 'address',
            header: 'Adresa'
        },
        {
            accessorKey: 'industry',
            header: 'Odvětví',
            cell: ({ row }) => row.original.industry?.name || ''
        },
        {
            accessorKey: 'region',
            header: 'Region',
            cell: ({ row }) => row.original.region?.name || ''
        }
    ];

    // Použití React Table pro zobrazení dat
    const table = useReactTable({
        data: businesses,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true, // Stránkování řídí server
        manualSorting: true, // Řazení řídí server
        manualFiltering: true, // Filtrování řídí server
        onSortingChange: setSorting,
        state: {
            sorting,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize,
            },
        },
        pageCount: totalPages,
    });

    const handleResetFilters = () => {
        resetFilters();
        // setSorting([]);
    };

    // Funkce pro změnu stránky
    const handlePageChange = (newPage: number) => {
        setFilters({ page: newPage.toString() });
    };

    return (
        <div className="space-y-4">
            {/* Filtry */}
            <div className="flex gap-2 items-center flex-wrap">
                <Input
                    placeholder="Hledat podle názvu nebo adresy"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow min-w-[200px]"
                />

                <CategorySelect />

                <Select
                    value={filters.hasWebsite}
                    onValueChange={(value: 'all' | 'true' | 'false') => setFilter('hasWebsite', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Web" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Jakýkoli web</SelectItem>
                        <SelectItem value="true">S webem</SelectItem>
                        <SelectItem value="false">Bez webu</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filters.hasEmail}
                    onValueChange={(value: 'all' | 'true' | 'false') => setFilter('hasEmail', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Email" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Jakýkoli email</SelectItem>
                        <SelectItem value="true">S emailem</SelectItem>
                        <SelectItem value="false">Bez emailu</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filters.hasPhone}
                    onValueChange={(value: 'all' | 'true' | 'false') => setFilter('hasPhone', value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Phone" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Jakýkoli</SelectItem>
                        <SelectItem value="true">S telefonem</SelectItem>
                        <SelectItem value="false">Bez telefonu</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleResetFilters}
                    title="Resetovat filtry"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Tabulka */}
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
                    {isLoading && businesses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-8">
                                <div className="flex justify-center items-center">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Načítání dat...
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : businesses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="text-center py-8">
                                Nebyly nalezeny žádné firmy odpovídající filtru
                            </TableCell>
                        </TableRow>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </UITable>

            {/* Stránkování */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    Celkem firem: {totalItems}
                    <Input
                        max={200}
                        min={10}
                        type="number"
                        value={limit}
                        step={5}
                        onChange={(e) => setLimit(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>
                        Strana {currentPage} z {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || isLoading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
