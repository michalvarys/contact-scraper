import { Table as TableInstance } from '@tanstack/react-table';

export interface VirtualTableProps<T> {
  /**
   * Instance tabulky z tanstack/react-table
   */
  table: TableInstance<T>;

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
   * Callback při kliknutí na řádek
   */
  onRowClick?: (row: T) => void;

  /**
   * Callback při dvojkliku na řádek
   */
  onRowDoubleClick?: (row: T) => void;

  /**
   * Vlastní CSS třídy
   */
  className?: string;

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

  /**
   * Obsah patičky tabulky
   */
  footer?: React.ReactNode;

  /**
   * Aktuální stránka
   */
  currentPage?: number;

  /**
   * Celkový počet stránek
   */
  totalPages?: number;

  /**
   * Callback pro změnu stránky
   */
  onPageChange?: (page: number) => void;

  /**
   * Velikost stránky (počet záznamů na stránku)
   */
  pageSize?: number;

  /**
   * Callback pro změnu velikosti stránky
   */
  onPageSizeChange?: (pageSize: number) => void;

  /**
   * Dostupné velikosti stránek
   */
  pageSizeOptions?: number[];
}
