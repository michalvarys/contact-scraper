import { useEffect, useRef } from 'react';

interface UsePageTrackingProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pageSize: number;
  enabled?: boolean;
}

/**
 * Hook pro sledování aktuálně viditelné stránky v infinite scroll tabulce
 * Aktualizuje URL podle toho, které řádky jsou momentálně viditelné ve viewportu
 */
export function usePageTracking({ containerRef, pageSize, enabled = true }: UsePageTrackingProps) {
  const lastPageRef = useRef<number>(1);
  const updateTimeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const options: IntersectionObserverInit = {
      root: container,
      rootMargin: '0px',
      threshold: 0.5, // Řádek musí být viditelný alespoň z 50%
    };

    const observedRows = new Map<Element, number>();
    const visibleRows = new Set<number>();

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const rowIndex = observedRows.get(entry.target);
        if (rowIndex === undefined) return;

        if (entry.isIntersecting) {
          visibleRows.add(rowIndex);
        } else {
          visibleRows.delete(rowIndex);
        }
      });

      // Debounce aktualizace URL
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        if (visibleRows.size === 0) return;

        // Najdeme prostřední viditelný řádek
        const sortedRows = Array.from(visibleRows).sort((a, b) => a - b);
        const middleIndex = sortedRows[Math.floor(sortedRows.length / 2)];

        // Vypočítáme číslo stránky (řádky jsou indexované od 0)
        const currentPage = Math.floor(middleIndex / pageSize) + 1;

        // Aktualizujeme URL pouze pokud se stránka změnila
        if (currentPage !== lastPageRef.current) {
          lastPageRef.current = currentPage;

          // Aktualizujeme pouze URL bez triggeru refetch
          // Používáme replaceState místo pushState, aby se netvořila zbytečná historie
          const params = new URLSearchParams(window.location.search);
          params.set('page', currentPage.toString());
          window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
      }, 300); // Debounce 300ms
    };

    const observer = new IntersectionObserver(handleIntersection, options);

    // Funkce pro observování všech řádků
    const observeRows = () => {
      const rows = container.querySelectorAll('[data-index]');

      // Unobserve starých řádků
      observedRows.forEach((_, element) => {
        observer.unobserve(element);
      });
      observedRows.clear();
      visibleRows.clear();

      // Observe nových řádků
      rows.forEach((row) => {
        const indexAttr = row.getAttribute('data-index');
        if (indexAttr !== null) {
          const index = parseInt(indexAttr, 10);
          observedRows.set(row, index);
          observer.observe(row);
        }
      });
    };

    // Počkáme na vykreslení řádků
    const timeoutId = setTimeout(observeRows, 100);

    // MutationObserver pro sledování změn v tabulce (nové řádky)
    const mutationObserver = new MutationObserver(() => {
      observeRows();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, pageSize, enabled]);
}
