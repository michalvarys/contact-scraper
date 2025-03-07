import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/atoms/Table';
import { cn } from '@/lib/utils';
import { SortingState } from '@tanstack/react-table';

export interface Column {
    /**
     * Identifikátor sloupce
     */
    id: string;
    /**
     * Zobrazovaný název sloupce
     */
    label: string;
    /**
     * Zda lze podle sloupce řadit
     */
    sortable?: boolean;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Šířka sloupce
     */
    width?: number | string;
}

export interface BusinessTableHeaderProps {
    /**
     * Definice sloupců
     */
    columns: Column[];
    /**
     * Aktuální stav řazení
     */
    sorting: SortingState;
    /**
     * Callback pro změnu řazení
     */
    onSortingChange: (sorting: SortingState) => void;
    /**
     * Zda je vybrán checkbox pro výběr všech řádků
     */
    allRowsSelected?: boolean;
    /**
     * Callback pro změnu výběru všech řádků
     */
    onSelectAllChange?: (selected: boolean) => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro hlavičku tabulky firem
 */
export const BusinessTableHeader: React.FC<BusinessTableHeaderProps> = ({
    columns,
    sorting,
    onSortingChange,
    allRowsSelected = false,
    onSelectAllChange,
    className,
}) => {
    // Funkce pro získání směru řazení pro sloupec
    const getSortDirection = (columnId: string): 'asc' | 'desc' | undefined => {
        const sortItem = sorting.find(item => item.id === columnId);
        return sortItem ? (sortItem.desc ? 'desc' : 'asc') : undefined;
    };

    // Funkce pro změnu řazení při kliknutí na sloupec
    const handleSort = (columnId: string) => {
        const currentDirection = getSortDirection(columnId);

        let newSorting: SortingState = [];

        if (!currentDirection) {
            // Pokud sloupec není řazen, nastavíme vzestupné řazení
            newSorting = [{ id: columnId, desc: false }];
        } else if (currentDirection === 'asc') {
            // Pokud je sloupec řazen vzestupně, změníme na sestupné
            newSorting = [{ id: columnId, desc: true }];
        } else {
            // Pokud je sloupec řazen sestupně, zrušíme řazení
            newSorting = [];
        }

        onSortingChange(newSorting);
    };

    return (
        <TableHeader className={className}>
            <TableRow>
                {/* Checkbox pro výběr všech řádků */}
                <TableHead className="w-10 text-center">
                    <input
                        type="checkbox"
                        checked={allRowsSelected}
                        onChange={(e) => onSelectAllChange?.(e.target.checked)}
                        className="h-4 w-4"
                    />
                </TableHead>

                {/* Sloupce podle definice */}
                {columns.map((column) => {
                    const sortDirection = column.sortable ? getSortDirection(column.id) : undefined;

                    return (
                        <TableHead
                            key={column.id}
                            className={cn(
                                column.sortable && 'cursor-pointer hover:bg-gray-100',
                                column.className
                            )}
                            style={column.width ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : undefined}
                            onClick={() => column.sortable && handleSort(column.id)}
                        >
                            <div className="flex items-center">
                                {column.label}
                                {sortDirection && (
                                    <span className="ml-1">
                                        {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                                    </span>
                                )}
                            </div>
                        </TableHead>
                    );
                })}
            </TableRow>
        </TableHeader>
    );
};

export default BusinessTableHeader;
