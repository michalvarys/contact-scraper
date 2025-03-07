import React from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TablePaginationProps {
    /**
     * Aktuální stránka
     */
    currentPage: number;
    /**
     * Celkový počet stránek
     */
    totalPages: number;
    /**
     * Celkový počet položek
     */
    totalItems: number;
    /**
     * Počet položek na stránku
     */
    pageSize: number;
    /**
     * Callback pro změnu stránky
     */
    onPageChange: (page: number) => void;
    /**
     * Callback pro změnu počtu položek na stránku
     */
    onPageSizeChange: (pageSize: number) => void;
    /**
     * Zda se načítají data
     */
    isLoading?: boolean;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro stránkování tabulky
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
    className,
}) => {
    // Funkce pro změnu počtu položek na stránku
    const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPageSize = parseInt(e.target.value, 10);
        if (!isNaN(newPageSize) && newPageSize > 0 && newPageSize <= 200) {
            onPageSizeChange(newPageSize);
        }
    };

    return (
        <div className={cn('flex justify-between items-center mt-4', className)}>
            <div className="flex flex-row flex-nowrap items-center gap-2">
                <span className="flex text-nowrap">
                    Celkem záznamů: <strong className="ml-1">{totalItems}</strong>
                </span>
                <div className="flex items-center gap-2">
                    <span>Zobrazit:</span>
                    <Input
                        className="w-16"
                        type="number"
                        min={10}
                        max={200}
                        step={5}
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || isLoading}
                    aria-label="Předchozí stránka"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <span>
                    Stránka <strong>{currentPage}</strong> z <strong>{totalPages || 1}</strong>
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || isLoading}
                    aria-label="Další stránka"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default TablePagination;
