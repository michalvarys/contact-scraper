import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    ColumnDef,
    PaginationState,
    RowSelectionState,
} from '@tanstack/react-table';
import { useCompanies } from '@/hooks/useCompanies';
import { useFilters } from '@/hooks/useFilters';
import { Company } from '@contact-scraper/api/routers';

// Typ pro kontext
interface BusinessTableContextType {
    table: ReturnType<typeof useReactTable<Company>>;
    data: Company[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
    };
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
    rowSelection: RowSelectionState;
    setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}

// Vytvoření kontextu
const BusinessTableContext = createContext<BusinessTableContextType | undefined>(undefined);

// Mapování názvů sloupců z API na ID sloupců v tabulce
const apiToColumnMapping: Record<string, string> = {
    name: 'name',
    address: 'address',
    reviewsCount: 'reviewsCount',
    scrapedAt: 'scrapedAt',
    email: 'email',
    website: 'website',
    phone: 'phone',
};

// Mapování ID sloupců v tabulce na názvy v API
const columnToApiMapping: Record<string, string> = {
    name: 'name',
    address: 'address',
    reviewsCount: 'reviewsCount',
    scrapedAt: 'scrapedAt',
    email: 'email',
    website: 'website',
    phone: 'phone',
};

// Provider komponenta
export const BusinessTableProvider: React.FC<{
    children: React.ReactNode;
    columns: ColumnDef<Company, any>[];
}> = ({ children, columns }) => {
    // Filtry a parametry pro API
    const { filters, setFilters } = useFilters();

    // Výchozí hodnoty
    const defaultPageSize = 20;
    const defaultPage = 1;
    const defaultSorting: SortingState = [{ id: 'name', desc: false }];

    // Inicializace stavu řazení podle aktuálních filtrů
    const initialSorting: SortingState = useMemo(() => {
        const sortBy = filters.sortBy || 'name';
        const sortDir = filters.sortDir || 'asc';

        // Najít odpovídající ID sloupce v tabulce
        const columnId = Object.entries(columnToApiMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';

        return [{ id: columnId, desc: sortDir === 'desc' }];
    }, [filters.sortBy, filters.sortDir]);

    // Stav řazení
    const [sorting, setSorting] = useState<SortingState>(initialSorting);

    // Aktualizace stavu řazení při změně filtrů
    useEffect(() => {
        const sortBy = filters.sortBy || 'name';
        const sortDir = filters.sortDir || 'asc';

        // Najít odpovídající ID sloupce v tabulce
        const columnId = Object.entries(columnToApiMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';

        setSorting([{ id: columnId, desc: sortDir === 'desc' }]);
    }, [filters.sortBy, filters.sortDir]);

    // Stav výběru řádků
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    // Načtení dat z API
    const {
        data: {
            data: companies = [],
            pagination: {
                total: totalItems = 0,
                page: currentPage = defaultPage,
                limit: pageSize = defaultPageSize,
                pages: totalPages = 1,
            } = {},
        } = {},
        isLoading,
        error,
        refetch,
    } = useCompanies(filters);

    // Vytvoření instance tabulky pomocí useReactTable
    const table = useReactTable({
        data: companies,
        columns,
        state: {
            // Stav řazení
            sorting,
            // Stav stránkování
            pagination: {
                pageIndex: currentPage - 1,
                pageSize,
            },
            // Stav výběru řádků
            rowSelection,
        },
        // Povolení výběru řádků
        enableRowSelection: true,
        // Funkce pro zpracování změn výběru řádků
        onRowSelectionChange: setRowSelection,
        // Funkce pro zpracování změn řazení
        onSortingChange: (updater) => {
            // Získání nového stavu řazení
            const newSorting = typeof updater === 'function' ? updater(sorting) : updater;

            // Aktualizace stavu řazení
            setSorting(newSorting);

            // Aktualizace filtrů pro API
            if (newSorting.length > 0) {
                const sortColumn = newSorting[0].id;
                const sortDirection = newSorting[0].desc ? 'desc' : 'asc';

                if (columnToApiMapping[sortColumn]) {
                    setFilters({
                        sortBy: columnToApiMapping[sortColumn],
                        sortDir: sortDirection,
                    });
                }
            }
        },
        // Funkce pro zpracování změn stránkování
        onPaginationChange: (updater) => {
            // Získání nového stavu stránkování
            const newPagination =
                typeof updater === 'function' ? updater({ pageIndex: currentPage - 1, pageSize }) : updater;

            // Aktualizace filtrů pro API
            setFilters({
                page: (newPagination.pageIndex + 1).toString(),
                limit: newPagination.pageSize.toString(),
            });
        },
        // Základní modely pro tabulku
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        // Používáme vlastní stránkování z API
        manualPagination: true,
        pageCount: totalPages,
    });

    // Hodnota kontextu
    const contextValue = useMemo(
        () => ({
            table,
            data: companies,
            pagination: {
                currentPage,
                totalPages,
                totalItems,
                pageSize,
            },
            isLoading,
            error,
            refetch,
            rowSelection,
            setRowSelection,
        }),
        [
            table,
            companies,
            currentPage,
            totalPages,
            totalItems,
            pageSize,
            isLoading,
            error,
            refetch,
            rowSelection,
            setRowSelection
        ]
    );

    return (
        <BusinessTableContext.Provider value={contextValue}>
            {children}
        </BusinessTableContext.Provider>
    );
};

// Hook pro použití kontextu
export const useBusinessTable = () => {
    const context = useContext(BusinessTableContext);
    if (context === undefined) {
        throw new Error('useBusinessTable must be used within a BusinessTableProvider');
    }
    return context;
};
