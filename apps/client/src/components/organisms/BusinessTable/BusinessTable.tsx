import React, { useState } from 'react';
import { Table, TableBody } from '@/components/atoms/Table';
import { BusinessTableHeader } from '@/components/molecules/BusinessTableHeader';
import { BusinessTableRow } from '@/components/molecules/BusinessTableRow';
import { TablePagination } from '@/components/molecules/TablePagination';
import { BusinessTableFilters } from '@/components/molecules/BusinessTableFilters';
import { useBusinessTable } from '@/hooks/ui';
import { Company } from '@contact-scraper/api/routers';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BusinessTableProps {
    /**
     * Callback pro editaci firmy
     */
    onEdit: (business: Company) => void;
    /**
     * Callback pro smazání firmy
     */
    onDelete: (businessId: string) => void;
    /**
     * Callback pro výběr firem
     */
    onSelectionChange?: (businesses: Company[]) => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Organismická komponenta pro tabulku firem
 */
export const BusinessTable: React.FC<BusinessTableProps> = ({
    onEdit,
    onDelete,
    onSelectionChange,
    className,
}) => {
    // Použití hooku pro práci s tabulkou
    const {
        data: companies,
        pagination,
        sorting,
        selection,
        isLoading,
        error,
    } = useBusinessTable();

    // Stav pro aktivní řádek (např. při najetí myší)
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

    // Efekt pro notifikaci o změně výběru
    React.useEffect(() => {
        onSelectionChange?.(selection.selectedRows);
    }, [selection.selectedRows, onSelectionChange]);

    // Definice sloupců tabulky
    const columns = [
        { id: 'id', label: '#', width: 60 },
        { id: 'name', label: 'Název', sortable: true, width: 200 },
        { id: 'email', label: 'Email', sortable: true, width: 200 },
        { id: 'website', label: 'Web', sortable: true, width: 200 },
        { id: 'phone', label: 'Telefon', sortable: true, width: 120 },
        { id: 'categories', label: 'Kategorie', width: 200 },
        { id: 'address', label: 'Adresa', sortable: true, width: 200 },
        { id: 'metadata.notes', label: 'Poznámky', width: 200 },
        { id: 'industry', label: 'Odvětví', width: 150 },
        { id: 'region', label: 'Region', width: 150 },
        { id: 'scrapedAt', label: 'Vytvořeno', sortable: true, width: 150 },
        { id: 'actions', label: 'Akce', width: 100 },
    ];

    // Zobrazení chyby
    if (error) {
        return (
            <div className="container mx-auto p-4 text-red-500">
                Nepodařilo se načíst data firem
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Filtry */}
            <BusinessTableFilters />

            {/* Tabulka */}
            <div className="overflow-x-auto">
                <Table>
                    <BusinessTableHeader
                        columns={columns}
                        sorting={sorting.state}
                        onSortingChange={sorting.onSortingChange}
                        allRowsSelected={selection.isAllSelected}
                        onSelectAllChange={selection.onSelectAll}
                    />
                    <TableBody>
                        {isLoading && companies.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center py-8">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                        Načítání dat...
                                    </div>
                                </td>
                            </tr>
                        ) : companies.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center py-8">
                                    Nebyly nalezeny žádné firmy odpovídající filtru
                                </td>
                            </tr>
                        ) : (
                            companies.map((business, index) => (
                                <BusinessTableRow
                                    key={business.id}
                                    business={business}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    isSelected={!!selection.state[index]}
                                    onSelectChange={(isSelected) => {
                                        const newSelection = { ...selection.state };
                                        if (isSelected) {
                                            newSelection[index] = true;
                                        } else {
                                            delete newSelection[index];
                                        }
                                        selection.onRowSelectionChange(newSelection);
                                    }}
                                    isActive={activeRowIndex === index}
                                    onDoubleClick={() => onEdit(business)}
                                    onMouseEnter={() => setActiveRowIndex(index)}
                                    onMouseLeave={() => setActiveRowIndex(null)}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Stránkování */}
            <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
                isLoading={isLoading}
            />
        </div>
    );
};

export default BusinessTable;
