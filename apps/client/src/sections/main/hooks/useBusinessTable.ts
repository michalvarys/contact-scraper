import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  ColumnDef,
  createColumnHelper,
  PaginationState,
} from '@tanstack/react-table';
import { useCompanies } from '@/hooks/useCompanies';
import { filterColumnMapping, FilterSortDirType, useFilters } from '@/hooks/useFilters';
import { Company, SortByType } from '@contact-scraper/api/routers';

// Pomocník pro vytváření sloupců
const columnHelper = createColumnHelper<Company>();

// Definice sloupců tabulky
const defaultColumns: ColumnDef<Company, any>[] = [
  {
    id: 'select',
    header: () => 'Výběr',
    cell: () => null, // Implementace checkboxu bude v komponentě
    enableSorting: false,
    size: 40,
  },
  columnHelper.accessor('id', {
    header: '#',
    size: 60,
  }),
  columnHelper.accessor('name', {
    header: 'Název',
    size: 200,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    size: 200,
  }),
  columnHelper.accessor('website', {
    header: 'Web',
    size: 200,
  }),
  columnHelper.accessor('phone', {
    header: 'Telefon',
    size: 120,
  }),
  columnHelper.accessor((row) => row.categories?.map((c) => c.name).join(', '), {
    id: 'categories',
    header: 'Kategorie',
    size: 200,
  }),
  columnHelper.accessor('address', {
    header: 'Adresa',
    size: 200,
  }),
  columnHelper.accessor((row) => row.metadata?.notes || '', {
    id: 'metadata.notes',
    header: 'Poznámky',
    size: 200,
  }),
  columnHelper.accessor('scrapedAt', {
    header: 'Vytvořeno',
    size: 150,
  }),
  {
    id: 'actions',
    header: 'Akce',
    cell: () => null, // Implementace akcí bude v komponentě
    enableSorting: false,
    size: 100,
  },
];

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
  /**
   * Vlastní definice sloupců
   */
  columns?: ColumnDef<Company, any>[];
}

export interface UseBusinessTableResult {
  /**
   * Instance tabulky z useReactTable
   */
  table: ReturnType<typeof useReactTable<Company>>;
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
  /**
   * Funkce pro reset výběru
   */
  resetSelection: () => void;
}

/**
 * Hook pro práci s tabulkou firem pomocí useReactTable
 */
export const useBusinessTable = (options: UseBusinessTableOptions = {}): UseBusinessTableResult => {
  const {
    defaultPageSize = 20,
    defaultPage = 1,
    defaultSorting = [{ id: 'name', desc: false }],
    columns = defaultColumns,
  } = options;

  // Filtry a parametry pro API
  const { filters, setFilters } = useFilters();
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
      // Výchozí stav řazení
      sorting: defaultSorting,
      // Výchozí stav stránkování
      pagination: {
        pageIndex: currentPage - 1,
        pageSize,
      },
    },
    // Povolení výběru řádků
    enableRowSelection: true,
    enableMultiRowSelection: true,
    // Funkce pro zpracování změn řazení
    onSortingChange: (updater) => {
      // Získání nového stavu řazení
      const newSorting = typeof updater === 'function' ? updater(defaultSorting) : updater;

      // Aktualizace filtrů pro API
      if (newSorting.length > 0) {
        const sortColumn = newSorting[0].id as SortByType;
        const sortDirection = newSorting[0].desc ? 'desc' : 'asc';

        // Mapování sloupců na názvy v API

        if (filterColumnMapping[sortColumn]) {
          setFilters({
            sortBy: filterColumnMapping[sortColumn],
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

  // Funkce pro reset výběru
  const resetSelection = () => {
    table.resetRowSelection();
  };

  return {
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
    resetSelection,
  };
};

export default useBusinessTable;
