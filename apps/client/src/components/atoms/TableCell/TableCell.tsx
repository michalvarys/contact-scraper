import React from 'react';
import { cn } from '@/lib/utils';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    /**
     * Obsah buňky
     */
    children: React.ReactNode;
    /**
     * Zarovnání obsahu buňky
     */
    align?: 'left' | 'center' | 'right';
    /**
     * Maximální šířka buňky s oříznutím textu
     */
    maxWidth?: number;
    /**
     * Zda má buňka zobrazit tooltip při najetí myší
     */
    withTooltip?: boolean;
    /**
     * Text tooltipu (pokud není zadán, použije se obsah buňky)
     */
    tooltipText?: string;
}

/**
 * Atomická komponenta pro buňku tabulky
 */
export const TableCell: React.FC<TableCellProps> = ({
    children,
    className,
    align = 'left',
    maxWidth,
    withTooltip = false,
    tooltipText,
    ...props
}) => {
    const alignmentClass = {
        'text-left': align === 'left',
        'text-center': align === 'center',
        'text-right': align === 'right',
    };

    const maxWidthStyle = maxWidth ? { maxWidth: `${maxWidth}px` } : {};
    const truncateClass = maxWidth ? 'truncate' : '';
    const tooltipAttr = withTooltip ? { title: tooltipText || (typeof children === 'string' ? children : '') } : {};

    return (
        <td
            className={cn(
                'p-2',
                alignmentClass,
                truncateClass,
                className
            )}
            style={maxWidthStyle}
            {...tooltipAttr}
            {...props}
        >
            {children}
        </td>
    );
};

export default TableCell;
