declare module '@contact-scraper/types' {
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
}
