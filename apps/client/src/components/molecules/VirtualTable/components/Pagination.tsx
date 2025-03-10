import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// Komponenta pro paginaci
const Pagination = memo(({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) => {
    // Generování seznamu stránek pro zobrazení
    const getPageNumbers = () => {
        const pages = [];

        // Pokud je méně než 7 stránek, zobrazíme všechny
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        // Vždy zobrazit první stránku
        pages.push(1);

        // Přidání elipsy, pokud aktuální stránka není blízko začátku
        if (currentPage > 3) {
            pages.push('...');
        }

        // Výpočet rozsahu stránek kolem aktuální stránky
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        // Speciální případy pro začátek a konec
        if (currentPage <= 3) {
            startPage = 2;
            endPage = Math.min(4, totalPages - 1);
        } else if (currentPage >= totalPages - 2) {
            startPage = Math.max(totalPages - 3, 2);
            endPage = totalPages - 1;
        }

        // Přidání stránek v rozsahu
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Přidání elipsy, pokud aktuální stránka není blízko konce
        if (currentPage < totalPages - 2) {
            pages.push('...');
        }

        // Vždy zobrazit poslední stránku
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center space-x-2 py-2">
            {/* Tlačítko pro první stránku */}
            <button
                className={cn(
                    "px-2 py-1 rounded border",
                    currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-gray-50"
                )}
                onClick={() => currentPage > 1 && onPageChange(1)}
                disabled={currentPage === 1}
                title="První stránka"
            >
                &laquo;
            </button>

            {/* Tlačítko pro předchozí stránku */}
            <button
                className={cn(
                    "px-2 py-1 rounded border",
                    currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-gray-50"
                )}
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Předchozí stránka"
            >
                &lt;
            </button>

            {/* Seznam stránek */}
            {getPageNumbers().map((page, index) => (
                <button
                    key={index}
                    className={cn(
                        "px-3 py-1 rounded border",
                        page === currentPage
                            ? "bg-blue-50 border-blue-200 text-blue-600 font-bold"
                            : page === '...'
                                ? "border-transparent"
                                : "bg-white hover:bg-gray-50"
                    )}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                >
                    {page}
                </button>
            ))}

            {/* Tlačítko pro další stránku */}
            <button
                className={cn(
                    "px-2 py-1 rounded border",
                    currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-gray-50"
                )}
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Další stránka"
            >
                &gt;
            </button>

            {/* Tlačítko pro poslední stránku */}
            <button
                className={cn(
                    "px-2 py-1 rounded border",
                    currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white hover:bg-gray-50"
                )}
                onClick={() => currentPage < totalPages && onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Poslední stránka"
            >
                &raquo;
            </button>
        </div>
    );
});

Pagination.displayName = 'Pagination';

export default Pagination;
