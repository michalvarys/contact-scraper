import React from 'react';
import { TableCell } from '@/components/atoms/TableCell';
import { TableRow } from '@/components/atoms/Table';
import { Button } from '@/components/atoms/Button';
import { Edit, Trash2 } from 'lucide-react';
import { Company } from '@contact-scraper/api/routers';
import { cn } from '@/lib/utils';

export interface BusinessTableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    /**
     * Data firmy k zobrazení
     */
    business: Company;
    /**
     * Callback pro editaci firmy
     */
    onEdit: (business: Company) => void;
    /**
     * Callback pro smazání firmy
     */
    onDelete: (businessId: string) => void;
    /**
     * Zda je řádek vybrán
     */
    isSelected?: boolean;
    /**
     * Callback pro změnu výběru řádku
     */
    onSelectChange?: (isSelected: boolean) => void;
    /**
     * Zda je řádek aktivní (např. při najetí myší)
     */
    isActive?: boolean;
    /**
     * Callback pro dvojklik na řádek
     */
    onDoubleClick?: () => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro řádek tabulky firem
 */
export const BusinessTableRow: React.FC<BusinessTableRowProps> = ({
    business,
    onEdit,
    onDelete,
    isSelected = false,
    onSelectChange,
    isActive = false,
    onDoubleClick,
    className,
}) => {
    // Pomocná funkce pro zkrácení textu
    const truncateText = (text: string | null | undefined, maxLength: number = 30) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    // Formátování data
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('cs-CZ');
    };

    // Získání textu kategorií
    const getCategoryText = () => {
        const categories = business.categories || [];
        return categories.map(cat => cat.name).join(', ');
    };

    return (
        <TableRow
            className={cn(
                isSelected && 'bg-blue-50',
                isActive && 'bg-gray-50',
                className
            )}
            onDoubleClick={onDoubleClick}
        >
            {/* Checkbox pro výběr */}
            <TableCell align="center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectChange?.(e.target.checked)}
                    className="h-4 w-4"
                />
            </TableCell>

            {/* ID */}
            <TableCell maxWidth={100} withTooltip>
                {business.id}
            </TableCell>

            {/* Název */}
            <TableCell maxWidth={200} withTooltip>
                <a
                    href={business.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    title={business.name}
                >
                    {truncateText(business.name, 30)}
                </a>
            </TableCell>

            {/* Email */}
            <TableCell maxWidth={200} withTooltip>
                {business.email && (
                    <a
                        href={`mailto:${business.email}`}
                        className="hover:underline"
                        title={business.email}
                    >
                        {truncateText(business.email, 25)}
                    </a>
                )}
            </TableCell>

            {/* Web */}
            <TableCell maxWidth={200} withTooltip>
                {business.website && (
                    <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={business.website}
                    >
                        {truncateText(business.website, 25)}
                    </a>
                )}
            </TableCell>

            {/* Telefon */}
            <TableCell maxWidth={120} withTooltip tooltipText={business.phone || ''}>
                {truncateText(business.phone || '', 15)}
            </TableCell>

            {/* Kategorie */}
            <TableCell maxWidth={200} withTooltip tooltipText={getCategoryText()}>
                {truncateText(getCategoryText(), 30)}
            </TableCell>

            {/* Adresa */}
            <TableCell maxWidth={200} withTooltip tooltipText={business.address}>
                {truncateText(business.address, 30)}
            </TableCell>

            {/* Poznámky */}
            <TableCell maxWidth={200} withTooltip tooltipText={business.metadata?.notes || ''}>
                {truncateText(business.metadata?.notes || '', 30)}
            </TableCell>

            {/* Vytvořeno */}
            <TableCell maxWidth={150} withTooltip>
                {business.scrapedAt ? formatDate(business.scrapedAt) : '-'}
            </TableCell>

            {/* Akce */}
            <TableCell>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(business);
                        }}
                        title="Upravit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(business.id);
                        }}
                        title="Smazat"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};

export default BusinessTableRow;
