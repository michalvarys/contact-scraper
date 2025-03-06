import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Aktualizace filtrů v URL
  const setFilters = useCallback(
    (newFilters: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Přidání nebo aktualizace nových filtrů
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Aktualizace URL
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Resetování všech filtrů
  const resetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortDir', 'asc');
    params.set('sortBy', 'name');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router]);

  const setFilter = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams],
  );

  const category = searchParams.get('category') || '';
  const hasWebsite = searchParams.get('hasWebsite') || 'all';
  const hasEmail = searchParams.get('hasEmail') || 'all';
  const hasPhone = searchParams.get('hasPhone') || 'all';
  const keyword = searchParams.get('keyword') || '';
  const page = searchParams.get('page') || '1';
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortDir = searchParams.get('sortDir') || 'asc';
  const limit = searchParams.get('limit') || '10';

  return {
    searchParams,
    filters: {
      category,
      hasWebsite,
      hasEmail,
      hasPhone,
      keyword,
      page,
      sortBy,
      sortDir,
      limit,
    },
    setFilter,
    setFilters,
    resetFilters,
  };
}
