/**
 * Základní typ pro firmu
 */
export interface Business {
  /**
   * Unikátní identifikátor firmy
   */
  id: string;

  /**
   * Název firmy
   */
  name: string;

  /**
   * Adresa firmy
   */
  address?: string | null;

  /**
   * Email firmy
   */
  email?: string | null;

  /**
   * Telefonní číslo firmy
   */
  phone?: string | null;

  /**
   * Webová stránka firmy
   */
  website?: string | null;

  /**
   * Datum vytvoření záznamu
   */
  createdAt: Date;

  /**
   * Datum poslední aktualizace záznamu
   */
  updatedAt: Date;

  /**
   * Datum posledního scrapování
   */
  scrapedAt?: Date | null;
}

/**
 * Typ pro kategorii
 */
export interface Category {
  /**
   * Unikátní identifikátor kategorie
   */
  id: number;

  /**
   * Název kategorie
   */
  name: string;
}
/**
 * Typ pro obrázek firmy
 */
export interface BusinessImage {
  /**
   * URL obrázku
   */
  url: string;

  /**
   * Cesta k obrázku v bucketu
   */
  path: string;

  /**
   * Typ obrázku (např. 'logo', 'thumbnail', 'photo')
   */
  type: string;

  /**
   * Datum nahrání obrázku
   */
  uploadedAt: Date;
}

/**
 * Typ pro metadata firmy
 */
export interface BusinessMetadata {
  /**
   * Poznámky k firmě
   */
  notes?: string | null;

  /**
   * Další data ve formátu JSON
   */
  data?: string | null;

  /**
   * Obrázky firmy
   */
  images?: BusinessImage[];

  /**
   * Náhledový obrázek webu
   */
  websiteThumbnail?: string | null;
}

/**
 * Rozšířený typ pro firmu s relacemi
 */
export interface BusinessWithRelations extends Business {
  /**
   * Kategorie firmy
   */
  categories?: Category[];

  /**
   * Metadata firmy
   */
  metadata?: BusinessMetadata | null;
}

/**
 * Typ pro vytvoření nové firmy
 */
export type CreateBusinessInput = Omit<Business, 'id' | 'createdAt' | 'updatedAt'> & {
  /**
   * ID kategorií firmy
   */
  categoryIds?: number[];

  /**
   * Metadata firmy
   */
  metadata?: BusinessMetadata | null;

  /**
   * Obrázky firmy
   */
  images?: BusinessImage[];
};

/**
 * Typ pro aktualizaci firmy
 */
export type UpdateBusinessInput = Partial<Omit<Business, 'id' | 'createdAt' | 'updatedAt'>> & {
  /**
   * ID firmy
   */
  id: string;

  /**
   * ID kategorií firmy
   */
  categoryIds?: number[];

  /**
   * Metadata firmy
   */
  metadata?: BusinessMetadata | null;

  /**
   * Obrázky firmy k přidání
   */
  addImages?: BusinessImage[];

  /**
   * Cesty k obrázkům, které mají být odstraněny
   */
  removeImagePaths?: string[];
};

/**
 * Typ pro filtrování firem
 */
export interface BusinessFilters {
  /**
   * Klíčové slovo pro vyhledávání
   */
  keyword?: string;

  /**
   * Kategorie firmy
   */
  category?: string;

  /**
   * Má firma web?
   */
  hasWebsite?: 'true' | 'false' | 'all';

  /**
   * Má firma email?
   */
  hasEmail?: 'true' | 'false' | 'all';

  /**
   * Má firma telefon?
   */
  hasPhone?: 'true' | 'false' | 'all';
}

/**
 * Typ pro řazení firem
 */
export interface BusinessSorting {
  /**
   * Pole pro řazení
   */
  field: keyof Business | 'metadata.notes';

  /**
   * Směr řazení
   */
  direction: 'asc' | 'desc';
}

/**
 * Typ pro stránkování firem
 */
export interface BusinessPagination {
  /**
   * Aktuální stránka
   */
  page: number;

  /**
   * Počet záznamů na stránku
   */
  pageSize: number;
}

/**
 * Typ pro výsledek stránkování firem
 */
export interface BusinessPaginationResult {
  /**
   * Celkový počet záznamů
   */
  totalItems: number;

  /**
   * Celkový počet stránek
   */
  totalPages: number;

  /**
   * Aktuální stránka
   */
  currentPage: number;

  /**
   * Počet záznamů na stránku
   */
  pageSize: number;

  /**
   * Data firem
   */
  data: BusinessWithRelations[];
}
