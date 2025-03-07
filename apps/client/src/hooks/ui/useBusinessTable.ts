import { useState, useEffect, useMemo } from 'react';
import { SortingState, RowSelectionState } from '@tanstack/react-table';
import { useCompanies } from '@/hooks/useCompanies';
import { useFilters } from '@/hooks/useFilters';
import { Company } from '@contact-scraper/api/routers';

export interface UseBusinessTableOptions {
  /**
   * Výchozí počet položek na stránku
   */
  defaultPageSize?: number;
  /**
   * Výchozí stránka
   */
  defaultPage?: number;
  /**
   * Výchozí řazení
   */
  defaultSorting?: SortingState;
}

export interface UseBusinessTableResult {
  /**
   * Data firem
   */
  data: Company[];
  /**
   * Informace o stránkování
   */
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  /**
   * Informace o řazení
   */
  sorting: {
    state: SortingState;
    onSortingChange: (sorting: SortingState) => void;
  };
  /**
   * Informace o výběru řádků
   */
  selection: {
    state: RowSelectionState;
    selectedCount: number;
    selectedRows: Company[];
    onRowSelectionChange: (state: RowSelectionState) => void;
    onSelectAll: (selected: boolean) => void;
    isAllSelected: boolean;
    resetSelection: () => void;
  };
  /**
   * Stav načítání
   */
  isLoading: boolean;
  /**
   * Chyba při načítání
   */
  error: unknown;
  /**
   * Funkce pro obnovení dat
   */
  refetch: () => void;
}

/**
 * Hook pro práci s tabulkou firem
 */
export const useBusinessTable = (options: UseBusinessTableOptions = {}): UseBusinessTableResult => {
  const {
    defaultPageSize = 20,
    defaultPage = 1,
    defaultSorting = [{ id: 'name', desc: false }],
  } = options;

  // Filtry a parametry pro API
  const { filters, setFilters } = useFilters();

  // Stav řazení
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

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

  // Efekt pro aktualizaci filtrů při změně řazení
  useEffect(() => {
    const newFilters: Record<string, string> = {};

    if (sorting.length > 0) {
      const sortColumn = sorting[0].id;
      const sortDirection = sorting[0].desc ? 'desc' : 'asc';

      // Mapování sloupců na názvy v API
      const columnMapping: Record<string, string> = {
        name: 'name',
        address: 'address',
        reviewsCount: 'reviewsCount',
        scrapedAt: 'scrapedAt',
        email: 'email',
        website: 'website',
        phone: 'phone',
      };

      if (columnMapping[sortColumn]) {
        newFilters.sortBy = columnMapping[sortColumn];
        newFilters.sortDir = sortDirection;
      }
    }

    setFilters(newFilters);
  }, [sorting, setFilters]);

  // Vybrané řádky
  const selectedRows = useMemo(() => {
    return Object.keys(rowSelection)
      .map((index) => companies[parseInt(index)])
      .filter(Boolean);
  }, [companies, rowSelection]);

  // Funkce pro změnu stránky
  const handlePageChange = (page: number) => {
    setFilters({ page: page.toString() });
  };

  // Funkce pro změnu počtu položek na stránku
  const handlePageSizeChange = (size: number) => {
    setFilters({
      page: '1', // Při změně velikosti stránky se vrátíme na první stránku
      limit: size.toString(),
    });
  };

  // Funkce pro výběr všech řádků
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const newSelection: RowSelectionState = {};
      companies.forEach((_, index) => {
        newSelection[index] = true;
      });
      setRowSelection(newSelection);
    } else {
      setRowSelection({});
    }
  };

  // Funkce pro reset výběru
  const resetSelection = () => {
    setRowSelection({});
  };

  // Kontrola, zda jsou vybrány všechny řádky
  const isAllSelected =
    companies.length > 0 && Object.keys(rowSelection).length === companies.length;

  return {
    data: companies,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
    },
    sorting: {
      state: sorting,
      onSortingChange: setSorting,
    },
    selection: {
      state: rowSelection,
      selectedCount: Object.keys(rowSelection).length,
      selectedRows,
      onRowSelectionChange: setRowSelection,
      onSelectAll: handleSelectAll,
      isAllSelected,
      resetSelection,
    },
    isLoading,
    error,
    refetch,
  };
};

export default useBusinessTable;
