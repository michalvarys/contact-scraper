import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UseUrlFiltersOptions {
  /**
   * Výchozí hodnoty filtrů
   */
  defaultValues?: Record<string, string>;
}

export interface UseUrlFiltersResult {
  /**
   * Aktuální parametry URL
   */
  searchParams: URLSearchParams;
  /**
   * Aktuální hodnoty filtrů
   */
  filters: Record<string, string>;
  /**
   * Nastavení jednoho filtru
   */
  setFilter: (name: string, value: string) => void;
  /**
   * Nastavení více filtrů najednou
   */
  setFilters: (newFilters: Record<string, string>) => void;
  /**
   * Resetování všech filtrů na výchozí hodnoty
   */
  resetFilters: () => void;
  /**
   * Získání hodnoty filtru
   */
  getFilter: (name: string, defaultValue?: string) => string;
}

/**
 * Hook pro práci s filtry v URL
 *
 * @example
 * ```tsx
 * const { filters, setFilter, resetFilters } = useUrlFilters({
 *   defaultValues: { sortBy: 'name', sortDir: 'asc' }
 * });
 *
 * // Nastavení filtru
 * setFilter('category', 'electronics');
 *
 * // Získání hodnoty filtru
 * const category = filters.category;
 *
 * // Resetování filtrů
 * resetFilters();
 * ```
 */
export function useUrlFilters(options: UseUrlFiltersOptions = {}): UseUrlFiltersResult {
  const { defaultValues = { sortDir: 'asc', sortBy: 'name' } } = options;

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
    const params = new URLSearchParams();

    // Nastavení výchozích hodnot
    Object.entries(defaultValues).forEach(([key, value]) => {
      params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, defaultValues]);

  // Nastavení jednoho filtru
  const setFilter = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Získání hodnoty filtru
  const getFilter = useCallback(
    (name: string, defaultValue: string = '') => {
      return searchParams.get(name) || defaultValue;
    },
    [searchParams],
  );

  // Vytvoření objektu s aktuálními hodnotami filtrů
  const filters = Array.from(searchParams.entries()).reduce(
    (acc, [key, value]) => ({ ...acc, [key]: value }),
    {} as Record<string, string>,
  );

  return {
    searchParams,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    getFilter,
  };
}

export default useUrlFilters;
