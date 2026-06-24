import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
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
  invalidate: () => void;
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions: number[];
  selectedRows: Company[];
  updateRowData: (id: string, updatedData: Partial<Company>) => void;
  editingCompany: Company | null;
  setEditingCompany: (company: Company | null) => void;
  deletingCompanyId: string | null;
  setDeletingCompanyId: (id: string | null) => void;
  isAllSelected: boolean;
  setIsAllSelected: (value: boolean) => void;
}

const BusinessTableContext = createContext<BusinessTableContextType | undefined>(undefined);

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE = 1;

export const BusinessTableProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { filters, setFilters } = useFilters();

  // Sorting state synced from URL filters
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortBy = filters.sortBy || 'name';
    const sortDir = filters.sortDir || 'asc';
    const columnId =
      Object.entries(filterColumnMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';
    return [{ id: columnId, desc: sortDir === 'desc' }];
  });

  useEffect(() => {
    const sortBy = filters.sortBy || 'name';
    const sortDir = filters.sortDir || 'asc';
    const columnId =
      Object.entries(filterColumnMapping).find(([_, apiName]) => apiName === sortBy)?.[0] || 'name';
    setSorting([{ id: columnId, desc: sortDir === 'desc' }]);
  }, [filters.sortBy, filters.sortDir]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  const columns = useMemo(() => {
    return createColumns(
      (company: Company) => setEditingCompany(company),
      (businessId: string) => setDeletingCompanyId(businessId),
    );
  }, []);

  // Local override for row data (optimistic updates)
  const [rowOverrides, setRowOverrides] = useState<Record<string, Partial<Company>>>({});

  // Fetch from API — filters drive the query key, so page changes auto-refetch
  const {
    data: {
      data: rawCompanies = [],
      pagination: {
        total: totalItems = 0,
        page: currentPage = DEFAULT_PAGE,
        limit: pageSize = DEFAULT_PAGE_SIZE,
        pages: totalPages = 1,
      } = {},
    } = {},
    isLoading,
    error,
    refetch,
  } = useCompanies(filters);

  // Apply local overrides to server data
  const companies = useMemo(() => {
    if (Object.keys(rowOverrides).length === 0) return rawCompanies;
    return rawCompanies.map((c) => (rowOverrides[c.id] ? { ...c, ...rowOverrides[c.id] } : c));
  }, [rawCompanies, rowOverrides]);

  // Reset row selection and overrides when filters change (except page)
  const filtersKey = `${filters.category}|${filters.hasWebsite}|${filters.hasEmail}|${filters.hasPhone}|${filters.keyword}|${filters.sortBy}|${filters.sortDir}|${filters.limit}|${filters.duplicates}`;
  useEffect(() => {
    setRowSelection({});
    setIsAllSelected(false);
    setRowOverrides({});
  }, [filtersKey]);

  const utils = trpc.useUtils();

  const invalidate = useCallback(() => {
    setRowOverrides({});
    utils.company.getCompanies.invalidate();
  }, [utils.company.getCompanies]);

  const onPageChange = useCallback(
    (page: number) => {
      setFilters({ page: page.toString() });
    },
    [setFilters],
  );

  const onPageSizeChange = useCallback(
    (newPageSize: number) => {
      setFilters({ limit: newPageSize.toString(), page: '1' });
    },
    [setFilters],
  );

  const table = useReactTable({
    data: companies,
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

      if (newSorting.length > 0) {
        const sortColumn = newSorting[0].id as SortByType;
        const sortDirection = newSorting[0].desc ? 'desc' : 'asc';

        if (sortColumn && filterColumnMapping[sortColumn]) {
          setFilters({
            sortBy: filterColumnMapping[sortColumn],
            sortDir: sortDirection,
            page: '1',
          });
        }
      }
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const updateRowData = useCallback((id: string, updatedData: Partial<Company>) => {
    setRowOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...updatedData } }));
  }, []);

  const selectedRows = useMemo(() => {
    return table.getSelectedRowModel().flatRows.map((row) => row.original);
  }, [table, rowSelection]);

  const effectivePageSize = parseInt(filters.limit || pageSize.toString(), 10);

  const contextValue = useMemo(
    () => ({
      table,
      data: companies,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        pageSize: effectivePageSize,
      },
      isLoading,
      error,
      refetch,
      invalidate,
      rowSelection,
      setRowSelection,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      updateRowData,
      selectedRows,
      editingCompany,
      setEditingCompany,
      deletingCompanyId,
      setDeletingCompanyId,
      isAllSelected,
      setIsAllSelected,
    }),
    [
      table,
      companies,
      currentPage,
      totalPages,
      totalItems,
      effectivePageSize,
      isLoading,
      error,
      refetch,
      invalidate,
      rowSelection,
      onPageChange,
      onPageSizeChange,
      updateRowData,
      selectedRows,
      editingCompany,
      deletingCompanyId,
      isAllSelected,
    ],
  );

  return (
    <BusinessTableContext.Provider value={contextValue}>{children}</BusinessTableContext.Provider>
  );
};

export const useBusinessTable = () => {
  const context = useContext(BusinessTableContext);
  if (context === undefined) {
    throw new Error('useBusinessTable must be used within a BusinessTableProvider');
  }
  return context;
};
