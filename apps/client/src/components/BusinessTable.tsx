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
    Loader2,
    Edit,
    Trash2,
    Tag
} from 'lucide-react';
import { Business } from '@/types/business';
import {
    useReactTable,
    getCoreRowModel,
    ColumnDef,
    flexRender,
    SortingState,
    RowSelectionState,
} from '@tanstack/react-table';
import { useFilters } from '@/hooks/useFilters';
import { CategorySelect } from './CategorySelect';
import { useDebounce } from '@/hooks/useDebounce';
import { useBusinessMutations } from '@/hooks/useBusinessMutations';
import { ConfirmDialog } from './ConfirmDialog';
import { EditBusinessForm } from './EditBusinessForm';
import { BulkCategoryChange } from './BulkCategoryChange';

interface BusinessTableProps {
    businesses: Business[];
    isLoading: boolean;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
}

// Pomocná funkce pro zkrácení textu
const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

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
    const [limit, setLimit] = useState(filters.limit || '20');
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Stavy pro modální okna a akce
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [businessToDelete, setBusinessToDelete] = useState<string | null>(null);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
    const [bulkCategoryChangeOpen, setBulkCategoryChangeOpen] = useState(false);

    // Mutace pro operace s firmami
    const { updateBusiness, deleteBusiness, bulkUpdateCategory, bulkDelete } = useBusinessMutations();

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


    // Funkce pro manipulaci s vybranými řádky
    const getSelectedBusinessIds = (): string[] => {
        return Object.keys(rowSelection).map(index => businesses[parseInt(index)].id);
    };

    // Funkce pro úpravu firmy
    const handleEditBusiness = (business: Business) => {
        setEditingBusiness(business);
    };

    // Funkce pro uložení úprav
    const handleSaveBusiness = (updatedBusiness: Business) => {
        updateBusiness.mutate(updatedBusiness, {
            onSuccess: () => {
                setEditingBusiness(null);
            }
        });
    };

    // Funkce pro smazání firmy
    const handleDeleteClick = (businessId: string) => {
        setBusinessToDelete(businessId);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (businessToDelete) {
            deleteBusiness.mutate(businessToDelete, {
                onSuccess: () => {
                    setDeleteConfirmOpen(false);
                    setBusinessToDelete(null);
                }
            });
        }
    };

    // Funkce pro hromadné akce
    const handleBulkDeleteClick = () => {
        if (Object.keys(rowSelection).length > 0) {
            setBulkDeleteConfirmOpen(true);
        }
    };

    const handleConfirmBulkDelete = () => {
        const selectedIds = getSelectedBusinessIds();
        if (selectedIds.length > 0) {
            bulkDelete.mutate({ businessIds: selectedIds }, {
                onSuccess: () => {
                    setBulkDeleteConfirmOpen(false);
                    setRowSelection({});
                }
            });
        }
    };

    const handleBulkCategoryChangeClick = () => {
        if (Object.keys(rowSelection).length > 0) {
            setBulkCategoryChangeOpen(true);
        }
    };

    const handleApplyBulkCategoryChange = (categoryId: number) => {
        const selectedIds = getSelectedBusinessIds();
        if (selectedIds.length > 0) {
            bulkUpdateCategory.mutate(
                { businessIds: selectedIds, categoryId },
                {
                    onSuccess: () => {
                        setBulkCategoryChangeOpen(false);
                        setRowSelection({});
                    }
                }
            );
        }
    };

    // Odeslání filtrů na server při změně
    useEffect(() => {
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
            id: 'select',
            header: ({ table }) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={
                            table.getRowModel().rows.length > 0 &&
                            table.getIsAllRowsSelected()
                        }
                        onChange={table.getToggleAllRowsSelectedHandler()}
                        className="h-4 w-4"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        className="h-4 w-4"
                    />
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'name',
            header: 'Název',
            cell: ({ row }) => (
                <div className="max-w-[200px] truncate">
                    <a
                        href={row.original.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={row.original.name}
                    >
                        {truncateText(row.original.name, 30)}
                    </a>
                </div>
            )
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => (
                <div className="max-w-[200px] truncate">
                    {row.original.email && (
                        <a
                            href={`mailto:${row.original.email}`}
                            className="hover:underline"
                            title={row.original.email}
                        >
                            {truncateText(row.original.email, 25)}
                        </a>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'website',
            header: 'Web',
            cell: ({ row }) => (
                <div className="max-w-[200px] truncate">
                    {row.original.website && (
                        <a
                            href={row.original.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            title={row.original.website}
                        >
                            {truncateText(row.original.website, 25)}
                        </a>
                    )}
                </div>
            )
        },
        {
            accessorKey: 'phone',
            header: 'Telefon',
            cell: ({ row }) => (
                <div className="max-w-[120px] truncate" title={row.original.phone}>
                    {truncateText(row.original.phone, 15)}
                </div>
            )
        },
        {
            accessorKey: 'categories',
            header: 'Kategorie',
            cell: ({ row }) => {
                const categories = row.original.categories || [];
                const categoryText = categories.map(cat => cat.name).join(', ');
                return (
                    <div className="max-w-[200px] truncate" title={categoryText}>
                        {truncateText(categoryText, 30)}
                    </div>
                );
            }
        },
        {
            accessorKey: 'address',
            header: 'Adresa',
            cell: ({ row }) => (
                <div className="max-w-[200px] truncate" title={row.original.address}>
                    {truncateText(row.original.address, 30)}
                </div>
            )
        },
        {
            accessorKey: 'industry',
            header: 'Odvětví',
            cell: ({ row }) => (
                <div className="max-w-[150px] truncate" title={row.original.industry?.name || ''}>
                    {truncateText(row.original.industry?.name || '', 20)}
                </div>
            )
        },
        {
            accessorKey: 'region',
            header: 'Region',
            cell: ({ row }) => (
                <div className="max-w-[150px] truncate" title={row.original.region?.name || ''}>
                    {truncateText(row.original.region?.name || '', 20)}
                </div>
            )
        },
        {
            id: 'actions',
            header: 'Akce',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditBusiness(row.original);
                        }}
                        title="Upravit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(row.original.id);
                        }}
                        title="Smazat"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
            enableSorting: false,
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
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            pagination: {
                pageIndex: currentPage - 1,
                pageSize: pageSize,
            },
            rowSelection,
        },
        pageCount: totalPages,
        enableRowSelection: true,
    });

    const handleResetFilters = () => {
        resetFilters();
    };

    // Funkce pro změnu stránky
    const handlePageChange = (newPage: number) => {
        setFilters({ page: newPage.toString() });
    };

    // Počet vybraných řádků
    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="space-y-4">
            {/* Hromadné akce */}
            {selectedCount > 0 && (
                <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        Vybráno: <strong>{selectedCount}</strong> záznamů
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkCategoryChangeClick}
                            className="flex items-center gap-1"
                        >
                            <Tag className="h-4 w-4" />
                            Změnit kategorii
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDeleteClick}
                            className="flex items-center gap-1"
                        >
                            <Trash2 className="h-4 w-4" />
                            Smazat vybrané
                        </Button>
                    </div>
                </div>
            )}

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

            {/* Modální okna */}
            {/* Editace firmy */}
            {editingBusiness && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                        <h2 className="text-xl font-bold mb-4">Upravit firmu</h2>
                        <EditBusinessForm
                            business={editingBusiness}
                            onSave={handleSaveBusiness}
                            onCancel={() => setEditingBusiness(null)}
                        />
                    </div>
                </div>
            )}

            {/* Potvrzení smazání */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title="Smazat firmu"
                message="Opravdu chcete smazat tuto firmu? Tato akce je nevratná."
                confirmLabel="Smazat"
                cancelLabel="Zrušit"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
            />

            {/* Potvrzení hromadného smazání */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirmOpen}
                title="Smazat vybrané firmy"
                message={`Opravdu chcete smazat ${selectedCount} vybraných firem? Tato akce je nevratná.`}
                confirmLabel="Smazat"
                cancelLabel="Zrušit"
                onConfirm={handleConfirmBulkDelete}
                onCancel={() => setBulkDeleteConfirmOpen(false)}
            />

            {/* Hromadná změna kategorie */}
            {bulkCategoryChangeOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Změnit kategorii</h2>
                        <BulkCategoryChange
                            onApply={handleApplyBulkCategoryChange}
                            onCancel={() => setBulkCategoryChangeOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
