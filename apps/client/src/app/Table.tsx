// src/app/page.tsx
'use client';
import { BusinessTable } from '@/components/BusinessTable';
import { useCompanies } from '@/hooks/useCompanies';
import { useFilters } from '@/hooks/useFilters';

export default function Table() {
    const { filters } = useFilters();
    const { data, isLoading, error } = useCompanies(filters);

    if (isLoading && (!data || data.data.length === 0)) {
        return (
            <div className="container mx-auto p-4 text-center">
                Načítání dat...
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 text-red-500">
                Nepodařilo se načíst data firem
            </div>
        );
    }

    return (
        <BusinessTable
            businesses={data?.data || []}
            isLoading={isLoading}
            totalItems={data?.pagination.total || 0}
            currentPage={data?.pagination.page || 1}
            pageSize={data?.pagination.limit || 20}
            totalPages={data?.pagination.pages || 1}
        />
    );
}
