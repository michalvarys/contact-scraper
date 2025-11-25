import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { filterColumnMapping, useFilters } from '@/hooks/useFilters';
import { Company, SortByType } from '@contact-scraper/api/routers';
import { useCompanies } from '@/hooks/useCompanies';
import { createColumns } from '../components/CompanyTable/columns';
import { trpc } from '@/trpc/trpc';

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
  // Načítání předchozích stránek
  isLoadingPreviousPages: boolean;
  scrollToPageAfterLoad: React.MutableRefObject<number | null>;
}

// Vytvoření kontextu
const BusinessTableContext = createContext<BusinessTableContextType | undefined>(undefined);

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
    return value.map((v) => getSortValue(v)).join(',');
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

  // Výchozí hodnoty
  const defaultPageSize = 50; // Zvýšeno pro lepší UX při scrollování
  const defaultPage = 1;
  const pageSizeOptions = [10, 25, 50, 100, 200];

  // Inicializace stavu řazení podle aktuálních filtrů
  const initialSorting: SortingState = useMemo(() => {
    const sortBy = filters.sortBy || 'name';
    const sortDir = filters.sortDir || 'asc';

    // Najít odpovídající ID sloupce v tabulce
    const columnId =
      Object.entries(filterColumnMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';

    return [{ id: columnId, desc: sortDir === 'desc' }];
  }, [filters.sortBy, filters.sortDir]);

  // Stav řazení
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  // Aktualizace stavu řazení při změně filtrů
  useEffect(() => {
    const sortBy = filters.sortBy || 'name';
    const sortDir = filters.sortDir || 'asc';

    // Najít odpovídající ID sloupce v tabulce
    const columnId =
      Object.entries(filterColumnMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';

    setSorting([{ id: columnId, desc: sortDir === 'desc' }]);
  }, [filters.sortBy, filters.sortDir]);

  // Stav výběru řádků
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Stav pro modální dialogy
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  // Memoizace definice sloupců, aby se nevytvářela při každém renderování
  const columns = useMemo(() => {
    const handleEdit = (company: Company) => {
      setEditingCompany(company);
    };

    const handleDelete = (businessId: string) => {
      setDeletingCompanyId(businessId);
    };

    return createColumns(handleEdit, handleDelete);
  }, []);
  // Optimalizovaný stav pro infinite scrolling
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);

  // Stav pro sledování načítání předchozích stránek
  const [isLoadingPreviousPages, setIsLoadingPreviousPages] = useState(false);
  const hasLoadedPreviousPages = useRef(false);
  const scrollToPageAfterLoad = useRef<number | null>(null);

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
    const hasChanged =
      JSON.stringify(filtersWithoutPage) !== JSON.stringify(prevFiltersWithoutPage);

    // Aktualizace reference na filtry
    filtersRef.current = { ...filters };

    if (hasChanged) {
      isFilterChanged.current = true;

      // Reset stavu pro infinite scrolling při změně filtrů (kromě stránky)
      setCurrentPageIndex(1);
      setAllCompanies([]);

      // Reset výběru řádků při změně filtrů
      setRowSelection({});

      // Reset načítání předchozích stránek
      hasLoadedPreviousPages.current = false;
    } else if (currentPage !== prevPage) {
      // Pokud se změnila pouze stránka, aktualizujeme pouze currentPageIndex

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
      if (isFilterChanged.current || currentPageIndex === 1 || isManualPageChange.current) {
        // Při změně filtrů, první stránce nebo manuální změně stránky nahradit celé pole
        setAllCompanies(companies);
        isFilterChanged.current = false;
        isManualPageChange.current = false;
      } else {
        // Jinak přidat nové záznamy (pouze při infinite scrollingu)
        setAllCompanies((prev) => {
          // Vytvoření mapy existujících ID pro odstranění duplicit
          const existingIds = new Set(prev.map((company) => company.id));

          // Filtrování nových záznamů, které ještě nemáme
          const newCompanies = companies.filter((company) => !existingIds.has(company.id));

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
  const onPageChange = useCallback(
    (page: number) => {
      // Nastavíme flag, že se jedná o manuální změnu stránky
      isManualPageChange.current = true;

      // Aktualizace filtrů přímo přes setFilters místo manipulace s URL
      setFilters({
        ...filters,
        page: page.toString(),
      });
    },
    [filters, setFilters],
  );

  // Funkce pro změnu počtu záznamů na stránku
  const onPageSizeChange = useCallback(
    (newPageSize: number) => {
      // Aktualizace filtrů - toto automaticky vyvolá reset stavu v efektu při změně filtrů
      setFilters({
        ...filters,
        limit: newPageSize.toString(),
        page: '1', // Reset na první stránku
      });
    },
    [filters, setFilters],
  );

  // Flag pro sledování, zda se jedná o infinite scrolling
  const isInfiniteScrolling = useRef(false);

  // Efekt pro aktualizaci currentPageIndex při změně stránky v URL
  useEffect(() => {
    const pageFromFilters = parseInt(filters.page || '1', 10);
    if (!isInfiniteScrolling.current && pageFromFilters !== currentPageIndex) {
      setCurrentPageIndex(pageFromFilters);
    }
  }, [filters.page]);

  // TRPC utils pro manuální query
  const utils = trpc.useContext();

  // Funkce pro načtení všech stránek od začátku (při reload stránky s page > 1)
  const loadAllPagesToCurrent = useCallback(async () => {
    const startPage = parseInt(filters.page || '1', 10);

    if (startPage <= 1 || hasLoadedPreviousPages.current || isLoadingPreviousPages) {
      return;
    }

    setIsLoadingPreviousPages(true);

    // Uložíme si aktuální stránku pro scroll po načtení
    scrollToPageAfterLoad.current = startPage;

    try {
      // Načteme všechny stránky od 1 do startPage paralelně pomocí TRPC
      const pagePromises = [];
      for (let page = 1; page <= startPage; page++) {
        pagePromises.push(
          utils.client.company.getCompanies
            .query({
              ...filters,
              hasEmail: filters.hasEmail,
              hasWebsite: filters.hasWebsite,
              hasPhone: filters.hasPhone,
              category: filters.category,
              keyword: filters.keyword,
              limit: filters.limit,
              sortBy: filters.sortBy,
              sortDir: filters.sortDir,
              page: page.toString(),
            })
            .then((data) => ({
              page,
              companies: data.data,
            })),
        );
      }

      const results = await Promise.all(pagePromises);

      // Seřadíme výsledky podle stránky a spojíme všechna data
      const allCompaniesFromPages = results
        .sort((a, b) => a.page - b.page)
        .flatMap((result) => result.companies);

      // Nahradíme všechna data novými (kompletní data od stránky 1 až po aktuální)
      setAllCompanies(allCompaniesFromPages);

      hasLoadedPreviousPages.current = true;
    } catch (error) {
      console.error('Error loading all pages:', error);
    } finally {
      setIsLoadingPreviousPages(false);
    }
  }, [filters, isLoadingPreviousPages, utils]);

  // Efekt pro automatické načtení všech stránek od začátku při mount
  useEffect(() => {
    const startPage = parseInt(filters.page || '1', 10);

    // Načteme všechny stránky od 1 do aktuální pouze pokud:
    // 1. Stránka je > 1
    // 2. Ještě jsme je nenačetli
    // 3. Už máme načtená data z aktuální stránky
    if (startPage > 1 && !hasLoadedPreviousPages.current && companies.length > 0 && !isLoading) {
      loadAllPagesToCurrent();
    }
  }, [companies.length, isLoading, loadAllPagesToCurrent, filters.page]);

  // Optimalizovaná funkce pro načtení další stránky
  const fetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
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
      enableResizing: true,
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
        const sortColumn = newSorting[0].id as SortByType;
        const sortDirection = newSorting[0].desc ? 'desc' : 'asc';

        if (sortColumn && filterColumnMapping[sortColumn]) {
          setFilters({
            ...filters,
            sortBy: filterColumnMapping[sortColumn],
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
    setAllCompanies((prevCompanies) => {
      return prevCompanies.map((company) => {
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
    return table.getSelectedRowModel().flatRows.map((row) => row.original);
  }, [table, rowSelection]);

  // Memoizovaná hodnota kontextu pro minimalizaci re-renderů
  const contextValue = useMemo(() => {
    // Použijeme poslední platné hodnoty, pokud se načítají nová data nebo jsou aktuální hodnoty 0
    const effectiveTotalItems =
      (isLoading || totalItems === 0) && lastValidPagination.totalItems > 0
        ? lastValidPagination.totalItems
        : totalItems;

    const effectiveTotalPages =
      (isLoading || totalPages === 0) && lastValidPagination.totalPages > 0
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
      selectedRows,
      editingCompany,
      setEditingCompany,
      deletingCompanyId,
      setDeletingCompanyId,
      isLoadingPreviousPages,
      scrollToPageAfterLoad,
    };
  }, [
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
    selectedRows,
    editingCompany,
    deletingCompanyId,
    isLoadingPreviousPages,
  ]);

  return (
    <BusinessTableContext.Provider value={contextValue}>{children}</BusinessTableContext.Provider>
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
