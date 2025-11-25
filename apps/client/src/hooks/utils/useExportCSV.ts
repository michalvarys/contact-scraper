import { useCallback } from 'react';
import type { Company } from '@contact-scraper/api/routers';

export function useExportCSV() {
  const exportToCSV = useCallback((companies: Company[], filename = 'export.csv') => {
    if (companies.length === 0) {
      return;
    }

    // Pomocná funkce pro formátování hodnot
    const formatValue = (value: any): string => {
      // Null nebo undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Pole - spojit elementy středníkem nebo serializovat objekty
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              // Pokud má objekt property 'name', použít ji, jinak JSON
              return item.name || JSON.stringify(item);
            }
            return String(item);
          })
          .join('; ');
      }

      // Objekt - serializovat jako JSON nebo použít name property
      if (typeof value === 'object') {
        // Pokud má objekt property 'name', použít ji
        if ('name' in value && value.name) {
          return String(value.name);
        }
        // Jinak serializovat jako JSON
        return JSON.stringify(value);
      }

      // Primitivní hodnoty
      return String(value);
    };

    // Získat všechny klíče z prvního záznamu pro hlavičku
    const firstCompany = companies[0];
    const headers = Object.keys(firstCompany);

    // Vytvořit CSV obsah
    const csvContent = [
      // Hlavička
      headers.join(','),
      // Řádky
      ...companies.map((company) =>
        headers
          .map((header) => {
            const value = company[header as keyof Company];
            const formattedValue = formatValue(value);

            // Escape hodnot s čárkami a uvozovkami
            if (
              formattedValue.includes(',') ||
              formattedValue.includes('"') ||
              formattedValue.includes('\n')
            ) {
              return `"${formattedValue.replace(/"/g, '""')}"`;
            }
            return formattedValue;
          })
          .join(','),
      ),
    ].join('\n');

    // Vytvořit blob a stáhnout
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { exportToCSV };
}
