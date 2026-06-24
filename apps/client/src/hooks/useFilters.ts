import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterBooleanType, SortByType, SortDirType } from '@contact-scraper/api/routers';

export const filterColumnMapping: Record<SortByType, SortByType> = {
  name: 'name',
  address: 'address',
  reviewsCount: 'reviewsCount',
  scrapedAt: 'scrapedAt',
  email: 'email',
  website: 'website',
  phone: 'phone',
};
export type FilterType = FilterBooleanType;
export type FilterSortType = SortByType;
export type FilterSortDirType = SortDirType;

export type FiltersType = {
  category?: string;
  hasWebsite?: FilterType;
  hasEmail?: FilterType;
  hasPhone?: FilterType;
  keyword?: string;
  page?: string;
  sortBy?: SortByType;
  sortDir?: SortDirType;
  limit?: string;
  duplicates?: any;
};

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilters = useCallback(
    (newFilters: FiltersType) => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('sortDir', 'asc');
    params.set('sortBy', 'name');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router]);

  const setFilter = useCallback(
    (name: string, value: string | string[]) => {
      const params = new URLSearchParams(window.location.search);
      params.set(name, typeof value === 'string' ? value : value.join(','));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router],
  );

  const category = searchParams.get('category') || '';
  const hasWebsite = (searchParams.get('hasWebsite') || 'all') as FilterType;
  const hasEmail = (searchParams.get('hasEmail') || 'all') as FilterType;
  const hasPhone = (searchParams.get('hasPhone') || 'all') as FilterType;
  const keyword = searchParams.get('keyword') || '';
  const page = searchParams.get('page') || '1';
  const sortBy = (searchParams.get('sortBy') || 'name') as FilterSortType;
  const sortDir = (searchParams.get('sortDir') || 'asc') as FilterSortDirType;
  const limit = searchParams.get('limit') || '10';
  const duplicates = searchParams.get('duplicates') || '';

  const filters = useMemo(
    () => ({
      category,
      hasWebsite,
      hasEmail,
      hasPhone,
      keyword,
      page,
      sortBy,
      sortDir,
      limit,
      duplicates,
    }),
    [category, hasWebsite, hasEmail, hasPhone, keyword, page, sortBy, sortDir, limit, duplicates],
  );

  return {
    searchParams,
    filters,
    setFilter,
    setFilters,
    resetFilters,
  };
}
