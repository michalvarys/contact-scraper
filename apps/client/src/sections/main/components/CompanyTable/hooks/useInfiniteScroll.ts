import { useCallback, useEffect, MutableRefObject } from 'react';

interface UseInfiniteScrollProps {
  threshold: number;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  isLoading: boolean;
  fetchNextPage: () => void;
}

export const useInfiniteScroll = ({
  threshold,
  containerRef,
  isFetchingNextPage,
  hasNextPage,
  isLoading,
  fetchNextPage,
}: UseInfiniteScrollProps) => {
  // Funkce pro načtení dalších dat při scrollování
  const checkForMoreItems = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollHeight, scrollTop, clientHeight } = container;

    // Výpočet vzdálenosti od konce
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Načíst další data, když se uživatel přiblíží ke konci
    if (distanceFromBottom < threshold && !isFetchingNextPage && hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [fetchNextPage, isFetchingNextPage, hasNextPage, isLoading, threshold, containerRef]);

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
  }, [checkForMoreItems]);

  return {
    handleScroll,
  };
};
