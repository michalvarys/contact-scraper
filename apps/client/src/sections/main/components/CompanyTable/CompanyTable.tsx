import React from 'react';
import { useBusinessTable } from '@/sections/main/contexts/BusinessTableContext';
import { cn } from '@/lib/utils';
import { TableView } from './TableView';

export interface BusinessTableProps {
    className?: string;
}

export function BusinessTable({
    className,
}: BusinessTableProps) {
    const { error } = useBusinessTable();

    // Zobrazení chyby
    if (error) {
        return (
            <div className="container mx-auto p-4 text-red-500">
                Nepodařilo se načíst data firem
            </div>
        );
    }

    return (
        <>
            <div className={cn('flex flex-col h-full', className)}>
                <TableView />
            </div>
        </>
    );
};

export default BusinessTable;
