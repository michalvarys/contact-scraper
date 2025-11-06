import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    ColumnDef,
    RowSelectionState,
} from '@tanstack/react-table';
import { useFilters } from '@/hooks/useFilters';
import { Company } from '@contact-scraper/api/routers';
import { useCompanies } from '@/hooks/useCompanies';
import { createColumns } from '../components/CompanyTable/columns';

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
    fetchNextPage: () => void;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions: number[];
    selectedRows: Company[];
    // Nová funkce pro aktualizaci konkrétního záznamu v tabulce
    updateRowData: (id: string, updatedData: Partial<Company>) => void;
    // Modální dialogy pro editaci a mazání
    editingCompany: Company | null;
    setEditingCompany: (company: Company | null) => void;
    deletingCompanyId: string | null;
    setDeletingCompanyId: (id: string | null) => void;
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

// Funkce pro získání hodnoty pro řazení
const getSortValue = (value: any): string => {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number') {
        return value.toString();
    }

    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(v => getSortValue(v)).join(',');
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
};

// Provider komponenta
export const BusinessTableProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    // Filtry a parametry pro API
    const { filters, setFilters } = useFilters();

    // Memoizace definice sloupců, aby se nevytvářela při každém renderování
    const columns = useMemo(() => {
        const handleEdit = (company: Company) => {
            // Tato funkce bude předána do BusinessListPageContent přes props
            // a tam bude použita pro otevření modálního okna pro editaci
        };

        const handleDelete = (businessId: string) => {
            // Tato funkce bude předána do BusinessListPageContent přes props
            // a tam bude použita pro otevření potvrzovacího dialogu pro smazání
        };

        return createColumns(handleEdit, handleDelete);
    }, []);

    // Výchozí hodnoty
    const defaultPageSize = 50; // Zvýšeno pro lepší UX při scrollování
    const defaultPage = 1;
    const pageSizeOptions = [10, 25, 50, 100, 200];

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

    // Optimalizovaný stav pro infinite scrolling
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(1);

    // Stav pro uchování poslední platné hodnoty pagination
    const [lastValidPagination, setLastValidPagination] = useState({
        totalItems: 0,
        totalPages: 1,
    });

    // Ref pro sledování změn filtrů
    const filtersRef = useRef(filters);
    const isFilterChanged = useRef(false);
    const isInitialMount = useRef(true);

    // Detekce změny filtrů
    useEffect(() => {
        // Ignorujeme změnu stránky, protože tu řídíme sami
        const { page: currentPage, ...filtersWithoutPage } = { ...filters };
        const { page: prevPage, ...prevFiltersWithoutPage } = { ...filtersRef.current };

        // Porovnání aktuálních filtrů s předchozími (bez page)
        const hasChanged = JSON.stringify(filtersWithoutPage) !== JSON.stringify(prevFiltersWithoutPage);

        // Aktualizace reference na filtry
        filtersRef.current = { ...filters };

        if (hasChanged) {
            console.log('Filters changed', filtersWithoutPage, prevFiltersWithoutPage);
            isFilterChanged.current = true;

            // Reset stavu pro infinite scrolling při změně filtrů (kromě stránky)
            setCurrentPageIndex(1);
            setAllCompanies([]);

            // Reset výběru řádků při změně filtrů
            setRowSelection({});
        } else if (currentPage !== prevPage) {
            // Pokud se změnila pouze stránka, aktualizujeme pouze currentPageIndex
            console.log('Page changed from', prevPage, 'to', currentPage);

            // Neresetujeme allCompanies, protože chceme zachovat načtená data
            // Nastavíme isFilterChanged na false, aby se při načtení nových dat nepřepsala stávající data
            isFilterChanged.current = false;
        }
    }, [filters]);

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
    } = useCompanies({
        ...filters,
        // Použijeme limit z filtrů místo pevné hodnoty
        // limit: defaultPageSize.toString(),
    });

    // Flag pro sledování, zda se jedná o manuální změnu stránky
    const isManualPageChange = useRef(false);

    // Optimalizovaná aktualizace allCompanies při načtení nových dat
    useEffect(() => {
        if (companies.length > 0) {
            console.log('Companies loaded', companies.length, currentPageIndex, isFilterChanged.current, isManualPageChange.current);

            if (isFilterChanged.current || currentPageIndex === 1 || isManualPageChange.current) {
                // Při změně filtrů, první stránce nebo manuální změně stránky nahradit celé pole
                console.log('Replacing all companies', companies.length);
                setAllCompanies(companies);
                isFilterChanged.current = false;
                isManualPageChange.current = false;
            } else {
                // Jinak přidat nové záznamy (pouze při infinite scrollingu)
                console.log('Adding new companies', companies.length);
                setAllCompanies(prev => {
                    // Vytvoření mapy existujících ID pro odstranění duplicit
                    const existingIds = new Set(prev.map(company => company.id));

                    // Filtrování nových záznamů, které ještě nemáme
                    const newCompanies = companies.filter(company => !existingIds.has(company.id));
                    console.log('New unique companies', newCompanies.length);

                    // Spojení stávajících a nových záznamů
                    return [...prev, ...newCompanies];
                });
            }

            // Resetujeme stav načítání
            setIsFetchingNextPage(false);
        }
    }, [companies, currentPageIndex]);

    // Aktualizace lastValidPagination, když se načtou nová data
    useEffect(() => {
        if (totalItems > 0 && totalPages > 0) {
            setLastValidPagination({
                totalItems,
                totalPages,
            });
        }
    }, [totalItems, totalPages]);

    // Optimalizovaná aktualizace hasNextPage
    useEffect(() => {
        setHasNextPage(currentPage < totalPages);
    }, [currentPage, totalPages]);

    // Funkce pro změnu stránky
    const onPageChange = useCallback((page: number) => {
        console.log('Changing page to', page);

        // Nastavíme flag, že se jedná o manuální změnu stránky
        isManualPageChange.current = true;

        // Aktualizace filtrů přímo přes setFilters místo manipulace s URL
        setFilters({
            ...filters,
            page: page.toString(),
        });

    }, [filters, setFilters]);

    // Funkce pro změnu počtu záznamů na stránku
    const onPageSizeChange = useCallback((newPageSize: number) => {
        console.log('Changing page size to', newPageSize);

        // Aktualizace filtrů - toto automaticky vyvolá reset stavu v efektu při změně filtrů
        setFilters({
            ...filters,
            limit: newPageSize.toString(),
            page: '1', // Reset na první stránku
        });

    }, [filters, setFilters]);

    // Flag pro sledování, zda se jedná o infinite scrolling
    const isInfiniteScrolling = useRef(false);

    // Efekt pro aktualizaci currentPageIndex při změně stránky v URL
    useEffect(() => {
        const pageFromFilters = parseInt(filters.page || '1', 10);
        if (!isInfiniteScrolling.current && pageFromFilters !== currentPageIndex) {
            console.log('Updating currentPageIndex from URL', pageFromFilters);
            setCurrentPageIndex(pageFromFilters);
        }
    }, [filters.page]);

    // Optimalizovaná funkce pro načtení další stránky
    const fetchNextPage = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            console.log('Fetching next page in context...', currentPageIndex);
            setIsFetchingNextPage(true);
            const nextPage = currentPageIndex + 1;

            // Nastavíme flag, že se jedná o infinite scrolling
            isInfiniteScrolling.current = true;

            // Aktualizace stavu pro infinite scrolling
            setCurrentPageIndex(nextPage);

            // Aktualizace URL bez překreslení komponenty - toto je stále potřeba pro zachování historie
            const params = new URLSearchParams(window.location.search);
            params.set('page', nextPage.toString());
            // Zachováme aktuální limit v URL
            if (filters.limit) {
                params.set('limit', filters.limit);
            }
            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

            // Manuální načtení dat
            refetch().finally(() => {
                // Reset flagu po dokončení načítání
                isInfiniteScrolling.current = false;
            });
        }
    }, [hasNextPage, isFetchingNextPage, isLoading, currentPageIndex, refetch, filters]);

    // Memoizovaná data pro tabulku
    const tableData = useMemo(() => {
        // Použijeme allCompanies, pokud existují, jinak companies
        const data = allCompanies.length > 0 ? allCompanies : companies;

        // Aplikujeme řazení na data
        if (sorting.length > 0) {
            const sortColumn = sorting[0].id;
            const sortDirection = sorting[0].desc ? -1 : 1;

            // Vytvoříme kopii dat, abychom nemodifikovali původní data
            const sortedData = [...data].sort((a, b) => {
                // Získáme hodnoty pro řazení
                const aValue = getSortValue(a[sortColumn as keyof Company]);
                const bValue = getSortValue(b[sortColumn as keyof Company]);

                // Porovnáme hodnoty jako řetězce
                return sortDirection * aValue.localeCompare(bValue);
            });

            return sortedData;
        }

        return data;
    }, [allCompanies, companies, sorting]);

    // Optimalizovaná instance tabulky
    const table = useReactTable({
        data: tableData,
        columns,
        state: {
            sorting,
            rowSelection,
        },
        defaultColumn: {
            minSize: 40,
            maxSize: 200,
            enableResizing: true
        },
        enableColumnResizing: true,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: (updater) => {
            const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
            setSorting(newSorting);

            // Reset stavu pro infinite scrolling
            setCurrentPageIndex(1);
            setAllCompanies([]);
            isFilterChanged.current = true;

            // Aktualizace filtrů pro API
            if (newSorting.length > 0) {
                const sortColumn = newSorting[0].id;
                const sortDirection = newSorting[0].desc ? 'desc' : 'asc';

                if (columnToApiMapping[sortColumn]) {
                    setFilters({
                        ...filters,
                        sortBy: columnToApiMapping[sortColumn],
                        sortDir: sortDirection,
                        page: '1',
                    });
                }
            }
        },
        getCoreRowModel: getCoreRowModel(),
        // Nepoužíváme getSortedRowModel, protože řadíme data manuálně
        // getSortedRowModel: getSortedRowModel(),
    });

    // Funkce pro aktualizaci konkrétního záznamu v tabulce
    const updateRowData = useCallback((id: string, updatedData: Partial<Company>) => {
        setAllCompanies(prevCompanies => {
            return prevCompanies.map(company => {
                if (company.id === id) {
                    // Vytvoříme nový objekt s aktualizovanými daty
                    return { ...company, ...updatedData };
                }
                return company;
            });
        });
    }, []);

    // Získání vybraných řádků přímo z tabulky
    const selectedRows = useMemo(() => {
        return table.getSelectedRowModel().flatRows.map(row => row.original);
    }, [table, rowSelection]);

    // Memoizovaná hodnota kontextu pro minimalizaci re-renderů
    const contextValue = useMemo(
        () => {
            // Použijeme poslední platné hodnoty, pokud se načítají nová data nebo jsou aktuální hodnoty 0
            const effectiveTotalItems = (isLoading || totalItems === 0) && lastValidPagination.totalItems > 0
                ? lastValidPagination.totalItems
                : totalItems;

            const effectiveTotalPages = (isLoading || totalPages === 0) && lastValidPagination.totalPages > 0
                ? lastValidPagination.totalPages
                : totalPages;

            // Použijeme hodnotu z URL místo hodnoty z API
            const effectivePageSize = parseInt(filters.limit || pageSize.toString(), 10);

            return {
                table,
                data: tableData,
                pagination: {
                    currentPage,
                    totalPages: effectiveTotalPages,
                    totalItems: effectiveTotalItems,
                    pageSize: effectivePageSize,
                },
                isLoading,
                error,
                refetch,
                rowSelection,
                setRowSelection,
                fetchNextPage,
                isFetchingNextPage,
                hasNextPage,
                onPageChange,
                onPageSizeChange,
                pageSizeOptions,
                updateRowData,
                selectedRows
            };
        },
        [
            table,
            tableData,
            currentPage,
            totalPages,
            totalItems,
            pageSize,
            isLoading,
            error,
            refetch,
            rowSelection,
            setRowSelection,
            fetchNextPage,
            isFetchingNextPage,
            hasNextPage,
            onPageChange,
            onPageSizeChange,
            pageSizeOptions,
            lastValidPagination,
            filters.limit, // Přidáno pro aktualizaci při změně limitu v URL
            updateRowData, // Přidáno pro aktualizaci při změně funkce updateRowData
            selectedRows
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
