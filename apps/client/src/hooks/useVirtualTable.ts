import { useCallback, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table } from '@tanstack/react-table';

interface UseVirtualTableOptions {
  /**
   * Instance tabulky z tanstack/react-table
   */
  table: Table<any>;

  /**
   * Funkce pro načtení další stránky dat
   */
  fetchNextPage: () => void;

  /**
   * Zda se načítají další data
   */
  isFetchingNextPage: boolean;

  /**
   * Zda existují další data k načtení
   */
  hasNextPage: boolean;

  /**
   * Zda se načítají data
   */
  isLoading: boolean;

  /**
   * Výška řádku v pixelech
   */
  rowHeight?: number;

  /**
   * Počet řádků načtených mimo viditelnou oblast
   */
  overscan?: number;

  /**
   * Vzdálenost od konce v pixelech, při které se načtou další data
   */
  threshold?: number;
}

/**
 * Hook pro virtualizaci tabulky s infinite scrollingem
 */
export function useVirtualTable({
  table,
  fetchNextPage,
  isFetchingNextPage,
  hasNextPage,
  isLoading,
  rowHeight = 48,
  overscan = 20,
  threshold = 300,
}: UseVirtualTableOptions) {
  // Reference na kontejner tabulky
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Stav pro aktivní řádek (např. při najetí myší)
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  // Získání řádků z tabulky
  const { rows } = table.getRowModel();

  // Virtualizer pro efektivní vykreslování řádků
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    getScrollElement: useCallback(() => tableContainerRef.current, []),
    overscan,
    measureElement: useCallback(
      (element: Element) => {
        return element?.getBoundingClientRect().height || rowHeight;
      },
      [rowHeight],
    ),
  });

  // Funkce pro načtení dalších dat při scrollování
  const checkForMoreItems = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;

    // Výpočet vzdálenosti od konce
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Načíst další data, když se uživatel přiblíží ke konci
    if (distanceFromBottom < threshold && !isFetchingNextPage && hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, hasNextPage, isLoading, threshold]);

  // Optimalizovaný event handler pro scroll
  const handleScroll = useCallback(() => {
    // Použití requestAnimationFrame pro omezení počtu volání
    window.requestAnimationFrame(() => {
      checkForMoreItems();
    });
  }, [checkForMoreItems]);

  // Kontrola při mountu a po načtení dat
  useEffect(() => {
    // Počkáme, až se komponenta vykreslí
    const timer = setTimeout(() => {
      checkForMoreItems();
    }, 100);

    return () => clearTimeout(timer);
  }, [checkForMoreItems, rows.length]);

  return {
    tableContainerRef,
    rowVirtualizer,
    virtualItems: rowVirtualizer.getVirtualItems(),
    totalSize: rowVirtualizer.getTotalSize(),
    handleScroll,
    activeRowIndex,
    setActiveRowIndex,
    rows,
  };
}
